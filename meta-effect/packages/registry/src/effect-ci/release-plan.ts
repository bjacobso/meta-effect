/**
 * Release Plan DSL
 *
 * Effect CLI program for generating weekly release notes from git/GitHub activity.
 * Composes git, gh, and Claude CLI commands into typed pipelines.
 *
 * @example
 * ```bash
 * # Run locally with default 7-day window
 * pnpm tsx release-plan.ts run
 *
 * # Custom date range
 * pnpm tsx release-plan.ts run --since 2025-10-10T00:00:00Z --until 2025-10-17T00:00:00Z
 *
 * # Dry run (no side effects)
 * pnpm tsx release-plan.ts run --dry-run
 *
 * # Generate GitHub Actions workflow
 * pnpm tsx release-plan.ts emit-workflow > .github/workflows/weekly-release.yml
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Effect, Schema as S, Option } from "effect"
import { Command, Options } from "@effect/cli"
import { NodeRuntime, NodeContext } from "@effect/platform-node"
import * as FileSystem from "@effect/platform/FileSystem"

import { Git, GH, Claude } from "./shell-runner.js"
import * as T from "./transforms.js"
import { ReleaseJSON } from "./types.js"

/**
 * Time window for release notes
 */
export type Window =
  | { kind: "lastDays"; days: number }
  | { kind: "sinceUntil"; since: string; until: string };

const computeWindow = (w: Window): { since: string; until: string } => {
  if (w.kind === "sinceUntil") return { since: w.since, until: w.until };
  const until = new Date();
  const since = new Date(until.getTime() - w.days * 24 * 3600 * 1000);
  return { since: since.toISOString(), until: until.toISOString() };
};

/**
 * Release plan configuration
 */
export interface ReleasePlan {
  name: string;
  window: Window;
  model: string;
  maxChangelog?: number;
  labelFilter?: ReadonlyArray<string>;
  output: {
    toMarkdownFile?: string;
    toJsonFile?: string;
    toGithubRelease?: (date: Date) => { tag: string; title: string };
  };
}

/**
 * Execute a release plan
 */
export const runPlan = (plan: ReleasePlan, dryRun = false) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const repo = process.env.GITHUB_REPOSITORY ?? "local/repo"
    const { since, until } = computeWindow(plan.window)

    // 1. Fetch default branch
    const defaultBranch = yield* GH.defaultBranch()
    yield* Git.fetch("origin", defaultBranch)

    // 2. Gather PRs and commits
    const prsRaw = yield* GH.mergedPRsSince(defaultBranch, since)
    const commitsRaw = yield* Git.logSince(defaultBranch, since, until)

    // 3. Parse and filter
    let prs = T.parsePRs(prsRaw);
    if (plan.labelFilter && plan.labelFilter.length > 0) {
      prs = T.filterByLabels(prs, plan.labelFilter);
    }
    const commits = T.dedupe(T.parseCommits(commitsRaw), prs);

    // 4. Build prompt and ask Claude
    const prompt = T.buildPrompt({ repo, since, until, prs, commits });
    const claudeOut = yield* Claude.ask(plan.model, prompt);
    const { md, json } = T.extractBlocks(claudeOut);

    // 5. Validate JSON with Effect Schema
    const parsed = yield* S.decode(ReleaseJSON)(JSON.parse(json));

    // 6. Apply optional changelog limit
    const limited = plan.maxChangelog
      ? { ...parsed, changelog: parsed.changelog.slice(0, plan.maxChangelog) }
      : parsed;

    if (dryRun) {
      yield* Effect.log("=== DRY RUN ===");
      yield* Effect.log(
        `Markdown preview (first 800 chars):\n${md.slice(0, 800)}...`
      );
      yield* Effect.log(`JSON keys: ${Object.keys(limited).join(", ")}`);
      return { md, json: limited };
    }

    // 7. Write outputs
    if (plan.output.toMarkdownFile) {
      yield* fs.writeFileString(plan.output.toMarkdownFile, md)
      yield* Effect.log(`Wrote Markdown to ${plan.output.toMarkdownFile}`)
    }

    if (plan.output.toJsonFile) {
      yield* fs.writeFileString(
        plan.output.toJsonFile,
        JSON.stringify(limited, null, 2)
      )
      yield* Effect.log(`Wrote JSON to ${plan.output.toJsonFile}`)
    }

    if (plan.output.toGithubRelease) {
      const { tag, title } = plan.output.toGithubRelease(new Date())
      const exists = yield* GH.releaseExists(tag)

      if (exists) {
        yield* GH.editRelease(tag, title, plan.output.toMarkdownFile!)
        yield* Effect.log(`Updated release ${tag}`)
      } else {
        yield* GH.createRelease(tag, title, plan.output.toMarkdownFile!)
        yield* Effect.log(`Created release ${tag}`)
      }

      if (plan.output.toJsonFile) {
        yield* GH.uploadReleaseAsset(tag, plan.output.toJsonFile)
        yield* Effect.log(`Uploaded ${plan.output.toJsonFile} to ${tag}`)
      }
    }

    return { md, json: limited }
  })

/**
 * Example weekly release plan
 */
export const weeklyPlan: ReleasePlan = {
  name: "weekly-release",
  window: { kind: "lastDays", days: 7 },
  model: "claude-3-5-sonnet-latest",
  maxChangelog: 70,
  output: {
    toMarkdownFile: "release_notes.md",
    toJsonFile: "release_notes.json",
    toGithubRelease: (d) => ({
      tag: `weekly-${d.toISOString().slice(0, 10)}`,
      title: `Weekly Release Notes – ${d.toISOString().slice(0, 10)}`,
    }),
  },
};

// --- CLI Definition ---

const sinceOption = Options.text("since").pipe(Options.optional);
const untilOption = Options.text("until").pipe(Options.optional);
const dryRunOption = Options.boolean("dry-run").pipe(
  Options.withDefault(false)
);

const runCommand = Command.make("run", {
  options: Options.all({
    since: sinceOption,
    until: untilOption,
    dryRun: dryRunOption
  })
}).pipe(
  Command.withHandler(({ options }) =>
    Effect.gen(function* () {
      const plan = weeklyPlan
      const window = Option.isSome(options.since) && Option.isSome(options.until)
        ? { kind: "sinceUntil" as const, since: options.since.value, until: options.until.value }
        : plan.window

      yield* runPlan({ ...plan, window }, options.dryRun)
    })
  )
)

const emitWorkflowCommand = Command.make("emit-workflow").pipe(
  Command.withHandler(() =>
    Effect.sync(() => {
      const yaml = `name: Weekly Release Notes

on:
  schedule:
    - cron: "0 17 * * FRI" # Fridays at 10 AM PT (17:00 UTC)
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: read

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run release plan
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: npx tsx lib/effect-ci/release-plan.ts run
`
      console.log(yaml)
    })
  )
)

const cli = Command.make("release-plan").pipe(
  Command.withSubcommands([runCommand, emitWorkflowCommand])
);

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const run = Command.run(cli, { name: "Release Plan", version: "0.0.0" })
  NodeRuntime.runMain(run(process.argv.slice(2)).pipe(Effect.provide(NodeContext.layer)))
}
