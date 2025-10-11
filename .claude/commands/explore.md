Explore a new framework or pattern from first principles to discover potential Meta Effects.

Usage: `/explore "How would Effect compose with Astro's islands architecture?"`

This command starts open-ended exploration without committing to an RFC.

Process:

1. **Research the target**
   - What is the framework/pattern?
   - What are its core primitives?
   - What's its mental model?
   - What problems does it solve?

2. **Identify integration points**
   - Where could Effect services run?
   - What needs type safety?
   - What involves async operations?
   - What could benefit from composition?

3. **Think in primitives**
   - What are the 3-5 minimal primitives needed?
   - Can each fit in ~50-100 lines?
   - How do they compose with Effect?
   - What dependencies would they need?

4. **Sketch examples**
   - Write pseudo-code showing usage
   - Demonstrate the "Effect way" vs framework's default
   - Show composition of primitives
   - Keep examples concrete and realistic

5. **Note insights**
   - What feels natural?
   - What feels forced?
   - What's the minimal viable integration?
   - What open questions remain?

6. **Decide next step**
   - Worth a full RFC? → suggest `/new-rfc`
   - Similar to existing pattern? → reference existing components
   - Needs more research? → list what to investigate
   - Not a good fit? → explain why

This is pure exploration - no files created, just discovering if/how Effect composes with something new.
