/**
 * Pipeline Transforms
 *
 * Pure transformation utilities for CI/CD data processing.
 * Includes parsers, deduplication, bucketing, and prompt templates.
 *
 * @example
 * ```ts
 * import { parseCommits, dedupe, buildPrompt, extractBlocks } from './lib/effect-ci/transforms'
 * import { Effect, Schema } from 'effect'
 *
 * const commits = parseCommits(rawTsv)
 * const unique = dedupe(commits, prs)
 * const prompt = buildPrompt({ repo: "owner/name", since, until, prs, commits })
 * const { md, json } = extractBlocks(claudeResponse)
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Schema as S } from "effect"
import type { Commit, PR, ChangelogItem } from "./types"

/**
 * Parse TSV output from `git log` into Commit objects
 * Format: fullSha|shortSha|dateIso|authorName|authorEmail|subject
 */
export const parseCommits = (tsv: string): ReadonlyArray<Commit> =>
  tsv
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const [fullSha, shortSha, dateIso, authorName, authorEmail, ...rest] = line.split("|")
      const subject = rest.join("|") // handle pipes in commit message
      return { fullSha, shortSha, dateIso, authorName, authorEmail, subject } as Commit
    })

/**
 * Parse JSON output from `gh pr list`
 */
export const parsePRs = (json: string): ReadonlyArray<PR> =>
  JSON.parse(json) as ReadonlyArray<PR>

/**
 * Deduplicate commits that are already represented by merged PRs
 * Filters out commits whose SHA matches a PR's mergeCommit.oid
 */
export const dedupe = (
  commits: ReadonlyArray<Commit>,
  prs: ReadonlyArray<PR>
): ReadonlyArray<Commit> => {
  const covered = new Set(prs.map(pr => pr.mergeCommit.oid).filter(Boolean))
  return commits.filter(c => !covered.has(c.fullSha))
}

/**
 * Filter PRs by label (include only those with at least one matching label)
 */
export const filterByLabels = (
  prs: ReadonlyArray<PR>,
  labels: ReadonlyArray<string>
): ReadonlyArray<PR> => {
  if (labels.length === 0) return prs
  return prs.filter(pr =>
    pr.labels.some(l => labels.includes(l.name))
  )
}

/**
 * Limit array to first N items
 */
export const limit = <A>(n: number) => (arr: ReadonlyArray<A>): ReadonlyArray<A> =>
  arr.slice(0, n)

/**
 * Build release notes prompt with strict output format markers
 */
export const buildPrompt = (ctx: {
  repo: string
  since: string
  until: string
  prs: ReadonlyArray<PR>
  commits: ReadonlyArray<Commit>
}) => `You are a release manager helping a cross-functional company (engineering, product, GTM, support, finance).
Given the repo activity for the last time window, produce:

1) A succinct, business-friendly Markdown release note, optimized for:
   - **Highlights** (plain English, outcomes/impact)
   - **Customer Impact** (what users notice; include "Who needs to know")
   - **New Features**, **Improvements**, **Fixes**, **Breaking Changes**, **Deprecations**
   - **Rollout / Risks** (flags, migrations, rollback steps in 1-2 bullets)
   - **Metrics & KPIs** (if inferable; otherwise "N/A")
   - **Credits / Owners** (teams or people)
   - **Changelog**: a compact bullet list of PRs/commits (linkable titles when URLs provided)
   Keep it under ~350 words before the Changelog.

2) A machine-readable JSON blob with these exact fields:
{
  "window": {"since":"<ISO>", "until":"<ISO>"},
  "highlights": [ "<sentence>" ],
  "customer_impact": [ "<sentence>" ],
  "features": [ {"title":"", "summary":"", "owner":""} ],
  "improvements": [ {"title":"", "summary":"", "owner":""} ],
  "fixes": [ {"title":"", "summary":"", "owner":""} ],
  "breaking_changes": [ {"title":"", "summary":"", "owner":"", "migration_notes":""} ],
  "deprecations": [ {"title":"", "summary":"", "owner":"", "sunset_date":""} ],
  "rollout_risks": [ {"risk":"", "mitigation":"", "flag_or_toggle":""} ],
  "metrics_kpis": [ {"name":"", "value":"", "note":""} ],
  "owners": [ {"name":"", "team":""} ],
  "changelog": [ {"id":"", "type":"PR|commit", "title":"", "url":"", "author":"", "mergedAt_or_date":""} ]
}

STRICT OUTPUT FORMAT:
- First emit ONLY the Markdown notes wrapped between:
<<<MARKDOWN>>>
...markdown...
<<<END>>>
- Then emit ONLY the JSON between:
<<<JSON>>>
{ ... }
<<<END>>>

Context:
- repo: ${ctx.repo}
- window: ${ctx.since} .. ${ctx.until}

=== BEGIN prs.json ===
${JSON.stringify(ctx.prs, null, 2)}
=== END prs.json ===

=== BEGIN commits.tsv ===
${ctx.commits.slice(0, 300).map(c =>
  [c.fullSha, c.shortSha, c.dateIso, c.authorName, c.authorEmail, c.subject].join("|")
).join("\n")}
=== END commits.tsv (showing up to 300 of ${ctx.commits.length} commits) ===

Rules:
- Prefer PR titles for "Changelog"; fall back to commits if no PR.
- Deduplicate commits already represented by a merged PR.
- Use plain language; avoid internal jargon.
- If info is missing, use reasonable defaults; never hallucinate numbers.
- Keep JSON values compact; omit nulls; use empty arrays if none.
- Do not exceed 70 items in "changelog".
`

/**
 * Extract Markdown and JSON blocks from Claude response
 * Expects <<<MARKDOWN>>>...<<<END>>> and <<<JSON>>>...<<<END>>> markers
 */
export const extractBlocks = (txt: string): { md: string; json: string } => {
  const mdMatch = txt.match(/<<<MARKDOWN>>>([\s\S]*?)<<<END>>>/)?.[1]?.trim()
  const jsonMatch = txt.match(/<<<JSON>>>([\s\S]*?)<<<END>>>/)?.[1]?.trim()
  return {
    md: mdMatch ?? "",
    json: jsonMatch ?? "{}"
  }
}
