// Shared helpers for Plan Anchor hooks.
//
// All hook scripts parse the same state file and talk to the same sidecar.
// This module is intentionally dependency-free (Node built-ins only) and
// fail-open: every caller wraps its entry point in safeMain() so a hook bug
// never bricks the user's session.

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ---------------------------------------------------------------------------
// I/O primitives
// ---------------------------------------------------------------------------

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function resolveProjectDir(input) {
  return (
    process.env.CLAUDE_PROJECT_DIR ||
    (input && typeof input.cwd === 'string' && input.cwd) ||
    process.cwd()
  );
}

function anchorDir(projectDir) {
  return path.join(projectDir, '.claude', 'plan-anchor');
}

function currentSlug(projectDir) {
  const p = path.join(anchorDir(projectDir), 'current.txt');
  try {
    const raw = fs.readFileSync(p, 'utf8').trim();
    return raw || null;
  } catch (_) {
    return null;
  }
}

function statePath(projectDir, slug) {
  return path.join(anchorDir(projectDir), `${slug}.md`);
}

function metaPath(projectDir, slug) {
  return path.join(anchorDir(projectDir), `${slug}.meta.json`);
}

// ---------------------------------------------------------------------------
// State parser
// ---------------------------------------------------------------------------

function parseFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return { frontmatter: {}, bodyStart: 0 };
  const fm = {};
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') break;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)(?:\s+#.*)?$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fm[m[1]] = value;
  }
  return { frontmatter: fm, bodyStart: i + 1 };
}

function splitSections(bodyLines) {
  // Returns [{ title, startLine, endLine, lines }]
  const sections = [];
  let current = null;
  bodyLines.forEach((line, idx) => {
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) {
      if (current) {
        current.endLine = idx - 1;
        current.lines = bodyLines.slice(current.startLine, idx);
        sections.push(current);
      }
      current = { title: m[1], startLine: idx, endLine: -1, lines: [] };
    }
  });
  if (current) {
    current.endLine = bodyLines.length - 1;
    current.lines = bodyLines.slice(current.startLine);
    sections.push(current);
  }
  return sections;
}

function findSection(sections, title) {
  const t = title.toLowerCase();
  return sections.find((s) => s.title.toLowerCase() === t) || null;
}

function parseWorkUnits(section) {
  if (!section) return [];
  const units = [];
  let current = null;
  section.lines.forEach((line) => {
    const heading = line.match(/^##\s+(WU-\d+)\s*[—\-]\s*(.+?)\s*[—\-]\s*(pending|active|blocked|complete)\s*$/i);
    if (heading) {
      if (current) units.push(finalizeWU(current));
      current = {
        id: heading[1].toUpperCase(),
        goal: heading[2].trim(),
        status: heading[3].toLowerCase(),
        _body: [],
      };
      return;
    }
    if (current) current._body.push(line);
  });
  if (current) units.push(finalizeWU(current));
  return units;
}

function finalizeWU(wu) {
  const body = wu._body.join('\n');
  const serves = extractListField(wu._body, /^-\s*Serves\s*:\s*(.+)$/i);
  const scopeRaw = extractListField(wu._body, /^-\s*Scope\s*:\s*(.+)$/i);
  const verification = extractListField(wu._body, /^-\s*Verification\s*:\s*(.+)$/i).join('; ');
  const evidenceLines = extractMultilineField(wu._body, /^-\s*Evidence\s*:\s*(.*)$/i);
  const risks = extractMultilineField(wu._body, /^-\s*Risks?\s*:\s*(.*)$/i);
  const doneWhen = extractDoneWhen(wu._body);

  return {
    id: wu.id,
    goal: wu.goal,
    status: wu.status,
    serves,
    scope: splitScope(scopeRaw.join(',')),
    scopeRaw: scopeRaw.join(', '),
    doneWhen,
    verification,
    evidence: evidenceLines.filter((l) => l.trim().length > 0),
    risks: risks.filter((l) => l.trim().length > 0),
    body,
  };
}

function extractListField(lines, headingRe) {
  for (const line of lines) {
    const m = line.match(headingRe);
    if (m) {
      return m[1]
        .split(',')
        .map((x) => x.replace(/`/g, '').trim())
        .filter((x) => x.length > 0);
    }
  }
  return [];
}

function extractMultilineField(lines, headingRe) {
  const out = [];
  let capturing = false;
  for (const line of lines) {
    const headMatch = line.match(headingRe);
    if (headMatch) {
      capturing = true;
      if (headMatch[1]) out.push(headMatch[1]);
      continue;
    }
    if (capturing) {
      if (/^-\s/.test(line) && !/^\s+-\s/.test(line)) {
        capturing = false;
        continue;
      }
      out.push(line);
    }
  }
  return out;
}

function extractDoneWhen(lines) {
  const out = [];
  let inBlock = false;
  for (const line of lines) {
    if (/^-\s*Done when\s*:\s*$/i.test(line)) {
      inBlock = true;
      continue;
    }
    if (inBlock) {
      const item = line.match(/^\s+-\s*\[([ xX])\]\s*(.+?)\s*$/);
      if (item) {
        out.push({ checked: item[1].toLowerCase() === 'x', text: item[2] });
        continue;
      }
      if (/^-\s/.test(line)) {
        inBlock = false;
      }
    }
  }
  return out;
}

function splitScope(raw) {
  return raw
    .split(/[,\n]/)
    .map((s) => s.replace(/`/g, '').trim())
    .filter((s) => s.length > 0);
}

function parseDriftLog(section) {
  if (!section) return [];
  const rows = [];
  for (const line of section.lines) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 5) continue;
    if (/^[-:\s]+$/.test(cells.join(''))) continue; // table separator
    if (/^deviation$/i.test(cells[0])) continue; // header
    rows.push({
      deviation: cells[0],
      reason: cells[1],
      impact: cells[2],
      userApprovalNeeded: /^yes$/i.test(cells[3]),
      status: (cells[4] || '').toLowerCase(),
    });
  }
  return rows;
}

function parseAcceptance(section) {
  if (!section) return [];
  const out = [];
  for (const line of section.lines) {
    const m = line.match(/^-\s*\[([ xX])\]\s*\*\*(AC\d+)\*\*\s*[—\-]\s*(.+?)\s*$/);
    if (m) {
      out.push({ id: m[2], checked: m[1].toLowerCase() === 'x', description: m[3], evidence: '' });
    }
  }
  return out;
}

function loadState(projectDir) {
  const slug = currentSlug(projectDir);
  if (!slug) return null;
  const p = statePath(projectDir, slug);
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (_) {
    return null;
  }
  const { frontmatter, bodyStart } = parseFrontmatter(raw);
  const bodyLines = raw.split('\n').slice(bodyStart);
  const sections = splitSections(bodyLines);
  const workUnits = parseWorkUnits(findSection(sections, 'Work Units'));
  const acceptance = parseAcceptance(findSection(sections, 'Acceptance Criteria'));
  const drift = parseDriftLog(findSection(sections, 'Drift Log'));
  return {
    slug,
    path: p,
    raw,
    frontmatter,
    bodyStart,
    sections,
    workUnits,
    acceptance,
    drift,
  };
}

function findActiveWU(state) {
  if (!state) return null;
  return state.workUnits.find((wu) => wu.status === 'active') || null;
}

// ---------------------------------------------------------------------------
// Scope matching (v1 — prefix + simple globs)
// ---------------------------------------------------------------------------

function normalizePath(p, projectDir) {
  if (!p) return '';
  let abs = path.isAbsolute(p) ? p : path.join(projectDir, p);
  let rel = path.relative(projectDir, abs);
  rel = rel.split(path.sep).join('/');
  return rel.replace(/^\.\//, '').replace(/\/+$/, '');
}

function scopeToRegex(entry) {
  // v1: support **, *, ? as globs. Anchor full match.
  let pat = entry.replace(/^\.\//, '').replace(/\\/g, '/').replace(/\/+$/, '');
  const hasGlob = /[*?\[]/.test(pat);
  if (!hasGlob) return null;
  let regex = '';
  let i = 0;
  while (i < pat.length) {
    const ch = pat[i];
    if (ch === '*' && pat[i + 1] === '*') {
      regex += '.*';
      i += 2;
      if (pat[i] === '/') i++;
    } else if (ch === '*') {
      regex += '[^/]*';
      i++;
    } else if (ch === '?') {
      regex += '[^/]';
      i++;
    } else if ('.+^$()|{}\\'.includes(ch)) {
      regex += '\\' + ch;
      i++;
    } else {
      regex += ch;
      i++;
    }
  }
  return new RegExp('^' + regex + '$');
}

function inScope(filePath, wu, projectDir) {
  if (!wu || !wu.scope || wu.scope.length === 0) return false;
  const rel = normalizePath(filePath, projectDir);
  for (const entryRaw of wu.scope) {
    const entry = entryRaw.replace(/^\.\//, '').replace(/\\/g, '/').replace(/\/+$/, '');
    if (!entry) continue;
    const re = scopeToRegex(entry);
    if (re) {
      if (re.test(rel)) return true;
      continue;
    }
    if (rel === entry) return true;
    if (rel.startsWith(entry + '/')) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Meta sidecar
// ---------------------------------------------------------------------------

function loadMeta(projectDir, slug) {
  const p = metaPath(projectDir, slug);
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.recent_touches) parsed.recent_touches = [];
    if (typeof parsed.loop_counter !== 'number') parsed.loop_counter = 0;
    return parsed;
  } catch (_) {
    return { recent_touches: [], loop_counter: 0 };
  }
}

function saveMeta(projectDir, slug, meta) {
  const p = metaPath(projectDir, slug);
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(meta, null, 2) + '\n', 'utf8');
    return true;
  } catch (_) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Git facts
// ---------------------------------------------------------------------------

function runGit(args, projectDir) {
  try {
    const out = execFileSync('git', args, {
      cwd: projectDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    });
    return out.trim();
  } catch (_) {
    return '';
  }
}

function gitFacts(projectDir) {
  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], projectDir) || 'unknown';
  const porcelain = runGit(['status', '--porcelain'], projectDir);
  const worktree = porcelain ? 'modified' : 'clean';
  const touched = porcelain
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[A-Z?!\s]{1,3}\s*/, ''))
    .slice(0, 20);
  return { branch, worktree, touched };
}

// ---------------------------------------------------------------------------
// Handoff rendering
// ---------------------------------------------------------------------------

function renderHandoffSection(state, git) {
  const active = findActiveWU(state);
  const completed = state.workUnits.filter((wu) => wu.status === 'complete');
  const remaining = state.workUnits.filter((wu) => wu.status === 'pending' || wu.status === 'blocked');
  const remainingDoneWhen = active ? active.doneWhen.filter((d) => !d.checked) : [];
  const totalDoneWhen = active ? active.doneWhen.length : 0;
  const doneCount = totalDoneWhen - remainingDoneWhen.length;

  const lines = [];
  lines.push('# Handoff');
  lines.push('');
  lines.push(`- Repository assumptions: branch=${git.branch}, worktree=${git.worktree}`);
  lines.push('- Completed WUs:');
  if (completed.length === 0) {
    lines.push('  - _None yet._');
  } else {
    for (const wu of completed) {
      const ev = (wu.evidence[0] || '').replace(/^-\s*/, '').trim();
      lines.push(`  - ${wu.id}: ${wu.goal}${ev ? ' — ' + truncate(ev, 80) : ''}`);
    }
  }
  if (active) {
    lines.push(`- Active WU: ${active.id} — ${active.goal}`);
    const stateSentence =
      totalDoneWhen === 0
        ? 'no Done-when conditions declared yet'
        : `${doneCount} of ${totalDoneWhen} Done-when conditions satisfied`;
    lines.push(`  - Current state: ${stateSentence}`);
    if (remainingDoneWhen.length > 0) {
      lines.push('  - Done-when remaining:');
      for (const d of remainingDoneWhen) lines.push(`    - ${d.text}`);
    }
  } else {
    lines.push('- Active WU: _none_');
  }
  lines.push('- Remaining WUs:');
  if (remaining.length === 0) {
    lines.push('  - _None._');
  } else {
    for (const wu of remaining) lines.push(`  - ${wu.id}: ${wu.goal}`);
  }
  lines.push('- Files touched:');
  if (git.touched.length === 0) {
    lines.push('  - _No uncommitted changes._');
  } else {
    for (const f of git.touched) lines.push(`  - ${f}`);
  }
  const openDrift = state.drift.filter((d) => d.status === 'open');
  if (openDrift.length > 0) {
    lines.push(`- Open blockers: ${openDrift.length} open drift row(s) — ${openDrift.map((d) => truncate(d.deviation, 50)).join('; ')}`);
  } else {
    const blockedWU = state.workUnits.find((wu) => wu.status === 'blocked');
    lines.push(`- Open blockers: ${blockedWU ? blockedWU.id + ' blocked' : 'None'}`);
  }
  lines.push(`- Smallest next action: ${smallestNextAction(state)}`);
  lines.push('');
  return lines.join('\n');
}

function smallestNextAction(state) {
  const active = findActiveWU(state);
  if (!active) {
    const next = state.workUnits.find((wu) => wu.status === 'pending');
    return next ? `Promote ${next.id} to active and begin: ${next.goal}` : 'Run /plan-anchor:done to gate completion';
  }
  const remaining = active.doneWhen.filter((d) => !d.checked);
  if (remaining.length > 0) return remaining[0].text;
  return `Run verification for ${active.id}: ${active.verification || 'as declared'}`;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ---------------------------------------------------------------------------
// State file mutation
// ---------------------------------------------------------------------------

function writeHandoffSection(state, handoffMarkdown) {
  const raw = state.raw;
  const marker = /^#\s+Handoff\s*$/m;
  if (!marker.test(raw)) return false;
  const withoutHandoff = raw.replace(/\n?#\s+Handoff\s*\n[\s\S]*$/m, '\n');
  const next = withoutHandoff.replace(/\n+$/, '') + '\n\n' + handoffMarkdown.replace(/^\s+|\s+$/g, '') + '\n';
  return writeStateRaw(state.path, bumpUpdated(next));
}

function bumpUpdated(raw) {
  const iso = new Date().toISOString();
  const lines = raw.split('\n');
  if (lines[0].trim() !== '---') return raw;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') break;
    if (/^updated:/.test(lines[i])) {
      lines[i] = `updated: ${iso}`;
      return lines.join('\n');
    }
  }
  return raw;
}

function writeStateRaw(p, raw) {
  try {
    fs.writeFileSync(p, raw, 'utf8');
    return true;
  } catch (_) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Hook I/O conventions
// ---------------------------------------------------------------------------

function blockPreTool(reason) {
  const payload = {
    decision: 'block',
    reason,
    hookSpecificOutput: {
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
  try {
    process.stderr.write(reason + '\n');
    process.stdout.write(JSON.stringify(payload));
  } catch (_) {}
  process.exit(2);
}

function emitContext(text) {
  if (!text) return;
  try {
    process.stdout.write(text.endsWith('\n') ? text : text + '\n');
  } catch (_) {}
}

function safeMain(fn) {
  (async () => {
    try {
      await fn();
      process.exit(0);
    } catch (_) {
      process.exit(0);
    }
  })();
}

module.exports = {
  readStdinJson,
  resolveProjectDir,
  anchorDir,
  currentSlug,
  statePath,
  metaPath,
  loadState,
  findActiveWU,
  inScope,
  normalizePath,
  loadMeta,
  saveMeta,
  runGit,
  gitFacts,
  renderHandoffSection,
  writeHandoffSection,
  smallestNextAction,
  truncate,
  blockPreTool,
  emitContext,
  safeMain,
};
