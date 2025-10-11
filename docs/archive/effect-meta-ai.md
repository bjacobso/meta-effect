what are the effect meta ai apis look like?

What does it look like to have an ai primitive that can define tools, based on the schema domains you have defined, and McpService (ex: ClientsMcp extends McpService...) to register and call them? similar to how we have HttpApi and CrudService as meta primitives.

What would an ai primitive look like that can take a schema and generate a set of tools for it, using effects to handle the tool operations? AiToolService?

Like how our this then map onto atoms so that we can have a ai tool atom that can be used in the same way as other atoms, and can be composed with other atoms to create more complex ai tools? all speaking the HttpApi or CrudService language.

What would an ai primitive look like that can take a schema and generate a set of prompts for it, using effects to handle the prompt operations?

What would the frontend api look like to use these ai primitives? useAiTool(aiChatAtom), useAiPrompt()?
or something like useAiTool(AiToolService.generateTools(UserSchema))?

What would the backend api look like to use these ai primitives? AiToolService.generateTools(UserSchema), AiPromptService.generatePrompts(UserSchema)?

what is something that is as elegent as the ai-sdk
https://ai-sdk.dev/
