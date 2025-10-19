import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { parseCommits, parsePRs, dedupe, filterByLabels, limit, extractBlocks } from "./transforms"
import type { Commit, PR } from "./types"

describe("transforms", () => {
  describe("parseCommits", () => {
    it("should parse single TSV line correctly", () => {
      const tsv = "abc123def456|abc123d|2024-01-01T12:00:00Z|John Doe|john@example.com|feat: add new feature"
      const result = parseCommits(tsv)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        fullSha: "abc123def456",
        shortSha: "abc123d",
        dateIso: "2024-01-01T12:00:00Z",
        authorName: "John Doe",
        authorEmail: "john@example.com",
        subject: "feat: add new feature"
      })
    })

    it("should parse multiple TSV lines", () => {
      const tsv = [
        "abc123|abc|2024-01-01T12:00:00Z|Alice|alice@example.com|feat: feature 1",
        "def456|def|2024-01-02T13:00:00Z|Bob|bob@example.com|fix: bug fix"
      ].join("\n")
      
      const result = parseCommits(tsv)
      expect(result).toHaveLength(2)
      expect(result[0].subject).toBe("feat: feature 1")
      expect(result[1].subject).toBe("fix: bug fix")
    })

    it("should handle commit messages with pipes", () => {
      const tsv = "abc123|abc|2024-01-01T12:00:00Z|Alice|alice@example.com|fix: handle | pipe in message"
      const result = parseCommits(tsv)
      
      expect(result).toHaveLength(1)
      expect(result[0].subject).toBe("fix: handle | pipe in message")
    })

    it("should filter empty lines", () => {
      const tsv = "abc123|abc|2024-01-01T12:00:00Z|Alice|alice@example.com|feat: test\n\n"
      const result = parseCommits(tsv)
      
      expect(result).toHaveLength(1)
    })
  })

  describe("parsePRs", () => {
    it("should parse PR JSON array", () => {
      const json = JSON.stringify([
        {
          number: 123,
          title: "Add feature",
          mergedAt: "2024-01-01T12:00:00Z",
          author: { login: "alice" },
          labels: [{ name: "feature" }],
          mergeCommit: { oid: "abc123" },
          url: "https://github.com/org/repo/pull/123"
        }
      ])
      
      const result = parsePRs(json)
      expect(result).toHaveLength(1)
      expect(result[0].number).toBe(123)
      expect(result[0].title).toBe("Add feature")
    })
  })

  describe("dedupe", () => {
    it("should remove commits covered by PRs", () => {
      const commits: Commit[] = [
        {
          fullSha: "abc123",
          shortSha: "abc",
          dateIso: "2024-01-01T12:00:00Z",
          authorName: "Alice",
          authorEmail: "alice@example.com",
          subject: "feat: feature 1"
        },
        {
          fullSha: "def456",
          shortSha: "def",
          dateIso: "2024-01-02T12:00:00Z",
          authorName: "Bob",
          authorEmail: "bob@example.com",
          subject: "fix: fix 1"
        }
      ]

      const prs: PR[] = [
        {
          number: 1,
          title: "Add feature",
          mergedAt: "2024-01-01T12:00:00Z",
          author: { login: "alice" },
          labels: [],
          mergeCommit: { oid: "abc123" },
          url: "https://github.com/org/repo/pull/1"
        }
      ]

      const result = dedupe(commits, prs)
      expect(result).toHaveLength(1)
      expect(result[0].fullSha).toBe("def456")
    })

    it("should keep all commits when no PRs match", () => {
      const commits: Commit[] = [
        {
          fullSha: "abc123",
          shortSha: "abc",
          dateIso: "2024-01-01T12:00:00Z",
          authorName: "Alice",
          authorEmail: "alice@example.com",
          subject: "feat: feature 1"
        }
      ]

      const prs: PR[] = []
      const result = dedupe(commits, prs)
      expect(result).toHaveLength(1)
    })
  })

  describe("filterByLabels", () => {
    const prs: PR[] = [
      {
        number: 1,
        title: "Feature PR",
        mergedAt: "2024-01-01T12:00:00Z",
        author: { login: "alice" },
        labels: [{ name: "feature" }, { name: "enhancement" }],
        mergeCommit: { oid: "abc123" },
        url: "https://github.com/org/repo/pull/1"
      },
      {
        number: 2,
        title: "Bug fix PR",
        mergedAt: "2024-01-02T12:00:00Z",
        author: { login: "bob" },
        labels: [{ name: "bug" }],
        mergeCommit: { oid: "def456" },
        url: "https://github.com/org/repo/pull/2"
      }
    ]

    it("should filter PRs by single label", () => {
      const result = filterByLabels(prs, ["feature"])
      expect(result).toHaveLength(1)
      expect(result[0].number).toBe(1)
    })

    it("should filter PRs by multiple labels (OR logic)", () => {
      const result = filterByLabels(prs, ["feature", "bug"])
      expect(result).toHaveLength(2)
    })

    it("should return all PRs when no labels specified", () => {
      const result = filterByLabels(prs, [])
      expect(result).toHaveLength(2)
    })

    it("should return empty when no PRs match", () => {
      const result = filterByLabels(prs, ["nonexistent"])
      expect(result).toHaveLength(0)
    })
  })

  describe("limit", () => {
    it("should limit array to N items", () => {
      const arr = [1, 2, 3, 4, 5]
      const result = limit(3)(arr)
      expect(result).toEqual([1, 2, 3])
    })

    it("should return full array if limit exceeds length", () => {
      const arr = [1, 2, 3]
      const result = limit(10)(arr)
      expect(result).toEqual([1, 2, 3])
    })

    it("should return empty array for limit 0", () => {
      const arr = [1, 2, 3]
      const result = limit(0)(arr)
      expect(result).toEqual([])
    })
  })

  describe("extractBlocks", () => {
    it("should extract markdown and JSON blocks", () => {
      const response = `
Some preamble text

<<<MARKDOWN>>>
# Release Notes
This is markdown content
<<<END>>>

Some middle text

<<<JSON>>>
{"key": "value"}
<<<END>>>

Some trailing text
`
      
      const result = extractBlocks(response)
      expect(result.md).toContain("# Release Notes")
      expect(result.md).toContain("This is markdown content")
      expect(result.json).toBe('{"key": "value"}')
    })

    it("should return empty strings when blocks missing", () => {
      const response = "No markers here"
      const result = extractBlocks(response)
      
      expect(result.md).toBe("")
      expect(result.json).toBe("{}")
    })

    it("should handle only markdown block", () => {
      const response = "<<<MARKDOWN>>>\n# Test\n<<<END>>>"
      const result = extractBlocks(response)
      
      expect(result.md).toBe("# Test")
      expect(result.json).toBe("{}")
    })

    it("should handle only JSON block", () => {
      const response = '<<<JSON>>>\n{"test": true}\n<<<END>>>'
      const result = extractBlocks(response)
      
      expect(result.md).toBe("")
      expect(result.json).toBe('{"test": true}')
    })
  })
})
