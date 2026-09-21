import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { AgentMemoryApp } from './App.ts';
import { supportsOpenCodeRequest } from './host-features.ts';

const UNSUPPORTED_HOST_MESSAGE = 'This OpenChamber build does not provide authenticated OpenCode requests. Update OpenChamber to use Agent Memory.';

const root = document.querySelector<HTMLElement>('#root');
if (!root) throw new Error('Missing Agent Memory panel root.');

const host = connectHost();
const app = new AgentMemoryApp(root, host);
const stopReady = host.onReady((context) => {
  applyHostReady(context, document.documentElement);
  if (supportsOpenCodeRequest(context)) app.setHostReady(context.directory, context.locale);
  else app.setHostUnsupported(UNSUPPORTED_HOST_MESSAGE);
});
const stopDirectory = host.onDirectory((directory) => app.setDirectory(directory));

window.addEventListener('pagehide', () => {
  stopReady();
  stopDirectory();
  app.dispose();
  host.dispose();
}, { once: true });
