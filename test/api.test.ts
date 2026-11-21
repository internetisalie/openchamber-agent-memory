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
    await api.list('project', 'core selection');
    await api.update('memory/a', 'project', {
      title: 'Updated', type: 'learning', content: memory.content,
    });
    await api.delete('memory/a', 'project');

    assert.deepEqual(transport.seen, [
      {
        pluginId: 'opencode-simple-memory', method: 'GET', path: '/memories',
        query: { scope: 'project', q: 'core selection' },
      },
      {
        pluginId: 'opencode-simple-memory', method: 'PATCH', path: '/memories/memory%2Fa',
        body: JSON.stringify({ scope: 'project', title: 'Updated', type: 'learning', content: memory.content }),
      },
      {
        pluginId: 'opencode-simple-memory', method: 'DELETE', path: '/memories/memory%2Fa',
        query: { scope: 'project' },
      },
    ]);
  });

  it('reports malformed JSON, malformed records, auth, and host failures clearly', async () => {
    await assert.rejects(
      new MemoryApi(requester({ status: 200, body: 'nope' })).list('global', ''),
      (error: unknown) => error instanceof MemoryApiError && /invalid JSON/.test(error.message),
    );
    await assert.rejects(
      new MemoryApi(requester({ status: 200, body: '{"memories":[{}]}' })).list('global', ''),
      (error: unknown) => error instanceof MemoryApiError && /invalid memory list/.test(error.message),
    );
    await assert.rejects(
      new MemoryApi(requester({ status: 403, body: '' })).list('global', ''),
      (error: unknown) => error instanceof MemoryApiError && /denied access/.test(error.message),
    );
    await assert.rejects(
      new MemoryApi(requester(new Error('Host timed out'))).list('global', ''),
      (error: unknown) => error instanceof MemoryApiError && /Host timed out/.test(error.message),
    );
  });
});
