[[agent architecture]]
A trio of commands — researcher → executor → director. Originally built for Claude Code (`.claude/commands/`); ported to pi on 2026-05-29 (`.pi/prompts/` + `.pi/extensions/ares.ts`).
## Roles

- **scout** — read-only researcher. No write tools at all. Investigates and reports findings only.
- **soldier** — executor. Implements changes using scout's findings from earlier in the same conversation. Has no read tools of its own to re-derive them.
- **commander** — thin router. Only holds `Skill` + `AskUserQuestion`. Classifies the request, then chains `Skill(scout, ...)` → `Skill(soldier, ...)`.

## Files

- `.claude/commands/scout.md`
- `.claude/commands/soldier.md`
- `.claude/commands/commander.md`

## Shared scope keywords

The leading word of the argument picks the scope; no leading word defaults to `code`.

- **`code`** — source: `source/scimitar/liberty` + `source/scimitar/libertygui`, narrowed by wording in the request (gameplay/AI/combat → liberty only, UI/HUD/widget → libertygui only).
- **`data`** — live Anvil data via `mcp-lty-data` MCP tools. Read-only for scout; soldier writes are hijack-mode only (never checkout, never submit/shelve).
- **`note <file>`** — notes in the Obsidian vault at `C:\Users\hchicam\Documents\Obsidian Vault`. Shared keyword for both scout (reads) and soldier (writes/merges). If `<file>` is omitted, both fall back to the most recent note filename already used earlier in the session — asking the user only if the session has no prior note filename either.

## How commander routes (Claude)

1. Classify scope (above) and risk (destructive-sounding wording on `code`/`data` only).
2. Ask the user only on genuine scope ambiguity or risky wording — otherwise proceed straight through.
3. `Skill(scout, "<scope> <request>")` → `Skill(soldier, "<scope> <request>")`.

No plan document, no mandatory approval gate — minimum ceremony by design.

---

## pi port (2026-05-29, machine: usaree)

Same trio, pi-native. Project-local to `C:\Users\usaree\rice\tam` (Unity project).

- **Templates** (`.pi/prompts/scout.md`, `soldier.md`, `commander.md`) carry the personas and report/merge instructions. Invoke with `/scout`, `/soldier`, `/commander <args>`.
- **Extension** (`.pi/extensions/ares.ts`) supplies what pi templates can't: hard enforcement. An `input` event hook flips the role the moment the user types `/scout|soldier|commander` — before template expansion — and a `tool_call` hook blocks per role:
  - scout/commander (pre-handoff): `write`/`edit`/`bash` blocked; only known read-only unity-mcp tools allowed (`Unity_ReadResource`, `Unity_GetConsoleLogs`, captures, `Unity_ManageScript` with action read/get_sha/validate; `Unity_RunCommand` blocked).
  - soldier: `read` blocked; destructive ops blocked (`delete` action, `DestroyImmediate`, `DeleteAsset`, `File.Delete`).
  - Tools `ares_set_role` (handoff + release) and `ares_state` (role/scope/last-note-file). Role resets on session start.
- **Scopes here:** `code` = Unity C# under `Assets/Scripts` (project: `C:\Users\usaree\rice\tam`); `data` = live Unity Editor via `unity-mcp` MCP tools (read-only for scout/commander, no destroy ops for soldier); `note <file>` = Obsidian vault at `C:\Users\usaree\obsidian\zeno`, last-note fallback tracked by the extension.
- `/commander` runs the full pipeline in one prompt (classify → scout research → `ares_set_role(soldier)` handoff → implement → release); `/scout` and `/soldier` exist as separate commands for manual chaining.
- **Claude→pi mapping:** Skill() chaining → prompt templates (no sub-agent spawning in pi — one prompt, role flips via `ares_set_role`); ask_user_question → still `ask_user_question`; soft tool restrictions → `tool_call`-hook hard blocks.

---
Full rationale, keyword lists, and design history: `.claude/memory/claude-agent-architecture.md`.

## Updating this architecture

1. Claude: edit `.claude/commands/{scout,soldier,commander}.md`, then re-sync `.claude/memory/claude-agent-architecture.md` (authoritative record other sessions read).
2. pi: edit the templates in `C:\Users\usaree\rice\tam\.pi\prompts\*` and/or the enforcement in `C:\Users\usaree\rice\tam\.pi\extensions\ares.ts`, then `/reload`.
3. Re-sync this note by prompting `/commander note <what changed>`. The filename can be omitted — it falls back to the last note filename used in the session (`Ares.md`). Commander routes it through the normal scout-reads-then-soldier-writes single pass.
4. For a full rewrite instead of a merge, say so explicitly in the prompt — soldier's default is merge/append, not replace.