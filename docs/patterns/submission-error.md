# Typed Error with HTTP Status (SubmissionError)

## Problem statement

When something goes wrong during issue submission, two different parts of the system need information about that failure: the Express router needs an HTTP status code to forward to the client, and the Vue component needs a human-readable message to display inline.

Without a consistent error shape, each throw site makes its own decision. One might throw a plain object `{ status: 422, message: '...' }`. Another might throw a standard `Error` with `.message` but no `.status`. A third might throw a string. The router then has to guess: `res.status(e.status || 500)` — the `|| 500` is a silent fallback for "I don't know what this is."

Plain object throws have a further problem: they aren't `Error` instances. This means they don't have a stack trace, don't work correctly with `instanceof`, and behave unexpectedly with some promise rejection handlers and logging tools.

The typed error pattern gives the failure a name, a consistent shape, and real `Error` semantics.

## Implementation in this codebase

`SubmissionError` extends the native `Error` class and adds a `.status` property:

```js
// src/githubService.js
export class SubmissionError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
```

Every throw site in the GitHub API layer uses it. When the GitHub API returns a non-2xx response, `postGitHubIssue` throws with the HTTP status and GitHub's error message:

```js
if (!res.ok) throw new SubmissionError(res.status, data.message || `GitHub API error: ${res.status}`)
```

When `githubService` is constructed without a token, it throws immediately with a 503:

```js
if (!token) throw new SubmissionError(503, 'token is required')
```

The router catches whatever the service throws and reads `.status` to forward the right HTTP code:

```js
// src/githubRouter.js
} catch (e) {
  res.status(e.status || 500).json({ error: e.message })
}
```

Because `SubmissionError` is an `Error` subclass, both `.status` and `.message` are always present and reliable. The `|| 500` fallback still protects against unexpected throws from custom services — it's a defensive default, not the primary path.

The Vue component catches errors from adapters and reads `.message` for the inline error display:

```js
// src/IssueReporter.vue
} catch (e) {
  error.value = e.message
}
```

Both the router and the component get what they need from the same thrown object.

## Advantages

- **One error shape everywhere.** Every throw in the GitHub API layer produces a `SubmissionError`. Callers don't need to defensively check whether `.status` exists or whether the thrown value is an `Error` or a plain object.
- **Full `Error` semantics.** Stack traces, `instanceof` checks, and promise rejection handlers all work correctly. A logging tool that expects `Error` instances won't drop the error silently.
- **Construction-time failures are explicit.** `githubService` throws a `SubmissionError(503, ...)` immediately if the token is missing — not on the first request. The failure is loud, typed, and carries a meaningful status code.
- **Tests can assert on the type.** `rejects.toMatchObject({ status: 422 })` works on `SubmissionError` instances because `toMatchObject` checks properties regardless of class. Tests can also use `instanceof SubmissionError` for stricter assertions if needed.

## Disadvantages

- **`SubmissionError` is not part of the public API.** It's exported from `src/githubService.js` but not re-exported from either entry point. A custom adapter author who wants to throw the same type has to import from an internal path.
- **The router still duck-types `.status`.** The `e.status || 500` pattern works for `SubmissionError` but also for any Error with `.status` attached. This flexibility is intentional (it supports custom services), but it means the router doesn't enforce that thrown errors are `SubmissionError` instances.

## Key files

- `src/githubService.js` — defines `SubmissionError`; `postGitHubIssue` and `githubService` both throw it
- `src/githubRouter.js` — reads `e.status` and `e.message` from caught errors to build the HTTP response
- `src/IssueReporter.vue` — reads `e.message` from caught adapter errors to display inline
- `tests/githubService.test.js` — verifies `SubmissionError` carries both `.status` and `.message`
