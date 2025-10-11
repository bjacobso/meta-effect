# Effect Meta Git Integration

[← Back to README](../../README.md) | [← AI Integration](ai.md)

## Overview

Effect Meta Git provides a primitive for implementing Git operations as Effects that can be composed with other Effects to create complex Git workflows. Git operations compile to file system operations or can be redirected to alternative backends like SQLite or DynamoDB.

## Core Concept

Just as we have `HttpApi` and `CrudService` as meta primitives, GitService provides Git operations as composable Effects, enabling version control to be part of your application logic.

## GitService API

### Basic Operations

```typescript
interface GitService {
  clone(repoUrl: string, options?: CloneOptions): Effect<void, GitError, GitDeps>;

  commit(message: string, options?: CommitOptions): Effect<CommitHash, GitError, GitDeps>;

  push(remote?: string, branch?: string, options?: PushOptions): Effect<void, GitError, GitDeps>;

  pull(remote?: string, branch?: string, options?: PullOptions): Effect<void, GitError, GitDeps>;

  createBranch(branchName: string, options?: CreateBranchOptions): Effect<void, GitError, GitDeps>;

  merge(branch: string, options?: MergeOptions): Effect<MergeResult, GitError, GitDeps>;

  diff(options?: DiffOptions): Effect<Diff[], GitError, GitDeps>;

  log(options?: LogOptions): Effect<Commit[], GitError, GitDeps>;

  status(): Effect<GitStatus, GitError, GitDeps>;
}
```

### Advanced Operations

```typescript
// Stashing
GitService.stash(options?: StashOptions): Effect<StashId, GitError, GitDeps>;
GitService.stashPop(stashId?: StashId): Effect<void, GitError, GitDeps>;

// Tagging
GitService.tag(name: string, options?: TagOptions): Effect<void, GitError, GitDeps>;
GitService.listTags(): Effect<Tag[], GitError, GitDeps>;

// Worktrees
GitService.addWorktree(path: string, branch: string): Effect<void, GitError, GitDeps>;
GitService.removeWorktree(path: string): Effect<void, GitError, GitDeps>;

// History
GitService.revert(commitHash: string): Effect<void, GitError, GitDeps>;
GitService.reset(options: ResetOptions): Effect<void, GitError, GitDeps>;
GitService.cherryPick(commitHash: string): Effect<void, GitError, GitDeps>;
```

## Usage Examples

### Basic Workflow

```typescript
const deploymentWorkflow = Effect.gen(function* () {
  // Ensure we're on main branch
  const status = yield* GitService.status();
  if (status.branch !== "main") {
    yield* GitService.checkout("main");
  }

  // Pull latest changes
  yield* GitService.pull();

  // Create release branch
  const version = yield* Version.next();
  yield* GitService.createBranch(`release/${version}`);

  // Update version file
  yield* FileSystem.write("package.json", {
    version: version
  });

  // Commit and tag
  yield* GitService.commit(`Release v${version}`);
  yield* GitService.tag(`v${version}`, {
    message: `Version ${version}`,
    annotated: true
  });

  // Push to remote
  yield* GitService.push("origin", `release/${version}`, {
    tags: true
  });

  return { version, branch: `release/${version}` };
});
```

### Complex Workflows

```typescript
const featureDevelopment = Effect.gen(function* () {
  const featureName = yield* FeatureName;

  // Create feature branch
  yield* GitService.createBranch(`feature/${featureName}`);

  // Make changes
  yield* FeatureService.implement();

  // Commit with conventional commit
  yield* GitService.commit(`feat(${featureName}): implement new feature`);

  // Run tests
  const testResult = yield* TestRunner.run();
  if (!testResult.success) {
    // Stash changes and fix
    yield* GitService.stash();
    yield* GitService.checkout("main");
    return yield* Effect.fail(new TestsFailedError());
  }

  // Create PR
  yield* GitService.push("origin", `feature/${featureName}`);
  const pr = yield* GitHub.createPR({
    title: `Feature: ${featureName}`,
    base: "main",
    head: `feature/${featureName}`
  });

  return pr;
});
```

## Backend Adapters

### File System Backend (Default)

```typescript
const GitServiceFS = Layer.effect(
  GitService,
  Effect.gen(function* () {
    const fs = yield* FileSystem;

    return {
      commit: (message, options) =>
        Effect.gen(function* () {
          yield* Shell.exec(`git commit -m "${message}"`);
          return yield* Shell.exec("git rev-parse HEAD");
        })
      // ... other operations
    };
  })
);
```

### SQLite Backend

```typescript
const GitServiceSQLite = Layer.effect(
  GitService,
  Effect.gen(function* () {
    const db = yield* SQLiteDatabase;

    return {
      commit: (message, options) =>
        Effect.gen(function* () {
          const changes = yield* collectChanges();
          const hash = yield* calculateHash(changes);

          yield* db.execute(`
            INSERT INTO commits (hash, message, author, timestamp, changes)
            VALUES (?, ?, ?, ?, ?)
          `, [hash, message, options.author, Date.now(), changes]);

          return hash;
        })
      // ... other operations
    };
  })
);
```

### DynamoDB Backend

```typescript
const GitServiceDynamoDB = Layer.effect(
  GitService,
  Effect.gen(function* () {
    const dynamo = yield* DynamoDBClient;

    return {
      commit: (message, options) =>
        Effect.gen(function* () {
          const changes = yield* collectChanges();
          const hash = yield* calculateHash(changes);

          yield* dynamo.putItem({
            TableName: "commits",
            Item: {
              hash: { S: hash },
              message: { S: message },
              author: { S: options.author },
              timestamp: { N: Date.now().toString() },
              changes: { S: JSON.stringify(changes) }
            }
          });

          return hash;
        })
      // ... other operations
    };
  })
);
```

## LLM Integration

### Natural Language Git Commands

Enable LLMs to execute Git operations through natural language:

```markdown
meta-git `
- show me the commit history for the last 5 commits on the main branch
- show me the diff between the current branch and main
- show me the details for the commit abc123
- create a new branch called feature-x based on main and switch to it
`
```

This translates to:

```typescript
const executeLLMGitCommand = Effect.gen(function* () {
  const command = yield* LLMCommand.parse();

  switch (command.type) {
    case "show-history":
      return yield* GitService.log({
        branch: command.branch,
        limit: command.limit
      });

    case "show-diff":
      return yield* GitService.diff({
        from: command.from,
        to: command.to
      });

    case "show-commit":
      return yield* GitService.show(command.hash);

    case "create-branch":
      yield* GitService.createBranch(command.name, {
        from: command.base
      });
      return yield* GitService.checkout(command.name);
  }
});
```

### Chat Interface for Git

```typescript
const GitChatInterface = Effect.gen(function* () {
  const context = yield* GitContext;

  return {
    ask: (question: string) =>
      Effect.gen(function* () {
        const intent = yield* NLP.parseGitIntent(question);

        switch (intent.type) {
          case "status":
            return yield* GitService.status().pipe(
              Effect.map(formatStatus)
            );

          case "history":
            return yield* GitService.log(intent.options).pipe(
              Effect.map(formatHistory)
            );

          case "changes":
            return yield* GitService.diff().pipe(
              Effect.map(formatDiff)
            );

          default:
            return "I don't understand that Git question";
        }
      })
  };
});
```

## Testing

### Mock Git Operations

```typescript
const MockGitService = Layer.succeed(GitService, {
  commit: (message) =>
    Effect.succeed("mock-commit-hash-123"),

  push: () =>
    Effect.succeed(undefined),

  status: () =>
    Effect.succeed({
      branch: "main",
      clean: true,
      files: []
    })
});

// Test with mocked Git
const result = await myGitWorkflow.pipe(
  Effect.provide(MockGitService),
  Effect.runPromise
);
```

## Advanced Features

### Git Hooks as Effects

```typescript
const preCommitHook = Effect.gen(function* () {
  // Run linter
  yield* Linter.check();

  // Run tests
  yield* TestRunner.runUnit();

  // Check for secrets
  yield* SecretScanner.scan();

  // Format code
  yield* Formatter.format();
});

const postCommitHook = Effect.gen(function* () {
  // Update issue tracker
  const message = yield* GitService.lastCommitMessage();
  const issueId = extractIssueId(message);
  if (issueId) {
    yield* IssueTracker.updateStatus(issueId, "in-progress");
  }
});
```

### Automated Workflows

```typescript
const automatedRelease = Effect.gen(function* () {
  // Check if release is needed
  const commits = yield* GitService.log({
    since: "last-tag"
  });

  const version = yield* SemanticVersion.calculate(commits);
  if (!version.hasChanges) {
    return yield* Effect.succeed("No release needed");
  }

  // Create release
  yield* GitService.createBranch(`release/${version.next}`);
  yield* updateChangelog(commits);
  yield* updateVersion(version.next);
  yield* GitService.commit(`chore: release ${version.next}`);
  yield* GitService.tag(`v${version.next}`);

  // Deploy
  yield* GitService.push("origin", `release/${version.next}`, {
    tags: true
  });

  return { released: version.next };
});
```

## Configuration

```typescript
const GitConfig = Config.all({
  defaultBranch: Config.string("GIT_DEFAULT_BRANCH").pipe(
    Config.withDefault("main")
  ),
  remote: Config.string("GIT_REMOTE").pipe(
    Config.withDefault("origin")
  ),
  author: Config.all({
    name: Config.string("GIT_AUTHOR_NAME"),
    email: Config.string("GIT_AUTHOR_EMAIL")
  }),
  signCommits: Config.boolean("GIT_SIGN_COMMITS").pipe(
    Config.withDefault(false)
  )
});
```

## Best Practices

1. **Always check status** before operations
2. **Use atomic operations** with Effect transactions
3. **Handle merge conflicts** gracefully
4. **Validate branch names** before creation
5. **Use conventional commits** for automation
6. **Test with mock backends** for speed
7. **Log all operations** for audit trails

## Future Enhancements

- Visual Git history explorer
- Conflict resolution UI
- Automated merge strategies
- Git bisect integration
- Submodule management
- Large file storage (LFS) support
- Distributed backend (IPFS)

## Related Documents

- [AI Integration](ai.md) - AI primitives for Effect Meta
- [Worktree Management](../tools/worktree.md) - Advanced worktree features
- [CLI Documentation](../tools/cli.md) - Command-line tools