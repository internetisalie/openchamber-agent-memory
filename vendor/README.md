# V2 SDK build

`openchamber-sdk-2.4.0.tgz` is an unpublished local build of the OpenChamber V2
fork SDK. It includes the object-based `ready.features.openCodeRequest` flag and
the authenticated `HostClient.openCodeRequest` operation.

- Upstream source: `3392d9113ea5664c3927f64d77647434bb95be2f`.
- Fork starting source: `d1f2ae0b06c7fb0257f9c0736f0d831253dd856a`.
- Integration branch: `integration/openchamber-v2.4.0-20261018`.
- Integrated source: `d53b80047f678863f320b945020a6f7cca3a6d20`.
- Built on 2026-10-18 with Bun 1.4.3 and Node 24.14.0.
- Tarball SHA-256: `a84a35c2d857e077d03f6c9a71f92359b7d3d0e0399db813ffaa539bdf7c4621`.

The local tarball keeps installation reproducible before the fork's V2 SDK is
published. Build it from the integration repository with:

```bash
bun run --cwd packages/sdk build
npm pack ./packages/sdk --pack-destination ../openchamber-agent-memory-v2/vendor
```

The integration plan records final source and runtime acceptance. Rebuild and
revalidate this extension if SDK runtime sources change after this tarball was
created.
