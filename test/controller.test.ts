import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryDraft } from '../src/api.ts';
import { MemoryController } from '../src/controller.ts';
import type { MemoryRecord, MemoryScope } from '../src/model.ts';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const flush = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); };

const makeMemory = (id: string, scope: MemoryScope = 'global'): MemoryRecord => ({
  id,
  title: `Memory ${id}`,
  type: 'learning',
  scope,
  content: `Body ${id}`,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
});

describe('memory UI controller', () => {
  it('reloads global memories when the directory selects a different plugin instance', async () => {
    const projectA = deferred<MemoryRecord[]>();
    const projectB = deferred<MemoryRecord[]>();
    const calls: Array<[MemoryScope, string | null]> = [];
    const lists = [projectA, projectB];
    const controller = new MemoryController({
      api: {
        list: (scope, _search, directory) => {
          calls.push([scope, directory]);
          return lists.shift()!.promise;
        },
        update: async () => { throw new Error('not used'); },
        delete: async () => { throw new Error('not used'); },
      },
      onChange: () => {},
    });

    controller.setHostReady('/project/a');
    controller.setDirectory('/project/b');
    projectA.resolve([makeMemory('stale')]);
    projectB.resolve([makeMemory('current')]);
    await flush();

    assert.deepEqual(calls, [['global', '/project/a'], ['global', '/project/b']]);
    assert.deepEqual(controller.snapshot().memories.map((memory) => memory.id), ['current']);
    controller.dispose();
  });

  it('follows project directory changes and ignores stale list responses', async () => {
    const global = deferred<MemoryRecord[]>();
    const projectA = deferred<MemoryRecord[]>();
    const projectB = deferred<MemoryRecord[]>();
    const calls: Array<[MemoryScope, string, string | null]> = [];
    const lists = [global, projectA, projectB];
    const controller = new MemoryController({
      api: {
        list: (scope, search, directory) => {
          calls.push([scope, search, directory]);
          return lists.shift()!.promise;
        },
        update: async () => { throw new Error('not used'); },
        delete: async () => { throw new Error('not used'); },
      },
      onChange: () => {},
    });

    controller.setHostReady('/project/a');
    controller.setScope('project');
    controller.setDirectory('/project/b');
    global.resolve([makeMemory('stale-global')]);
    projectA.resolve([makeMemory('stale-project', 'project')]);
    projectB.resolve([makeMemory('current', 'project')]);
    await flush();

    assert.deepEqual(calls, [
      ['global', '', '/project/a'],
      ['project', '', '/project/a'],
      ['project', '', '/project/b'],
    ]);
    assert.deepEqual(controller.snapshot().memories.map((memory) => memory.id), ['current']);
    controller.dispose();
  });

  it('submits search, edits the selected memory, and requires delete confirmation', async () => {
    const first = makeMemory('one');
    const second = makeMemory('two');
    const updates: Array<[string, MemoryScope, string | null, MemoryDraft]> = [];
    const deletes: string[] = [];
    const controller = new MemoryController({
      api: {
        list: async (_scope, search) => search ? [second] : [first, second],
        update: async (id, scope, directory, draft) => {
          updates.push([id, scope, directory, draft]);
          return { ...first, ...draft, updatedAt: '2026-09-03T00:00:00.000Z' };
        },
        delete: async (id) => { deletes.push(id); },
      },
      onChange: () => {},
    });

    controller.setHostReady('/project');
    await flush();
    assert.equal(controller.snapshot().selectedId, 'one');
    controller.beginEdit();
    await controller.save({ title: '  Revised  ', type: ' preference ', content: 'New body' });
    assert.deepEqual(updates[0], ['one', 'global', '/project', {
      title: 'Revised', type: 'preference', content: 'New body',
    }]);
    assert.equal(controller.snapshot().editing, false);
    assert.equal(controller.snapshot().memories[0]?.title, 'Revised');

    controller.requestDelete();
    assert.equal(controller.snapshot().confirmingDelete, true);
    assert.deepEqual(deletes, []);
    controller.cancelDelete();
    assert.deepEqual(deletes, []);
    controller.requestDelete();
    await controller.confirmDelete();
    assert.deepEqual(deletes, ['one']);
    assert.equal(controller.snapshot().selectedId, 'two');

    controller.setSearch(' Memory two ');
    await flush();
    assert.equal(controller.snapshot().search, 'Memory two');
    assert.deepEqual(controller.snapshot().memories.map((memory) => memory.id), ['two']);
    controller.dispose();
  });

  it('does not request project memories without an open project', async () => {
    let calls = 0;
    const controller = new MemoryController({
      api: {
        list: async () => { calls += 1; return []; },
        update: async () => { throw new Error('not used'); },
        delete: async () => { throw new Error('not used'); },
      },
      onChange: () => {},
    });
    controller.setScope('project');
    controller.setHostReady(null);
    await flush();
    assert.equal(calls, 0);
    assert.equal(controller.snapshot().status, 'ready');
    controller.dispose();
  });

  it('blocks requests on an unsupported host and recovers on a supported ready snapshot', async () => {
    let calls = 0;
    const controller = new MemoryController({
      api: {
        list: async () => { calls += 1; return []; },
        update: async () => { throw new Error('not used'); },
        delete: async () => { throw new Error('not used'); },
      },
      onChange: () => {},
    });

    controller.setHostUnsupported('Update OpenChamber.');
    controller.setDirectory('/project');
    controller.setScope('project');
    controller.refresh();
    await flush();
    assert.equal(calls, 0);
    assert.equal(controller.snapshot().status, 'unsupported');
    assert.equal(controller.snapshot().error, 'Update OpenChamber.');

    controller.setHostReady('/project');
    await flush();
    assert.equal(calls, 1);
    assert.equal(controller.snapshot().status, 'ready');
    controller.dispose();
  });
});
