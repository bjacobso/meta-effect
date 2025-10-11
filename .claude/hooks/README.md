# Meta Effect Claude Code Hooks

Custom hooks for maintaining Meta Effect's vendorable component registry.

## Available Hooks

### pre-commit.sh

Runs before commits to validate registry quality:

- ✅ Validates `registry.json` is valid JSON
- 📏 Checks component line counts (warns if >100 lines)
- 📝 Ensures components have header documentation
- ⚠️  Warns if README.md not updated with registry changes

**Purpose**: Maintain component quality and consistency.

### post-write.sh

Runs after file writes to provide feedback:

- 📊 Reports line counts for registry components
- ⚠️  Warns if components exceed 100 lines
- 📋 Reminds to update registry.json and docs
- ✅ Validates registry.json when changed

**Purpose**: Keep developer aware of component sizes and metadata updates.

## Hook Configuration

To enable these hooks in Claude Code settings:

```json
{
  "hooks": {
    "pre-commit": ".claude/hooks/pre-commit.sh",
    "post-write": ".claude/hooks/post-write.sh"
  }
}
```

## What the Hooks Enforce

### Component Quality Standards

1. **Size**: 50-100 lines (warns outside this range)
2. **Documentation**: Must have `/** ... */` header with `@example`
3. **Metadata**: registry.json must be valid JSON

### Workflow Reminders

- Update README.md when components change
- Update registry.json for new components
- Update specs when adding/changing components

## Philosophy

These hooks are **assistive, not blocking**. They:
- ✅ Warn but don't fail builds
- ✅ Provide actionable feedback
- ✅ Remind about vendorable component principles
- ❌ Don't enforce rigid rules

The goal is to maintain the "50-100 lines, well-documented" philosophy without being heavy-handed.
