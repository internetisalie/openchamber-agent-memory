# OpenChamber Agent Memory

A standalone OpenChamber rail panel for browsing and maintaining memories created by
[`opencode-simple-memory`](https://github.com/internetisalie/opencode-plugin-simple-memory).

The panel has separate Global and Project scopes. Project requests follow the current
OpenChamber directory, while Global requests work without an open project. Users can
search, inspect, edit, and deliberately delete memories. There is intentionally no
Create or Add action: memory creation remains agent-only.

## Compatibility

This extension requires OpenChamber `1.24.3-internetisalie.3` or a compatible build
that provides `openCodeRequest`. The manifest grammar cannot encode a fork suffix, so
its `>=1.24.3` engine floor checks only the core version; upstream `1.24.3` alone is
not compatible. The panel also checks the host's `ready.features` list and shows an
update message instead of making requests when `openCodeRequest` is absent. The
extension uses the SDK's authenticated `host.openCodeRequest` transport and never
contacts localhost or port 4747 directly.

The manifest grants only `GET`, `PATCH`, and `DELETE` access to the exact OpenCode
plugin ID `opencode-simple-memory`. It grants no `POST`, `PUT`, filesystem, session,
or Project Knowledge capabilities.

## Install

In **Settings > Extensions**, install:

```text
https://github.com/internetisalie/openchamber-agent-memory.git
```

Approve its OpenCode plugin grant. OpenChamber follows the repository's default branch
and offers updates when its `package.json` version increases. The matching
`opencode-simple-memory` plugin must be configured in the selected OpenCode runtime.

For local development, build the extension and install this repository folder instead.
OpenChamber serves `dist/index.html` and the checked-in `dist/main.js` bundle directly.

## Development

Requirements: Node.js 22 or newer and npm 10 or newer.

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run validate:manifest
```

The SDK dependency is pinned to the release tarball for
`v1.24.3-internetisalie.2`, where `HostClient.openCodeRequest` is available. Run
`npm run build` whenever panel source changes so the installable bundle stays current.

## HTTP Contract

- `GET /memories` lists Global or Project records and optionally searches with `q`.
- `PATCH /memories/:id` edits `title`, `type`, and `content` in the selected scope.
- `DELETE /memories/:id` permanently removes a selected record after confirmation.

Whenever OpenChamber has a current directory, every Global and Project request sends
it so OpenCode core can select the correct plugin instance. The plugin ignores the
query after selection; the extension never treats it as an arbitrary storage path.

## License

MIT
