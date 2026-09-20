import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { AgentMemoryApp } from './App.ts';

const root = document.querySelector<HTMLElement>('#root');
if (!root) throw new Error('Missing Agent Memory panel root.');

const host = connectHost();
const app = new AgentMemoryApp(root, host);
const stopReady = host.onReady((context) => {
  applyHostReady(context, document.documentElement);
  app.setHostReady(context.directory, context.locale);
});
const stopDirectory = host.onDirectory((directory) => app.setDirectory(directory));

window.addEventListener('pagehide', () => {
  stopReady();
  stopDirectory();
  app.dispose();
  host.dispose();
}, { once: true });
