# GitHub Actions Workflows

## Weekly Release Notes (`weekly-release.yml`)

Automatically generates weekly release notes using the `effect-ci` release plan.

### Prerequisites

Before enabling this workflow, you need to configure the following repository secret:

#### Required Secret: `ANTHROPIC_API_KEY`

The workflow uses Claude AI to generate release notes from git history and pull requests.

**To add the secret:**

1. Go to your repository settings
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `ANTHROPIC_API_KEY`
5. Value: Your Anthropic API key (starts with `sk-ant-...`)
6. Click **Add secret**

**To get an Anthropic API key:**

1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Go to **API Keys** section
4. Create a new API key
5. Copy and save it securely (you won't be able to see it again)

### Permissions

The workflow requires:

- `contents: write` - To create GitHub releases
- `pull-requests: read` - To read merged PRs for release notes

These are configured in the workflow file and should work with the default `GITHUB_TOKEN`.

### How to Run

#### Manual Trigger (Recommended for Testing)

1. Go to **Actions** tab in your repository
2. Select **Weekly Release Notes** workflow
3. Click **Run workflow** button
4. Select branch (usually `main`)
5. Click **Run workflow**

#### Automatic Schedule (After Testing)

The workflow is currently configured for manual triggering only. To enable automatic weekly releases:

1. Edit `.github/workflows/weekly-release.yml`
2. Uncomment the `schedule` section:
   ```yaml
   schedule:
     - cron: "0 17 * * FRI" # Fridays at 10 AM PT (17:00 UTC)
   ```
3. Commit and push the change

This will run the workflow every Friday at 10 AM Pacific Time.

### Output

The workflow produces:

1. **Markdown Release Notes** (`release_notes.md`)
   - Human-readable release notes
   - Uploaded as build artifact
   - Used for GitHub Release body

2. **JSON Release Data** (`release_notes.json`)
   - Machine-readable structured data
   - Contains all metadata: highlights, features, fixes, etc.
   - Uploaded as build artifact
   - Attached to GitHub Release for downstream systems

3. **GitHub Release**
   - Tagged as `weekly-YYYY-MM-DD`
   - Title: `Weekly Release Notes – YYYY-MM-DD`
   - Contains Markdown notes and JSON attachment

### Customization

To customize the release plan (time window, filters, output format):

1. Edit `meta-effect/packages/registry/src/effect-ci/release-plan.ts`
2. Modify the `weeklyPlan` configuration:
   - `window`: Change from 7 days to custom range
   - `labelFilter`: Filter PRs by GitHub labels
   - `maxChangelog`: Limit number of changelog items
   - `model`: Change Claude model (default: `claude-3-5-sonnet-latest`)

### Troubleshooting

#### "ANTHROPIC_API_KEY not found"

- Ensure you've added the secret to repository settings
- Check the secret name matches exactly: `ANTHROPIC_API_KEY`
- Verify the key is valid and not expired

#### "Permission denied" errors

- Check that the workflow has required permissions
- Ensure your repository allows Actions to create releases
- Go to **Settings** → **Actions** → **General** → **Workflow permissions**
- Select "Read and write permissions"

#### "No commits found" or empty release

- Verify there have been commits/PRs in the last 7 days
- Check that the default branch is correct (should be `main`)
- Review the workflow logs for details

#### Module or dependency errors

- The workflow installs dependencies fresh each time
- If there are dependency issues, check `meta-effect/package.json` and `meta-effect/packages/registry/package.json`
- Ensure all peer dependencies are properly configured

### Local Testing

To test the release plan locally before running in CI:

```bash
# From meta-effect/packages/registry directory
export ANTHROPIC_API_KEY=sk-ant-...
export GITHUB_TOKEN=ghp_...
export GITHUB_REPOSITORY=your-org/your-repo

# Dry run (no side effects)
pnpm tsx src/effect-ci/release-plan.ts run --dry-run

# Custom date range
pnpm tsx src/effect-ci/release-plan.ts run \
  --since 2025-10-10T00:00:00Z \
  --until 2025-10-17T00:00:00Z
```

### Cost Considerations

- **Anthropic API**: ~$0.01-0.05 per run (Claude Sonnet)
- **GitHub Actions**: Free for public repos, included in private repo minutes
- **Frequency**: Weekly = ~$0.20-2.50/month for API costs

For high-frequency use, consider:
- Switching to a cheaper model
- Caching results
- Limiting changelog items with `maxChangelog`
