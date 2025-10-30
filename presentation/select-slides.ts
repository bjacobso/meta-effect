#!/usr/bin/env node
/**
 * Slide Selector
 *
 * Interactive script to select which slide deck to present.
 * Creates a symlink from slides.md to the selected deck in slides/
 */

import { Effect, Console, Array as EffectArray, pipe } from "effect"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { createInterface } from "readline"
import { promises as fs } from "fs"
import { resolve, join, basename } from "path"

// Service for reading user input
class ReadlineService extends Effect.Service<ReadlineService>()("ReadlineService", {
  effect: Effect.gen(function* () {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    return {
      question: (query: string) =>
        Effect.async<string>((resume) => {
          rl.question(query, (answer) => {
            resume(Effect.succeed(answer))
          })
        }),
      close: () => Effect.sync(() => rl.close()),
    } as const
  }),
}) {}

// Find all .md files in slides directory
const findSlideDecks = Effect.gen(function* () {
  const slidesDir = resolve(process.cwd(), "slides")

  const files = yield* Effect.tryPromise({
    try: () => fs.readdir(slidesDir),
    catch: () => new Error(`Could not read slides directory: ${slidesDir}`),
  })

  const mdFiles = files.filter((f) => f.endsWith(".md"))

  if (mdFiles.length === 0) {
    yield* Effect.fail(new Error("No .md files found in slides/ directory"))
  }

  return mdFiles.sort()
})

// Prompt user to select a slide deck
const selectDeck = (decks: string[]) =>
  Effect.gen(function* () {
    const readline = yield* ReadlineService

    yield* Console.log("\n📊 Available slide decks:\n")
    decks.forEach((deck, idx) => {
      const name = basename(deck, ".md")
      console.log(`  ${idx + 1}. ${name}`)
    })
    yield* Console.log("")

    const answer = yield* readline.question(
      `Select a deck (1-${decks.length}) or press Enter for first: `
    )

    yield* readline.close()

    const selection = answer.trim() === "" ? 1 : parseInt(answer.trim(), 10)

    if (isNaN(selection) || selection < 1 || selection > decks.length) {
      yield* Effect.fail(
        new Error(`Invalid selection. Please choose 1-${decks.length}`)
      )
    }

    return decks[selection - 1]
  })

// Create or update symlink
const createSymlink = (target: string) =>
  Effect.gen(function* () {
    const targetPath = join("slides", target)
    const linkPath = "slides.md"

    // Remove existing symlink or file if it exists
    yield* Effect.tryPromise({
      try: async () => {
        try {
          await fs.unlink(linkPath)
        } catch {
          // File doesn't exist, that's fine
        }
      },
      catch: () => new Error(`Could not remove existing ${linkPath}`),
    })

    // Create new symlink
    yield* Effect.tryPromise({
      try: () => fs.symlink(targetPath, linkPath),
      catch: () =>
        new Error(`Could not create symlink: ${linkPath} -> ${targetPath}`),
    })

    yield* Console.log(`\n✅ Selected: ${basename(target, ".md")}`)
    yield* Console.log(`   Symlink created: slides.md -> ${targetPath}\n`)
  })

// Main program
const program = Effect.gen(function* () {
  yield* Console.log("\n🎯 Meta Effect Slide Selector")

  const decks = yield* findSlideDecks
  const selected = yield* selectDeck(decks)
  yield* createSymlink(selected)
})

// Run with proper error handling
const runnable = program.pipe(
  Effect.catchAll((error) =>
    Console.error(`\n❌ Error: ${error.message}\n`).pipe(
      Effect.flatMap(() => Effect.fail(error))
    )
  ),
  Effect.provide(ReadlineService.Default)
)

Effect.runPromise(runnable).catch(() => process.exit(1))
