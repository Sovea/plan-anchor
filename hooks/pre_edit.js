#!/usr/bin/env node
// PreToolUse hook — fires before Edit / Write / MultiEdit.
//
// Enforces guardrail G1: an active Work Unit must exist, and the edit target
// must be within its declared scope. Blocks the tool call with a reason Claude
// can act on.
//
// If there is no active Plan Anchor task (current.txt absent/empty), this
// hook is a no-op — users who haven't opted in see no interference.

'use strict';

const lib = require('./lib/state');

lib.safeMain(async () => {
  const input = lib.readStdinJson();
  const projectDir = lib.resolveProjectDir(input);
  const state = lib.loadState(projectDir);
  if (!state) return; // no active task → allow freely

  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || toolInput.path || '';
  if (!filePath) return; // tool without a file target — nothing to gate

  // Exempt Plan Anchor's own state directory. The /plan-anchor:* commands
  // write the state file, the drift log, the handoff section, and completion
  // status via Edit — these are the plugin editing its own home, not user
  // code. Gating them with G1 would have the plugin block itself.
  const rel = lib.normalizePath(filePath, projectDir);
  if (rel === '.claude/plan-anchor' || rel.startsWith('.claude/plan-anchor/')) {
    return;
  }

  const active = lib.findActiveWU(state);
  if (!active) {
    lib.blockPreTool(
      `[Plan Anchor · G1] No active Work Unit on task "${state.slug}". ` +
        `Run /plan-anchor:resume to pick up the current task, /plan-anchor:resume <slug> to change tasks, or /plan-anchor:start <slug> for a new task before editing.`,
    );
  }

  if (!lib.inScope(filePath, active, projectDir)) {
    lib.blockPreTool(
      `[Plan Anchor · G1] Edit target "${rel}" is outside the active Work Unit's scope. ` +
        `${active.id} allows: [${active.scope.join(', ') || '(empty)'}]. ` +
        `If this edit is needed, either promote the right Work Unit (edit ${state.path} to set its status to active), widen ${active.id}'s Scope line in ${state.path}, or record this as drift via /plan-anchor:drift — do not silently step outside the plan.`,
    );
  }
});
