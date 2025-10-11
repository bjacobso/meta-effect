Apply an RFC by creating actual vendorable components in the registry.

Usage: `/apply-rfc effect-vite-rfc`

This command transitions from exploration (RFC) to implementation (registry components).

Process:

1. **Load RFC**
   - Read the specified RFC from docs/rfcs/
   - Identify the core primitives proposed
   - Review code examples and patterns

2. **Confirm scope**
   - List components proposed in RFC
   - Ask which components to implement (or all)
   - Verify component names and structure

3. **Create component structure**
   - For each component:
     - Create file in appropriate registry/{type}/ directory
     - Extract code from RFC examples as starting point
     - Add proper header documentation with @example
     - Ensure ~50-100 line target

4. **Update metadata**
   - Add components to registry/registry.json
   - Include dependencies from RFC
   - Add appropriate tags

5. **Create or update spec**
   - Create docs/specs/{type}.md if new type
   - Link back to original RFC
   - Document current implementation status
   - Note differences from RFC if any

6. **Update README**
   - Add new component type section if needed
   - List new components with line counts
   - Update project status

7. **Document the transition**
   - Add note to RFC: "Status: Implemented as {components}"
   - Link from RFC to registry components
   - Link from spec back to RFC for historical context

8. **Report**
   - Show what was created
   - List next steps (testing, examples, etc.)
   - Highlight any RFC ideas not yet implemented

This bridges the gap between "exploring an idea" and "shipping vendorable code".
