⚠️ The content and scripts in this project are AI-generated and may contain errors or inaccuracies.

# Phalanx 

The military-themed subagent architecture built for [Pi](https://pi.dev).

<img width="1402" height="1122" alt="image" src="https://github.com/user-attachments/assets/967b7081-c0ce-4fc2-8b31-a9d36276d807" />


## Rules

| Rule | Meaning |
|------|---------|
| `chain_of_command` | A hoplite escalates to its lochagos, never sideways |
| `scout_first` | Probe with psiloi before committing costly work |
| `shield_wall` | Retry once at narrowest scope, then escalate |
| `consult_the_oracle` | If ambiguous or retries exhausted, ask the oracle |
| `single_state` | No private state; all reads/writes go through agora |
| `concise_output` | Extremely concise output — no preamble or narration |

## Commands

- `/phalanx` — show status at any point
- `/phalanx-new` — reset agora runtime state

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
