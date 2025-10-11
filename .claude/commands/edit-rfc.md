Iterate on an existing RFC with new ideas or refinements.

Usage: `/edit-rfc "What if the remix module was split into separate loaders and actions?"`

This command helps evolve RFCs based on new insights.

Process:

1. **Identify relevant RFC**
   - Search docs/rfcs/ for matching topics
   - If multiple matches, ask user to clarify
   - Read the current RFC in full

2. **Understand the proposed change**
   - What new insight are we exploring?
   - How does this refine the original idea?
   - Does it make components more minimal?

3. **Review current state**
   - What components are already in registry/?
   - What examples exist in the RFC?
   - What open questions remain?

4. **Propose refinements**
   - Show how the new idea changes the design
   - Update code examples to reflect new approach
   - Revise component boundaries if needed
   - Update line count estimates

5. **Update RFC document**
   - Add a "Revision History" section if not present
   - Document what changed and why
   - Keep old ideas visible (strikethrough) for context
   - Update "Last Updated" date

6. **Consider impact**
   - If components exist in registry/, suggest updates
   - Note any breaking changes to existing patterns
   - Link to related specs that might need updates

The goal is iterative refinement while maintaining the RFC's exploratory nature.
