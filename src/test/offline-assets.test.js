import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * Guards the offline-first and privacy guarantees.
 *
 * The app shipped with `@import url('https://fonts.googleapis.com/...')`, so every
 * cold start made a cross-origin request before first paint and the typography
 * depended on a CDN. These tests fail if a third-party runtime dependency is
 * reintroduced anywhere in the source tree.
 */

const SRC = new URL('../', import.meta.url).pathname;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const sourceFiles = walk(SRC).filter((f) => ['.js', '.jsx', '.css', '.html'].includes(extname(f)));

/** Strip comments so a mention in a doc comment is not treated as a real dependency. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Hosts that must never appear in shipped code.
 *
 * The needle is assembled from fragments so that this file's own source does not
 * contain the literal it searches for (otherwise the guard flags itself).
 */
const FORBIDDEN = [
  ['fonts', 'googleapis', 'com'].join('.'),
  ['fonts', 'gstatic', 'com'].join('.'),
  ['google-analytics', 'com'].join('.'),
  ['googletag', 'manager'].join(''),
  ['cdn', 'jsdelivr', 'net'].join('.'),
  ['unpkg', 'com'].join('.'),
];

describe('no third-party runtime dependencies', () => {
  it('has no font or analytics CDN reference in any source file', () => {
    const offenders = [];

    for (const file of sourceFiles) {
      const code = stripComments(readFileSync(file, 'utf8'));
      const hit = FORBIDDEN.find((host) => code.includes(host));
      if (hit) offenders.push(`${file.replace(SRC, '')} -> ${hit}`);
    }

    expect(offenders).toEqual([]);
  });

  it('actually detects a CDN reference when one is present', () => {
    // Guard against the guard silently passing because the needle is wrong.
    const sample = `@import url('https://${FORBIDDEN[0]}/css2?family=Inter');`;
    expect(FORBIDDEN.some((host) => sample.includes(host))).toBe(true);
  });

  it('references only self-hosted font files', () => {
    const css = readFileSync(join(SRC, 'styles/fonts.css'), 'utf8');
    const urls = [...css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).toMatch(/^\/Dastarkhwan\/fonts\/.+\.woff2$/);
    }
  });

  it('ships the font files those declarations point at', () => {
    const css = readFileSync(join(SRC, 'styles/fonts.css'), 'utf8');
    const names = [...css.matchAll(/fonts\/([a-z0-9-]+\.woff2)/g)].map((m) => m[1]);
    const present = readdirSync(join(SRC, '..', 'public', 'fonts'));
    for (const name of names) {
      expect(present).toContain(name);
    }
  });

  it('declares one variable font face per family rather than one per weight', () => {
    const css = readFileSync(join(SRC, 'styles/fonts.css'), 'utf8');
    const faces = (css.match(/@font-face/g) || []).length;
    // Inter, Outfit (latin) and Noto Nastaliq Urdu (arabic). Google's stylesheet
    // served 59 near-identical declarations for these; 3 unique files cover them.
    expect(faces).toBe(3);
  });
});

describe('service worker configuration', () => {
  it('precaches font files so typography works on the first offline launch', () => {
    const config = readFileSync(join(SRC, '..', 'vite.config.js'), 'utf8');
    expect(config).toMatch(/globPatterns/);
    expect(config).toMatch(/woff2/);
  });

  it('does not configure runtime caching for a font CDN', () => {
    const config = stripComments(readFileSync(join(SRC, '..', 'vite.config.js'), 'utf8'));
    expect(config).not.toMatch(/runtimeCaching/);
  });
});
