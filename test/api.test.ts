import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GuestRequestResult, OpenCodeRequest } from '@openchamber/sdk';
import { MemoryApi, MemoryApiError } from '../src/api.ts';
import type { MemoryRecord } from '../src/model.ts';
import type { OpenCodeRequester } from '../src/protocol.ts';

const memory: MemoryRecord = {
  id: 'memory/a',
  title: 'Project convention',
  type: 'learning',
  scope: 'project',
  content: 'Use the host directory only for core selection.',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
};

const requester = (...responses: Array<GuestRequestResult | Error>): OpenCodeRequester & { seen: OpenCodeRequest[] } => {
  const seen: OpenCodeRequest[] = [];
  return {
    seen,
    openCodeRequest: async (request) => {
      seen.push(request);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      if (!response) throw new Error('Missing test response.');
      return response;
    },
  };
};

describe('memory HTTP API', () => {
  it('constructs scoped GET, PATCH, and DELETE requests exactly', async () => {
    const transport = requester(
      { status: 200, body: JSON.stringify({ memories: [memory] }) },
      { status: 200, body: JSON.stringify({ memory: { ...memory, title: 'Updated' } }) },
      { status: 204, body: '' },
    );
    const api = new MemoryApi(transport);
    await api.list('project', 'core selection', '/work/project');
    await api.update('memory/a', 'project', '/work/project', {
      title: 'Updated', type: 'learning', content: memory.content,
    });
    await api.delete('memory/a', 'project', '/work/project');

    assert.deepEqual(transport.seen, [
      {
        pluginId: 'opencode-simple-memory', method: 'GET', path: '/memories',
        query: { scope: 'project', directory: '/work/project', q: 'core selection' },
      },
      {
        pluginId: 'opencode-simple-memory', method: 'PATCH', path: '/memories/memory%2Fa',
        query: { directory: '/work/project' },
        body: JSON.stringify({ scope: 'project', title: 'Updated', type: 'learning', content: memory.content }),
      },
      {
        pluginId: 'opencode-simple-memory', method: 'DELETE', path: '/memories/memory%2Fa',
        query: { scope: 'project', directory: '/work/project' },
      },
    ]);
  });

  it('uses the current directory to select the plugin instance for every global method', async () => {
    const globalMemory = { ...memory, scope: 'global' as const };
    const transport = requester(
      { status: 200, body: JSON.stringify({ memories: [globalMemory] }) },
      { status: 200, body: JSON.stringify({ memory: globalMemory }) },
      { status: 204, body: '' },
    );
    const api = new MemoryApi(transport);
    await api.list('global', '', '/current/project');
    await api.update('memory/a', 'global', '/current/project', {
      title: memory.title, type: memory.type, content: memory.content,
    });
    await api.delete('memory/a', 'global', '/current/project');

    assert.deepEqual(transport.seen.map((request) => request.query), [
      { scope: 'global', directory: '/current/project' },
      { directory: '/current/project' },
      { scope: 'global', directory: '/current/project' },
    ]);
  });

  it('keeps every global method usable without a directory', async () => {
    const globalMemory = { ...memory, scope: 'global' as const };
    const transport = requester(
      { status: 200, body: '{"memories":[]}' },
      { status: 200, body: JSON.stringify({ memory: globalMemory }) },
      { status: 204, body: '' },
    );
    const api = new MemoryApi(transport);
    await api.list('global', '', null);
    await api.update('memory/a', 'global', null, {
      title: memory.title, type: memory.type, content: memory.content,
    });
    await api.delete('memory/a', 'global', null);

    assert.deepEqual(transport.seen.map((request) => request.query), [
      { scope: 'global' },
      undefined,
      { scope: 'global' },
    ]);
  });

  it('reports malformed JSON, malformed records, auth, and host failures clearly', async () => {
    await assert.rejects(
      new MemoryApi(requester({ status: 200, body: 'nope' })).list('global', '', null),
      (error: unknown) => error instanceof MemoryApiError && /invalid JSON/.test(error.message),
    );
    await assert.rejects(
      new MemoryApi(requester({ status: 200, body: '{"memories":[{}]}' })).list('global', '', null),
      (error: unknown) => error instanceof MemoryApiError && /invalid memory list/.test(error.message),
    );
    await assert.rejects(
      new MemoryApi(requester({ status: 403, body: '' })).list('global', '', null),
      (error: unknown) => error instanceof MemoryApiError && /denied access/.test(error.message),
    );
    await assert.rejects(
      new MemoryApi(requester(new Error('Host timed out'))).list('global', '', null),
      (error: unknown) => error instanceof MemoryApiError && /Host timed out/.test(error.message),
    );
  });
});
