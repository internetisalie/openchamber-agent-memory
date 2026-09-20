import type { HostClient } from '@openchamber/sdk';
import {
  mountBadge,
  mountBanner,
  mountButton,
  mountEmpty,
  mountSpinner,
  mountTabs,
} from '@openchamber/sdk/ui';
import { MemoryApi, type MemoryDraft } from './api.ts';
import { MemoryController, type MemorySnapshot } from './controller.ts';
import type { MemoryDate, MemoryRecord, MemoryScope } from './model.ts';

const STYLE = `
  * { box-sizing: border-box; }
  body { background: var(--oc-bg); color: var(--oc-fg); font-family: var(--oc-font); }
  button, input, textarea { font: inherit; }
  button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid var(--oc-focus); outline-offset: 2px; }
  .app { height: 100%; min-height: 0; display: grid; grid-template-rows: auto auto auto minmax(0, 1fr); }
  .masthead { padding: 17px 18px 13px; border-bottom: 1px solid var(--oc-border); display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .identity { min-width: 0; }
  .eyebrow { margin: 0 0 3px; color: var(--oc-muted); font-size: 10px; font-weight: 750; letter-spacing: .14em; text-transform: uppercase; }
  h1 { margin: 0; font-size: 19px; line-height: 1.15; letter-spacing: -.025em; }
  .scope-context { min-width: 0; max-width: 52%; color: var(--oc-muted); font: 11px/1.4 var(--oc-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .toolbar { padding: 11px 14px; border-bottom: 1px solid var(--oc-border); display: grid; grid-template-columns: auto minmax(150px, 1fr) auto; align-items: center; gap: 10px; background: var(--oc-muted-surface); }
  .search-form { min-width: 0; display: flex; gap: 7px; }
  .search-input { width: 100%; min-width: 0; height: 32px; padding: 0 10px; border: 1px solid var(--oc-border); border-radius: var(--oc-radius); background: var(--oc-bg); color: var(--oc-fg); }
  .search-input::placeholder { color: var(--oc-muted); }
  .button-row { display: flex; align-items: center; gap: 6px; }
  .notice:empty { display: none; }
  .notice { padding: 10px 14px 0; }
  .workspace { min-height: 0; display: grid; grid-template-columns: minmax(210px, 36%) minmax(0, 1fr); }
  .list-pane { min-height: 0; overflow: auto; padding: 10px; border-right: 1px solid var(--oc-border); background: var(--oc-muted-surface); }
  .memory-row { width: 100%; margin: 0 0 7px; padding: 11px; border: 1px solid transparent; border-radius: var(--oc-radius); background: transparent; color: inherit; text-align: left; cursor: pointer; transition: background 100ms ease, border-color 100ms ease; }
  .memory-row:hover { background: var(--oc-hover); }
  .memory-row[aria-selected="true"] { border-color: var(--oc-border); background: var(--oc-selection); color: var(--oc-selection-fg); box-shadow: inset 3px 0 0 var(--oc-primary); }
  .row-title { overflow: hidden; font-size: 13px; font-weight: 680; text-overflow: ellipsis; white-space: nowrap; }
  .row-meta { margin-top: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--oc-muted); font-size: 10px; }
  .memory-row[aria-selected="true"] .row-meta { color: inherit; opacity: .72; }
  .row-type { overflow: hidden; font-family: var(--oc-mono); text-overflow: ellipsis; white-space: nowrap; }
  .detail { min-width: 0; min-height: 0; overflow: auto; padding: 20px clamp(16px, 4vw, 32px) 30px; }
  .detail-header { padding-bottom: 14px; border-bottom: 1px solid var(--oc-border); display: flex; align-items: start; justify-content: space-between; gap: 16px; }
  .detail-title { margin: 0 0 8px; font-size: 20px; line-height: 1.25; letter-spacing: -.02em; overflow-wrap: anywhere; }
  .detail-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--oc-muted); font-size: 11px; }
  .detail-actions { flex: none; display: flex; gap: 6px; }
  .memory-body { margin-top: 18px; font: 13px/1.65 var(--oc-font); white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; }
  .memory-body:empty::before { content: "This memory has no body."; color: var(--oc-muted); font-style: italic; }
  .edit-form { display: grid; gap: 14px; }
  .field { display: grid; gap: 6px; }
  .field label { color: var(--oc-muted); font-size: 11px; font-weight: 650; }
  .field input, .field textarea { width: 100%; border: 1px solid var(--oc-border); border-radius: var(--oc-radius); background: var(--oc-bg); color: var(--oc-fg); }
  .field input { height: 36px; padding: 0 10px; }
  .field textarea { min-height: 230px; padding: 10px; font: 12px/1.55 var(--oc-mono); resize: vertical; }
  .form-actions { display: flex; justify-content: flex-end; gap: 7px; }
  .danger-zone { margin-top: 16px; padding: 13px; border: 1px solid color-mix(in srgb, var(--oc-error) 45%, var(--oc-border)); border-radius: var(--oc-radius); background: color-mix(in srgb, var(--oc-error) 9%, transparent); }
  .danger-title { margin: 0; color: var(--oc-error-text); font-size: 12px; font-weight: 750; }
  .danger-copy { margin: 5px 0 11px; color: var(--oc-muted); font-size: 11px; line-height: 1.45; }
  .state { min-height: 0; overflow: auto; padding: 28px 18px; }
  .state .oc-sdk-spinner { justify-content: center; }
  .state-actions { margin-top: 14px; display: flex; justify-content: center; }
  .list-summary { padding: 3px 4px 10px; color: var(--oc-muted); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
  @media (max-width: 620px) {
    .masthead { padding: 14px; }
    .scope-context { max-width: 43%; }
    .toolbar { grid-template-columns: 1fr auto; }
    .toolbar-tabs { grid-column: 1 / -1; }
    .workspace { grid-template-columns: 1fr; grid-template-rows: minmax(120px, 34%) minmax(0, 1fr); }
    .list-pane { border-right: 0; border-bottom: 1px solid var(--oc-border); }
    .detail { padding: 17px 14px 24px; }
    .detail-header { display: grid; }
    .detail-actions { justify-content: flex-start; }
  }
`;

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const selectedMemory = (snapshot: MemorySnapshot): MemoryRecord | null => (
  snapshot.memories.find((memory) => memory.id === snapshot.selectedId) ?? null
);

export class AgentMemoryApp {
  private readonly controller: MemoryController;
  private locale = 'en';

  constructor(private readonly root: HTMLElement, host: Pick<HostClient, 'openCodeRequest'>) {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.append(style);
    this.controller = new MemoryController({
      api: new MemoryApi(host),
      onChange: (snapshot) => this.render(snapshot),
    });
    this.render(this.controller.snapshot());
  }

  setHostReady(directory: string | null, locale: string): void {
    this.locale = locale;
    this.controller.setHostReady(directory);
  }

  setDirectory(directory: string | null): void {
    this.controller.setDirectory(directory);
  }

  dispose(): void {
    this.controller.dispose();
  }

  private render(snapshot: MemorySnapshot): void {
    this.root.replaceChildren();
    const app = element('section', 'app');
    app.append(this.renderHeader(snapshot), this.renderToolbar(snapshot));

    const notice = element('div', 'notice');
    if (snapshot.error && snapshot.memories.length > 0) {
      mountBanner(notice, { tone: 'warning', title: 'Refresh interrupted', body: snapshot.error });
    } else if (snapshot.mutationError) {
      mountBanner(notice, { tone: 'error', title: 'Memory was not changed', body: snapshot.mutationError });
    }
    app.append(notice, this.renderContent(snapshot));
    this.root.append(app);
  }

  private renderHeader(snapshot: MemorySnapshot): HTMLElement {
    const header = element('header', 'masthead');
    const identity = element('div', 'identity');
    identity.append(element('p', 'eyebrow', 'Agent-written context'), element('h1', undefined, 'Agent Memory'));
    const context = element('div', 'scope-context');
    context.title = snapshot.scope === 'global' ? 'Global memories' : snapshot.directory ?? 'No project open';
    context.textContent = snapshot.scope === 'global'
      ? 'Across projects'
      : snapshot.directory ?? 'No project open';
    header.append(identity, context);
    return header;
  }

  private renderToolbar(snapshot: MemorySnapshot): HTMLElement {
    const toolbar = element('div', 'toolbar');
    const tabsRoot = element('div', 'toolbar-tabs');
    mountTabs(tabsRoot, {
      items: [
        { id: 'global', label: 'Global' },
        { id: 'project', label: 'Project' },
      ],
      activeId: snapshot.scope,
      trackBackground: true,
      onChange: (id) => {
        if (id === 'global' || id === 'project') this.controller.setScope(id satisfies MemoryScope);
      },
    });

    const search = element('form', 'search-form');
    search.setAttribute('role', 'search');
    const input = element('input', 'search-input');
    input.type = 'search';
    input.name = 'q';
    input.value = snapshot.search;
    input.placeholder = 'Search title, type, or body';
    input.setAttribute('aria-label', 'Search memories');
    const submitRoot = element('div');
    mountButton(submitRoot, { label: 'Search', size: 'sm', variant: 'secondary', onClick: () => search.requestSubmit() });
    search.addEventListener('submit', (event) => {
      event.preventDefault();
      this.controller.setSearch(input.value);
    });
    search.append(input, submitRoot);

    const actions = element('div', 'button-row');
    if (snapshot.search) {
      const clearRoot = element('div');
      mountButton(clearRoot, { label: 'Clear', size: 'sm', variant: 'ghost', onClick: () => this.controller.setSearch('') });
      actions.append(clearRoot);
    }
    const refreshRoot = element('div');
    mountButton(refreshRoot, {
      label: 'Refresh',
      size: 'sm',
      variant: 'outline',
      disabled: !snapshot.hostReady || (snapshot.scope === 'project' && !snapshot.directory),
      loading: snapshot.status === 'loading' && snapshot.memories.length > 0,
      onClick: () => this.controller.refresh(),
    });
    actions.append(refreshRoot);
    toolbar.append(tabsRoot, search, actions);
    return toolbar;
  }

  private renderContent(snapshot: MemorySnapshot): HTMLElement {
    if (!snapshot.hostReady || (snapshot.status === 'loading' && snapshot.memories.length === 0)) {
      const state = element('div', 'state');
      mountSpinner(state, { label: snapshot.hostReady ? 'Loading memories' : 'Connecting to OpenChamber' });
      return state;
    }
    if (snapshot.scope === 'project' && !snapshot.directory) {
      const state = element('div', 'state');
      mountEmpty(state, {
        title: 'Open a project to view its memories',
        body: 'Project memories follow the current OpenChamber directory. Global memories remain available without a project.',
      });
      return state;
    }
    if (snapshot.status === 'error' && snapshot.memories.length === 0) {
      const state = element('div', 'state');
      mountBanner(state, {
        tone: 'error',
        title: 'Could not load agent memories',
        body: snapshot.error ?? 'The memory plugin did not return a usable response.',
      });
      const actions = element('div', 'state-actions');
      mountButton(actions, { label: 'Try again', size: 'sm', variant: 'outline', onClick: () => this.controller.refresh() });
      state.append(actions);
      return state;
    }
    if (snapshot.memories.length === 0) {
      const state = element('div', 'state');
      mountEmpty(state, {
        title: snapshot.search ? 'No matching memories' : `No ${snapshot.scope} memories`,
        body: snapshot.search
          ? 'Try a broader search. Search is applied by the memory plugin.'
          : 'Memories are created by agents and will appear here when available.',
      });
      return state;
    }

    const workspace = element('div', 'workspace');
    workspace.append(this.renderList(snapshot), this.renderDetail(snapshot));
    return workspace;
  }

  private renderList(snapshot: MemorySnapshot): HTMLElement {
    const list = element('nav', 'list-pane');
    list.setAttribute('aria-label', `${snapshot.scope} memories`);
    list.append(element('div', 'list-summary', `${snapshot.memories.length} memor${snapshot.memories.length === 1 ? 'y' : 'ies'}`));
    for (const memory of snapshot.memories) {
      const row = element('button', 'memory-row');
      row.type = 'button';
      row.setAttribute('aria-selected', String(memory.id === snapshot.selectedId));
      row.addEventListener('click', () => this.controller.select(memory.id));
      row.append(element('div', 'row-title', memory.title));
      const meta = element('div', 'row-meta');
      meta.append(element('span', 'row-type', memory.type), element('time', undefined, this.formatDate(memory.updatedAt, true)));
      row.append(meta);
      list.append(row);
    }
    return list;
  }

  private renderDetail(snapshot: MemorySnapshot): HTMLElement {
    const detail = element('article', 'detail');
    const memory = selectedMemory(snapshot);
    if (!memory) return detail;
    if (snapshot.editing) {
      detail.append(this.renderEdit(snapshot, memory));
      return detail;
    }

    const header = element('header', 'detail-header');
    const heading = element('div');
    heading.append(element('h2', 'detail-title', memory.title));
    const meta = element('div', 'detail-meta');
    const badgeRoot = element('span');
    mountBadge(badgeRoot, { label: memory.type, tone: 'info' });
    const updated = element('span', undefined, `Updated ${this.formatDate(memory.updatedAt)}`);
    const created = element('span', undefined, `Created ${this.formatDate(memory.createdAt)}`);
    meta.append(badgeRoot, updated, created);
    heading.append(meta);

    const actions = element('div', 'detail-actions');
    const editRoot = element('div');
    mountButton(editRoot, { label: 'Edit', size: 'sm', variant: 'outline', onClick: () => this.controller.beginEdit() });
    const deleteRoot = element('div');
    mountButton(deleteRoot, { label: 'Delete', size: 'sm', variant: 'ghost', onClick: () => this.controller.requestDelete() });
    actions.append(editRoot, deleteRoot);
    header.append(heading, actions);
    detail.append(header, element('div', 'memory-body', memory.content));

    if (snapshot.confirmingDelete) detail.append(this.renderDeleteConfirmation(snapshot, memory));
    return detail;
  }

  private renderEdit(snapshot: MemorySnapshot, memory: MemoryRecord): HTMLElement {
    const form = element('form', 'edit-form');
    const title = this.renderField('Title', 'text', memory.title);
    const type = this.renderField('Type', 'text', memory.type);
    const content = this.renderField('Body', 'textarea', memory.content);
    const titleInput = title.querySelector('input');
    const typeInput = type.querySelector('input');
    const contentInput = content.querySelector('textarea');
    if (!titleInput || !typeInput || !contentInput) throw new Error('Missing edit fields.');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const draft: MemoryDraft = { title: titleInput.value, type: typeInput.value, content: contentInput.value };
      void this.controller.save(draft);
    });
    const actions = element('div', 'form-actions');
    const cancelRoot = element('div');
    mountButton(cancelRoot, {
      label: 'Cancel',
      variant: 'ghost',
      disabled: snapshot.mutation === 'saving',
      onClick: () => this.controller.cancelEdit(),
    });
    const saveRoot = element('div');
    mountButton(saveRoot, {
      label: 'Save changes',
      loading: snapshot.mutation === 'saving',
      disabled: snapshot.mutation !== null,
      onClick: () => form.requestSubmit(),
    });
    actions.append(cancelRoot, saveRoot);
    form.append(title, type, content, actions);
    return form;
  }

  private renderField(labelText: string, kind: 'text' | 'textarea', value: string): HTMLElement {
    const field = element('div', 'field');
    const id = `memory-${labelText.toLowerCase()}`;
    const label = element('label', undefined, labelText);
    label.htmlFor = id;
    if (kind === 'textarea') {
      const input = element('textarea');
      input.id = id;
      input.value = value;
      field.append(label, input);
    } else {
      const input = element('input');
      input.id = id;
      input.type = 'text';
      input.required = true;
      input.value = value;
      field.append(label, input);
    }
    return field;
  }

  private renderDeleteConfirmation(snapshot: MemorySnapshot, memory: MemoryRecord): HTMLElement {
    const zone = element('section', 'danger-zone');
    zone.append(
      element('h3', 'danger-title', `Delete “${memory.title}”?`),
      element('p', 'danger-copy', 'This permanently removes the memory. This action cannot be undone.'),
    );
    const actions = element('div', 'button-row');
    const cancelRoot = element('div');
    mountButton(cancelRoot, {
      label: 'Keep memory',
      size: 'sm',
      variant: 'ghost',
      disabled: snapshot.mutation === 'deleting',
      onClick: () => this.controller.cancelDelete(),
    });
    const confirmRoot = element('div');
    mountButton(confirmRoot, {
      label: 'Delete permanently',
      size: 'sm',
      variant: 'destructive',
      loading: snapshot.mutation === 'deleting',
      disabled: snapshot.mutation !== null,
      onClick: () => { void this.controller.confirmDelete(); },
    });
    actions.append(cancelRoot, confirmRoot);
    zone.append(actions);
    return zone;
  }

  private formatDate(value: MemoryDate, compact = false): string {
    const date = new Date(value);
    return new Intl.DateTimeFormat(this.locale, compact
      ? { month: 'short', day: 'numeric' }
      : { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
}
