/**
 * Shell Command Runners
 *
 * Effect-based wrappers around git, gh, and claude CLI commands.
 * Uses @effect/platform/Command for pure, typed shell execution.
 *
 * @example
 * ```ts
 * import { Git, GH, Claude } from './lib/effect-ci/shell-runner'
 * import { Effect } from 'effect'
 *
 * const program = Effect.gen(function*() {
 *   const branch = yield* GH.defaultBranch()
 *   const commits = yield* Git.logSince(branch, "2025-10-10T00:00:00Z")
 *   const notes = yield* Claude.ask("claude-3-5-sonnet-latest", "Summarize...")
 * })
 * ```
 *
 * Copy this file into your project and customize for your needs.
 */

import { Effect } from "effect"
import * as Command from "@effect/platform/Command"

/**
 * Execute a shell command and return stdout as a string
 * Requires CommandExecutor in environment (provided by NodeContext.layer)
 */
const exec = (cmd: string, args: ReadonlyArray<string>) =>
  Command.make(cmd, ...args).pipe(
    Command.runInShell(true),
    Command.string,
    Effect.map(output => output.trim())
  )

/**
 * Execute with stdin input
 * Requires CommandExecutor in environment (provided by NodeContext.layer)
 */
const execWithStdin = (cmd: string, args: ReadonlyArray<string>, stdin: string) =>
  Command.make(cmd, ...args).pipe(
    Command.feed(stdin),
    Command.runInShell(true),
    Command.string,
    Effect.map(output => output.trim())
  )

/**
 * Git command wrappers
 */
export const Git = {
  /**
   * Get commits between two dates on a branch
   * Returns TSV format: fullSha|shortSha|dateIso|authorName|authorEmail|subject
   */
  logSince: (branch: string, sinceIso: string, untilIso?: string) =>
    exec("git", [
      "log",
      `origin/${branch}`,
      `--since=${sinceIso}`,
      ...(untilIso ? [`--until=${untilIso}`] : []),
      "--pretty=format:%H|%h|%ad|%an|%ae|%s",
      "--date=iso-strict"
    ]),

  /**
   * Fetch from remote
   */
  fetch: (remote: string, branch: string) =>
    exec("git", ["fetch", remote, branch, "--prune"])
}

/**
 * GitHub CLI wrappers
 */
export const GH = {
  /**
   * Get the default branch name for the current repo
   */
  defaultBranch: () =>
    exec("gh", [
      "repo",
      "view",
      "--json",
      "defaultBranchRef",
      "-q",
      ".defaultBranchRef.name"
    ]),

  /**
   * List merged PRs since a given date
   * Returns JSON array of PR objects
   */
  mergedPRsSince: (base: string, sinceIso: string, limit = 200) =>
    exec("gh", [
      "pr",
      "list",
      "--state",
      "merged",
      "--search",
      `merged:>=${sinceIso} sort:updated-desc`,
      "--base",
      base,
      "--limit",
      String(limit),
      "--json",
      "number,title,mergedAt,author,labels,mergeCommit,url"
    ]),

  /**
   * Create or update a GitHub release
   */
  createRelease: (tag: string, title: string, notesFile: string) =>
    exec("gh", [
      "release",
      "create",
      tag,
      "--title",
      title,
      "--notes-file",
      notesFile,
      "--latest=false"
    ]),

  editRelease: (tag: string, title: string, notesFile: string) =>
    exec("gh", [
      "release",
      "edit",
      tag,
      "--title",
      title,
      "--notes-file",
      notesFile
    ]),

  uploadReleaseAsset: (tag: string, file: string) =>
    exec("gh", ["release", "upload", tag, file, "--clobber"]),

  /**
   * Check if a release exists
   */
  releaseExists: (tag: string) =>
    exec("gh", ["release", "view", tag]).pipe(
      Effect.map(() => true),
      Effect.catchAll(() => Effect.succeed(false))
    )
}

/**
 * Claude CLI wrapper (assumes a `claude` CLI tool)
 * Replace with direct Anthropic API calls if needed
 */
export const Claude = {
  /**
   * Ask Claude a question via stdin prompt
   * Assumes CLI tool that reads prompt from stdin and outputs response
   */
  ask: (model: string, prompt: string) =>
    execWithStdin("claude", ["--model", model, "--max-tokens", "4000"], prompt)
}
