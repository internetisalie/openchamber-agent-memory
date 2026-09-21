import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readHostMessage } from '@openchamber/sdk';
import { supportsOpenCodeRequest } from '../src/host-features.ts';

describe('OpenChamber host features', () => {
  it('requires an explicit openCodeRequest feature', () => {
    assert.equal(supportsOpenCodeRequest({}), false);
    assert.equal(supportsOpenCodeRequest({ features: [] }), false);
    assert.equal(supportsOpenCodeRequest({ features: ['other'] }), false);
    assert.equal(supportsOpenCodeRequest({ features: ['openCodeRequest'] }), true);
  });

  it('receives new feature fields through the pinned SDK reader', () => {
    const message = readHostMessage({
      channel: 'openchamber.sdk',
      v: 1,
      type: 'ready',
      payload: { features: ['openCodeRequest'] },
    });
    assert.equal(message?.type, 'ready');
    if (message?.type !== 'ready') throw new Error('Expected a ready message.');
    assert.equal(supportsOpenCodeRequest(message.payload), true);
  });
});
