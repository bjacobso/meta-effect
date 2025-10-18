/**
 * Weekly Release Notes Example
 *
 * Demonstrates how to customize the release plan DSL for your needs.
 * Run with: pnpm tsx plan.ts
 */

import { Effect } from "effect"
import { NodeRuntime, NodeContext } from "@effect/platform-node"
import { ReleasePlan, runPlan } from "../../src/effect-ci/release-plan.js"

// Customize your release plan here
const customPlan: ReleasePlan = {
  name: "meta-effect-weekly",
  window: { kind: "lastDays", days: 7 },
  model: "claude-3-5-sonnet-latest",
  maxChangelog: 70,

  // Optional: filter by PR labels
  labelFilter: ["user-facing", "enhancement", "bug"],

  output: {
    toMarkdownFile: "release_notes.md",
    toJsonFile: "release_notes.json",
    toGithubRelease: (d) => ({
      tag: `weekly-${d.toISOString().slice(0, 10)}`,
      title: `Weekly Release Notes – ${d.toISOString().slice(0, 10)}`
    })
  }
}

// Parse CLI args for dry-run and date overrides
const isDryRun = process.argv.includes("--dry-run")
const sinceIndex = process.argv.indexOf("--since")
const untilIndex = process.argv.indexOf("--until")

const window =
  sinceIndex > 0 && untilIndex > 0
    ? {
        kind: "sinceUntil" as const,
        since: process.argv[sinceIndex + 1],
        until: process.argv[untilIndex + 1]
      }
    : customPlan.window

// Run the plan
const program = runPlan({ ...customPlan, window }, isDryRun)

NodeRuntime.runMain(program.pipe(Effect.provide(NodeContext.layer)))
