#!/usr/bin/env node
// PreCompact hook.
//
// Runs just before context compaction (auto or /compact). Flushes the Handoff
// section of the active task's state file to disk so the next session (or the
// post-compaction continuation) can resume without the conversation history.
//
// Fail-open: losing a handoff refresh is better than losing the compaction.

'use strict';

const lib = require('./lib/state');

lib.safeMain(async () => {
  const input = lib.readStdinJson();
  const projectDir = lib.resolveProjectDir(input);
  const state = lib.loadState(projectDir);
  if (!state) return;

  const git = lib.gitFacts(projectDir);
  const handoff = lib.renderHandoffSection(state, git);
  const ok = lib.writeHandoffSection(state, handoff);

  if (ok) {
    const trigger = input.trigger ? input.trigger : 'compact';
    lib.emitContext(
      `[Plan Anchor] flushed handoff before compaction (task=${state.slug}, trigger=${trigger}).`,
    );
  }
});
