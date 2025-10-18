/**
 * CI Pipeline Types
 *
 * Effect Schema types for strongly-typed CI/CD pipelines.
 * Provides validation for git commits, GitHub PRs, and LLM-generated release notes.
 *
 * @example
 * ```ts
 * import { Commit, PR, ReleaseJSON } from './lib/effect-ci/types'
 * import { Schema } from 'effect'
 *
 * const commits = Schema.decodeUnknownSync(Schema.Array(Commit))(rawData)
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Schema as S } from "effect"

/**
 * ISO 8601 datetime string (e.g., "2025-10-17T12:00:00Z")
 */
export const ISODateTime = S.String.pipe(
  S.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
  S.brand("ISODateTime")
)
export type ISODateTime = typeof ISODateTime.Type

/**
 * Git commit from `git log` output
 */
export class Commit extends S.Class<Commit>("Commit")({
  fullSha: S.String,
  shortSha: S.String,
  dateIso: ISODateTime,
  authorName: S.String,
  authorEmail: S.String,
  subject: S.String
}) {}

/**
 * GitHub Pull Request from `gh pr list --json`
 */
export class PR extends S.Class<PR>("PR")({
  number: S.Number,
  title: S.String,
  mergedAt: ISODateTime,
  author: S.Struct({ login: S.String }),
  labels: S.Array(S.Struct({ name: S.String })),
  mergeCommit: S.Struct({ oid: S.String }),
  url: S.String
}) {}

/**
 * Changelog item (unified from PR or commit)
 */
export class ChangelogItem extends S.Class<ChangelogItem>("ChangelogItem")({
  id: S.String,
  type: S.Literal("PR", "commit"),
  title: S.String,
  url: S.String,
  author: S.String,
  mergedAt_or_date: S.String
}) {}

/**
 * Machine-readable release notes JSON
 */
export class ReleaseJSON extends S.Class<ReleaseJSON>("ReleaseJSON")({
  window: S.Struct({ since: S.String, until: S.String }),
  highlights: S.Array(S.String),
  customer_impact: S.Array(S.String),
  features: S.Array(S.Struct({ title: S.String, summary: S.String, owner: S.String })),
  improvements: S.Array(S.Struct({ title: S.String, summary: S.String, owner: S.String })),
  fixes: S.Array(S.Struct({ title: S.String, summary: S.String, owner: S.String })),
  breaking_changes: S.Array(S.Struct({
    title: S.String,
    summary: S.String,
    owner: S.String,
    migration_notes: S.String
  })),
  deprecations: S.Array(S.Struct({
    title: S.String,
    summary: S.String,
    owner: S.String,
    sunset_date: S.String
  })),
  rollout_risks: S.Array(S.Struct({
    risk: S.String,
    mitigation: S.String,
    flag_or_toggle: S.String
  })),
  metrics_kpis: S.Array(S.Struct({ name: S.String, value: S.String, note: S.String })),
  owners: S.Array(S.Struct({ name: S.String, team: S.String })),
  changelog: S.Array(ChangelogItem)
}) {}
