# Shared API Primitive with Thin Wrappers

## Problem statement

When multiple parts of a codebase need to call the same external API, the natural instinct is to write the API call wherever it's first needed, then copy it when a second caller appears. This works initially but creates a fragile codebase:

- **Headers drift.** The GitHub API requires specific headers (`Authorization`, `Accept`, `X-GitHub-Api-Version`). If these are written twice, one copy will eventually fall behind — wrong API version, missing header, different error handling.
- **Response parsing duplicates.** Both callers need to read `html_url` from the response JSON and normalise it to `{ url }`. Two implementations means two places where this mapping can be wrong.
- **Error handling splits.** One caller might check `res.ok` before parsing JSON; another might read the error body for a user-facing message. The difference is invisible until something breaks.
- **The surface area for bugs doubles.** A bug in the GitHub API layer must be found in, and fixed in, two places.

The shared primitive pattern addresses this by giving the API call exactly one home.

## Implementation in this codebase

`postGitHubIssue` in `src/githubService.js` is the single function that knows how to talk to the GitHub Issues API. It owns every detail of that interaction: the URL, the required headers, the JSON serialisation, the response parsing, and the error shape.

```js
// src/githubService.js

export async function postGitHubIssue({ repo, token, title, body, labels }) {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title, body, labels }),
  })
  const data = await res.json()
  if (!res.ok) throw new SubmissionError(res.status, data.message || `GitHub API error: ${res.status}`)
  return { url: data.html_url }
}
```

Two callers use it. Neither duplicates the fetch logic — they just prepare their inputs and delegate:

```js
// src/adapters.js — client-side path
export function createDirectAdapter({ repo, token }) {
  return ({ title, description, type, context }) => {
    return postGitHubIssue({ repo, token, title, body: formatIssueBody({ description, context }), labels: [type] })
  }
}
```

```js
// src/githubService.js — server-side path
export function githubService({ repo, token }) {
  return {
    createIssue({ title, body, label }) {
      return postGitHubIssue({ repo, token, title, body, labels: [label] })
    },
  }
}
```

The wrappers handle the concerns that differ between callers — `createDirectAdapter` formats the body from form fields; `githubService.createIssue` accepts a pre-formatted body from the router. But neither touches headers, status codes, or response shapes. Those live in the primitive.

If GitHub changes their API version header or the `html_url` field is renamed, there is exactly one line to update.

## Advantages

- **Locality.** All GitHub API mechanics are in one place. Understanding, debugging, and changing the API interaction requires reading one function.
- **Consistent error shape.** Both callers automatically throw `SubmissionError` with the correct HTTP status — no divergence in how failures are reported.
- **Tests collapse.** Before this pattern existed, both `adapters.test.js` and `githubService.test.js` mocked the same `fetch` call with the same headers. Now the primitive's tests cover that once; the wrapper tests only verify their own logic.
- **The deletion test passes.** If you delete `postGitHubIssue`, the complexity doesn't vanish — it reappears in both wrappers. That's the signal the primitive is earning its keep.

## Disadvantages

- **One more indirection to trace.** A developer reading `createDirectAdapter` for the first time hits an import and must follow it to understand what actually happens. For a codebase this size, the cost is low; in a larger system it's worth documenting clearly.
- **The primitive's interface must satisfy both callers.** Currently both callers pass `labels` as an array, `body` as a pre-formatted string, etc. If a future caller needs different behaviour (e.g., multiple assignees), the primitive's interface must grow to accommodate it or a second primitive must be created.

## Key files

- `src/githubService.js` — `postGitHubIssue`, the primitive; owns all GitHub API mechanics
- `src/adapters.js` — `createDirectAdapter`, a thin client-side wrapper that formats the body before delegating
- `src/githubService.js` — `githubService.createIssue`, a thin server-side wrapper that accepts a pre-formatted body and delegates
