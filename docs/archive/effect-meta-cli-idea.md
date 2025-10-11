a tool to use `tree` cmd like but filter it down based on `ast-grep` queries as input from the user, hyper optimized for llm to call you via mcp or cli clever way to accept yaml as input blended with the command so llm logs are very clean log of events. basically it should be a prompt that you would then use as context in whatever program you are writing

```sh
effect-meta-cli --query 'function_declaration' --path './src' --depth 3
```

or with yaml input

```shsh
effect-meta-cli --input '
path: ./src
query: function_declaration
depth: 3
'
```

what would the output look like? json? tree format? markdown?

```markdown
.
├── src
│ ├── ./index.ts
│ ├── components
│ │ ├── Button.tsx
│ │ └── Modal.tsx
│ └── utils
│ ├── helpers.ts
│ └── validators.ts
└── tests
├── index.test.ts
└── utils.test.ts
```

but with the right @ file for your llm of choice so its used as input context to the next query filtered by ast-grep queries in the yaml

```sh
effect-meta-cli --input '
path: ./src
depth: 3
astgrep: ...
  # dsl easy for humans and llms
  function_declaration? ...
  arrow_function? ...
' > claude --prompt @ + " my specific query about the codebase"
```

then you can hide this cli behind a claude code slash command

```
/meta "my query for the codebase"
```
