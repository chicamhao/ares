# Phalanx 

Phalanx is a military-themed multi-agent architecture built for [pi](https://pi.dev).
It uses **extensions** (the runtime machinery) and **skills** (on-demand instructions
loaded by the command agent) to delegate work through a chain of command.


<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/f960ee73-12d7-4e04-b909-6b7e75535944" />

⚠️ Note: The content and scripts in this project are AI-generated and may contain errors or inaccuracies.

## Rules

| Rule | Meaning |
|------|---------|
| `chain_of_command` | A hoplite escalates to its lochagos, never sideways |
| `scout_first` | Probe with psiloi before committing costly work |
| `shield_wall` | Retry once at narrowest scope, then escalate |
| `consult_the_oracle` | If ambiguous or retries exhausted, ask the user |
| `single_state` | No private state; all reads/writes go through agora |
| `concise_output` | Extremely concise output — no preamble or narration |

## Commands
  
Both adding commands:
- `/phalanx add-lochos <domain>` — add a coordinator for a domain (e.g 'docs') 
- `/phalanx add-hoplite <skill> <lochagos> [tool]` — add a specialist (e.g 'scribe docs write' to add a "scribe" specialist under docs with the "write" tool)
  
Append to phalanx-architecture.yaml using the extend templates.
Create a new .pi/agents/<role>.md system prompt.
This is done by the nomophylax hoplite behind the scenes.


- `/phalanx` — show status at any point
- `/phalanx reset` — reset runtime state

## How extensions & skills work

The **extension** provides the infrastructure — the `agora`, `phalanx_dispatch`,
and `phalanx_status` tools, plus `/phalanx` commands.

**Skills** are not loaded automatically. They are referenced by name in the
strategos prompt and read on demand when the task matches their description.
Each skill file teaches the agent how to handle a specific job:

| Skill | When to use |
|-------|------------|
| `phalanx-strategos` | Coordinating a multi-step task across multiple domains |
| `phalanx-psiloi` | Fast codebase reconnaissance before committing a specialist |
| `phalanx-lochagos` | Substantial multi-step work in one domain |
| `phalanx-hoplites` | Small, well-scoped task needing exactly one tool |
| `phalanx-agora` | Sharing state across dispatches via the memory bus |
| `phalanx-oracle` | Escalating to the user when stuck or ambiguous |

The **strategos** (the main session) loads these skill files as needed and
applies their instructions. You never install or enable skills — they are just
markdown files that describe how to use the extension's tools.

Both commands:
1. Append to `phalanx-architecture.yaml` using the `extend` templates.
2. Create a new `.pi/agents/<role>.md` system prompt.

This is done by the `nomophylax` hoplite behind the scenes.

## File layout

```
ares/
├── phalanx-architecture.yaml        # Roles, tiers, rules, extend templates
├── .pi/
│   ├── agent/AGENTS.md              # 🆕 Strategos system prompt (overrides global)
│   ├── agents/                      # Subagent system prompts
│   ├── extensions/phalanx/          # Extension source code (TypeScript)
│   ├── skills/phalanx-*/SKILL.md    # Skill instructions (loaded on demand)
│   └── phalanx/agora.json           # Runtime shared memory (gitignored)
└── Scripts/                         # Your game/project code
```

---

