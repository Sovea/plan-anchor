#!/usr/bin/env node
// PostToolUse hook — fires after Edit / Write / MultiEdit.
//
// Maintains the local-fix-loop counter used by G2.
//
// Because pre_edit.js already blocks out-of-scope edits, by the time we
// see a PostToolUse the file is (usually) inside the active WU's scope.
// What G2 actually cares about is: *within* the scope, is the agent
// chasing secondary failures (tests, lint, build, config) instead of
// completing the active Work Unit's mainline goal?
//
// Heuristic: a file whose path looks like test / config / tooling is
// "secondary". Two consecutive secondary edits without a mainline edit
// in between sets loop_counter >= 2, which triggers a warning in
// user_prompt.js on the next turn.
//
// Non-blocking. Writes only to the sidecar meta file.

'use strict';

const lib = require('./lib/state');

const SECONDARY_PATTERNS = [
  /\.test\./i,
  /\.spec\./i,
  /__tests__\//,
  /(^|\/)tests?\//,
  /(^|\/)e2e\//,
  /tsconfig[^/]*\.json$/i,
  /\.eslintrc/i,
  /\.prettierrc/i,
  /\.babelrc/i,
  /jest\.config/i,
  /vitest\.config/i,
  /playwright\.config/i,
  /webpack\.config/i,
  /vite\.config/i,
  /\.ya?ml$/i,
  /\.toml$/i,
  /(^|\/)Dockerfile$/,
  /(^|\/)Makefile$/,
  /\.github\//,
  /\.gitlab-ci/i,
];

function isSecondary(rel) {
  return SECONDARY_PATTERNS.some((re) => re.test(rel));
}

lib.safeMain(async () => {
  const input = lib.readStdinJson();
  const projectDir = lib.resolveProjectDir(input);
  const state = lib.loadState(projectDir);
  if (!state) return;

  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || toolInput.path || '';
  if (!filePath) return;

  const active = lib.findActiveWU(state);
  if (!active) return;

  const rel = lib.normalizePath(filePath, projectDir);
  const inScope = lib.inScope(filePath, active, projectDir);
  const secondary = isSecondary(rel);

  const meta = lib.loadMeta(projectDir, state.slug);
  meta.recent_touches.push({
    path: rel,
    ts: new Date().toISOString(),
    in_scope: inScope,
    secondary,
    wu: active.id,
  });
  if (meta.recent_touches.length > 5) meta.recent_touches = meta.recent_touches.slice(-5);

  // loop_counter logic:
  //   - out-of-scope edit           → +1 (escaped G1 somehow — scope widened, or tool without file guard)
  //   - in-scope but secondary file → +1 (chasing tests / configs inside the WU)
  //   - in-scope mainline file      → reset to 0 (mainline progress)
  if (!inScope || secondary) {
    meta.loop_counter = (meta.loop_counter || 0) + 1;
  } else {
    meta.loop_counter = 0;
  }

  lib.saveMeta(projectDir, state.slug, meta);
});
