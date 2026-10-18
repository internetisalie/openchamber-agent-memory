import type { HostReadyContext } from '@openchamber/sdk';

export const supportsOpenCodeRequest = (context: Pick<HostReadyContext, 'features'>): boolean => (
  context.features?.openCodeRequest === true
);
