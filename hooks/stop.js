#!/usr/bin/env node
// Stop hook.
//
// When Claude's main agent finishes a response, quietly refresh the Handoff
// section of the active task. This means every pause — planned or not — leaves
// a resume-ready state file on disk without the user having to run
// /anchor:handoff.
//
// The stop_hook_active guard prevents re-entry: Claude Code sets it when the
// Stop hook is already on the stack, and we bail immediately in that case.
// Non-blocking in all other paths.

'use strict';

const lib = require('./lib/state');

lib.safeMain(async () => {
  const input = lib.readStdinJson();
  if (input.stop_hook_active) return; // recursion guard

  const projectDir = lib.resolveProjectDir(input);
  const state = lib.loadState(projectDir);
  if (!state) return;

  // Skip refresh once a task is complete — the Handoff section was rewritten
  // by /anchor:done into a completion summary that we don't want to overwrite.
  if ((state.frontmatter.status || '').toLowerCase() === 'complete') return;

  const git = lib.gitFacts(projectDir);
  const handoff = lib.renderHandoffSection(state, git);
  lib.writeHandoffSection(state, handoff);
  // No stdout output: Stop-hook stdout isn't injected into context anyway,
  // and we want this to be invisible unless the user opens the state file.
});
