#!/usr/bin/env node
// UserPromptSubmit hook.
//
// Inject a short note into every turn so the agent can't lose track of the
// active Work Unit, open drift, or a suspected local-fix loop. Kept deliberately
// compact (2–5 lines) to play well with the prompt cache.

'use strict';

const lib = require('./lib/state');

lib.safeMain(async () => {
  const input = lib.readStdinJson();
  const projectDir = lib.resolveProjectDir(input);
  const state = lib.loadState(projectDir);
  if (!state) return;

  const active = lib.findActiveWU(state);
  const openDrift = state.drift.filter((d) => d.status === 'open');
  const meta = lib.loadMeta(projectDir, state.slug);

  const out = [];
  const head =
    `[Plan Anchor] task=${state.slug} active=${active ? active.id : 'none'}` +
    (active ? ` next="${lib.truncate(lib.smallestNextAction(state), 80)}"` : '');
  out.push(head);

  if (active && active.scope.length > 0) {
    out.push(`[Plan Anchor] scope: ${active.scope.map((s) => '`' + s + '`').join(', ')}`);
  }

  if (openDrift.length > 0) {
    const gist = openDrift.map((d) => lib.truncate(d.deviation, 60)).join('; ');
    out.push(`[Plan Anchor drift] ${openDrift.length} open: ${gist}`);
  }

  if (meta.loop_counter >= 2) {
    out.push(
      `[Plan Anchor loop] ${meta.loop_counter} consecutive secondary / out-of-scope edits without mainline progress on ${active ? active.id : 'the active WU'} — classify the blocker (incidental / structural / requirement-gap / environmental) and choose one: continue with a bounded fix, replan, ask user, or handoff (G2).`,
    );
  }

  lib.emitContext(out.join('\n'));
});
