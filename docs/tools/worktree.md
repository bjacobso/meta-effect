# Effect Meta Worktree Management

[← Back to README](../../README.md) | [← CLI Documentation](cli.md)

## Overview

Effect Meta Worktree provides intelligent Git worktree management specifically designed for Effect Meta projects, enabling efficient parallel development across multiple branches and features.

## Concept

Git worktrees allow you to have multiple branches checked out simultaneously in different directories. Effect Meta enhances this with:

- Automatic dependency management per worktree
- Isolated development environments
- Shared Effect service layers
- Synchronized configuration

## Basic Usage

### Create a New Worktree

```sh
effect-meta worktree add feature/new-auth
```

This creates:
```
effect-meta/
├── main/                    # Main branch
│   ├── src/
│   ├── node_modules/
│   └── package.json
└── worktrees/
    └── feature-new-auth/   # New worktree
        ├── src/
        ├── node_modules/   # Separate dependencies
        └── package.json
```

### List Worktrees

```sh
effect-meta worktree list
```

Output:
```
main              (branch: main) - /Users/you/effect-meta
feature-new-auth  (branch: feature/new-auth) - /Users/you/effect-meta/worktrees/feature-new-auth
bugfix-routing    (branch: bugfix/routing) - /Users/you/effect-meta/worktrees/bugfix-routing
```

### Switch Between Worktrees

```sh
effect-meta worktree switch feature-new-auth
```

## Advanced Features

### Shared Services

Share Effect service implementations across worktrees:

```sh
effect-meta worktree share-services UserService DatabaseService
```

This creates symlinks to share service implementations while keeping configurations separate.

### Environment Synchronization

```sh
effect-meta worktree sync-env
```

Synchronizes environment variables and configurations across worktrees while maintaining branch-specific overrides.

### Parallel Development

Run commands across all worktrees:

```sh
effect-meta worktree exec "npm test"
```

Output:
```
[main] ✓ All tests passed (42 tests)
[feature-new-auth] ✓ All tests passed (45 tests)
[bugfix-routing] ✗ 2 tests failed
```

## Integration with Effect Meta

### Worktree-Aware Services

```typescript
// Automatically uses worktree-specific configuration
const config = yield* WorktreeConfig;

const service = Layer.effect(
  MyService,
  Effect.gen(function* () {
    const config = yield* WorktreeConfig;

    return {
      apiUrl: config.get("API_URL"),
      dbUrl: config.get("DATABASE_URL")
    };
  })
);
```

### Development Workflow

1. **Create feature worktree**
   ```sh
   effect-meta worktree add feature/payments
   ```

2. **Install dependencies**
   ```sh
   cd worktrees/feature-payments
   npm install stripe
   ```

3. **Develop with isolation**
   ```sh
   npm run dev
   # Runs on different port than main worktree
   ```

4. **Test in parallel**
   ```sh
   effect-meta worktree exec "npm test"
   ```

5. **Merge when ready**
   ```sh
   effect-meta worktree merge feature-payments
   ```

## Configuration

### Project Configuration

```yaml
# .effect-meta.yaml
worktree:
  baseDir: "./worktrees"
  sharedDirs:
    - ".effect-meta"
    - "docs"
  sharedServices:
    - "DatabaseService"
    - "CacheService"
  portMapping:
    main: 3000
    feature: 3100
    bugfix: 3200
```

### Worktree-Specific Config

```yaml
# worktrees/feature-auth/.effect-meta.worktree.yaml
worktree:
  name: "feature-auth"
  port: 3101
  env:
    API_URL: "http://localhost:3101/api"
    AUTH_PROVIDER: "auth0"
  dependencies:
    additional:
      - "@auth0/nextjs-auth0"
```

## Use Cases

### 1. Feature Development

Develop multiple features in parallel without switching branches:

```sh
# Terminal 1: Main app
cd ~/effect-meta/main
npm run dev

# Terminal 2: Auth feature
cd ~/effect-meta/worktrees/feature-auth
npm run dev

# Terminal 3: Payment feature
cd ~/effect-meta/worktrees/feature-payments
npm run dev
```

### 2. Bug Fixing

Keep a dedicated worktree for hotfixes:

```sh
effect-meta worktree add --persistent hotfix
cd worktrees/hotfix
git checkout production
# Always ready for production fixes
```

### 3. Experimentation

Create temporary worktrees for experiments:

```sh
effect-meta worktree add --temp experiment/new-architecture
# Automatically cleaned up after 7 days of inactivity
```

### 4. Code Review

Check out PRs in separate worktrees:

```sh
effect-meta worktree add-pr 123
# Creates worktree from PR #123
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `worktree add <name>` | Create new worktree |
| `worktree remove <name>` | Remove worktree |
| `worktree list` | List all worktrees |
| `worktree switch <name>` | Switch to worktree |
| `worktree exec <cmd>` | Run command in all worktrees |
| `worktree sync-env` | Sync environment configs |
| `worktree share-services` | Share service implementations |
| `worktree status` | Show worktree statuses |
| `worktree clean` | Remove inactive worktrees |
| `worktree merge <name>` | Merge worktree branch |

## Best Practices

1. **Use descriptive names**: `feature-auth` instead of `auth`
2. **Clean up regularly**: Remove merged worktrees
3. **Share wisely**: Only share stable services
4. **Document differences**: Keep worktree-specific READMEs
5. **Use port mapping**: Avoid port conflicts

## Troubleshooting

### Port Conflicts

```sh
effect-meta worktree fix-ports
# Automatically reassigns ports to avoid conflicts
```

### Dependency Issues

```sh
effect-meta worktree reinstall feature-auth
# Clean reinstall of dependencies
```

### Sync Problems

```sh
effect-meta worktree repair
# Repairs worktree references and symlinks
```

## Future Enhancements

- Visual worktree manager UI
- Automatic PR worktree creation
- Docker container per worktree
- Cloud worktree synchronization
- Worktree templates

## Related Documents

- [CLI Documentation](cli.md) - Main CLI features
- [Git Integration](../integrations/git.md) - Git operations as Effects