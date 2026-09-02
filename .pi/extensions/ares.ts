/**
 * Ares — hard role enforcement for the scout → soldier → commander trio.
 *
 * Companion to the /scout, /soldier, /commander prompt templates in .pi/prompts/.
 *
 * Enforcement (tool_call hook):
 * - scout / commander (pre-handoff): write, edit, bash and mutating unity-mcp
 *   calls are BLOCKED. commander unlocks execution by calling
 *   ares_set_role({ role: "soldier" }).
 * - soldier: the read tool is BLOCKED (works from scout's findings); destructive
 *   unity-mcp operations stay blocked (delete/destroy of assets, scenes, objects).
 * - none: no restrictions (default).
 *
 * Role is set from the `input` event the moment the user types /scout, /soldier
 * or /commander — before template expansion — so enforcement does not rely on
 * the model's cooperation. Role resets on session start.
 *
 * Also tracks the last Obsidian note file touched this session (fallback for
 * `note` scope when no filename is given), exposed via the ares_state tool.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// ── Configuration ───────────────────────────────────────────────────────────

const VAULT_PATH = "C:/Users/usaree/obsidian/zeno"; // Obsidian vault root (note scope)
const CODE_DIR = "Assets/Scripts"; // Unity code scope root

// unity-mcp tools that never mutate editor/project state
const UNITY_READONLY = new Set([
	"Unity_ReadResource",
	"Unity_GetConsoleLogs",
	"Unity_AssetGeneration_GetModels",
	"Unity_ManageScript_capabilities",
	"Unity_Camera_Capture",
	"Unity_SceneView_Capture2DScene",
	"Unity_SceneView_CaptureMultiAngleSceneView",
]);
const UNITY_READONLY_ACTIONS = new Set(["read", "get_sha", "validate"]);
const DESTRUCTIVE_CODE = /DestroyImmediate|DeleteAsset|File\.Delete|Directory\.Delete/i;

type Role = "none" | "commander" | "scout" | "soldier";
type Scope = "code" | "data" | "note";

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseMaybeJson(value: unknown): Record<string, unknown> | undefined {
	if (value && typeof value === "object") return value as Record<string, unknown>;
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
		} catch {
			// not JSON
		}
	}
	return undefined;
}

function extractUnityToolNames(code: string): string[] {
	return code.match(/Unity_[A-Za-z0-9_]+/g) ?? [];
}

/** "read" | "write" | "destructive" | "unknown" */
function classifyUnityCall(tool: string, args: Record<string, unknown> | undefined): string {
	if (UNITY_READONLY.has(tool)) return "read";
	if (tool === "Unity_ManageScript") {
		const action = String(args?.action ?? "read").toLowerCase();
		if (UNITY_READONLY_ACTIONS.has(action)) return "read";
		if (action === "delete") return "destructive";
		return "write";
	}
	if (tool === "Unity_RunCommand") {
		const code = String(args?.Code ?? args?.code ?? "");
		return DESTRUCTIVE_CODE.test(code) ? "destructive" : "write";
	}
	if (tool === "Unity_AssetGeneration_GenerateAsset") return "write";
	return "unknown";
}

function isDestructiveCall(tool: string, args: Record<string, unknown> | undefined): boolean {
	return classifyUnityCall(tool, args) === "destructive";
}

// ── Extension ───────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	const state = { role: "none" as Role, scope: "code" as Scope, lastNoteFile: null as string | null };

	function updateStatus(ctx: ExtensionContext) {
		ctx.ui.setStatus("ares", state.role === "none" ? "" : `⚔ ares: ${state.role}/${state.scope}`);
	}

	// Reset on session start / reload
	pi.on("session_start", async (_event, ctx) => {
		state.role = "none";
		state.scope = "code";
		state.lastNoteFile = null;
		updateStatus(ctx);
	});

	// Flip role the moment the user types /scout, /soldier or /commander —
	// before template expansion — then let the template expand as usual.
	pi.on("input", async (event, ctx) => {
		const m = /^\/(scout|soldier|commander)\b([\s\S]*)$/.exec(event.text.trim());
		if (!m) return { action: "continue" };

		state.role = m[1] as Role;
		const tokens = m[2].trim().split(/\s+/).filter(Boolean);
		if (tokens[0] === "code" || tokens[0] === "data" || tokens[0] === "note") {
			state.scope = tokens[0];
		} else {
			state.scope = "code";
		}
		if (state.scope === "note") {
			const fileToken = tokens.slice(1).find((t) => /\.md$/i.test(t));
			if (fileToken) state.lastNoteFile = fileToken.replace(/^["']|["']$/g, "");
		}
		updateStatus(ctx);
		return { action: "continue" };
	});

	// Track the last note file touched, for the `note` scope fallback
	pi.on("tool_execution_end", async (event) => {
		if (event.isError) return;
		if (event.toolName !== "read" && event.toolName !== "write" && event.toolName !== "edit") return;
		const p = String((event.args as { path?: unknown })?.path ?? "");
		const normalized = p.replace(/\\/g, "/").toLowerCase();
		if (normalized.startsWith(VAULT_PATH.toLowerCase() + "/")) {
			const base = p.split(/[\\/]/).pop();
			if (base) state.lastNoteFile = base;
		}
	});

	// ── Hard enforcement ────────────────────────────────────────────────────
	pi.on("tool_call", async (event) => {
		if (state.role === "none") return;
		const { toolName } = event;
		const input = (event.input ?? {}) as Record<string, unknown>;
		const role = state.role;

		// ── Read-only roles: scout, and commander before the handoff ──
		if (role === "scout" || role === "commander") {
			const handoff =
				role === "commander"
					? " If research is complete, call ares_set_role({ role: \"soldier\" }) to begin execution."
					: " Investigate and report findings instead.";
			if (toolName === "write" || toolName === "edit" || toolName === "bash") {
				return { block: true, reason: `${role.toUpperCase()} is read-only: '${toolName}' is blocked.${handoff}` };
			}
			if (toolName === "mcp" || toolName.startsWith("mcp__")) {
				const tool = typeof input.tool === "string" ? input.tool : "";
				if (!tool) return; // gateway search/describe/status — read-only, allowed
				const verdict = classifyUnityCall(tool, parseMaybeJson(input.args));
				if (verdict !== "read") {
					const why = verdict === "unknown" ? "is not a recognized read-only unity-mcp tool" : "mutates state";
					return { block: true, reason: `${role.toUpperCase()} is read-only: MCP tool '${tool}' ${why}.${handoff}` };
				}
			}
			if (toolName === "mcpScript") {
				const names = extractUnityToolNames(String(input.code ?? ""));
				const bad = [...new Set(names.filter((n) => !UNITY_READONLY.has(n)))];
				if (bad.length > 0) {
					return { block: true, reason: `${role.toUpperCase()} is read-only: script references non-read-only MCP tools: ${bad.join(", ")}.${handoff}` };
				}
			}
			return;
		}

		// ── soldier ──
		if (toolName === "read") {
			return {
				block: true,
				reason:
					"SOLDIER has no read tool: work from scout's findings earlier in this conversation (quoted paths, verbatim snippets, line references). If they are missing or insufficient, say so instead of re-deriving them.",
			};
		}
		if (toolName === "mcp" || toolName.startsWith("mcp__")) {
			const tool = typeof input.tool === "string" ? input.tool : "";
			if (tool && isDestructiveCall(tool, parseMaybeJson(input.args))) {
				return { block: true, reason: `SOLDIER may mutate live state but never destroy it: '${tool}' with this action/code is blocked.` };
			}
		}
		if (toolName === "mcpScript") {
			const code = String(input.code ?? "");
			if (DESTRUCTIVE_CODE.test(code)) {
				return { block: true, reason: "SOLDIER: destructive editor operations (DestroyImmediate / DeleteAsset / File.Delete / Directory.Delete) are blocked." };
			}
		}
	});

	// ── Tools the model can call ────────────────────────────────────────────

	pi.registerTool({
		name: "ares_set_role",
		label: "Ares: set role",
		description:
			"Switch the active Ares role. commander → soldier performs the research-to-execution handoff (unlocks write/edit/bash and mutating unity-mcp tools; locks the read tool). 'none' releases all restrictions.",
		parameters: Type.Object({
			role: Type.Union([Type.Literal("scout"), Type.Literal("soldier"), Type.Literal("commander"), Type.Literal("none")], {
				description: "Role to switch to",
			}),
			scope: Type.Optional(
				Type.Union([Type.Literal("code"), Type.Literal("data"), Type.Literal("note")], {
					description: "Optionally update the active scope too",
				}),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			state.role = params.role;
			if (params.scope) state.scope = params.scope;
			updateStatus(ctx);
			const effects: Record<Role, string> = {
				none: "No Ares restrictions.",
				scout: "write/edit/bash and mutating MCP calls are BLOCKED.",
				commander: "Read-only until ares_set_role({ role: \"soldier\" }) performs the handoff.",
				soldier: "read tool is BLOCKED; destructive MCP operations remain BLOCKED.",
			};
			return {
				content: [{ type: "text", text: `Ares role → '${state.role}' (scope: ${state.scope}). ${effects[state.role]}` }],
				details: { role: state.role, scope: state.scope },
			};
		},
	});

	pi.registerTool({
		name: "ares_state",
		label: "Ares: state",
		description:
			"Get current Ares session state: active role, scope, configured paths, and the last Obsidian note file used this session (fallback for 'note' scope when the request names no file).",
		parameters: Type.Object({}),
		async execute() {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							role: state.role,
							scope: state.scope,
							lastNoteFile: state.lastNoteFile,
							vaultPath: VAULT_PATH,
							codeDir: CODE_DIR,
						}),
					},
				],
				details: { role: state.role, scope: state.scope, lastNoteFile: state.lastNoteFile },
			};
		},
	});
}
