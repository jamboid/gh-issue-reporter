# Factory-Configured Adapter

## Problem statement

An adapter needs two kinds of input: configuration that stays the same for every submission (which repo to post to, which token to use), and data that changes per submission (the form contents). Mixing these together creates problems.

If the component receives the token as a prop, it ends up in the Vue component tree — visible in Vue DevTools, passable between components, and potentially logged. Credentials don't belong in UI state.

If the adapter reads config from a global variable or environment directly, it becomes impossible to test with different configurations and tightly coupled to a specific deployment environment.

If config and form data are passed together in a single function call, the caller must assemble and pass credentials on every submission — which either means storing them in component state or re-fetching them each time.

The factory pattern solves this by separating the two concerns in time: configure once at startup, submit many times with no credentials in sight.

## Implementation in this codebase

Both adapters in the package are factories. A factory is a function that takes configuration and returns another function — the actual adapter. Calling the factory "locks in" the config via a closure; the returned function only needs the form data.

```js
// src/adapters.js

export function createDirectAdapter({ repo, token }) {
  // Config is captured here, at construction time.
  return ({ title, description, type, context }) => {
    // The returned function only takes form data.
    return postGitHubIssue({ repo, token, title, body: formatIssueBody({ description, context }), labels: [type] })
  }
}
```

In practice, the factory is called once when the app starts — typically in the same file where the component is mounted:

```js
// In the host app
const token = import.meta.env.VITE_GITHUB_TOKEN
const submit = createDirectAdapter({ repo: 'owner/repo', token })
```

```vue
<IssueReporter :submit="submit" />
```

From this point on, `token` is held inside the closure and never appears again. The component receives `submit` — a plain function — with no knowledge of what's inside it.

The proxy adapter follows the same shape, but captures a URL instead of credentials:

```js
export function createProxyAdapter({ url = '/api/github/issues' } = {}) {
  return async ({ title, description, type, context }) => {
    // url is captured; only form data is passed per call
    const res = await fetch(url, { ... })
    ...
  }
}
```

The server-side `githubService` uses the same pattern for the same reason — `repo` and `token` are captured at construction, and `createIssue` only takes the issue fields:

```js
// src/githubService.js
export function githubService({ repo, token }) {
  if (!token) throw new SubmissionError(503, 'token is required')
  return {
    createIssue({ title, body, label }) {
      return postGitHubIssue({ repo, token, title, body, labels: [label] })
    },
  }
}
```

## Advantages

- **Credentials never reach the component.** The token is captured in the closure at startup and is invisible to Vue's reactivity system, DevTools, and prop drilling.
- **Configuration is validated early.** `githubService` throws immediately if `token` is missing — at server startup, not buried inside the first request.
- **Tests can configure adapters independently.** Each test can call the factory with its own `repo` and `token` without any shared state between tests.
- **The returned function has a minimal interface.** Callers only pass what changes — the form data. Everything stable is already baked in.

## Disadvantages

- **Configuration errors surface at construction, not at call time.** If the factory is called with bad config (wrong repo name, malformed token), the error appears when the adapter is created — which could be confusing if that happens far from where the adapter is actually used.
- **Dynamic reconfiguration requires a new factory call.** If `repo` or `token` needs to change at runtime, you can't mutate the existing adapter — you create a new one. For most use cases this is fine, but it's worth knowing.

## Key files

- `src/adapters.js` — `createDirectAdapter` and `createProxyAdapter`, both factory functions that close over configuration
- `src/githubService.js` — `githubService` follows the same factory pattern on the server side
- `src/IssueReporter.vue` — receives the pre-configured adapter as `submit`; never sees credentials
