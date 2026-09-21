import type { MemoryApi, MemoryDraft } from './api.ts';
import type { MemoryRecord, MemoryScope } from './model.ts';

export type LoadStatus = 'waiting' | 'loading' | 'ready' | 'error' | 'unsupported';
export type MutationStatus = 'saving' | 'deleting' | null;

export type MemorySnapshot = {
  hostReady: boolean;
  directory: string | null;
  scope: MemoryScope;
  search: string;
  status: LoadStatus;
  error: string | null;
  memories: readonly MemoryRecord[];
  selectedId: string | null;
  editing: boolean;
  confirmingDelete: boolean;
  mutation: MutationStatus;
  mutationError: string | null;
};

type MemoryDataApi = Pick<MemoryApi, 'list' | 'update' | 'delete'>;

type ControllerOptions = {
  api: MemoryDataApi;
  onChange: (snapshot: MemorySnapshot) => void;
};

const messageOf = (error: unknown): string => (
  error instanceof Error && error.message ? error.message : 'The memory operation failed.'
);

export class MemoryController {
  private readonly api: MemoryDataApi;
  private readonly onChange: (snapshot: MemorySnapshot) => void;
  private generation = 0;
  private disposed = false;
  private hostReady = false;
  private hostSupported = true;
  private directory: string | null = null;
  private scope: MemoryScope = 'global';
  private search = '';
  private status: LoadStatus = 'waiting';
  private error: string | null = null;
  private memories: MemoryRecord[] = [];
  private selectedId: string | null = null;
  private editing = false;
  private confirmingDelete = false;
  private mutation: MutationStatus = null;
  private mutationError: string | null = null;

  constructor(options: ControllerOptions) {
    this.api = options.api;
    this.onChange = options.onChange;
  }

  snapshot(): MemorySnapshot {
    return {
      hostReady: this.hostReady,
      directory: this.directory,
      scope: this.scope,
      search: this.search,
      status: this.status,
      error: this.error,
      memories: [...this.memories],
      selectedId: this.selectedId,
      editing: this.editing,
      confirmingDelete: this.confirmingDelete,
      mutation: this.mutation,
      mutationError: this.mutationError,
    };
  }

  setHostReady(directory: string | null): void {
    if (this.disposed) return;
    const wasReady = this.hostReady;
    const wasSupported = this.hostSupported;
    const changed = this.directory !== directory;
    this.hostReady = true;
    this.hostSupported = true;
    this.directory = directory;
    if (!wasReady || !wasSupported || changed) this.reload(true);
  }

  setHostUnsupported(message: string): void {
    if (this.disposed) return;
    this.generation += 1;
    this.hostReady = true;
    this.hostSupported = false;
    this.status = 'unsupported';
    this.error = message;
    this.memories = [];
    this.selectedId = null;
    this.editing = false;
    this.confirmingDelete = false;
    this.mutation = null;
    this.mutationError = null;
    this.emit();
  }

  setDirectory(directory: string | null): void {
    if (this.disposed || this.directory === directory) return;
    this.directory = directory;
    if (this.hostReady) this.reload(true);
    else this.emit();
  }

  setScope(scope: MemoryScope): void {
    if (this.disposed || this.scope === scope) return;
    this.scope = scope;
    this.reload(true);
  }

  setSearch(search: string): void {
    const next = search.trim();
    if (this.disposed || this.search === next) return;
    this.search = next;
    this.reload(true);
  }

  refresh(): void {
    if (this.disposed || !this.hostReady) return;
    this.reload(false);
  }

  select(id: string): void {
    if (this.disposed || !this.memories.some((memory) => memory.id === id) || this.selectedId === id) return;
    this.selectedId = id;
    this.editing = false;
    this.confirmingDelete = false;
    this.mutationError = null;
    this.emit();
  }

  beginEdit(): void {
    if (this.disposed || !this.selectedId || this.mutation) return;
    this.editing = true;
    this.confirmingDelete = false;
    this.mutationError = null;
    this.emit();
  }

  cancelEdit(): void {
    if (this.disposed || !this.editing || this.mutation) return;
    this.editing = false;
    this.mutationError = null;
    this.emit();
  }

  requestDelete(): void {
    if (this.disposed || !this.selectedId || this.mutation) return;
    this.editing = false;
    this.confirmingDelete = true;
    this.mutationError = null;
    this.emit();
  }

  cancelDelete(): void {
    if (this.disposed || !this.confirmingDelete || this.mutation) return;
    this.confirmingDelete = false;
    this.mutationError = null;
    this.emit();
  }

  async save(draft: MemoryDraft): Promise<void> {
    const selectedId = this.selectedId;
    if (this.disposed || !selectedId || !this.editing || this.mutation) return;
    const normalized: MemoryDraft = {
      title: draft.title.trim(),
      type: draft.type.trim(),
      content: draft.content,
    };
    if (!normalized.title || !normalized.type) {
      this.mutationError = 'Title and type are required.';
      this.emit();
      return;
    }

    const generation = this.generation;
    const scope = this.scope;
    const directory = this.directory;
    this.mutation = 'saving';
    this.mutationError = null;
    this.emit();
    try {
      const memory = await this.api.update(selectedId, scope, directory, normalized);
      if (!this.current(generation) || this.selectedId !== selectedId) return;
      this.memories = this.memories.map((item) => item.id === selectedId ? memory : item);
      this.mutation = null;
      this.editing = false;
      this.emit();
    } catch (error) {
      if (!this.current(generation) || this.selectedId !== selectedId) return;
      this.mutation = null;
      this.mutationError = messageOf(error);
      this.emit();
    }
  }

  async confirmDelete(): Promise<void> {
    const selectedId = this.selectedId;
    if (this.disposed || !selectedId || !this.confirmingDelete || this.mutation) return;
    const generation = this.generation;
    const scope = this.scope;
    const directory = this.directory;
    this.mutation = 'deleting';
    this.mutationError = null;
    this.emit();
    try {
      await this.api.delete(selectedId, scope, directory);
      if (!this.current(generation) || this.selectedId !== selectedId) return;
      const index = this.memories.findIndex((memory) => memory.id === selectedId);
      this.memories = this.memories.filter((memory) => memory.id !== selectedId);
      this.selectedId = this.memories[Math.min(index, this.memories.length - 1)]?.id ?? null;
      this.mutation = null;
      this.confirmingDelete = false;
      this.emit();
    } catch (error) {
      if (!this.current(generation) || this.selectedId !== selectedId) return;
      this.mutation = null;
      this.mutationError = messageOf(error);
      this.emit();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
  }

  private reload(clear: boolean): void {
    this.generation += 1;
    this.editing = false;
    this.confirmingDelete = false;
    this.mutation = null;
    this.mutationError = null;
    if (clear) {
      this.memories = [];
      this.selectedId = null;
    }
    if (!this.hostReady) {
      this.status = 'waiting';
      this.emit();
      return;
    }
    if (!this.hostSupported) {
      this.status = 'unsupported';
      this.emit();
      return;
    }
    this.error = null;
    if (this.scope === 'project' && !this.directory) {
      this.status = 'ready';
      this.memories = [];
      this.selectedId = null;
      this.emit();
      return;
    }
    const generation = this.generation;
    const scope = this.scope;
    const search = this.search;
    const directory = this.directory;
    this.status = 'loading';
    this.emit();
    void this.load(generation, scope, search, directory);
  }

  private async load(
    generation: number,
    scope: MemoryScope,
    search: string,
    directory: string | null,
  ): Promise<void> {
    try {
      const memories = await this.api.list(scope, search, directory);
      if (!this.current(generation)) return;
      this.memories = memories;
      this.selectedId = this.selectedId && memories.some((memory) => memory.id === this.selectedId)
        ? this.selectedId
        : memories[0]?.id ?? null;
      this.status = 'ready';
      this.error = null;
      this.emit();
    } catch (error) {
      if (!this.current(generation)) return;
      this.status = 'error';
      this.error = messageOf(error);
      this.emit();
    }
  }

  private current(generation: number): boolean {
    return !this.disposed && this.generation === generation;
  }

  private emit(): void {
    if (!this.disposed) this.onChange(this.snapshot());
  }
}
