Effect Meta Git

primitive for emplementing git operations as effects
that can be composed with other effects to create more complex git workflows. git operations and compile to file system or maybe write to sqllite or dynamodb or whatever.

like how we have HttpApi and CrudService as meta primitives.

What would a meta primitive look like that takes a git operation and generates an effect for it, using effects to handle the git operations? GitService?

GitService?
GitService.clone(repoUrl: string, options?: CloneOptions): Effect<void>
GitService.commit(message: string, options?: CommitOptions): Effect<void>
GitService.push(remote?: string, branch?: string, options?: PushOptions): Effect<void>
GitService.pull(remote?: string, branch?: string, options?: PullOptions): Effect<void>
GitService.createBranch(branchName: string, options?: CreateBranchOptions): Effect<void>

// Or what if an llm knew how to run inline markdown code tags for this dsl language in effect typescript?

You could have a meta component as context that you then can expose a chat interface to ask questions about the current things in context.

would it be more expressive for llms to ask questins to expand their context. like a chat interface to ask questions about the current git repo or worktree or branch or commit history or whatever.

```bash
meta-git `
- show me the commit history for the last 5 commits on the main branch
- show me the diff between the current branch and main
- show me the details for the commit abc123
- create a new branch called feature-x based on main and switch to it
`
```

like a chat interface to ask questions about the current git repo or worktree or branch or commit history or whatever.
