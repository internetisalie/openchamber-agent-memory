import type { GuestRequestResult, HostClient, OpenCodeRequest } from '@openchamber/sdk';

export const OPENCODE_PLUGIN_ID = 'opencode-simple-memory';

export type OpenCodeRequester = Pick<HostClient, 'openCodeRequest'>;
export type MemoryRequest = Omit<OpenCodeRequest, 'pluginId'>;

export const memoryItemPath = (id: string): string => `/memories/${encodeURIComponent(id)}`;

export const openCodeMemoryRequest = (
  requester: OpenCodeRequester,
  request: MemoryRequest,
): Promise<GuestRequestResult> => requester.openCodeRequest({
  pluginId: OPENCODE_PLUGIN_ID,
  ...request,
});
