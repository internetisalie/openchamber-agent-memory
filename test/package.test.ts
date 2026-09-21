import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { parseManifestJson } from '@openchamber/sdk/schemas';
import { validateManifest } from '../scripts/validate-manifest.ts';

const root = resolve(import.meta.dirname, '..');

describe('installable package', () => {
  it('declares the exact panel and least-privilege OpenCode grant', () => {
    const source = readFileSync(resolve(root, 'package.json'), 'utf8');
    const pkg = JSON.parse(source) as { version: string };
    const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8')) as {
      version: string;
      packages: Record<string, { version?: string }>;
    };
    assert.doesNotThrow(() => validateManifest(pkg));
    assert.equal(parseManifestJson(source).ok, true);
    assert.equal(lock.version, pkg.version);
    assert.equal(lock.packages['']?.version, pkg.version);
  });

  it('ships a classic IIFE panel artifact without a direct localhost transport', () => {
    const html = readFileSync(resolve(root, 'dist/index.html'), 'utf8');
    const bundle = readFileSync(resolve(root, 'dist/main.js'), 'utf8');
    assert.match(html, /<script src="main\.js"><\/script>/);
    assert.ok(bundle.length > 1_000);
    assert.doesNotMatch(bundle, /(^|\n)\s*(import|export)\s/m);
    assert.doesNotMatch(bundle, /localhost|127\.0\.0\.1|4747/);
  });
});
