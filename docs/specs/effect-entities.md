# effect-entities Specification

**Status**: Planned
**Components**: See [`registry/effect-entities/`](../../registry/effect-entities/) (to be created)
**Last Updated**: 2025-10-18

## Overview

`effect-entities` is a collection of vendorable components (~480 lines total) for defining domain entities, value objects, and relationships using an Effect Schema-based DSL that compiles to SQL schemas, migrations, Prisma schemas, and type-safe query builders. This enables customers to define their own domain models on an abstract platform.

Think "database schema as code" - typed, composable entity definitions that generate SQL, migrations, and type-safe queries across multiple database dialects.

**Core Thesis**: Entity definitions are data structures that should be defined once and compiled to multiple targets. By using Effect Schema with domain-driven design patterns (entities, value objects, aggregates), schemas become portable, validatable, and compatible with multiple ORMs and database systems.

**Components**:
- Entity definition primitives (~480 lines): entity-schema, entity-relationships, entity-to-sql, entity-to-migration, entity-to-prisma, entity-query-builder

## Core Primitives

### 1. Entity Schema (Type-Safe Entity IR)

Effect Schema types for declarative entity and value object definitions:

```typescript
import { Entity, ValueObject, Attr } from './lib/effect-entities/entity-schema'

// Value Objects (DDD pattern - embedded complex types)
const Address = ValueObject.make("Address", {
  street: Attr.string({ maxLength: 200 }),
  city: Attr.string({ maxLength: 100 }),
  state: Attr.string({ length: 2, pattern: /^[A-Z]{2}$/ }),
  zipCode: Attr.string({ pattern: /^\d{5}(-\d{4})?$/ }),
  country: Attr.string({ default: "US" })
})

const Money = ValueObject.make("Money", {
  amount: Attr.decimal({ precision: 10, scale: 2, min: 0 }),
  currency: Attr.enum(["USD", "EUR", "GBP"], { default: "USD" })
})

const EmailAddress = ValueObject.make("EmailAddress", {
  value: Attr.email(),
  verified: Attr.boolean({ default: false }),
  verifiedAt: Attr.timestamp({ optional: true })
})

// Entities (DDD pattern - objects with identity)
const User = Entity.make("User", {
  id: Attr.uuid({ primary: true, default: "gen_random_uuid()" }),
  email: Attr.valueObject(EmailAddress),
  name: Attr.string({ maxLength: 100 }),
  age: Attr.number({ min: 0, max: 150, optional: true }),
  address: Attr.valueObject(Address, { optional: true }),
  role: Attr.enum(["user", "admin", "moderator"], { default: "user" }),
  metadata: Attr.json({ optional: true }), // JSONB for PostgreSQL
  createdAt: Attr.timestamp({ default: "now()", immutable: true }),
  updatedAt: Attr.timestamp({ onUpdate: "now()" }),
  deletedAt: Attr.timestamp({ optional: true }) // Soft delete
}, {
  tableName: "users", // Override default
  indexes: [
    { fields: ["email.value"], unique: true },
    { fields: ["createdAt"] },
    { fields: ["deletedAt"], where: "deletedAt IS NULL" } // Partial index
  ],
  checks: [
    { name: "age_valid", expression: "age IS NULL OR (age >= 0 AND age <= 150)" }
  ]
})

const Product = Entity.make("Product", {
  id: Attr.uuid({ primary: true }),
  sku: Attr.string({ unique: true, maxLength: 50 }),
  name: Attr.string({ maxLength: 200 }),
  description: Attr.text({ optional: true }),
  price: Attr.valueObject(Money),
  inStock: Attr.boolean({ default: true }),
  stockCount: Attr.number({ min: 0, default: 0 }),
  categoryId: Attr.uuid(),
  tags: Attr.array(Attr.string()), // PostgreSQL array or JSON
  publishedAt: Attr.timestamp({ optional: true })
}, {
  indexes: [
    { fields: ["sku"], unique: true },
    { fields: ["categoryId"] },
    { fields: ["publishedAt"], where: "publishedAt IS NOT NULL" }
  ]
})
```

**Attribute Types**:
- `Attr.uuid()` - UUID type with optional default
- `Attr.string()` - VARCHAR with length/pattern constraints
- `Attr.text()` - TEXT type for long content
- `Attr.number()` - INTEGER with min/max constraints
- `Attr.decimal()` - DECIMAL with precision/scale
- `Attr.boolean()` - BOOLEAN type
- `Attr.timestamp()` - TIMESTAMP with timezone
- `Attr.date()` - DATE type
- `Attr.email()` - String with email validation
- `Attr.enum()` - ENUM type or CHECK constraint
- `Attr.json()` - JSON or JSONB type
- `Attr.array()` - Array type (PostgreSQL) or JSON
- `Attr.valueObject()` - Embedded value object (flattened or JSON)

**Attribute Options**:
```typescript
interface AttrOptions {
  primary?: boolean          // Primary key
  unique?: boolean          // Unique constraint
  optional?: boolean        // Nullable
  default?: string | number // Default value (can be SQL expression)
  immutable?: boolean       // Can't be updated after creation
  onUpdate?: string         // Auto-update expression
  index?: boolean           // Create index
  // Validation
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  length?: number           // Exact length
  pattern?: RegExp          // Pattern validation
  // Advanced
  columnName?: string       // Override column name
  comment?: string          // Column comment
}
```

**Entity Options**:
```typescript
interface EntityOptions {
  tableName?: string        // Override table name
  schema?: string           // Database schema (e.g., "public")
  indexes?: Index[]         // Composite/partial indexes
  checks?: CheckConstraint[] // Table-level checks
  comment?: string          // Table comment
}
```

### 2. Entity Relationships

Define relationships between entities:

```typescript
import { Entity, Relation } from './lib/effect-entities/entity-relationships'

const User = Entity.make("User", {
  id: Attr.uuid({ primary: true }),
  email: Attr.email({ unique: true }),
  name: Attr.string({ maxLength: 100 })
})

const Profile = Entity.make("Profile", {
  id: Attr.uuid({ primary: true }),
  userId: Attr.uuid(),
  bio: Attr.text({ optional: true }),
  avatarUrl: Attr.string({ optional: true })
})

const Post = Entity.make("Post", {
  id: Attr.uuid({ primary: true }),
  title: Attr.string({ maxLength: 200 }),
  content: Attr.text(),
  authorId: Attr.uuid(),
  publishedAt: Attr.timestamp({ optional: true })
})

const Tag = Entity.make("Tag", {
  id: Attr.uuid({ primary: true }),
  name: Attr.string({ maxLength: 50, unique: true }),
  slug: Attr.string({ maxLength: 50, unique: true })
})

const Comment = Entity.make("Comment", {
  id: Attr.uuid({ primary: true }),
  postId: Attr.uuid(),
  authorId: Attr.uuid(),
  content: Attr.text(),
  createdAt: Attr.timestamp({ default: "now()" })
})

// Add relationships using Entity.extend
const UserWithRelations = Entity.extend(User, {
  profile: Relation.hasOne(Profile, {
    foreignKey: "userId",
    onDelete: "CASCADE"
  }),
  posts: Relation.hasMany(Post, {
    foreignKey: "authorId",
    onDelete: "CASCADE"
  }),
  comments: Relation.hasMany(Comment, {
    foreignKey: "authorId",
    onDelete: "SET NULL"
  })
})

const PostWithRelations = Entity.extend(Post, {
  author: Relation.belongsTo(User, {
    foreignKey: "authorId",
    onDelete: "CASCADE",
    references: "id"
  }),
  tags: Relation.manyToMany(Tag, {
    through: "PostTags",      // Junction table name
    foreignKey: "postId",     // FK to Post
    otherKey: "tagId",        // FK to Tag
    timestamps: true          // Add createdAt to junction
  }),
  comments: Relation.hasMany(Comment, {
    foreignKey: "postId",
    onDelete: "CASCADE",
    orderBy: { createdAt: "desc" }
  })
})

const ProfileWithRelations = Entity.extend(Profile, {
  user: Relation.belongsTo(User, {
    foreignKey: "userId",
    onDelete: "CASCADE"
  })
})
```

**Relationship Types**:
- `Relation.belongsTo()` - Many-to-one (adds FK on this entity)
- `Relation.hasOne()` - One-to-one (FK on related entity)
- `Relation.hasMany()` - One-to-many (FK on related entity)
- `Relation.manyToMany()` - Many-to-many (generates junction table)

**Cascade Options**:
- `"CASCADE"` - Delete related records
- `"SET NULL"` - Set FK to NULL
- `"RESTRICT"` - Prevent deletion
- `"NO ACTION"` - Database default

### 3. SQL Schema Compiler

Compile entity definitions to SQL DDL:

```typescript
import { toSQL, SQLDialect } from './lib/effect-entities/entity-to-sql'
import fs from 'node:fs'

// Single entity
const userSQL = toSQL(User, {
  dialect: "postgresql",
  includeIfNotExists: true,
  includeComments: true
})

// Multiple entities with relationships
const schema = toSQL([UserWithRelations, PostWithRelations, ProfileWithRelations], {
  dialect: "postgresql",
  schema: "public"
})

fs.writeFileSync("schema.sql", schema)
```

**Generated SQL (PostgreSQL)**:
```sql
-- Users table
CREATE TABLE IF NOT EXISTS "public"."users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email_value" VARCHAR(255) NOT NULL,
  "email_verified" BOOLEAN NOT NULL DEFAULT false,
  "email_verifiedAt" TIMESTAMP WITH TIME ZONE,
  "name" VARCHAR(100) NOT NULL,
  "age" INTEGER CHECK (age >= 0 AND age <= 150),
  "address_street" VARCHAR(200),
  "address_city" VARCHAR(100),
  "address_state" VARCHAR(2) CHECK (address_state ~ '^[A-Z]{2}$'),
  "address_zipCode" VARCHAR(20),
  "address_country" VARCHAR(10) DEFAULT 'US',
  "role" VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  "metadata" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "deletedAt" TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE UNIQUE INDEX "idx_users_email" ON "public"."users" ("email_value");
CREATE INDEX "idx_users_createdAt" ON "public"."users" ("createdAt");
CREATE INDEX "idx_users_deletedAt" ON "public"."users" ("deletedAt") WHERE "deletedAt" IS NULL;

-- Comments
COMMENT ON TABLE "public"."users" IS 'User accounts';
COMMENT ON COLUMN "public"."users"."email_value" IS 'Primary email address';

-- Products table
CREATE TABLE IF NOT EXISTS "public"."products" (
  "id" UUID PRIMARY KEY,
  "sku" VARCHAR(50) UNIQUE NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "price_amount" DECIMAL(10, 2) NOT NULL CHECK (price_amount >= 0),
  "price_currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "inStock" BOOLEAN NOT NULL DEFAULT true,
  "stockCount" INTEGER NOT NULL DEFAULT 0 CHECK (stockCount >= 0),
  "categoryId" UUID NOT NULL,
  "tags" TEXT[], -- PostgreSQL array
  "publishedAt" TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX "idx_products_sku" ON "public"."products" ("sku");
CREATE INDEX "idx_products_categoryId" ON "public"."products" ("categoryId");
CREATE INDEX "idx_products_publishedAt" ON "public"."products" ("publishedAt") WHERE "publishedAt" IS NOT NULL;

-- Profile table
CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL,
  "bio" TEXT,
  "avatarUrl" VARCHAR(255),
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "idx_profiles_userId" ON "public"."profiles" ("userId");

-- Posts table
CREATE TABLE IF NOT EXISTS "public"."posts" (
  "id" UUID PRIMARY KEY,
  "title" VARCHAR(200) NOT NULL,
  "content" TEXT NOT NULL,
  "authorId" UUID NOT NULL,
  "publishedAt" TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_posts_authorId" ON "public"."posts" ("authorId");

-- Tags table
CREATE TABLE IF NOT EXISTS "public"."tags" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(50) UNIQUE NOT NULL,
  "slug" VARCHAR(50) UNIQUE NOT NULL
);

-- PostTags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS "public"."PostTags" (
  "postId" UUID NOT NULL,
  "tagId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("postId", "tagId"),
  FOREIGN KEY ("postId") REFERENCES "public"."posts"("id") ON DELETE CASCADE,
  FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_PostTags_postId" ON "public"."PostTags" ("postId");
CREATE INDEX "idx_PostTags_tagId" ON "public"."PostTags" ("tagId");

-- Comments table
CREATE TABLE IF NOT EXISTS "public"."comments" (
  "id" UUID PRIMARY KEY,
  "postId" UUID NOT NULL,
  "authorId" UUID,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("postId") REFERENCES "public"."posts"("id") ON DELETE CASCADE,
  FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_comments_postId" ON "public"."comments" ("postId");
CREATE INDEX "idx_comments_authorId" ON "public"."comments" ("authorId");
```

**Supported Dialects**:
- `"postgresql"` - PostgreSQL 12+
- `"mysql"` - MySQL 8+ / MariaDB 10.5+
- `"sqlite"` - SQLite 3.35+

**Dialect Differences**:
```typescript
// PostgreSQL
price_amount: DECIMAL(10, 2)
tags: TEXT[]
metadata: JSONB

// MySQL
price_amount: DECIMAL(10, 2)
tags: JSON
metadata: JSON

// SQLite
price_amount: REAL
tags: TEXT  -- Stored as JSON string
metadata: TEXT  -- Stored as JSON string
```

### 4. Migration Generator

Generate SQL migrations from entity definition changes:

```typescript
import { generateMigration } from './lib/effect-entities/entity-to-migration'
import fs from 'node:fs'

// Define old and new schema
const oldUser = Entity.make("User", {
  id: Attr.uuid({ primary: true }),
  email: Attr.email({ unique: true }),
  name: Attr.string({ maxLength: 100 })
})

const newUser = Entity.make("User", {
  id: Attr.uuid({ primary: true }),
  email: Attr.email({ unique: true }),
  name: Attr.string({ maxLength: 100 }),
  age: Attr.number({ min: 0, max: 150, optional: true }), // NEW
  role: Attr.enum(["user", "admin"], { default: "user" })  // NEW
})

// Generate migration
const migration = generateMigration(oldUser, newUser, {
  dialect: "postgresql",
  migrationName: "add_user_age_and_role",
  timestamp: "20251018120000"
})

// Write migration files
fs.writeFileSync("migrations/20251018120000_add_user_age_and_role.up.sql", migration.up)
fs.writeFileSync("migrations/20251018120000_add_user_age_and_role.down.sql", migration.down)
```

**Generated Migration (UP)**:
```sql
-- Migration: add_user_age_and_role
-- Generated: 2025-10-18 12:00:00

BEGIN;

-- Add new columns
ALTER TABLE "users" ADD COLUMN "age" INTEGER;
ALTER TABLE "users" ADD COLUMN "role" VARCHAR(20) NOT NULL DEFAULT 'user';

-- Add constraints
ALTER TABLE "users" ADD CONSTRAINT "check_age" CHECK (age IS NULL OR (age >= 0 AND age <= 150));
ALTER TABLE "users" ADD CONSTRAINT "check_role" CHECK (role IN ('user', 'admin'));

COMMIT;
```

**Generated Migration (DOWN)**:
```sql
-- Rollback: add_user_age_and_role
-- Generated: 2025-10-18 12:00:00

BEGIN;

-- Drop constraints
ALTER TABLE "users" DROP CONSTRAINT "check_role";
ALTER TABLE "users" DROP CONSTRAINT "check_age";

-- Drop columns
ALTER TABLE "users" DROP COLUMN "role";
ALTER TABLE "users" DROP COLUMN "age";

COMMIT;
```

**Supported Change Types**:
- Add column
- Remove column
- Rename column
- Change column type
- Add/remove constraint
- Add/remove index
- Add/remove table
- Rename table
- Change cascade behavior

**Safety Features**:
- Detects destructive changes (warns on data loss)
- Generates safe migrations with type conversions
- Requires explicit confirmation for dangerous operations
- Supports multi-step migrations for complex changes

### 5. Prisma Schema Compiler

Compile entity definitions to Prisma schema format:

```typescript
import { toPrisma } from './lib/effect-entities/entity-to-prisma'
import fs from 'node:fs'

// Single entity
const userPrisma = toPrisma(User)

// Multiple entities with relationships
const prismaSchema = toPrisma([UserWithRelations, PostWithRelations, ProfileWithRelations], {
  datasource: {
    provider: "postgresql",
    url: "env(DATABASE_URL)"
  },
  generator: {
    provider: "prisma-client-js",
    previewFeatures: ["postgresqlExtensions"]
  }
})

fs.writeFileSync("prisma/schema.prisma", prismaSchema)
```

**Generated Prisma Schema**:
```prisma
// Auto-generated from effect-entities
// Do not edit manually - regenerate from entity definitions

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique @db.VarChar(255)
  emailVerified Boolean   @default(false)
  name          String    @db.VarChar(100)
  age           Int?      @db.Integer
  addressStreet String?   @db.VarChar(200)
  addressCity   String?   @db.VarChar(100)
  addressState  String?   @db.VarChar(2)
  addressZip    String?   @db.VarChar(20)
  role          String    @default("user") @db.VarChar(20)
  metadata      Json?
  createdAt     DateTime  @default(now()) @db.Timestamptz
  updatedAt     DateTime  @updatedAt @db.Timestamptz
  deletedAt     DateTime? @db.Timestamptz

  profile  Profile?
  posts    Post[]
  comments Comment[]

  @@index([createdAt])
  @@index([deletedAt])
  @@map("users")
}

model Profile {
  id        String  @id @default(uuid())
  userId    String  @unique
  bio       String? @db.Text
  avatarUrl String? @db.VarChar(255)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Post {
  id          String    @id @default(uuid())
  title       String    @db.VarChar(200)
  content     String    @db.Text
  authorId    String
  publishedAt DateTime? @db.Timestamptz

  author   User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  tags     Tag[]     @relation("PostTags")
  comments Comment[]

  @@index([authorId])
  @@map("posts")
}

model Tag {
  id   String @id @default(uuid())
  name String @unique @db.VarChar(50)
  slug String @unique @db.VarChar(50)

  posts Post[] @relation("PostTags")

  @@map("tags")
}

model Comment {
  id        String   @id @default(uuid())
  postId    String
  authorId  String?
  content   String   @db.Text
  createdAt DateTime @default(now()) @db.Timestamptz

  post   Post  @relation(fields: [postId], references: [id], onDelete: Cascade)
  author User? @relation(fields: [authorId], references: [id], onDelete: SetNull)

  @@index([postId])
  @@index([authorId])
  @@map("comments")
}
```

**Integration with effect-prisma**:
```typescript
import { PrismaClient } from '@prisma/client'
import { DbClient } from './lib/effect-prisma/db-client'

const prisma = new PrismaClient()
const DbLive = DbClient.layer(prisma)

// Use generated Prisma client with effect-prisma
const getUser = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DbClient
    return yield* db.use((client) =>
      client.user.findUnique({
        where: { id },
        include: { profile: true, posts: true }
      })
    )
  }).pipe(Effect.provide(DbLive))
```

### 6. Type-Safe Query Builder

Generate type-safe query builders from entity definitions:

```typescript
import { Query } from './lib/effect-entities/entity-query-builder'
import { DbClient } from './lib/effect-prisma/db-client'

// Simple queries
const getUsers = Query.from(User)
  .where({ role: "admin" })
  .orderBy({ createdAt: "desc" })
  .limit(10)
  .execute()

// With relationships
const getUsersWithPosts = Query.from(UserWithRelations)
  .where({ age: Query.gte(18) })
  .include({ posts: true, profile: true })
  .execute()

// Complex queries
const getActiveUsers = Query.from(User)
  .where({
    deletedAt: Query.isNull(),
    createdAt: Query.gte(new Date("2025-01-01")),
    role: Query.in(["admin", "moderator"])
  })
  .select({ id: true, email: true, name: true })
  .execute()

// Aggregations
const userStats = Query.from(User)
  .aggregate({
    count: true,
    avg: { age: true },
    max: { createdAt: true }
  })
  .execute()

// Joins
const getPostsWithAuthors = Query.from(Post)
  .include({ author: true })
  .where({
    publishedAt: Query.isNotNull(),
    "author.role": "admin" // Nested conditions
  })
  .orderBy({ publishedAt: "desc" })
  .execute()
```

**Query Builder API**:
```typescript
class QueryBuilder<Entity, Result> {
  // Filtering
  where(conditions: WhereConditions<Entity>): QueryBuilder<Entity, Result>

  // Selection
  select<Fields>(fields: FieldSelection<Entity, Fields>): QueryBuilder<Entity, Fields>
  include(relations: RelationIncludes<Entity>): QueryBuilder<Entity, Result>

  // Ordering
  orderBy(order: OrderBy<Entity>): QueryBuilder<Entity, Result>

  // Pagination
  limit(n: number): QueryBuilder<Entity, Result>
  offset(n: number): QueryBuilder<Entity, Result>

  // Aggregation
  aggregate(agg: Aggregations<Entity>): QueryBuilder<Entity, AggregateResult>

  // Execution
  execute(): Effect<Result[], DbError, DbClient>
  executeOne(): Effect<Result | null, DbError, DbClient>
  executeFirst(): Effect<Result, DbError | NotFoundError, DbClient>
}
```

**Where Conditions**:
```typescript
Query.eq(value)           // =
Query.ne(value)           // !=
Query.gt(value)           // >
Query.gte(value)          // >=
Query.lt(value)           // <
Query.lte(value)          // <=
Query.in(values)          // IN
Query.notIn(values)       // NOT IN
Query.isNull()            // IS NULL
Query.isNotNull()         // IS NOT NULL
Query.like(pattern)       // LIKE
Query.ilike(pattern)      // ILIKE (case-insensitive)
Query.between(min, max)   // BETWEEN
Query.contains(value)     // Array contains (PostgreSQL)
Query.startsWith(value)   // String starts with
Query.endsWith(value)     // String ends with
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Entity Definitions (Effect Schema)         │
│                      (Type-Safe DSL)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  const User = Entity.make("User", {                          │
│    id: Attr.uuid({ primary: true }),                         │
│    email: Attr.email({ unique: true }),                      │
│    address: Attr.valueObject(Address)                        │
│  })                                                           │
│                                                               │
│  const UserWithRelations = Entity.extend(User, {             │
│    posts: Relation.hasMany(Post),                            │
│    profile: Relation.hasOne(Profile)                         │
│  })                                                           │
│                                                               │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴─────────┬─────────────┬──────────────┬──────────────┐
        │                  │             │              │              │
┌───────▼────────┐ ┌───────▼──────┐ ┌───▼────────┐ ┌──▼──────────┐ ┌──▼─────────┐
│  SQL Schema    │ │  Migration   │ │  Prisma    │ │  TypeScript │ │  Query     │
│  Compiler      │ │  Generator   │ │  Compiler  │ │  Types      │ │  Builder   │
└───────┬────────┘ └───────┬──────┘ └───┬────────┘ └──┬──────────┘ └──┬─────────┘
        │                  │             │              │              │
┌───────▼────────┐ ┌───────▼──────┐ ┌───▼────────┐ ┌──▼──────────┐ ┌──▼─────────┐
│ schema.sql     │ │ migrations/  │ │ schema.    │ │ types.ts    │ │ Query API  │
│ (PostgreSQL/   │ │ 001_*.sql    │ │ prisma     │ │ (generated) │ │ (runtime)  │
│  MySQL/SQLite) │ │ (UP/DOWN)    │ │            │ │             │ │            │
└────────────────┘ └──────────────┘ └────────────┘ └─────────────┘ └────────────┘
        │                  │             │                             │
        └──────────────────┴─────────────┴─────────────────────────────┘
                                    │
                            ┌───────▼────────┐
                            │   Database     │
                            │  (PostgreSQL/  │
                            │   MySQL/       │
                            │   SQLite)      │
                            └────────────────┘
```

## Key Design Decisions

### 1. Why Effect Schema?

- **Type-Safe**: Full TypeScript inference for entities and queries
- **Composable**: Value objects compose into entities
- **Validatable**: Built-in validation rules
- **Portable**: Serialize to JSON for storage/transmission
- **AI-Friendly**: Structured metadata for tooling

### 2. Why Value Objects?

- **Domain-Driven Design**: Capture domain concepts (Money, Address, Email)
- **Type-Safe**: Stronger types than primitives
- **Reusable**: Share across entities
- **Flexible Compilation**: Flatten to columns or store as JSON

### 3. Why Multiple Compilation Targets?

- **SQL**: Direct schema creation, portable across databases
- **Prisma**: Integration with existing Prisma workflows
- **Migrations**: Safe schema evolution
- **Query Builder**: Type-safe runtime queries

### 4. Why Vendorable?

- **Customizable**: Modify SQL generation for specific needs
- **No Black Box**: All logic visible in ~80 lines per component
- **Educational**: Learn DDD patterns and SQL generation
- **No Lock-In**: Own your schema definitions

### 5. Why Multi-Dialect?

- **Portability**: Switch databases without rewriting entities
- **Best Practices**: Use database-specific features (JSONB, arrays)
- **Testing**: Use SQLite for tests, PostgreSQL for production

## Implementation Status

### ✅ Planned Components

- **entity-schema.ts** (~80 lines)
  - Entity and ValueObject builders
  - Attribute type definitions
  - Validation rules and constraints
  - Entity options (indexes, checks, comments)

- **entity-relationships.ts** (~70 lines)
  - Relation.belongsTo, hasOne, hasMany, manyToMany
  - Foreign key configuration
  - Cascade behaviors
  - Junction table generation

- **entity-to-sql.ts** (~90 lines)
  - Compile entities → SQL DDL
  - Support PostgreSQL, MySQL, SQLite
  - Index and constraint generation
  - Dialect-specific optimizations

- **entity-to-migration.ts** (~80 lines)
  - Diff entity definitions
  - Generate UP/DOWN migrations
  - Detect destructive changes
  - Safe migration strategies

- **entity-to-prisma.ts** (~60 lines)
  - Compile entities → Prisma schema
  - Datasource and generator configuration
  - Relation mapping
  - Type mapping

- **entity-query-builder.ts** (~100 lines)
  - Type-safe query builder
  - Where conditions (eq, gt, in, like, etc.)
  - Relations (include, select)
  - Aggregations (count, avg, max, etc.)

### 🚧 Future Enhancements

- **Entity Validation**:
  - Runtime validation using Effect Schema
  - Custom validators per entity
  - Cross-field validation rules

- **Schema Introspection**:
  - Read existing database schema
  - Generate entity definitions from SQL
  - Sync entities with database

- **Advanced Features**:
  - Polymorphic associations
  - Inheritance (single-table, class-table, concrete-table)
  - Composite primary keys
  - Database views as entities
  - Materialized views
  - Triggers and stored procedures

- **Multi-Tenancy**:
  - Row-level security
  - Schema-per-tenant
  - Discriminator columns

- **Audit & History**:
  - Automatic audit trails
  - Temporal tables
  - Event sourcing integration

## Example Application Structure

```
my-project/
├── lib/
│   ├── effect-entities/           # Vendored components
│   │   ├── entity-schema.ts       # Entity & value object DSL (80 lines)
│   │   ├── entity-relationships.ts # Relationship definitions (70 lines)
│   │   ├── entity-to-sql.ts       # SQL compiler (90 lines)
│   │   ├── entity-to-migration.ts # Migration generator (80 lines)
│   │   ├── entity-to-prisma.ts    # Prisma compiler (60 lines)
│   │   └── entity-query-builder.ts # Query builder (100 lines)
│   └── effect-prisma/              # Vendored Prisma integration
│       ├── db-client.ts            # Prisma Effect wrapper (105 lines)
│       └── db-transaction.ts       # Advanced transactions (110 lines)
├── entities/                       # Entity definitions
│   ├── user.ts                    # User entity
│   ├── post.ts                    # Post entity
│   ├── product.ts                 # Product entity
│   └── value-objects.ts           # Shared value objects
├── prisma/
│   ├── schema.prisma              # Generated from entities
│   └── migrations/                # Generated migrations
│       ├── 20251018_initial_schema.up.sql
│       ├── 20251018_initial_schema.down.sql
│       └── ...
├── scripts/
│   ├── generate-schema.ts         # Build script: entities → Prisma
│   ├── generate-migration.ts      # Build script: diff → migration
│   └── generate-sql.ts            # Build script: entities → SQL
└── package.json
```

## Usage Examples

### Example 1: E-Commerce Domain

```typescript
import { Entity, ValueObject, Attr, Relation } from './lib/effect-entities/entity-schema'

// Value Objects
const Money = ValueObject.make("Money", {
  amount: Attr.decimal({ precision: 10, scale: 2, min: 0 }),
  currency: Attr.enum(["USD", "EUR", "GBP"], { default: "USD" })
})

const Address = ValueObject.make("Address", {
  street: Attr.string({ maxLength: 200 }),
  city: Attr.string({ maxLength: 100 }),
  state: Attr.string({ length: 2 }),
  zipCode: Attr.string({ pattern: /^\d{5}(-\d{4})?$/ }),
  country: Attr.string({ default: "US" })
})

// Entities
const Customer = Entity.make("Customer", {
  id: Attr.uuid({ primary: true }),
  email: Attr.email({ unique: true }),
  name: Attr.string({ maxLength: 100 }),
  phone: Attr.string({ maxLength: 20, optional: true }),
  billingAddress: Attr.valueObject(Address),
  shippingAddress: Attr.valueObject(Address, { optional: true }),
  createdAt: Attr.timestamp({ default: "now()" }),
  updatedAt: Attr.timestamp({ onUpdate: "now()" })
}, {
  indexes: [
    { fields: ["email"], unique: true },
    { fields: ["createdAt"] }
  ]
})

const Product = Entity.make("Product", {
  id: Attr.uuid({ primary: true }),
  sku: Attr.string({ unique: true, maxLength: 50 }),
  name: Attr.string({ maxLength: 200 }),
  description: Attr.text({ optional: true }),
  price: Attr.valueObject(Money),
  compareAtPrice: Attr.valueObject(Money, { optional: true }),
  inStock: Attr.boolean({ default: true }),
  stockCount: Attr.number({ min: 0, default: 0 }),
  images: Attr.array(Attr.string()), // URLs
  tags: Attr.array(Attr.string()),
  publishedAt: Attr.timestamp({ optional: true })
})

const Order = Entity.make("Order", {
  id: Attr.uuid({ primary: true }),
  orderNumber: Attr.string({ unique: true, maxLength: 50 }),
  customerId: Attr.uuid(),
  status: Attr.enum(["pending", "processing", "shipped", "delivered", "cancelled"], {
    default: "pending"
  }),
  subtotal: Attr.valueObject(Money),
  tax: Attr.valueObject(Money),
  shipping: Attr.valueObject(Money),
  total: Attr.valueObject(Money),
  shippingAddress: Attr.valueObject(Address),
  createdAt: Attr.timestamp({ default: "now()" }),
  updatedAt: Attr.timestamp({ onUpdate: "now()" })
})

const OrderItem = Entity.make("OrderItem", {
  id: Attr.uuid({ primary: true }),
  orderId: Attr.uuid(),
  productId: Attr.uuid(),
  quantity: Attr.number({ min: 1 }),
  unitPrice: Attr.valueObject(Money),
  totalPrice: Attr.valueObject(Money)
})

// Add relationships
const CustomerWithRelations = Entity.extend(Customer, {
  orders: Relation.hasMany(Order, { foreignKey: "customerId" })
})

const OrderWithRelations = Entity.extend(Order, {
  customer: Relation.belongsTo(Customer, {
    foreignKey: "customerId",
    onDelete: "RESTRICT"
  }),
  items: Relation.hasMany(OrderItem, {
    foreignKey: "orderId",
    onDelete: "CASCADE"
  })
})

const OrderItemWithRelations = Entity.extend(OrderItem, {
  order: Relation.belongsTo(Order, {
    foreignKey: "orderId",
    onDelete: "CASCADE"
  }),
  product: Relation.belongsTo(Product, {
    foreignKey: "productId",
    onDelete: "RESTRICT"
  })
})
```

### Example 2: Multi-Tenant SaaS

```typescript
const Tenant = Entity.make("Tenant", {
  id: Attr.uuid({ primary: true }),
  name: Attr.string({ maxLength: 100 }),
  slug: Attr.string({ unique: true, maxLength: 50 }),
  plan: Attr.enum(["free", "pro", "enterprise"], { default: "free" }),
  status: Attr.enum(["active", "suspended", "cancelled"], { default: "active" }),
  createdAt: Attr.timestamp({ default: "now()" }),
  updatedAt: Attr.timestamp({ onUpdate: "now()" })
})

const User = Entity.make("User", {
  id: Attr.uuid({ primary: true }),
  tenantId: Attr.uuid(), // Tenant isolation
  email: Attr.email(),
  name: Attr.string({ maxLength: 100 }),
  role: Attr.enum(["admin", "member", "viewer"], { default: "member" }),
  createdAt: Attr.timestamp({ default: "now()" }),
  updatedAt: Attr.timestamp({ onUpdate: "now()" })
}, {
  indexes: [
    { fields: ["tenantId", "email"], unique: true } // Unique per tenant
  ]
})

const Project = Entity.make("Project", {
  id: Attr.uuid({ primary: true }),
  tenantId: Attr.uuid(), // Tenant isolation
  name: Attr.string({ maxLength: 200 }),
  description: Attr.text({ optional: true }),
  ownerId: Attr.uuid(),
  status: Attr.enum(["active", "archived"], { default: "active" }),
  createdAt: Attr.timestamp({ default: "now()" }),
  updatedAt: Attr.timestamp({ onUpdate: "now()" })
}, {
  indexes: [
    { fields: ["tenantId"] },
    { fields: ["ownerId"] }
  ]
})

// Query with tenant isolation
const getTenantProjects = (tenantId: string) =>
  Query.from(Project)
    .where({ tenantId, status: "active" })
    .include({ owner: true })
    .execute()
```

### Example 3: Build Script (Generate Prisma Schema)

```typescript
// scripts/generate-schema.ts
import { toPrisma } from './lib/effect-entities/entity-to-prisma'
import fs from 'node:fs'
import * as Entities from './entities'

const allEntities = [
  Entities.CustomerWithRelations,
  Entities.ProductWithRelations,
  Entities.OrderWithRelations,
  Entities.OrderItemWithRelations
]

const prismaSchema = toPrisma(allEntities, {
  datasource: {
    provider: "postgresql",
    url: "env(DATABASE_URL)"
  },
  generator: {
    provider: "prisma-client-js"
  }
})

fs.writeFileSync("prisma/schema.prisma", prismaSchema)
console.log("✓ Generated prisma/schema.prisma")
```

```bash
# Run build script
pnpm tsx scripts/generate-schema.ts

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev
```

### Example 4: Generate Migration

```typescript
// scripts/generate-migration.ts
import { generateMigration } from './lib/effect-entities/entity-to-migration'
import { readFileSync, writeFileSync } from 'fs'

// Load old and new entity definitions
const oldUser = JSON.parse(readFileSync('entities/.snapshots/User-v1.json', 'utf-8'))
const newUser = await import('./entities/user')

const migration = generateMigration(oldUser, newUser.User, {
  dialect: "postgresql",
  migrationName: "add_user_fields",
  timestamp: new Date().toISOString().replace(/[:-]/g, '').slice(0, 14)
})

const timestamp = migration.timestamp
writeFileSync(`prisma/migrations/${timestamp}_add_user_fields.up.sql`, migration.up)
writeFileSync(`prisma/migrations/${timestamp}_add_user_fields.down.sql`, migration.down)

console.log(`✓ Generated migration: ${timestamp}_add_user_fields`)
```

## Customization Patterns

### Custom Attribute Type

Add a custom attribute type for your domain:

```typescript
// After vendoring entity-schema.ts, add:
export const Attr = {
  // ... existing types ...

  // Custom: ISBN for books
  isbn: (options?: AttrOptions) => ({
    _tag: "attr" as const,
    type: "string" as const,
    ...options,
    pattern: /^(97(8|9))?\d{9}(\d|X)$/,
    maxLength: 13,
    comment: "ISBN-10 or ISBN-13"
  }),

  // Custom: Coordinates (using value object)
  coordinates: (options?: AttrOptions) =>
    Attr.valueObject(
      ValueObject.make("Coordinates", {
        latitude: Attr.decimal({ precision: 10, scale: 7, min: -90, max: 90 }),
        longitude: Attr.decimal({ precision: 10, scale: 7, min: -180, max: 180 })
      }),
      options
    )
}
```

### Custom SQL Generation

Modify SQL generation for specific database features:

```typescript
// After vendoring entity-to-sql.ts, customize:

// Add PostGIS extension support
const generatePostGISColumn = (attr) => {
  if (attr.type === "coordinates") {
    return `${attr.name} GEOGRAPHY(POINT, 4326)`
  }
  return generateColumn(attr)
}

// Add full-text search indexes
const generateFullTextIndex = (table, columns) => `
CREATE INDEX idx_${table}_fts ON ${table}
USING GIN (to_tsvector('english', ${columns.join(' || ')}));
`
```

### Custom Validation

Add entity-level validation rules:

```typescript
import { Schema as S } from '@effect/schema/Schema'

const OrderSchema = S.Struct({
  subtotal: S.Number,
  tax: S.Number,
  shipping: S.Number,
  total: S.Number
}).pipe(
  S.filter((order) => {
    // Validate total = subtotal + tax + shipping
    const expected = order.subtotal + order.tax + order.shipping
    return Math.abs(order.total - expected) < 0.01
  }, {
    message: () => "Order total must equal subtotal + tax + shipping"
  })
)

const validateOrder = S.decodeUnknownSync(OrderSchema)
```

## Testing Strategy

### Unit Tests (Entity Definitions)

```typescript
import { describe, it, expect } from 'vitest'
import { Entity, Attr } from './entity-schema'

describe('entity-schema', () => {
  it('creates entity with valid attributes', () => {
    const User = Entity.make("User", {
      id: Attr.uuid({ primary: true }),
      email: Attr.email({ unique: true }),
      name: Attr.string({ maxLength: 100 })
    })

    expect(User.name).toBe("User")
    expect(User.attributes).toHaveProperty("id")
    expect(User.attributes).toHaveProperty("email")
  })

  it('creates value object', () => {
    const Money = ValueObject.make("Money", {
      amount: Attr.decimal({ precision: 10, scale: 2 }),
      currency: Attr.enum(["USD", "EUR"])
    })

    expect(Money.name).toBe("Money")
    expect(Money.attributes.amount.type).toBe("decimal")
  })
})
```

### Compiler Tests (SQL Generation)

```typescript
import { describe, it, expect } from 'vitest'
import { toSQL } from './entity-to-sql'

describe('entity-to-sql', () => {
  it('generates PostgreSQL CREATE TABLE', () => {
    const User = Entity.make("User", {
      id: Attr.uuid({ primary: true }),
      email: Attr.email({ unique: true })
    })

    const sql = toSQL(User, { dialect: "postgresql" })

    expect(sql).toContain('CREATE TABLE')
    expect(sql).toContain('"id" UUID PRIMARY KEY')
    expect(sql).toContain('"email" VARCHAR(255) UNIQUE')
  })

  it('flattens value objects', () => {
    const Address = ValueObject.make("Address", {
      street: Attr.string({ maxLength: 200 }),
      city: Attr.string({ maxLength: 100 })
    })

    const User = Entity.make("User", {
      id: Attr.uuid({ primary: true }),
      address: Attr.valueObject(Address)
    })

    const sql = toSQL(User, { dialect: "postgresql" })

    expect(sql).toContain('"address_street" VARCHAR(200)')
    expect(sql).toContain('"address_city" VARCHAR(100)')
  })
})
```

### Migration Tests

```typescript
import { describe, it, expect } from 'vitest'
import { generateMigration } from './entity-to-migration'

describe('entity-to-migration', () => {
  it('generates ADD COLUMN for new fields', () => {
    const oldUser = Entity.make("User", {
      id: Attr.uuid({ primary: true }),
      email: Attr.email()
    })

    const newUser = Entity.make("User", {
      id: Attr.uuid({ primary: true }),
      email: Attr.email(),
      age: Attr.number({ optional: true })
    })

    const migration = generateMigration(oldUser, newUser, {
      dialect: "postgresql"
    })

    expect(migration.up).toContain('ALTER TABLE')
    expect(migration.up).toContain('ADD COLUMN "age"')
    expect(migration.down).toContain('DROP COLUMN "age"')
  })
})
```

### Integration Tests (Query Builder)

```typescript
import { describe, it, expect } from 'vitest'
import { Query } from './entity-query-builder'
import { Effect } from 'effect'

describe('entity-query-builder', () => {
  it('builds type-safe WHERE query', () => {
    const query = Query.from(User)
      .where({ role: "admin", age: Query.gte(18) })
      .toSQL()

    expect(query.sql).toContain('WHERE')
    expect(query.sql).toContain('role = ?')
    expect(query.sql).toContain('age >= ?')
    expect(query.params).toEqual(["admin", 18])
  })

  it('includes relations', () => {
    const query = Query.from(UserWithRelations)
      .include({ posts: true, profile: true })
      .toSQL()

    expect(query.sql).toContain('LEFT JOIN')
    expect(query.sql).toContain('posts')
    expect(query.sql).toContain('profiles')
  })
})
```

## Performance Characteristics

- **Entity Definition**: ~1ms to construct entity
- **SQL Compilation**: ~5-10ms per entity
- **Migration Generation**: ~10-20ms to diff schemas
- **Prisma Compilation**: ~5ms per entity
- **Query Building**: ~1ms to build query
- **Bundle Size**: ~3-5KB per vendored component (gzipped)

## Open Questions

1. **Schema Versioning**: How to track entity definition versions? Git tags? Snapshots?
2. **Soft Deletes**: Should this be a built-in pattern or user-implemented?
3. **Audit Trails**: Include automatic `createdBy`, `updatedBy` fields?
4. **Database-Specific Features**: How much dialect-specific code to include? (PostGIS, JSONB operators, etc.)
5. **Schema Introspection**: Should we include tools to read existing DB schemas and generate entities?
6. **Migrations in Production**: Include migration runner? Or leave to user/Prisma?
7. **Composite Keys**: Support composite primary keys and foreign keys?
8. **Polymorphic Relations**: Support polymorphic associations (e.g., commentable)?

## Related Documents

### Meta Effect Specs
- [effect-prisma Spec](./effect-prisma.md) - Prisma integration (wraps generated clients)
- [effect-forms Spec](./effect-forms.md) - Forms from schemas (could generate from entities)
- [effect-expressions Spec](./effect-expressions.md) - Expression evaluation (for query conditions)
- [effect-compilers Spec](./effect-compilers.md) - Multi-target compilation pattern

### External Docs
- [Effect Schema](https://effect.website/docs/schema) - Schema validation and types
- [Prisma Docs](https://www.prisma.io/docs) - Prisma ORM documentation
- [PostgreSQL Docs](https://www.postgresql.org/docs/) - PostgreSQL SQL reference
- [Domain-Driven Design](https://domainlanguage.com/ddd/) - DDD patterns and practices
- [Martin Fowler - Value Object](https://martinfowler.com/bliki/ValueObject.html)

## Contributing

This is a living document. As users customize `effect-entities`, we update this spec with:
- Common entity patterns (soft deletes, multi-tenancy, audit trails)
- Database-specific optimizations
- Migration strategies
- Query builder enhancements
- Community feedback

See [registry README](../../registry/README.md) for vendoring instructions.
