import { describe, it, expect } from 'vitest'
import * as T from '../../src/effect-ci/transforms.js'
import type { Commit, PR } from '../../src/effect-ci/types.js'

describe('transforms', () => {
  describe('parseCommits', () => {
    it('parses single commit from TSV', () => {
      const tsv = "abc123def|abc123d|2025-10-17T12:00:00Z|Ben Jacobson|ben@example.com|Add feature"
      const commits = T.parseCommits(tsv)

      expect(commits).toHaveLength(1)
      expect(commits[0]).toEqual({
        fullSha: "abc123def",
        shortSha: "abc123d",
        dateIso: "2025-10-17T12:00:00Z",
        authorName: "Ben Jacobson",
        authorEmail: "ben@example.com",
        subject: "Add feature"
      })
    })

    it('handles commit messages with pipes', () => {
      const tsv = "abc|def|2025-10-17T12:00:00Z|Ben|ben@example.com|Fix: handle | in messages"
      const commits = T.parseCommits(tsv)

      expect(commits[0].subject).toBe("Fix: handle | in messages")
    })

    it('handles multiple commits', () => {
      const tsv = [
        "abc|abc|2025-10-17T12:00:00Z|Ben|ben@example.com|First",
        "def|def|2025-10-17T13:00:00Z|Alice|alice@example.com|Second"
      ].join("\n")

      const commits = T.parseCommits(tsv)
      expect(commits).toHaveLength(2)
      expect(commits[0].subject).toBe("First")
      expect(commits[1].subject).toBe("Second")
    })

    it('filters out empty lines', () => {
      const tsv = "abc|abc|2025-10-17T12:00:00Z|Ben|ben@example.com|Commit\n\n"
      const commits = T.parseCommits(tsv)
      expect(commits).toHaveLength(1)
    })
  })

  describe('parsePRs', () => {
    it('parses PR JSON', () => {
      const json = JSON.stringify([
        {
          number: 123,
          title: "Add feature",
          mergedAt: "2025-10-17T12:00:00Z",
          author: { login: "ben" },
          labels: [{ name: "enhancement" }],
          mergeCommit: { oid: "abc123" },
          url: "https://github.com/owner/repo/pull/123"
        }
      ])

      const prs = T.parsePRs(json)
      expect(prs).toHaveLength(1)
      expect(prs[0].number).toBe(123)
      expect(prs[0].title).toBe("Add feature")
    })
  })

  describe('dedupe', () => {
    it('removes commits represented by PRs', () => {
      const commits: Commit[] = [
        {
          fullSha: "abc123",
          shortSha: "abc",
          dateIso: "2025-10-17T12:00:00Z" as any,
          authorName: "Ben",
          authorEmail: "ben@example.com",
          subject: "Feature"
        },
        {
          fullSha: "def456",
          shortSha: "def",
          dateIso: "2025-10-17T13:00:00Z" as any,
          authorName: "Alice",
          authorEmail: "alice@example.com",
          subject: "Fix"
        }
      ]

      const prs: PR[] = [
        {
          number: 1,
          title: "Feature PR",
          mergedAt: "2025-10-17T12:00:00Z" as any,
          author: { login: "ben" },
          labels: [],
          mergeCommit: { oid: "abc123" },
          url: "https://github.com/owner/repo/pull/1"
        }
      ]

      const unique = T.dedupe(commits, prs)
      expect(unique).toHaveLength(1)
      expect(unique[0].fullSha).toBe("def456")
    })

    it('keeps all commits if no PR matches', () => {
      const commits: Commit[] = [
        {
          fullSha: "abc123",
          shortSha: "abc",
          dateIso: "2025-10-17T12:00:00Z" as any,
          authorName: "Ben",
          authorEmail: "ben@example.com",
          subject: "Feature"
        }
      ]

      const prs: PR[] = []
      const unique = T.dedupe(commits, prs)
      expect(unique).toHaveLength(1)
    })
  })

  describe('filterByLabels', () => {
    const prs: PR[] = [
      {
        number: 1,
        title: "Feature",
        mergedAt: "2025-10-17T12:00:00Z" as any,
        author: { login: "ben" },
        labels: [{ name: "enhancement" }, { name: "user-facing" }],
        mergeCommit: { oid: "abc" },
        url: "https://github.com/owner/repo/pull/1"
      },
      {
        number: 2,
        title: "Internal",
        mergedAt: "2025-10-17T13:00:00Z" as any,
        author: { login: "alice" },
        labels: [{ name: "internal" }],
        mergeCommit: { oid: "def" },
        url: "https://github.com/owner/repo/pull/2"
      }
    ]

    it('filters by single label', () => {
      const filtered = T.filterByLabels(prs, ["user-facing"])
      expect(filtered).toHaveLength(1)
      expect(filtered[0].number).toBe(1)
    })

    it('filters by multiple labels (OR logic)', () => {
      const filtered = T.filterByLabels(prs, ["user-facing", "internal"])
      expect(filtered).toHaveLength(2)
    })

    it('returns all PRs if no labels specified', () => {
      const filtered = T.filterByLabels(prs, [])
      expect(filtered).toHaveLength(2)
    })
  })

  describe('limit', () => {
    it('limits array to N items', () => {
      const items = [1, 2, 3, 4, 5]
      const limited = T.limit(3)(items)
      expect(limited).toEqual([1, 2, 3])
    })

    it('returns full array if N >= length', () => {
      const items = [1, 2, 3]
      const limited = T.limit(10)(items)
      expect(limited).toEqual([1, 2, 3])
    })
  })

  describe('extractBlocks', () => {
    it('extracts markdown and JSON from Claude response', () => {
      const response = `Some preamble text
<<<MARKDOWN>>>
# Release Notes
- Feature 1
- Feature 2
<<<END>>>

Some middle text

<<<JSON>>>
{"highlights": ["Feature 1"]}
<<<END>>>

Some trailing text`

      const { md, json } = T.extractBlocks(response)
      expect(md).toContain("# Release Notes")
      expect(md).toContain("Feature 1")
      expect(json).toContain('"highlights"')
    })

    it('handles missing blocks gracefully', () => {
      const response = "No markers here"
      const { md, json } = T.extractBlocks(response)
      expect(md).toBe("")
      expect(json).toBe("{}")
    })
  })
})
