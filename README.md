# Phalanx — how to use it day to day

You talk to Pi. Pi dispatches phalanx agents to do the work.

## What you say to start work

| You want to... | Say to Pi |
|---------------|-----------|
| Fix a bug | `"investigate bug: player health doesn't decrease when hit"` |
| Add a feature | `"implement double-jump in the player controller"` |
| Find code | `"find all references to UnityEngine.Network"` |
| Understand how something works | `"trace how damage flows from enemy attack to health update"` |
| Verify something works | `"verify the double-jump fix — check edge cases"` |
| Sync results to your note | `"sync the bug report to my note"` |
| Extend the team | `"/phalanx add-lochos docs"` or `"/phalanx add-hoplite scribe docs write"` |

Pi handles the multi-agent pipeline: scouts the codebase first, researches,
builds, verifies, and reports back — all through isolated phalanx agents.

## What Pi does behind the scenes

| Your prompt triggers | Agents involved |
|---------------------|----------------|
| Bug investigation | psiloi (find code) → lochagos-research (trace flow) → lochagos-build (fix) → lochagos-verify (confirm) → hoplite-kerux (report to note) |
| Feature implementation | psiloi (find files) → lochagos-build (write code) → lochagos-verify (check correctness) → hoplite-kerux (report) |
| Codebase search | psiloi (grep/find) or lochagos-research (deeper investigation) |
| Architecture change | hoplite-nomophylax (edits `phalanx-architecture.yaml` via `/phalanx` commands) |

## Commands

- `/phalanx` — show status
- `/phalanx add-lochos <domain>` — add a coordinator for a new domain
- `/phalanx add-hoplite <skill> <lochagos> [tool]` — add a specialist
- `/phalanx reset` — reset runtime state

## Rules Pi follows

1. **Scout first** — always probes cheaply before committing expensive work.
2. **Chain of command** — agents report up, never sideways.
3. **Shield wall** — retries once, then asks you.
4. **Single state** — everything stored in shared memory (agora), never lost between steps.
5. **Concise output** — no preamble, no narration, just what you need.