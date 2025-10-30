# effect-esign Specification

**Status**: Planned
**Components**: See [`registry/effect-esign/`](../../meta-effect/packages/registry/src/effect-esign/)
**Last Updated**: 2025-10-29

## Overview

`effect-esign` is a collection of vendorable components (~600 lines total) for building compliant electronic signature workflows with Effect-TS. These are focused, copy-paste-able TypeScript modules that compose cryptographic operations, document lifecycle management, and audit trails into legally-compliant e-signature systems.

Think "DocuSign primitives, not DocuSign clone" - minimal, Effect-based building blocks for signature capture, verification, document workflows, and compliance tracking.

**Key Capabilities**:
- **Signature Capture**: Canvas drawing, typed text, uploaded images (3 modalities)
- **Cryptographic Integrity**: Web Crypto API for document signing/verification (ECDSA P-256)
- **Document Workflow**: State machine for signing lifecycle (draft → pending → signed → completed)
- **Audit Trail**: Immutable event log for legal compliance (ESIGN Act, eIDAS)
- **Multi-Party Signing**: Sequential and parallel signing workflows
- **Consent Tracking**: Capture and verify user consent before signing

**Legal Compliance**:
- **US ESIGN Act**: Electronic consent, intent to sign, record retention
- **EU eIDAS**: Qualified electronic signatures (with proper certificate authority)
- **Audit Requirements**: Complete history of who signed what, when, with what method

**Not Included** (users add these):
- Authentication (assumes authenticated users)
- PDF rendering (use pdf-lib or pdfjs)
- Email/SMS delivery (use existing notification system)
- Payment processing (separate concern)

## Core Primitives

### 1. Signature Capture (~75 lines)

Browser-side signature collection with multiple input modalities:

```typescript
import { SignatureCapture, DrawSignature, TypeSignature, UploadSignature } from './lib/effect-esign/signature-capture'
import { Effect } from 'effect'

const program = Effect.gen(function*() {
  const capture = yield* SignatureCapture

  // Capture drawn signature from canvas
  const drawnSig = yield* capture.fromCanvas(canvasElement)
  // → { _tag: "drawn", dataUrl: "data:image/png;base64,...", timestamp: Date, metadata: { width, height, strokeCount } }

  // Capture typed signature (user types their name)
  const typedSig = yield* capture.fromText("John Smith", { fontFamily: "Caveat" })
  // → { _tag: "typed", text: "John Smith", dataUrl: "data:image/png;base64,...", timestamp: Date, metadata: { font } }

  // Capture uploaded signature image
  const uploadedSig = yield* capture.fromUpload(file)
  // → { _tag: "uploaded", dataUrl: "data:image/png;base64,...", timestamp: Date, metadata: { originalFilename } }

  // Validate signature meets requirements (e.g., minimum size, aspect ratio)
  yield* capture.validate(drawnSig)
})
```

**Schema Types**:
```typescript
export class DrawSignature extends Schema.Class<DrawSignature>()({
  _tag: Schema.Literal("drawn"),
  dataUrl: Schema.String,  // Base64-encoded PNG
  timestamp: Schema.Date,
  metadata: Schema.Struct({
    width: Schema.Number,
    height: Schema.Number,
    strokeCount: Schema.Number,
    durationMs: Schema.Number
  })
}) {}

export class TypeSignature extends Schema.Class<TypeSignature>()({
  _tag: Schema.Literal("typed"),
  text: Schema.String,
  dataUrl: Schema.String,  // Rendered as image
  timestamp: Schema.Date,
  metadata: Schema.Struct({
    fontFamily: Schema.String,
    fontSize: Schema.Number
  })
}) {}

export class UploadSignature extends Schema.Class<UploadSignature>()({
  _tag: Schema.Literal("uploaded"),
  dataUrl: Schema.String,
  timestamp: Schema.Date,
  metadata: Schema.Struct({
    originalFilename: Schema.String,
    fileSize: Schema.Number
  })
}) {}

export const SignatureInput = Schema.Union(DrawSignature, TypeSignature, UploadSignature)
```

**Implementation**: Uses HTML Canvas API for drawing, renders typed text to canvas with Web Fonts, validates image data URLs.

### 2. Signature Cryptography (~65 lines)

Effect wrapper for Web Crypto API to sign/verify documents:

```typescript
import { SignatureCrypto } from './lib/effect-esign/signature-crypto'
import { Effect } from 'effect'

const program = Effect.gen(function*() {
  const crypto = yield* SignatureCrypto

  // Generate signing key pair (ECDSA P-256)
  const keyPair = yield* crypto.generateKeyPair()
  // → { publicKey: CryptoKey, privateKey: CryptoKey }

  // Sign document hash
  const documentHash = new Uint8Array([...])  // SHA-256 of document
  const signature = yield* crypto.sign(keyPair.privateKey, documentHash)
  // → { signature: Uint8Array, algorithm: "ECDSA-P256", timestamp: Date }

  // Verify signature
  const isValid = yield* crypto.verify(keyPair.publicKey, signature.signature, documentHash)
  // → true/false

  // Export public key for storage/verification
  const publicKeyBytes = yield* crypto.exportPublicKey(keyPair.publicKey)
  // → Uint8Array (SPKI format)

  // Import public key from storage
  const importedKey = yield* crypto.importPublicKey(publicKeyBytes)
  // → CryptoKey
})
```

**Schema Types**:
```typescript
export class SignatureKeyPair extends Schema.Class<SignatureKeyPair>()({
  publicKey: Schema.InstanceOf(CryptoKey),
  privateKey: Schema.InstanceOf(CryptoKey)
}) {}

export class CryptoSignature extends Schema.Class<CryptoSignature>()({
  signature: Schema.InstanceOf(Uint8Array),
  algorithm: Schema.Literal("ECDSA-P256"),
  timestamp: Schema.Date,
  publicKey: Schema.InstanceOf(Uint8Array)  // SPKI format
}) {}
```

**Security Notes**:
- Uses Web Crypto API (built into browsers, no dependencies)
- ECDSA with P-256 curve (NIST standard, widely supported)
- Private keys can be stored in IndexedDB (browser) or KMS (server)
- Public keys stored with document for verification

### 3. Document State Machine (~85 lines)

Workflow state management for document signing lifecycle:

```typescript
import { DocumentStateMachine, DocumentState } from './lib/effect-esign/document-state-machine'
import { Effect } from 'effect'

const program = Effect.gen(function*() {
  const stateMachine = yield* DocumentStateMachine

  // Create new document (starts in 'draft' state)
  const doc = yield* stateMachine.create({
    documentId: "doc_123",
    title: "Employment Agreement",
    signers: [
      { userId: "user_1", email: "john@example.com", role: "employee", order: 1 },
      { userId: "user_2", email: "jane@example.com", role: "employer", order: 2 }
    ]
  })
  // → { documentId, state: "draft", signers, createdAt, updatedAt }

  // Transition: draft → pending (ready for signing)
  const pending = yield* stateMachine.transition(doc, "send")
  // → { ...doc, state: "pending", sentAt: Date }

  // Transition: pending → partially_signed (first signer completes)
  const partiallySigned = yield* stateMachine.transition(pending, "sign", {
    signerId: "user_1",
    signature: drawnSig
  })
  // → { ...doc, state: "partially_signed", signatures: [{ signerId: "user_1", ... }] }

  // Transition: partially_signed → completed (all signers complete)
  const completed = yield* stateMachine.transition(partiallySigned, "sign", {
    signerId: "user_2",
    signature: typedSig
  })
  // → { ...doc, state: "completed", completedAt: Date }

  // Error handling: invalid transitions fail
  yield* stateMachine.transition(completed, "send")
  // → Effect.fail("Cannot transition from 'completed' to 'pending'")
})
```

**State Diagram**:
```
draft ──(send)──> pending ──(sign)──> partially_signed ──(sign)──> completed
  │                 │                       │
  └─(void)──────────┴───────(void)─────────┴────────────────────> voided
```

**Schema Types**:
```typescript
export const DocumentState = Schema.Literal(
  "draft",           // Initial state, editing allowed
  "pending",         // Sent for signing, awaiting signatures
  "partially_signed", // Some signers completed, others pending
  "completed",       // All signers completed
  "voided"           // Cancelled by creator
)

export class Signer extends Schema.Class<Signer>()({
  userId: Schema.String,
  email: Schema.String,
  role: Schema.String,  // e.g., "employee", "employer", "witness"
  order: Schema.Number, // Sequential signing order (1, 2, 3...)
  signedAt: Schema.optional(Schema.Date),
  signature: Schema.optional(SignatureInput)
}) {}

export class Document extends Schema.Class<Document>()({
  documentId: Schema.String,
  title: Schema.String,
  state: DocumentState,
  signers: Schema.Array(Signer),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  sentAt: Schema.optional(Schema.Date),
  completedAt: Schema.optional(Schema.Date)
}) {}
```

**Validation Rules**:
- `send`: Can only transition from `draft` to `pending`
- `sign`: Validates signer order (sequential signing)
- `void`: Can cancel from any state except `completed`
- Auto-transitions to `completed` when all signers finish

### 4. Audit Trail (~70 lines)

Immutable event log for compliance and legal audit:

```typescript
import { AuditTrail, AuditEvent } from './lib/effect-esign/audit-trail'
import { Effect } from 'effect'

const program = Effect.gen(function*() {
  const audit = yield* AuditTrail

  // Record document creation
  yield* audit.log({
    eventType: "document.created",
    documentId: "doc_123",
    userId: "user_1",
    timestamp: new Date(),
    metadata: { title: "Employment Agreement", signerCount: 2 }
  })

  // Record document sent for signing
  yield* audit.log({
    eventType: "document.sent",
    documentId: "doc_123",
    userId: "user_1",
    timestamp: new Date(),
    metadata: { recipients: ["john@example.com", "jane@example.com"] }
  })

  // Record signature captured
  yield* audit.log({
    eventType: "signature.captured",
    documentId: "doc_123",
    userId: "user_2",
    timestamp: new Date(),
    metadata: {
      signatureType: "drawn",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0...",
      durationMs: 5420
    }
  })

  // Query events by document
  const events = yield* audit.queryByDocument("doc_123")
  // → [AuditEvent, AuditEvent, ...]

  // Query events by user
  const userEvents = yield* audit.queryByUser("user_2")
  // → [AuditEvent, ...]

  // Generate compliance report (PDF-ready format)
  const report = yield* audit.generateReport("doc_123")
  // → { documentId, events: [...], summary: { created, sent, signed, completed }, signers: [...] }
})
```

**Schema Types**:
```typescript
export const AuditEventType = Schema.Literal(
  "document.created",
  "document.sent",
  "document.viewed",
  "signature.captured",
  "signature.applied",
  "document.completed",
  "document.voided",
  "consent.recorded"
)

export class AuditEvent extends Schema.Class<AuditEvent>()({
  eventId: Schema.String,  // UUID
  eventType: AuditEventType,
  documentId: Schema.String,
  userId: Schema.String,
  timestamp: Schema.Date,
  ipAddress: Schema.optional(Schema.String),
  userAgent: Schema.optional(Schema.String),
  metadata: Schema.Record(Schema.String, Schema.Unknown)
}) {}

export class AuditReport extends Schema.Class<AuditReport>()({
  documentId: Schema.String,
  title: Schema.String,
  events: Schema.Array(AuditEvent),
  summary: Schema.Struct({
    createdAt: Schema.Date,
    sentAt: Schema.optional(Schema.Date),
    completedAt: Schema.optional(Schema.Date),
    totalSigners: Schema.Number,
    completedSigners: Schema.Number
  }),
  signers: Schema.Array(Schema.Struct({
    userId: Schema.String,
    email: Schema.String,
    signedAt: Schema.optional(Schema.Date),
    ipAddress: Schema.optional(Schema.String),
    signatureType: Schema.optional(Schema.String)
  }))
}) {}
```

**Storage**:
- Events are append-only (immutable)
- Use Effect's persistent storage abstraction (filesystem, S3, database)
- Cryptographically hash events for tamper detection (optional)

### 5. Signature Field Parser (~80 lines)

Parse PDF documents to extract signature field positions:

```typescript
import { SignatureFieldParser } from './lib/effect-esign/signature-field-parser'
import { Effect } from 'effect'

const program = Effect.gen(function*() {
  const parser = yield* SignatureFieldParser

  // Parse PDF for signature fields (using pdf-lib)
  const fields = yield* parser.parseDocument(pdfBytes)
  // → [SignatureField, SignatureField, ...]

  // Map fields to signers
  const mapping = yield* parser.mapFieldsToSigners(fields, [
    { userId: "user_1", role: "employee" },
    { userId: "user_2", role: "employer" }
  ])
  // → [{ field: SignatureField, signer: Signer }, ...]

  // Validate all required fields have signers
  yield* parser.validateMapping(mapping)
  // → Effect.succeed(void) or Effect.fail("Missing signer for field 'witness_signature'")
})
```

**Schema Types**:
```typescript
export class SignatureField extends Schema.Class<SignatureField>()({
  fieldName: Schema.String,      // e.g., "employee_signature"
  pageNumber: Schema.Number,     // 1-indexed page number
  x: Schema.Number,              // X coordinate (in PDF points)
  y: Schema.Number,              // Y coordinate (in PDF points)
  width: Schema.Number,          // Field width (in PDF points)
  height: Schema.Number,         // Field height (in PDF points)
  required: Schema.Boolean,
  role: Schema.optional(Schema.String)  // e.g., "employee", "employer"
}) {}

export class FieldMapping extends Schema.Class<FieldMapping>()({
  field: SignatureField,
  signer: Signer
}) {}
```

**Implementation**:
- Uses `pdf-lib` to parse PDF AcroForms
- Extracts signature field annotations
- Handles both pre-existing PDF form fields and custom field definitions

### 6. Signing Session (~75 lines)

Manage signing sessions with expiration and authentication tokens:

```typescript
import { SigningSession } from './lib/effect-esign/signing-session'
import { Effect } from 'effect'

const program = Effect.gen(function*() {
  const sessionService = yield* SigningSession

  // Create signing session for a signer
  const session = yield* sessionService.create({
    documentId: "doc_123",
    signerId: "user_1",
    expiresInMinutes: 60
  })
  // → { sessionId, documentId, signerId, token, expiresAt, createdAt }

  // Validate session token (e.g., from URL parameter)
  const validSession = yield* sessionService.validate(session.token)
  // → Session or Effect.fail("Session expired")

  // Extend session expiration
  yield* sessionService.extend(session.sessionId, 30)
  // → { ...session, expiresAt: newDate }

  // Invalidate session after signing
  yield* sessionService.invalidate(session.sessionId)
})
```

**Schema Types**:
```typescript
export class Session extends Schema.Class<Session>()({
  sessionId: Schema.String,    // UUID
  documentId: Schema.String,
  signerId: Schema.String,
  token: Schema.String,        // Secure random token (for URL)
  expiresAt: Schema.Date,
  createdAt: Schema.Date,
  invalidatedAt: Schema.optional(Schema.Date)
}) {}
```

**Security**:
- Tokens are cryptographically secure random strings (256-bit entropy)
- Sessions expire automatically (default: 60 minutes)
- One-time use: invalidated after successful signing
- Include HMAC to prevent token tampering

### 7. Consent Tracking (~65 lines)

ESIGN Act compliance for recording user consent:

```typescript
import { ConsentTracking } from './lib/effect-esign/consent-tracking'
import { Effect } from 'effect'

const program = Effect.gen(function*() {
  const consent = yield* ConsentTracking

  // Record user consent before signing
  yield* consent.record({
    userId: "user_1",
    documentId: "doc_123",
    consentType: "esign_act",
    disclosureShown: true,
    consentGiven: true,
    timestamp: new Date(),
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0..."
  })

  // Verify consent was given before allowing signature
  const hasConsent = yield* consent.verify("user_1", "doc_123")
  // → true/false

  // Get consent record for audit
  const record = yield* consent.getRecord("user_1", "doc_123")
  // → ConsentRecord
})
```

**Schema Types**:
```typescript
export class ConsentRecord extends Schema.Class<ConsentRecord>()({
  consentId: Schema.String,
  userId: Schema.String,
  documentId: Schema.String,
  consentType: Schema.Literal("esign_act", "eidas", "custom"),
  disclosureText: Schema.String,  // Full disclosure text shown to user
  disclosureShown: Schema.Boolean,
  consentGiven: Schema.Boolean,
  timestamp: Schema.Date,
  ipAddress: Schema.String,
  userAgent: Schema.String
}) {}
```

**ESIGN Act Requirements**:
- User must be shown disclosure about electronic signatures
- User must affirmatively consent to use electronic signatures
- Consent must be recorded with timestamp, IP, user agent
- Users can withdraw consent (must be tracked)

### 8. PDF Signer (~85 lines)

Apply signature images to PDF documents:

```typescript
import { PdfSigner } from './lib/effect-esign/pdf-signer'
import { Effect } from 'effect'

const program = Effect.gen(function*() {
  const signer = yield* PdfSigner

  // Apply signature to PDF field
  const signedPdf = yield* signer.applySignature(pdfBytes, {
    field: signatureField,
    signature: drawnSig,
    timestamp: new Date(),
    reason: "I agree to the terms",
    location: "San Francisco, CA"
  })
  // → Uint8Array (modified PDF with signature image)

  // Apply multiple signatures (for multi-party signing)
  const multiSignedPdf = yield* signer.applySignatures(pdfBytes, [
    { field: field1, signature: sig1, ... },
    { field: field2, signature: sig2, ... }
  ])

  // Generate certificate of completion (audit page)
  const certificate = yield* signer.generateCertificate({
    documentId: "doc_123",
    title: "Employment Agreement",
    signers: [
      { name: "John Smith", email: "john@example.com", signedAt: date1 },
      { name: "Jane Doe", email: "jane@example.com", signedAt: date2 }
    ],
    completedAt: new Date()
  })
  // → Uint8Array (PDF with certificate page)

  // Append certificate to signed document
  const finalPdf = yield* signer.appendCertificate(signedPdf, certificate)
  // → Uint8Array (signed PDF + certificate page)
})
```

**Implementation**:
- Uses `pdf-lib` to manipulate PDF documents
- Embeds signature images as PNG annotations
- Adds visual timestamp and signer info below signature
- Optionally adds digital signature (requires certificate authority)

## Integration Components

### 9. effect-vite: Signature API (~80 lines)

HttpApi routes for e-signature workflow:

```typescript
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { SignatureCapture, DocumentStateMachine, AuditTrail } from '../effect-esign'

export class SignatureApi extends HttpApiGroup.make("signature")
  .add(
    HttpApiEndpoint.post("createDocument", "/documents")
      .setPayload(Schema.Struct({
        title: Schema.String,
        pdfBytes: Schema.String,  // Base64
        signers: Schema.Array(Schema.Struct({
          email: Schema.String,
          role: Schema.String,
          order: Schema.Number
        }))
      }))
      .setSuccess(Document)
  )
  .add(
    HttpApiEndpoint.post("sendForSigning", "/documents/:id/send")
      .setSuccess(Document)
  )
  .add(
    HttpApiEndpoint.post("captureSignature", "/documents/:id/sign")
      .setPayload(SignatureInput)
      .setSuccess(Document)
  )
  .add(
    HttpApiEndpoint.get("getDocument", "/documents/:id")
      .setSuccess(Document)
  )
  .add(
    HttpApiEndpoint.get("getAuditTrail", "/documents/:id/audit")
      .setSuccess(AuditReport)
  )
{} {}
```

**Handlers** (implement with Effect):
```typescript
export const handlers = HttpApiBuilder.group(SignatureApi, "signature", (handlers) =>
  handlers
    .handle("createDocument", ({ payload }) =>
      Effect.gen(function*() {
        const stateMachine = yield* DocumentStateMachine
        const audit = yield* AuditTrail

        const doc = yield* stateMachine.create({
          documentId: crypto.randomUUID(),
          ...payload
        })

        yield* audit.log({
          eventType: "document.created",
          documentId: doc.documentId,
          userId: "current_user",  // From auth context
          timestamp: new Date(),
          metadata: { title: payload.title }
        })

        return doc
      })
    )
    .handle("captureSignature", ({ params, payload }) =>
      Effect.gen(function*() {
        const stateMachine = yield* DocumentStateMachine
        const capture = yield* SignatureCapture
        const audit = yield* AuditTrail

        // Validate signature
        yield* capture.validate(payload)

        // Transition document state
        const doc = yield* stateMachine.transition(params.id, "sign", {
          signerId: "current_user",
          signature: payload
        })

        // Log audit event
        yield* audit.log({
          eventType: "signature.captured",
          documentId: doc.documentId,
          userId: "current_user",
          timestamp: new Date(),
          metadata: { signatureType: payload._tag }
        })

        return doc
      })
    )
)
```

### 10. effect-remix: Signature Loader (~65 lines)

Remix loader/action for signing page:

```typescript
import { withEffect } from '../effect-remix/with-effect'
import { SigningSession, DocumentStateMachine } from '../effect-esign'

// Loader: Load document and validate signing session
export const loader = withEffect((request, params) =>
  Effect.gen(function*() {
    const sessionToken = new URL(request.url).searchParams.get("token")
    if (!sessionToken) {
      return Effect.fail(new Error("Missing session token"))
    }

    const sessionService = yield* SigningSession
    const stateMachine = yield* DocumentStateMachine

    // Validate session
    const session = yield* sessionService.validate(sessionToken)

    // Load document
    const doc = yield* stateMachine.get(session.documentId)

    // Check if already signed
    const signer = doc.signers.find(s => s.userId === session.signerId)
    if (signer?.signedAt) {
      return Effect.fail(new Error("Already signed"))
    }

    return { document: doc, session, signer }
  })
)

// Action: Capture signature
export const action = withEffect((request, params) =>
  Effect.gen(function*() {
    const formData = yield* Effect.promise(() => request.formData())
    const signatureData = formData.get("signature")  // Base64 PNG

    const sessionToken = new URL(request.url).searchParams.get("token")!
    const sessionService = yield* SigningSession
    const session = yield* sessionService.validate(sessionToken)

    const capture = yield* SignatureCapture
    const signature = yield* capture.fromCanvas(signatureData)

    const stateMachine = yield* DocumentStateMachine
    const doc = yield* stateMachine.transition(session.documentId, "sign", {
      signerId: session.signerId,
      signature
    })

    // Invalidate session
    yield* sessionService.invalidate(session.sessionId)

    return { success: true, document: doc }
  })
)
```

### 11. effect-prisma: Signature Schema (~90 lines)

Prisma database schema for e-signatures:

```prisma
// lib/effect-prisma/signature-schema.prisma

model Document {
  id          String   @id @default(uuid())
  title       String
  state       DocumentState
  pdfUrl      String   // S3/storage URL
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  sentAt      DateTime?
  completedAt DateTime?

  signers     Signer[]
  auditEvents AuditEvent[]

  @@index([state])
  @@index([createdAt])
}

enum DocumentState {
  DRAFT
  PENDING
  PARTIALLY_SIGNED
  COMPLETED
  VOIDED
}

model Signer {
  id         String   @id @default(uuid())
  documentId String
  userId     String
  email      String
  role       String
  order      Int
  signedAt   DateTime?

  document   Document @relation(fields: [documentId], references: [id])
  signature  Signature?
  consent    ConsentRecord?

  @@unique([documentId, userId])
  @@index([email])
}

model Signature {
  id            String   @id @default(uuid())
  signerId      String   @unique
  type          SignatureType
  dataUrl       String   @db.Text  // Base64 PNG
  metadata      Json
  cryptoSig     Bytes?   // ECDSA signature
  createdAt     DateTime @default(now())

  signer        Signer   @relation(fields: [signerId], references: [id])
}

enum SignatureType {
  DRAWN
  TYPED
  UPLOADED
}

model AuditEvent {
  id          String   @id @default(uuid())
  eventType   AuditEventType
  documentId  String
  userId      String
  timestamp   DateTime @default(now())
  ipAddress   String?
  userAgent   String?
  metadata    Json

  document    Document @relation(fields: [documentId], references: [id])

  @@index([documentId])
  @@index([userId])
  @@index([eventType])
  @@index([timestamp])
}

enum AuditEventType {
  DOCUMENT_CREATED
  DOCUMENT_SENT
  DOCUMENT_VIEWED
  SIGNATURE_CAPTURED
  SIGNATURE_APPLIED
  DOCUMENT_COMPLETED
  DOCUMENT_VOIDED
  CONSENT_RECORDED
}

model ConsentRecord {
  id             String   @id @default(uuid())
  signerId       String   @unique
  consentType    ConsentType
  disclosureText String   @db.Text
  consentGiven   Boolean
  timestamp      DateTime @default(now())
  ipAddress      String
  userAgent      String

  signer         Signer   @relation(fields: [signerId], references: [id])
}

enum ConsentType {
  ESIGN_ACT
  EIDAS
  CUSTOM
}

model SigningSession {
  id           String   @id @default(uuid())
  documentId   String
  signerId     String
  token        String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  invalidatedAt DateTime?

  @@index([token])
  @@index([expiresAt])
}
```

## Usage Patterns

### Simple Single-Signer Flow

```typescript
import { Effect } from 'effect'
import { DocumentStateMachine, SignatureCapture, PdfSigner, AuditTrail } from './lib/effect-esign'

const singleSignerFlow = Effect.gen(function*() {
  const stateMachine = yield* DocumentStateMachine
  const capture = yield* SignatureCapture
  const pdfSigner = yield* PdfSigner
  const audit = yield* AuditTrail

  // 1. Create document
  const doc = yield* stateMachine.create({
    documentId: crypto.randomUUID(),
    title: "Employment Agreement",
    signers: [{ userId: "user_1", email: "john@example.com", role: "employee", order: 1 }]
  })

  // 2. Send for signing
  yield* stateMachine.transition(doc, "send")

  // 3. User opens signing page, captures signature
  const signature = yield* capture.fromCanvas(canvasElement)

  // 4. Apply signature and complete
  const signedDoc = yield* stateMachine.transition(doc, "sign", {
    signerId: "user_1",
    signature
  })

  // 5. Apply signature to PDF
  const signedPdf = yield* pdfSigner.applySignature(pdfBytes, {
    field: signatureField,
    signature,
    timestamp: new Date()
  })

  // 6. Generate audit report
  const report = yield* audit.generateReport(doc.documentId)

  return { document: signedDoc, pdf: signedPdf, audit: report }
})
```

### Multi-Party Sequential Signing

```typescript
const sequentialSigning = Effect.gen(function*() {
  const stateMachine = yield* DocumentStateMachine

  // Create document with 3 signers in order
  const doc = yield* stateMachine.create({
    documentId: crypto.randomUUID(),
    title: "Partnership Agreement",
    signers: [
      { userId: "user_1", email: "alice@example.com", role: "partner_a", order: 1 },
      { userId: "user_2", email: "bob@example.com", role: "partner_b", order: 2 },
      { userId: "user_3", email: "carol@example.com", role: "witness", order: 3 }
    ]
  })

  yield* stateMachine.transition(doc, "send")

  // First signer
  yield* stateMachine.transition(doc, "sign", { signerId: "user_1", signature: sig1 })
  // State: partially_signed

  // Second signer
  yield* stateMachine.transition(doc, "sign", { signerId: "user_2", signature: sig2 })
  // State: partially_signed

  // Third signer (final)
  yield* stateMachine.transition(doc, "sign", { signerId: "user_3", signature: sig3 })
  // State: completed ✓
})
```

### Template-Based Signing (Future)

```typescript
// Define reusable template
const employmentTemplate = {
  templateId: "tmpl_employment_v1",
  fields: [
    { fieldName: "employee_signature", role: "employee", required: true, page: 5, x: 100, y: 200 },
    { fieldName: "employer_signature", role: "employer", required: true, page: 5, x: 100, y: 300 },
    { fieldName: "date", role: "employee", required: true, page: 5, x: 300, y: 200 }
  ],
  signers: [
    { role: "employee", order: 1 },
    { role: "employer", order: 2 }
  ]
}

// Apply template to new document
const doc = yield* stateMachine.createFromTemplate(employmentTemplate, {
  signers: [
    { userId: "user_1", email: "john@example.com", role: "employee" },
    { userId: "user_2", email: "jane@example.com", role: "employer" }
  ]
})
```

## Security Considerations

### 1. Session Security
- Tokens are cryptographically secure (256-bit entropy)
- Sessions expire after 60 minutes (configurable)
- One-time use: invalidated after signing
- HMAC signature prevents token tampering

### 2. Key Management
- Private keys stored in secure storage (IndexedDB for browser, KMS for server)
- Public keys stored with document for verification
- Key rotation not required (keys tied to specific signing event)
- Consider HSM integration for high-security requirements

### 3. Audit Trail Integrity
- Events are append-only (immutable)
- Optionally cryptographically hash events for tamper detection
- Store audit logs in separate database (WORM storage)
- Include chain of custody (previous event hash)

### 4. Data Privacy
- Signature images contain biometric data (drawing speed, pressure)
- Store separately from document if privacy laws require
- Provide user data export/deletion (GDPR compliance)
- Encrypt sensitive fields (SSNs, account numbers)

### 5. Authentication
- Assume authentication handled upstream (not part of e-sign primitives)
- Signing sessions require valid auth token
- Multi-factor authentication recommended for high-value signatures
- Consider knowledge-based authentication (KBA) for additional security

## Compliance

### US ESIGN Act Requirements

✅ **Consent to Electronic Signatures**
- Implemented in `consent-tracking.ts`
- User must affirmatively consent before signing
- Disclosure text shown and recorded

✅ **Intent to Sign**
- User explicitly clicks "Sign" button
- Recorded in audit trail with timestamp

✅ **Association of Signature with Record**
- Signature cryptographically bound to document hash
- Audit trail links signature event to document

✅ **Record Retention**
- Signed documents stored permanently
- Audit trail preserved with document
- Certificate of completion included

✅ **Signature Attribution**
- Signer identity recorded (user ID, email)
- IP address and user agent captured
- Timestamp of signing event

### EU eIDAS Considerations

**Simple Electronic Signature (SES)**: ✅ Fully supported
- Signature capture + audit trail sufficient

**Advanced Electronic Signature (AES)**: ⚠️ Partially supported
- Requires certificate from trusted CA (not included)
- Use `signature-crypto.ts` with CA-issued certificates

**Qualified Electronic Signature (QES)**: ❌ Not supported
- Requires qualified certificate and SSCD (secure signature creation device)
- Users must integrate with qualified trust service provider (QTSP)

## Dependencies

**Required (peer dependencies)**:
- `effect` - Core Effect library
- `@effect/schema` - Schema validation
- `@effect/platform` - File system, HTTP
- `pdf-lib` - PDF manipulation (not vendored, ~150KB minified)

**Optional**:
- `@effect/platform-node` - Node.js runtime (for server-side)
- `@effect/platform-browser` - Browser runtime (for client-side)
- `@prisma/client` - Database ORM (if using effect-prisma component)

**Not Included** (users provide):
- Authentication system
- Email/SMS delivery
- File storage (S3, filesystem)
- Certificate authority (for eIDAS AES/QES)

## Implementation Roadmap

### Phase 1: Core Primitives (8 components)
- [x] `signature-capture.ts` - Signature input modalities
- [x] `signature-crypto.ts` - Web Crypto API wrapper
- [x] `document-state-machine.ts` - Workflow state management
- [x] `audit-trail.ts` - Event sourcing for compliance
- [x] `signature-field-parser.ts` - PDF field extraction
- [x] `signing-session.ts` - Session management
- [x] `consent-tracking.ts` - ESIGN compliance
- [x] `pdf-signer.ts` - Apply signatures to PDF

### Phase 2: Integration Components (3 components)
- [x] `effect-vite/signature-api.ts` - HttpApi routes
- [x] `effect-remix/signature-loader.ts` - Remix integration
- [x] `effect-prisma/signature-schema.prisma` - Database schema

### Phase 3: Advanced Features (optional)
- [ ] `signature-template.ts` - Reusable document templates
- [ ] `multi-party-workflow.ts` - Complex routing (conditional signing)
- [ ] `signature-biometrics.ts` - Capture signing speed/pressure
- [ ] `signature-field-editor.ts` - Visual field placement UI
- [ ] `bulk-send.ts` - Send same document to multiple signers
- [ ] `reminder-service.ts` - Automated email reminders
- [ ] `mobile-capture.ts` - Touch-optimized signature capture
- [ ] `voice-signature.ts` - Voice-based signature capture
- [ ] `witness-signature.ts` - Third-party witness workflows

### Phase 4: Compliance Enhancements
- [ ] eIDAS AES support (CA integration)
- [ ] Long-term validation (LTV) for archived documents
- [ ] Timestamping service integration (RFC 3161)
- [ ] Chain of custody verification
- [ ] GDPR compliance helpers (data export, deletion)

## Performance Characteristics

- **Signature Capture**: <100ms (canvas rendering)
- **Crypto Operations**: 10-50ms (ECDSA sign/verify)
- **PDF Parsing**: 200-500ms (depends on PDF size)
- **PDF Signing**: 300-800ms (embed signature image)
- **Audit Log Write**: 5-20ms (append-only)
- **Session Validation**: <10ms (token lookup)

**Optimization Tips**:
- Use Web Workers for PDF parsing (large documents)
- Cache parsed signature fields (avoid re-parsing)
- Batch audit events for bulk operations
- Pre-generate signing sessions (reduce latency)

## Open Questions

1. **Biometric Signatures**: Should we capture drawing speed, pressure, acceleration by default?
2. **Mobile UX**: Touch signatures often look worse than desktop - provide drawing guides?
3. **Offline Signing**: Support offline signature capture with sync later?
4. **Blockchain Integration**: Store audit trail hashes on blockchain for tamper-proof evidence?
5. **Video Signatures**: Capture video of signing ceremony for high-value transactions?
6. **Identity Verification**: Integrate with ID verification services (Stripe Identity, Onfido)?

## Related Documents

### Meta Effect Specs
- [effect-ci Spec](./effect-ci.md) - CI/CD automation (could trigger signing workflows)
- [effect-dag Spec](./effect-dag.md) - Workflow orchestration (complex signing flows)
- [effect-forms Spec](./effect-forms.md) - Form validation (signer information forms)
- [effect-collect Spec](./effect-collect.md) - Human-in-the-loop (manual review before sending)

### External References
- [US ESIGN Act](https://www.fdic.gov/resources/consumers/consumer-assistance-topics/e-sign-act.html)
- [EU eIDAS Regulation](https://digital-strategy.ec.europa.eu/en/policies/eidas-regulation)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [pdf-lib Documentation](https://pdf-lib.js.org/)
- [DocuSign API Concepts](https://developers.docusign.com/docs/esign-rest-api/esign101/) (for inspiration)

## Contributing

This is a living document. As users customize `effect-esign`, we update this spec with:
- Real-world compliance requirements
- Integration patterns (Stripe, Auth0, etc.)
- Performance optimizations
- Security best practices
- Community feedback

See [registry README](../../meta-effect/packages/registry/README.md) for vendoring instructions (when implemented).

---

**Next Steps**:
1. Implement Phase 1 components (~600 lines total)
2. Add comprehensive tests (vitest + @effect/vitest)
3. Create example Remix app demonstrating full flow
4. Document legal compliance checklist for users
