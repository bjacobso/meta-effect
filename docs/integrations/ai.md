# Effect Meta AI Primitives

[← Back to README](../../README.md)

## Overview

Effect Meta provides first-class AI integration through schema-driven tool generation, prompt management, and seamless integration with AI SDKs. All AI operations are Effects, providing type safety, composability, and automatic error handling.

## Core Concepts

### Schema-Driven Tool Generation

Generate AI tools automatically from your Effect Schemas:

```typescript
// Define your domain schema
const UserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.Email,
  role: Schema.Literal("admin", "user", "guest")
});

// Generate AI tools from schema
const userTools = AiToolService.generateTools(UserSchema, {
  operations: ["create", "read", "update", "delete", "search"]
});

// Tools are automatically available to AI
const ai = AI.withTools(userTools);
```

### MCP Service Integration

Register and use Model Context Protocol (MCP) services:

```typescript
class ClientsMcp extends McpService.Tag<ClientsMcp>()(
  "ClientsMcp",
  {
    operations: {
      listClients: {
        input: Schema.Struct({
          filter: Schema.optional(Schema.String)
        }),
        output: Schema.Array(ClientSchema)
      },
      getClient: {
        input: Schema.Struct({ id: Schema.String }),
        output: ClientSchema
      }
    }
  }
) {}

// AI can now call these operations
const result = yield* AI.call("ClientsMcp.listClients", {
  filter: "active"
});
```

## AI Primitives API

### AiToolService

Generates tools from schemas with Effect-based operations:

```typescript
interface AiToolService {
  generateTools<S extends Schema.Schema.Any>(
    schema: S,
    options?: {
      operations?: Operation[];
      middleware?: Effect<any, any, any>[];
    }
  ): AiTools<S>;

  fromHttpApi<Api extends HttpApi.HttpApi.Any>(
    api: Api
  ): AiTools<Api>;

  fromCrudService<Service extends CrudService.Any>(
    service: Service
  ): AiTools<Service>;
}
```

### AiPromptService

Schema-aware prompt generation:

```typescript
interface AiPromptService {
  generatePrompts<S extends Schema.Schema.Any>(
    schema: S,
    options?: {
      style?: "concise" | "detailed" | "conversational";
      examples?: boolean;
    }
  ): Prompts<S>;

  withContext<C>(
    context: C
  ): Effect<Prompts, never, C>;
}
```

### AI Effect Integration

All AI operations as composable Effects:

```typescript
const generateContent = Effect.gen(function* () {
  // Get current context
  const context = yield* AppContext;

  // Generate with schema validation
  const response = yield* AI.generate({
    prompt: "Create a user profile",
    schema: UserProfileSchema,
    tools: userTools,
    temperature: 0.7
  });

  // Response is typed and validated
  return response;
});
```

## Frontend API

### AI Tool Atoms

Use AI tools through reactive atoms:

```typescript
// Create AI chat atom
const aiChatAtom = Atom.make(
  Effect.gen(function* (get) {
    const messages = get(messagesAtom);

    return yield* AI.chat({
      messages,
      tools: userTools,
      stream: true
    });
  })
);

// Use in component
function AIChat() {
  const chatResult = useAtomValue(aiChatAtom);
  const sendMessage = useAtomSet(messagesAtom);

  return Result.match(chatResult, {
    onInitial: () => <div>Ready to chat...</div>,
    onPending: () => <div>AI is thinking...</div>,
    onFailure: (error) => <div>Error: {error.message}</div>,
    onSuccess: (response) => <ChatDisplay messages={response.value} />
  });
}
```

### Tool Execution Hook

```typescript
function useAiTool<T extends AiTool>(tool: T) {
  const [result, setResult] = useAtom(
    Atom.make(Effect.succeed(null))
  );

  const execute = useCallback((input: ToolInput<T>) => {
    setResult(
      tool.execute(input).pipe(
        Effect.tapError(Console.error)
      )
    );
  }, [tool]);

  return { execute, result };
}

// Usage
function UserManager() {
  const { execute, result } = useAiTool(
    AiToolService.generateTool(UserSchema, "create")
  );

  const handleCreate = (data: User) => {
    execute({ operation: "create", data });
  };

  return (
    <div>
      <UserForm onSubmit={handleCreate} />
      {result && <UserDisplay user={result} />}
    </div>
  );
}
```

## Backend API

### Service Layer Integration

```typescript
const AIService = Layer.effect(
  AI,
  Effect.gen(function* () {
    const config = yield* Config;
    const tools = yield* AiToolService;

    return AI.make({
      provider: config.aiProvider,
      apiKey: config.aiApiKey,
      tools: tools.all(),
      middleware: [
        rateLimiting,
        costTracking,
        responseValidation
      ]
    });
  })
);
```

### Tool Registration

```typescript
// Register schemas as tools
AiToolService.register(UserSchema, {
  handlers: {
    create: (data) => UserService.create(data),
    read: (id) => UserService.findById(id),
    update: (id, data) => UserService.update(id, data),
    delete: (id) => UserService.delete(id),
    search: (query) => UserService.search(query)
  }
});

// Register HTTP API as tools
AiToolService.registerHttpApi(InternalApi, {
  baseUrl: "http://localhost:3000",
  middleware: [authentication]
});

// Register CRUD service as tools
AiToolService.registerCrudService(PostService);
```

## Elegant API Design

Inspired by [Vercel AI SDK](https://ai-sdk.dev/), but with Effect superpowers:

### Streaming Responses

```typescript
const streamResponse = AI.stream({
  prompt: "Tell me a story",
  onChunk: (chunk) =>
    Effect.sync(() => console.log(chunk)),
  onComplete: (full) =>
    Effect.sync(() => console.log("Done:", full))
});
```

### Tool Calling

```typescript
const result = yield* AI.chat({
  messages: [
    { role: "user", content: "Find all active users and send them a newsletter" }
  ],
  tools: {
    findUsers: {
      schema: Schema.Struct({
        status: Schema.Literal("active", "inactive")
      }),
      execute: ({ status }) => UserService.findByStatus(status)
    },
    sendNewsletter: {
      schema: Schema.Struct({
        userIds: Schema.Array(Schema.String),
        subject: Schema.String,
        content: Schema.String
      }),
      execute: (data) => EmailService.sendBulk(data)
    }
  }
});
```

### Structured Output

```typescript
const analysis = yield* AI.analyze({
  data: salesData,
  schema: Schema.Struct({
    summary: Schema.String,
    trends: Schema.Array(Schema.Struct({
      metric: Schema.String,
      direction: Schema.Literal("up", "down", "stable"),
      percentage: Schema.Number
    })),
    recommendations: Schema.Array(Schema.String)
  })
});

// analysis is fully typed and validated
```

## Advanced Features

### Multi-Modal Support

```typescript
const description = yield* AI.describe({
  image: imageBuffer,
  schema: ImageDescriptionSchema,
  detail: "high"
});
```

### Agent Composition

```typescript
const researchAgent = AI.Agent.make({
  name: "Researcher",
  tools: [webSearch, documentReader, summarizer],
  prompt: "You are a research assistant..."
});

const writerAgent = AI.Agent.make({
  name: "Writer",
  tools: [textGenerator, grammarChecker],
  prompt: "You are a technical writer..."
});

const article = yield* AI.Pipeline.make([
  researchAgent.research(topic),
  writerAgent.write(),
  editorAgent.review()
]);
```

### Cost Management

```typescript
const withCostLimit = AI.withCostLimit(5.00); // $5 limit

const result = yield* withCostLimit.generate({
  prompt: expensivePrompt
}).pipe(
  Effect.catchTag("CostLimitExceeded", () =>
    Effect.succeed({
      error: "This operation would exceed the cost limit"
    })
  )
);
```

## Testing

### Mock AI Responses

```typescript
const MockAI = Layer.succeed(AI, {
  generate: ({ schema }) =>
    Effect.succeed(MockData.for(schema)),

  chat: ({ messages }) =>
    Effect.succeed({
      response: "Mock response",
      usage: { tokens: 100 }
    })
});

// Test with mocked AI
const result = await myAIEffect.pipe(
  Effect.provide(MockAI),
  Effect.runPromise
);
```

## Configuration

```typescript
const AIConfig = Config.nested("ai")({
  provider: Config.string("provider").pipe(
    Config.withDefault("openai")
  ),
  model: Config.string("model").pipe(
    Config.withDefault("gpt-4-turbo")
  ),
  temperature: Config.number("temperature").pipe(
    Config.withDefault(0.7)
  ),
  maxTokens: Config.number("maxTokens").pipe(
    Config.withDefault(2000)
  )
});
```

## Best Practices

1. **Always validate outputs** with Effect Schema
2. **Use streaming** for long responses
3. **Implement retry logic** with Effect.retry
4. **Track costs** with middleware
5. **Cache responses** when appropriate
6. **Use tools** instead of complex prompts
7. **Test with mocks** for predictable tests

## Future Enhancements

- Visual tool builder UI
- Automatic prompt optimization
- Multi-provider load balancing
- Fine-tuning integration
- Embedding database support
- RAG (Retrieval Augmented Generation) primitives
- Agent marketplace

## Related Documents

- [Git Integration](git.md) - Git operations as Effects
- [Framework Overview](../core/overview.md) - Core framework concepts
- [Architecture](../core/architecture.md) - System architecture