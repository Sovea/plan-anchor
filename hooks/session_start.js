#!/usr/bin/env node
// SessionStart hook.
//
// If there is an active Plan Anchor task, print a 4–6 line recovery brief on
// stdout. Claude Code injects SessionStart stdout into the model's context,
// so the next turn starts knowing where we left off.
//
// Always fail-open: any error exits 0 with no output.

'use strict';

const lib = require('./lib/state');

lib.safeMain(async () => {
  const input = lib.readStdinJson();
  const projectDir = lib.resolveProjectDir(input);
  const state = lib.loadState(projectDir);
  if (!state) return;

  const active = lib.findActiveWU(state);
  const completedCount = state.workUnits.filter((wu) => wu.status === 'complete').length;
  const remainingCount = state.workUnits.filter(
    (wu) => wu.status === 'pending' || wu.status === 'blocked',
  ).length;
  const openDrift = state.drift.filter((d) => d.status === 'open').length;

  const git = lib.gitFacts(projectDir);
  const mission = state.frontmatter.task || state.slug;
  const source = input.source ? ` [${input.source}]` : '';

  const lines = [];
  lines.push(`[Plan Anchor resumed${source}] task="${mission}" (slug: ${state.slug}).`);
  lines.push(
    `Work Units: ${completedCount} complete, ${active ? 'WU ' + active.id + ' active' : 'none active'}, ${remainingCount} remaining.`,
  );
  lines.push(`Repo: branch=${git.branch}, worktree=${git.worktree}.`);
  if (openDrift > 0) lines.push(`Open drift: ${openDrift} row(s) awaiting resolution.`);
  lines.push(`Next: ${lib.smallestNextAction(state)}`);

  lib.emitContext(lines.join('\n'));
});
