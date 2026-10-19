import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readHostMessage } from '@openchamber/sdk';
import { supportsOpenCodeRequest } from '../src/host-features.ts';

describe('OpenChamber host features', () => {
  it('requires an explicit openCodeRequest feature', () => {
    assert.equal(supportsOpenCodeRequest({}), false);
    assert.equal(supportsOpenCodeRequest({ features: {} }), false);
    assert.equal(supportsOpenCodeRequest({ features: { deviceStorage: true } }), false);
    assert.equal(supportsOpenCodeRequest({ features: { openCodeRequest: true } }), true);
  });

  it('receives object feature flags through the SDK reader', () => {
    const message = readHostMessage({
      channel: 'openchamber.sdk',
      v: 1,
      type: 'ready',
      payload: { features: { openCodeRequest: true, deviceStorage: true } },
    });
    assert.equal(message?.type, 'ready');
    if (message?.type !== 'ready') throw new Error('Expected a ready message.');
    assert.equal(supportsOpenCodeRequest(message.payload), true);
  });

  it('does not enable requests from the retired array or a non-true flag', () => {
    for (const features of [['openCodeRequest'], { openCodeRequest: false }, { openCodeRequest: 'true' }]) {
      const message = readHostMessage({ channel: 'openchamber.sdk', v: 1, type: 'ready', payload: { features } });
      if (message?.type !== 'ready') throw new Error('Expected a ready message.');
      assert.equal(supportsOpenCodeRequest(message.payload), false);
    }
  });
});
