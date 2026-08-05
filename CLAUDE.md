# AI Assistant Core Instructions

Please read and strictly follow the project rules and architecture specs located in:
- `CODING_RULES.md`
- `ARCHITECTURE.md`
- `STACK.md`
- `MEMORY.md`

## Subagents & Skills Routing
- Subagents are located in `.agents/agents/` (Antigravity) and `.claude/agents/` (Claude Code).
- Skills are located in `.agents/skills/` and `.claude/skills/`.
- Automatically select relevant agents and skills based on intent detection.
- Always update `MEMORY.md` at the end of each session with the progress made.
