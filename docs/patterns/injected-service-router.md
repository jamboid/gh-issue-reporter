# Injected Service Router

## Problem statement

An Express route handler needs to create a GitHub issue. The straightforward approach is to construct the GitHub client inside the route handler — importing it, passing in credentials, and calling it directly. This creates two problems.

First, **the route is untestable without real credentials and a live network.** There's no way to verify that the route returns 401 when GitHub rejects the token, or 422 when the issue body is malformed, without actually triggering those conditions against GitHub's API. Tests become slow, flaky, and dependent on the environment.

Second, **the route is coupled to one specific implementation.** If you want to swap GitHub for a different issue tracker, or add a caching layer, you have to edit the route file. The route conflates "handle HTTP" with "talk to GitHub."

Injecting the service as a parameter separates these responsibilities: the router handles HTTP mechanics, and the service handles API mechanics. The connection between them is made by the caller.

## Implementation in this codebase

`githubRouter` is a factory that accepts a service object and returns an Express `Router`. It never imports or constructs the service itself:

```js
// src/githubRouter.js
import { Router } from 'express'

export function githubRouter(service) {
  const router = Router()

  router.post('/issues', async (req, res) => {
    const { title, body, label } = req.body
    try {
      const result = await service.createIssue({ title, body, label })
      res.json(result)
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message })
    }
  })

  return router
}
```

The service is wired in by the caller — the Express app that mounts the router:

```js
// In the host Express app
import { githubRouter, githubService } from '@jamboid/gh-issue-reporter/server'

const service = githubService({ repo: 'owner/repo', token: process.env.GITHUB_TOKEN })
app.use('/api/github', githubRouter(service))
```

In tests, a mock object takes the service's place:

```js
// tests/githubRouter.test.js
const mockService = { createIssue: vi.fn() }
const app = express().use(express.json()).use('/', githubRouter(mockService))

mockService.createIssue.mockRejectedValue(Object.assign(new Error('Not authorized'), { status: 401 }))
const res = await request(app).post('/issues').send({})
expect(res.status).toBe(401)
```

No network call, no credentials, no live GitHub API — just a function that throws the right error. The router test can cover every error code and edge case in milliseconds.

The service interface the router expects is minimal: an object with a `createIssue({ title, body, label })` method that returns a promise. Any object satisfying that shape works — the built-in `githubService`, a mock, or a custom implementation.

## Advantages

- **Full test coverage without a network.** Every HTTP status code the router can emit is testable by controlling what the mock service throws or returns.
- **The router stays focused on HTTP.** It extracts fields from the request, delegates to the service, and maps results back to HTTP responses. It does nothing else.
- **The service is swappable.** A custom service that logs to a database before posting, rate-limits requests, or posts to a different tracker can replace `githubService` without touching the router.

## Disadvantages

- **The service interface is informal.** There's no TypeScript interface enforcing `{ createIssue({ title, body, label }): Promise<{ url }> }`. A service that returns `{ html_url }` instead of `{ url }` silently breaks the response without an error.
- **Wiring is the caller's responsibility.** The caller must know to construct the service before the router, pass it in, and mount the router at the right path. There's no default configuration if they omit it.

## Key files

- `src/githubRouter.js` — accepts a service as a parameter; handles HTTP request/response only
- `src/githubService.js` — the default service implementation; satisfies the router's expected interface
- `tests/githubRouter.test.js` — demonstrates testing the router with a mock service; no network required
