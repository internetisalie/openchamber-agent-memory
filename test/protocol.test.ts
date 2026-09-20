import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { memoryItemPath, openCodeMemoryRequest, OPENCODE_PLUGIN_ID, type OpenCodeRequester } from '../src/protocol.ts';

describe('OpenCode memory protocol', () => {
  it('uses the exact plugin grant through SDK openCodeRequest', async () => {
    let seen: unknown;
    const requester: OpenCodeRequester = {
      openCodeRequest: async (request) => {
        seen = request;
        return { status: 200, body: '{"memories":[]}' };
      },
    };
    const result = await openCodeMemoryRequest(requester, {
      method: 'GET',
      path: '/memories',
      query: { scope: 'global' },
    });
    assert.equal(OPENCODE_PLUGIN_ID, 'opencode-simple-memory');
    assert.deepEqual(seen, {
      pluginId: 'opencode-simple-memory',
      method: 'GET',
      path: '/memories',
      query: { scope: 'global' },
    });
    assert.equal(result.status, 200);
  });

  it('encodes an ID as exactly one path segment', () => {
    assert.equal(memoryItemPath('memory/a ?#'), '/memories/memory%2Fa%20%3F%23');
  });
});
