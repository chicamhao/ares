# Phalanx — Multi-Agent Command Hierarchy

Phalanx is a military-themed multi-agent architecture built on [pi](https://pi.dev).
It uses **extensions** (the runtime machinery) and **skills** (on-demand instructions
loaded by the command agent) to delegate work through a chain of command.

```
strategos  (you — command)
  ├── psiloi              (scout — cheap read-only recon)
  ├── lochagos-research   (coordinator — investigate a domain)
  ├── lochagos-build      (coordinator — implement changes)
  ├── lochagos-verify     (coordinator — test & confirm)
  ├── hoplite-kerux       (specialist — sync note ↔ Scripts/)
  └── hoplite-nomophylax  (specialist — edit architecture YAML)
```

---

## How extensions & skills work

| Layer | What it is | Files |
|-------|-----------|-------|
| **Extension** | Native pi extension that registers tools, commands, and rules | `.pi/extensions/phalanx/` |
| **Skills** | Read-only `.md` files loaded on demand by the strategos | `.pi/skills/phalanx-*/SKILL.md` |
| **Agents** | System prompts for each role (subagent isolation) | `.pi/agents/*.md` |
| **Architecture** | YAML schema defining roles, tiers, rules, and extend templates | `phalanx-architecture.yaml` |

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

The **strategos** (you, the main session) loads these skill files as needed and
applies their instructions. You never install or enable skills — they are just
markdown files that describe how to use the extension's tools.

---

## Core concepts

### Agora (shared memory)

The **agora** is the single source of state (`single_state` rule). No agent keeps
private state; everything is read from and written to the agora.

```json
// Key/value store
agora { action: "put",  key: "objective", value: "{\"text\": \"fix login bug\"}" }
agora { action: "get",  key: "objective" }
agora { action: "list" }

// Message bus
agora { action: "post", from: "strategos", to: "lochagos-build", content: "..." }
agora { action: "inbox", to: "strategos" }

// Retry tracking
agora { action: "attempts", scope: "dispatch:lochagos-build" }
```

Always write the objective and key decisions to agora so subsequent dispatches
inherit the context.

### Dispatch

`phalanx_dispatch` launches a role as an isolated subprocess with restricted tools.
It enforces the chain of command, the shield wall (retry once then escalate), and
the oracle (ask the user when retries are exhausted).

```
phalanx_dispatch { role: "psiloi", task: "find all auth-related files" }
phalanx_dispatch { role: "lochagos-build", task: "implement the fix" }
phalanx_dispatch { role: "hoplite-kerux", task: "sync note to Scripts/", tool: "edit" }
```

### Rules

| Rule | Meaning |
|------|---------|
| `chain_of_command` | A hoplite escalates to its lochagos, never sideways |
| `scout_first` | Probe with psiloi before committing costly work |
| `shield_wall` | Retry once at narrowest scope, then escalate |
| `consult_the_oracle` | If ambiguous or retries exhausted, ask the user |
| `single_state` | No private state; all reads/writes go through agora |
| `concise_output` | Extremely concise output — no preamble or narration |

---

## How to use Phalanx: end-to-end scenarios

### 1. Investigate a bug

```
Scenario: A player's health doesn't decrease when hit by an enemy.
```

**Step 1 — Scout first.** Dispatch a psiloi to find the relevant code.

```
phalanx_dispatch {
  role: "psiloi",
  task: "Find all code related to player damage, health, and enemy hit detection.
         Return file paths, line numbers, and a summary of the flow."
}
```

**Step 2 — Research.** Dispatch the research lochagos to understand the bug.

```
phalanx_dispatch {
  role: "lochagos-research",
  task: "Read the files found by psiloi. Trace the damage pipeline from enemy
         attack through collision to health decrement. Identify where the break
         occurs — is the collision not firing, the damage not applied, or the
         health not updating?"
}
```

**Step 3 — Record findings.** Write the root cause to agora.

```
agora { action: "put", key: "bug-root-cause", value: "{\"file\": \"Scripts/Health.cs\", \"line\": 42, \"cause\": \"null reference on damage source\"}" }
```

**Step 4 — Build the fix.** Dispatch the build lochagos.

```
phalanx_dispatch {
  role: "lochagos-build",
  task: "Fix the null reference in Scripts/Health.cs at line 42. Add a null guard
         before applying damage. Verify the fix parses correctly."
}
```

**Step 5 — Verify.** Dispatch the verify lochagos.

```
phalanx_dispatch {
  role: "lochagos-verify",
  task: "Read the change in Scripts/Health.cs. Verify the null guard covers
         all call sites. Run any available tests. Return pass/fail with evidence."
}
```

**Step 6 — Report.** Sync the result to the note.

```
phalanx_dispatch {
  role: "hoplite-kerux",
  task: "Sync the bug investigation report to the strategos note",
  tool: "edit"
}
```

---

### 2. Implement a feature

```
Scenario: Add a double-jump mechanic to the player controller.
```

**Step 1 — Scout.**

```
phalanx_dispatch {
  role: "psiloi",
  task: "Find the player controller script and any existing jump/movement code.
         Return file paths and the class/method structure."
}
```

**Step 2 — Build.**

```
phalanx_dispatch {
  role: "lochagos-build",
  task: "Implement double-jump in the player controller. Add a jump count variable,
         reset on ground contact, allow a second jump mid-air. Keep the original
         single-jump feel for the first jump."
}
```

**Step 3 — Verify.**

```
phalanx_dispatch {
  role: "lochagos-verify",
  task: "Read the double-jump implementation. Confirm: jump count resets on ground,
         second jump is only allowed mid-air, original jump force is preserved.
         Report any logic gaps."
}
```

**Step 4 — Report via kerux.**

```
agora { action: "put", key: "feature-status", value: "{\"feature\": \"double-jump\", \"files\": [\"Scripts/PlayerController.cs\"], \"status\": \"implemented and verified\"}" }
phalanx_dispatch {
  role: "hoplite-kerux",
  task: "Sync the double-jump feature report to the strategos note",
  tool: "edit"
}
```

---

### 3. Search the codebase

```
Scenario: Find all references to a deprecated API so you can plan a migration.
```

```
phalanx_dispatch {
  role: "psiloi",
  task: "Search the entire codebase for uses of 'UnityEngine.Network' (deprecated
         Networking API). Return every file path, line number, and the surrounding
         context (3 lines). Group results by file."
}
```

For a broader search that needs shell tools:

```
phalanx_dispatch {
  role: "lochagos-research",
  task: "Search Scripts/ and Assets/ for all MonoBehaviour lifecycle methods
         (Awake, Start, Update, FixedUpdate, LateUpdate). For each file, list
         which methods are used and their line numbers. Return a summary of
         patterns found."
}
```

---

### 4. Report to the note

The **kerux** hoplite is a direct-report specialist that keeps the strategos note
and `Scripts/` in sync, in either direction, only when told to.

```
// Push findings from agora into the note
agora { action: "put", key: "report", value: "{\"summary\": \"Fixed 3 bugs, added double-jump. See agora for full logs.\"}" }
phalanx_dispatch {
  role: "hoplite-kerux",
  task: "Push the report from agora key 'report' into the strategos note",
  tool: "edit"
}

// Pull a plan from the note into work
phalanx_dispatch {
  role: "hoplite-kerux",
  task: "Read the strategos note and sync the current week's task list into agora",
  tool: "read"
}
```

---

## Extending the phalanx

Use the `/phalanx` command to add new roles to the architecture.

```
/phalanx add-lochos docs          # Add a "docs" coordinator
/phalanx add-hoplite scribe docs write   # Add a "scribe" specialist under docs with the "write" tool
```

Both commands:
1. Append to `phalanx-architecture.yaml` using the `extend` templates.
2. Create a new `.pi/agents/<role>.md` system prompt.

This is done by the `nomophylax` hoplite behind the scenes.

---

## Phalanx status

At any point, check the current state:

```
phalanx_status
```

This reports:
- All loaded roles and their tiers
- The active rules
- Current agents in the roster
- The agora summary (keys, messages, retry attempts)

---

## Quick reference

| You want to... | Dispatch role | Tool restriction | Read the skill |
|---------------|--------------|-----------------|----------------|
| Find files quickly | `psiloi` | read, grep, find, ls | `phalanx-psiloi` |
| Investigate a domain | `lochagos-research` | read, grep, find, ls, bash | `phalanx-lochagos` |
| Implement changes | `lochagos-build` | read, edit, write, bash | `phalanx-lochagos` |
| Verify correctness | `lochagos-verify` | read, grep, bash | `phalanx-lochagos` |
| Sync note ↔ Scripts | `hoplite-kerux` | read, edit, write | `phalanx-hoplites` |
| Edit architecture | `hoplite-nomophylax` | read, edit | `phalanx-hoplites` |
| Share state | `agora` tool | — | `phalanx-agora` |
| Escalate ambiguity | `ask_user_question` | — | `phalanx-oracle` |
| Coordinate multi-step | You are the strategos | all tools | `phalanx-strategos` |

---

## File layout

```
ares/
├── phalanx-architecture.yaml        # Roles, tiers, rules, extend templates
├── .pi/
│   ├── agents/                      # Subagent system prompts
│   ├── extensions/phalanx/          # Extension source code (TypeScript)
│   ├── skills/phalanx-*/SKILL.md    # Skill instructions (loaded on demand)
│   └── phalanx/agora.json           # Runtime shared memory (gitignored)
└── Scripts/                         # Your game/project code
```

---

## The operating rules

Keep these in mind when dispatching:

1. **scout_first** — Always recon with psiloi before committing expensive work.
2. **chain_of_command** — Never dispatch sideways. If a hoplite fails, its
   lochagos retries, then escalates to you.
3. **shield_wall** — Retry once at the narrowest failing scope. Never retry the
   same scope twice.
4. **single_state** — Store everything in agora. Conversations are ephemeral;
   agora is the record.
5. **consult_the_oracle** — If you're stuck or the objective is unclear, ask the
   user. Don't guess and don't re-dispatch the same failing task.
6. **concise_output** — No preamble, no narration, no restating the question.
   Say only what the user needs.