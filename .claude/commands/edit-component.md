Edit an existing registry component with full context loaded.

Usage: `/edit-component api-atom "add retry logic"`

This command loads all relevant context before editing a component.

Process:

1. **Load component context**
   - Read the component file from registry/
   - Read its entry in registry.json (dependencies, description)
   - Count current line count
   - Check which preset(s) include it

2. **Load related documentation**
   - Read docs/specs/{type}.md for this component type
   - Find any RFCs that mention this component
   - Check for usage examples in docs/

3. **Load related components**
   - Find other components in same type directory
   - Check for components this one might depend on
   - Review similar patterns in other types

4. **Understand the change**
   - What's the proposed modification?
   - Does it maintain the ~50-100 line goal?
   - Does it change the component's interface?

5. **Make the edit**
   - Modify the component file
   - Update header documentation if needed
   - Ensure @example still works
   - Keep "Copy this file..." reminder

6. **Update metadata if needed**
   - If dependencies changed, update registry.json
   - If description changed, update registry.json
   - Update line count in README files

7. **Check impacts**
   - Does this affect the spec documentation?
   - Do any examples in docs/ need updating?
   - Should this be mentioned in CHANGELOG?

8. **Report**
   - Show what was changed
   - Note new line count
   - List any docs that might need updates
   - Remind to test in a real project

This ensures edits are made with full awareness of the component's role in the ecosystem.
