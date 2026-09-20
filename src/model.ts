export const MEMORY_SCOPES = ['global', 'project'] as const;
export type MemoryScope = (typeof MEMORY_SCOPES)[number];
export type MemoryDate = string | number;

export type MemoryRecord = {
  id: string;
  title: string;
  type: string;
  scope: MemoryScope;
  content: string;
  createdAt: MemoryDate;
  updatedAt: MemoryDate;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const isDateValue = (value: unknown): value is MemoryDate => {
  if (typeof value === 'number') return Number.isFinite(value) && Number.isFinite(new Date(value).getTime());
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
};

export const parseMemoryRecord = (value: unknown): MemoryRecord | null => {
  if (!isRecord(value)) return null;
  if (
    !isNonEmptyString(value.id)
    || !isNonEmptyString(value.title)
    || !isNonEmptyString(value.type)
    || !MEMORY_SCOPES.includes(value.scope as MemoryScope)
    || typeof value.content !== 'string'
    || !isDateValue(value.createdAt)
    || !isDateValue(value.updatedAt)
  ) return null;

  return {
    id: value.id,
    title: value.title,
    type: value.type,
    scope: value.scope as MemoryScope,
    content: value.content,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

export const parseMemoriesResponse = (value: unknown): { memories: MemoryRecord[] } | null => {
  if (!isRecord(value) || !Array.isArray(value.memories)) return null;
  const memories: MemoryRecord[] = [];
  for (const item of value.memories) {
    const memory = parseMemoryRecord(item);
    if (!memory) return null;
    memories.push(memory);
  }
  return { memories };
};

export const parseMemoryResponse = (value: unknown): { memory: MemoryRecord } | null => {
  if (!isRecord(value)) return null;
  const memory = parseMemoryRecord(value.memory);
  return memory ? { memory } : null;
};
