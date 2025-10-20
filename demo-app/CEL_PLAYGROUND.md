# CEL Expression Playground

An interactive web UI for testing and experimenting with Common Expression Language (CEL) expressions in real-time.

## Features

- **Real-time Evaluation**: See results as you type (300ms debounce)
- **Syntax Highlighting**: Clear error messages with line numbers
- **JSON Context Editor**: Define variables and data structures
- **Pre-built Examples**: 6 common use cases to get started
- **Type-safe Results**: Displays booleans, numbers, strings, and objects

## Running the Playground

```bash
cd demo-app
pnpm install
pnpm dev
```

Then navigate to: `http://localhost:5173/cel-playground`

## Example Use Cases

### 1. Feature Flags
```cel
user.plan == 'enterprise' && 'beta' in user.features
```

### 2. Access Control
```cel
user.role == 'admin' || user.id == resource.owner
```

### 3. Business Rules
```cel
price * (1.0 - discount)
```

### 4. Data Validation
```cel
age >= 18 && country == 'US'
```

### 5. Collection Operations
```cel
'admin' in user.roles && has(user.email)
```

### 6. Conditional Logic
```cel
age >= 18 ? 'adult' : 'minor'
```

## Supported CEL Features

- **Comparisons**: `==`, `!=`, `<`, `<=`, `>`, `>=`
- **Boolean Logic**: `&&`, `||`, `!`
- **Arithmetic**: `+`, `-`, `*`, `/`, `%`
- **Collections**: `in`, `has()`, `size()`, `exists()`
- **Ternary Operator**: `condition ? true_val : false_val`
- **String Operations**: `+`, `contains()`, `startsWith()`

## Architecture

The playground is built with:
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Effect-TS** - Functional runtime for CEL evaluation
- **@marcbachmann/cel-js** - CEL expression engine
- **Tailwind CSS** - Styling

## Code Structure

```
demo-app/
├── src/
│   ├── pages/
│   │   └── CELPlayground.tsx       # Main playground component
│   ├── lib/
│   │   └── effect-expressions/
│   │       ├── expr-cel.ts         # CEL evaluator implementation
│   │       └── expr-service.ts     # Service interface
│   └── components/
│       └── Navigation.tsx          # Updated with playground link
```

## How It Works

1. **User Input**: Expression and JSON context are edited in textareas
2. **Debounced Evaluation**: Changes trigger evaluation after 300ms
3. **Effect Runtime**: `createCELEvaluator()` wraps cel-js in Effect
4. **Error Handling**: Syntax and runtime errors are caught and displayed
5. **Result Display**: Success shows green box, errors show red box

## Extending the Playground

### Add Custom Functions

Modify `CELPlayground.tsx` to create an evaluator with extensions:

```typescript
const evaluator = createCELEvaluator({
  extensions: [
    {
      name: "isWeekend",
      signature: "isWeekend(string): bool",
      impl: (day: string) => day === "Saturday" || day === "Sunday"
    }
  ]
})
```

### Add More Examples

Add to the `EXAMPLES` array in `CELPlayground.tsx`:

```typescript
{
  name: "My Example",
  expression: "your.expression.here",
  context: { your: { expression: { here: "value" } } }
}
```

## References

- [CEL Specification](https://github.com/google/cel-spec)
- [@marcbachmann/cel-js Documentation](https://github.com/marcbachmann/cel-js)
- [Effect-TS Documentation](https://effect.website)
