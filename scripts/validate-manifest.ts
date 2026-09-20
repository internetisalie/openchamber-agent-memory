import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type JsonRecord = Record<string, unknown>;

const record = (value: unknown, name: string): JsonRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as JsonRecord;
};

export const validateManifest = (value: unknown): void => {
  const pkg = record(value, 'package.json');
  if (pkg.name !== '@internetisalie/openchamber-agent-memory') throw new Error('unexpected package name');
  if (pkg.version !== '0.1.0') throw new Error('unexpected package version');
  const openchamber = record(pkg.openchamber, 'openchamber');
  if (openchamber.apiVersion !== 1) throw new Error('openchamber.apiVersion must be 1');
  const engines = record(openchamber.engines, 'openchamber.engines');
  if (engines.openchamber !== '>=1.24.3') throw new Error('openchamber engine must be >=1.24.3');
  const contributes = record(openchamber.contributes, 'openchamber.contributes');
  const panel = record(contributes.panel, 'openchamber.contributes.panel');
  const expectedPanel = {
    id: 'openchamber-agent-memory',
    name: 'Agent Memory',
    icon: 'brain',
    entry: 'dist/index.html',
  };
  if (JSON.stringify(panel) !== JSON.stringify(expectedPanel)) throw new Error('unexpected panel contribution');
  const openCode = record(contributes.openCode, 'openchamber.contributes.openCode');
  const plugins = openCode.plugins;
  const expectedGrant = { id: 'opencode-simple-memory', methods: ['GET', 'PATCH', 'DELETE'] };
  if (!Array.isArray(plugins) || plugins.length !== 1 || JSON.stringify(plugins[0]) !== JSON.stringify(expectedGrant)) {
    throw new Error('OpenCode contribution must grant only opencode-simple-memory GET/PATCH/DELETE');
  }
};

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateManifest(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as unknown);
  const html = readFileSync(resolve(root, 'dist/index.html'), 'utf8');
  if (!html.includes('<script src="main.js"></script>')) throw new Error('panel entry does not load main.js');
  const bundle = readFileSync(resolve(root, 'dist/main.js'), 'utf8');
  if (!bundle.trim() || /(^|\n)\s*(import|export)\s/m.test(bundle)) throw new Error('dist/main.js is not a classic bundle');
}
