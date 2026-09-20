import { parseMemoriesResponse, parseMemoryResponse, type MemoryRecord, type MemoryScope } from './model.ts';
import { memoryItemPath, openCodeMemoryRequest, type OpenCodeRequester } from './protocol.ts';

export type MemoryDraft = Pick<MemoryRecord, 'title' | 'type' | 'content'>;

export class MemoryApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryApiError';
  }
}

const parseJson = (body: string, context: string): unknown => {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new MemoryApiError(`The memory plugin returned invalid JSON for ${context}.`);
  }
};

const describeFailure = (status: number, action: string): MemoryApiError => {
  if (status === 401 || status === 403) {
    return new MemoryApiError('OpenCode denied access to agent memories. Check the extension grant and reconnect.');
  }
  if (status === 404) {
    return new MemoryApiError(action === 'load'
      ? 'The opencode-simple-memory plugin is not available in this OpenCode runtime.'
      : 'This memory no longer exists. Refresh the list to continue.');
  }
  return new MemoryApiError(`The memory plugin could not ${action} memories (HTTP ${status}).`);
};

const queryFor = (scope: MemoryScope, directory: string | null): Record<string, string> => {
  const query: Record<string, string> = { scope };
  if (directory) query.directory = directory;
  return query;
};

const call = async (
  requester: OpenCodeRequester,
  request: Parameters<typeof openCodeMemoryRequest>[1],
  action: string,
) => {
  try {
    return await openCodeMemoryRequest(requester, request);
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
    throw new MemoryApiError(`OpenChamber could not ${action} agent memories.${detail}`);
  }
};

export class MemoryApi {
  constructor(private readonly requester: OpenCodeRequester) {}

  async list(scope: MemoryScope, search: string, directory: string | null): Promise<MemoryRecord[]> {
    const query = queryFor(scope, directory);
    if (search) query.q = search;
    const response = await call(this.requester, { method: 'GET', path: '/memories', query }, 'load');
    if (response.status !== 200) throw describeFailure(response.status, 'load');
    const parsed = parseMemoriesResponse(parseJson(response.body, 'the memory list'));
    if (!parsed) throw new MemoryApiError('The memory plugin returned an invalid memory list.');
    return parsed.memories;
  }

  async update(
    id: string,
    scope: MemoryScope,
    directory: string | null,
    draft: MemoryDraft,
  ): Promise<MemoryRecord> {
    const query: Record<string, string> | undefined = directory
      ? { directory }
      : undefined;
    const response = await call(this.requester, {
      method: 'PATCH',
      path: memoryItemPath(id),
      ...(query ? { query } : {}),
      body: JSON.stringify({ scope, ...draft }),
    }, 'update');
    if (response.status !== 200) throw describeFailure(response.status, 'update');
    const parsed = parseMemoryResponse(parseJson(response.body, 'the updated memory'));
    if (!parsed) throw new MemoryApiError('The memory plugin returned an invalid updated memory.');
    return parsed.memory;
  }

  async delete(id: string, scope: MemoryScope, directory: string | null): Promise<void> {
    const response = await call(this.requester, {
      method: 'DELETE',
      path: memoryItemPath(id),
      query: queryFor(scope, directory),
    }, 'delete');
    if (response.status < 200 || response.status >= 300) throw describeFailure(response.status, 'delete');
  }
}
