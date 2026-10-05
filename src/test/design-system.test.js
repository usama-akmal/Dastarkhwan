import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * Guards the design system.
 *
 * The app previously had a `:root` token block that almost nothing used: ~45 raw
 * colour literals were scattered across 14 components, including a *second* saffron
 * (`#F4A261` in the nav versus `#F5A623` as `--color-primary`), so the brand colour
 * was already inconsistent and the theme could not be changed. These tests fail if
 * that pattern returns.
 *
 * The rule: components reference semantic tokens (`--surface-*`, `--text-*`,
 * `--border-*`, `--accent*`), never primitive ramps or literal colours.
 */

const SRC = new URL('../', import.meta.url).pathname;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'test']);

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

const files = walk(SRC);
const jsxFiles = files.filter((f) => ['.jsx', '.js'].includes(extname(f)));
const read = (p) => readFileSync(p, 'utf8');
/** Remove comments so a hex value mentioned in prose is not counted. */
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('no literal colours in components', () => {
  it('uses no hex colours in any component or page', () => {
    const offenders = [];
    for (const file of jsxFiles) {
      const code = stripComments(read(file));
      const matches = code.match(/#[0-9a-fA-F]{3,8}\b/g);
      if (matches) offenders.push(`${file.replace(SRC, '')}: ${[...new Set(matches)].join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('uses no rgb()/rgba() literals in any component or page', () => {
    const offenders = [];
    for (const file of jsxFiles) {
      const code = stripComments(read(file));
      if (/\brgba?\(/.test(code)) offenders.push(file.replace(SRC, ''));
    }
    expect(offenders).toEqual([]);
  });
});

describe('the token system is layered correctly', () => {
  const tokens = read(join(SRC, 'styles/tokens.css'));

  it('defines both themes', () => {
    expect(tokens).toMatch(/\[data-theme='dark'\]/);
    expect(tokens).toMatch(/\[data-theme='light'\]/);
  });

  it('defines the full semantic surface, text, border and accent sets per theme', () => {
    for (const token of [
      '--surface-base', '--surface-sunken', '--surface-raised', '--surface-overlay', '--surface-elevated',
      '--text-primary', '--text-secondary', '--text-muted',
      '--border-subtle', '--border-default', '--border-strong',
      '--accent', '--accent-soft', '--accent-border',
      '--success', '--danger', '--warning',
      '--gradient-primary',
    ]) {
      // One declaration in :root/dark, one in [data-theme='light'].
      const count = (tokens.match(new RegExp(`${token}:`, 'g')) || []).length;
      expect(count, `${token} should be defined in both themes`).toBeGreaterThanOrEqual(2);
    }
  });

  it('maps the legacy token names onto semantic ones', () => {
    // Any surface not yet migrated still renders in both themes rather than
    // hardcoding dark values.
    const index = read(join(SRC, 'styles/index.css'));
    void index;
    expect(tokens).toMatch(/--color-bg-primary:\s*var\(--surface-base\)/);
    expect(tokens).toMatch(/--color-text-primary:\s*var\(--text-primary\)/);
  });
});

describe('native controls are restyled', () => {
  const components = read(join(SRC, 'styles/components.css'));

  it('draws custom checkboxes and radios rather than using the browser widgets', () => {
    expect(components).toMatch(/\.checkbox__box/);
    expect(components).toMatch(/\.radio__dot/);
  });

  it('styles the range thumb for both WebKit and Firefox', () => {
    expect(components).toMatch(/::-webkit-slider-thumb/);
    expect(components).toMatch(/::-moz-range-thumb/);
  });

  it('removes the native select chrome and supplies its own arrow', () => {
    expect(components).toMatch(/\.select[\s\S]*?appearance:\s*none/);
    expect(components).toMatch(/background-image:\s*url\("data:image\/svg\+xml/);
  });

  it('replaces the number input with a stepper', () => {
    expect(components).toMatch(/\.stepper__btn/);
    expect(components).toMatch(/\.stepper__value/);
  });

  it('keeps a visible keyboard focus ring', () => {
    const index = read(join(SRC, 'styles/index.css'));
    expect(index).toMatch(/:focus-visible/);
  });
});

describe('the full-control inventory is covered', () => {
  const allSource = jsxFiles.map((f) => stripComments(read(f))).join('\n');

  it('has no bare <input type="range"> outside the Range component', () => {
    const rawRanges = jsxFiles.filter((file) => {
      if (file.endsWith('Controls.jsx')) return false;
      return /type="range"/.test(stripComments(read(file)));
    });
    expect(rawRanges).toEqual([]);
  });

  it('has no bare checkbox, radio or number input outside the control components', () => {
    const offenders = jsxFiles.filter((file) => {
      if (file.endsWith('Controls.jsx')) return false;
      const code = stripComments(read(file));
      return /type="(checkbox|radio|number)"/.test(code);
    });
    expect(offenders).toEqual([]);
    void allSource;
  });
});
