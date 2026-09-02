⚠️ The content and scripts in this project are AI-generated and may contain errors or inaccuracies.

# Phalanx 

Phalanx is a military-themed subagents architecture built for [pi](https://pi.dev).


<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/f960ee73-12d7-4e04-b909-6b7e75535944" />

```
   Bronze dawn on the ridge —
   lochagos reads the terrain,
   psiloi, swift as spears.

   Strategos gives the word,
   hoplites lock shields and advance,
   agora, the drum.

   A whisper on the wind:
   "shield wall holds, but if it breaks,
   oracle, light the pyre."

   The yaml is the oath,
   the retry, a second breath —
   then up the chain, the fall.

   No king keeps private keeps;
   all speak through the stone of agora.
   One truth. On the field. Now.
```

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
- `/phalanx reset` — reset runtime state

Both adding commands
- `/phalanx add-lochos <domain>` — add a coordinator for a new domain (e.g 'docs') 
- `/phalanx add-hoplite <skill> <lochagos> [tool]` — add a specialist (e.g 'scribe docs write' to add a "scribe" specialist under docs with the "write" tool)
  
Will append to phalanx-architecture.yaml using the extend templates.
Create a new .pi/agents/<role>.md system prompt.
This is done by the nomophylax hoplite behind the scenes.


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

