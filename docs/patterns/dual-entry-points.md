# Dual Entry Points (Client vs Server)

## Problem statement

A package that ships both a Vue component and an Express router has a problem: Vue and Express are fundamentally different environments. Vue components are bundled by Vite and run in the browser. Express runs in Node.js on a server. Mixing them in one import causes real failures:

- **Bundlers complain about Node.js-only modules.** Express uses `http`, `net`, and other Node.js built-ins that don't exist in the browser. If a frontend bundler tries to include them, it either errors out or produces a broken bundle.
- **Bundle size balloons unnecessarily.** A client app that only needs the Vue component shouldn't pay the cost of importing Express and all its dependencies.
- **Tree-shaking can't help.** Even if a developer only imports `IssueReporter`, a single-entry package that re-exports everything forces the bundler to at least consider all exports, and some bundlers can't shake Node.js-specific code safely.

Without separate entry points, either the client bundle breaks or the developer must know exactly which internal file to import — bypassing the package's public API entirely.

## Implementation in this codebase

The `package.json` `exports` field defines two named entry points:

```json
// package.json
{
  "exports": {
    ".": "./src/index.js",
    "./server": "./src/server.js"
  }
}
```

Each maps to a dedicated re-export file containing only what belongs in that environment:

```js
// src/index.js — client entry point
export { default } from './IssueReporter.vue'
export { createDirectAdapter, createProxyAdapter } from './adapters.js'
```

```js
// src/server.js — server entry point
export { githubService } from './githubService.js'
export { githubRouter } from './githubRouter.js'
```

Callers import from the appropriate entry point:

```js
// In a Vue app (browser)
import IssueReporter, { createDirectAdapter } from '@jamboid/gh-issue-reporter'

// In an Express app (Node.js)
import { githubRouter, githubService } from '@jamboid/gh-issue-reporter/server'
```

The client entry never mentions Express. The server entry never mentions Vue. A bundler processing the client import can't even see that `githubRouter` exists.

## Advantages

- **Clean environment separation.** Frontend bundlers process only browser-safe code; Node.js processes only server code. No cross-environment pollution.
- **Explicit public API.** The two files make it immediately clear what the package offers and for which context. A developer reading `src/index.js` sees the client API at a glance.
- **Bundle safety.** Vite, webpack, and Rollup all respect the `exports` field. Importing from `'@jamboid/gh-issue-reporter'` provably cannot pull in Express.

## Disadvantages

- **Two APIs to document and maintain.** Changes to the package's public surface must be considered for both entry points — it's easy to accidentally expose something in one that shouldn't be there.
- **Import path is non-obvious for the server side.** `'@jamboid/gh-issue-reporter/server'` is a subpath that developers must know to look for. It won't appear in autocomplete unless the editor supports package `exports` resolution.

## Key files

- `package.json` — defines the `exports` map; the source of truth for what the package exposes
- `src/index.js` — client entry: re-exports `IssueReporter`, `createDirectAdapter`, `createProxyAdapter`
- `src/server.js` — server entry: re-exports `githubService`, `githubRouter`
