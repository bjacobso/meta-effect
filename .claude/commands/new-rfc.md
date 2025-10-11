Create a new RFC (Request for Comments) to explore a Meta Effect idea from first principles.

Usage: `/new-rfc "Exploration of effect-solidjs bindings"`

This command starts an exploratory design process for a new idea.

Process:

1. **Understand the idea**
   - What framework/pattern are we exploring?
   - What problem does it solve?
   - How does Effect naturally compose with this?

2. **Research context**
   - Read existing RFCs in docs/rfcs/ for patterns
   - Review similar component types in registry/
   - Check docs/specs/ for related specifications

3. **Draft RFC structure**
   - Create docs/rfcs/{topic-name}-rfc.md
   - Include sections:
     - **Overview**: What we're exploring
     - **Problem**: What pain point this addresses
     - **First Principles**: How Effect primitives apply
     - **Core Primitives**: 3-5 minimal components (~50-100 lines each)
     - **Examples**: Concrete usage examples
     - **Open Questions**: What we're unsure about
     - **Related**: Links to similar explorations

4. **Focus on discovery**
   - Emphasize "What's the minimal code needed?"
   - Ask "Can this fit in ~50-100 lines?"
   - Explore "How does this compose with Effect?"

5. **Create RFC file**
   - Write comprehensive RFC document
   - Include code examples showing the vision
   - Document the thought process, not just the solution

Remember: RFCs are explorations, not specifications. They capture the journey of discovering how Effect naturally composes with a framework or pattern.
