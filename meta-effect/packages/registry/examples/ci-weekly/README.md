# Weekly Release Notes Example

This example shows how to run the `effect-ci` release plan to generate weekly release notes.

## Prerequisites

```bash
# Required environment variables
export ANTHROPIC_API_KEY=sk-...
export GITHUB_TOKEN=ghp_...

# Install dependencies (from packages/registry)
pnpm install
```

## Running Locally

```bash
# Preview without side effects
pnpm tsx plan.ts --dry-run

# Run with default 7-day window
pnpm tsx plan.ts

# Custom date range
pnpm tsx plan.ts --since 2025-10-10T00:00:00Z --until 2025-10-17T00:00:00Z
```

## Output

- `release_notes.md` - Human-readable Markdown notes
- `release_notes.json` - Machine-readable JSON for downstream systems
- GitHub Release - Tagged as `weekly-YYYY-MM-DD`

## Customization

Edit `plan.ts` to customize:
- Time window (daily, weekly, monthly)
- LLM model
- Label filters
- Output destinations
- Release tag format

## GitHub Actions

Generate a workflow:

```bash
pnpm tsx ../../src/effect-ci/release-plan.ts emit-workflow > .github/workflows/weekly.yml
```

Then commit and push to enable scheduled releases.
