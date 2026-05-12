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

  // Tailor the leading line to how this session started. SessionStart sets
  // input.source to one of: 'startup' | 'resume' | 'clear' | 'compact'.
  const heading = leadingLine(input.source, mission, state.slug);

  const lines = [];
  lines.push(heading);
  lines.push(
    `Work Units: ${completedCount} complete, ${active ? 'WU ' + active.id + ' active' : 'none active'}, ${remainingCount} remaining.`,
  );
  lines.push(`Repo: branch=${git.branch}, worktree=${git.worktree}.`);
  if (openDrift > 0) lines.push(`Open drift: ${openDrift} row(s) awaiting resolution.`);
  lines.push(`Next: ${lib.smallestNextAction(state)}`);

  lib.emitContext(lines.join('\n'));
});

function leadingLine(source, mission, slug) {
  switch (source) {
    case 'resume':
      return `[Plan Anchor] Welcome back to "${mission}" (slug: ${slug}).`;
    case 'clear':
      return `[Plan Anchor] Context cleared, picking up "${mission}" (slug: ${slug}).`;
    case 'compact':
      return `[Plan Anchor] Resuming "${mission}" after compaction — handoff was just flushed (slug: ${slug}).`;
    case 'startup':
      return `[Plan Anchor] Active task: "${mission}" (slug: ${slug}).`;
    default:
      return `[Plan Anchor] Active task: "${mission}" (slug: ${slug}).`;
  }
}
