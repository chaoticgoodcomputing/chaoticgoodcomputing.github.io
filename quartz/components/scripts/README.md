# Quartz inline script organization (Option A)

Quartz components often attach client-side behavior via `.afterDOMLoaded` using bundled `.inline.ts` entrypoints.
When an inline script grows too large, split it into a feature directory and keep the `.inline.ts` file as a thin adapter.

## Pattern

For a feature named `X`:

```
quartz/components/scripts/
  X.inline.ts              # (optional) legacy shim to preserve imports
  x/
    main.inline.ts         # entrypoint: event wiring only (no `export`)
    core/
      ...                  # state + orchestration + types (framework-agnostic)
    ui/
      ...                  # DOM construction + DOM mutation + rendering helpers
    adapters/
      ...                  # integration boundaries (network, positioning libs, Quartz lifecycle)
```

## Conventions

- `main.inline.ts` should do as little as possible: wire `"nav"` / `"prenav"` events and delegate to modules.
- Avoid `export` statements inside `*.inline.ts` entrypoints.
- Prefer putting side-effectful code behind `adapters/` so core logic is easier to test.
- Use `window.addCleanup(...)` for all event handlers attached on `"nav"` to avoid leaks under SPA navigation.
