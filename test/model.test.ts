import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseMemoriesResponse, parseMemoryResponse } from '../src/model.ts';

const memory = {
  id: 'memory-1',
  title: 'Prefer small diffs',
  type: 'preference',
  scope: 'global',
  content: 'Make the smallest correct change.',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: 1_789_814_400_000,
};

describe('memory response validation', () => {
  it('accepts complete records with string or numeric dates', () => {
    assert.deepEqual(parseMemoriesResponse({ memories: [memory] }), { memories: [memory] });
    assert.deepEqual(parseMemoryResponse({ memory }), { memory });
  });

  it('rejects malformed envelopes and any malformed record', () => {
    assert.equal(parseMemoriesResponse([]), null);
    assert.equal(parseMemoriesResponse({ memories: [{ ...memory, content: 42 }] }), null);
    assert.equal(parseMemoriesResponse({ memories: [{ ...memory, scope: 'session' }] }), null);
    assert.equal(parseMemoriesResponse({ memories: [{ ...memory, updatedAt: 'not-a-date' }] }), null);
    assert.equal(parseMemoryResponse({ memory: { ...memory, id: '' } }), null);
  });
});
