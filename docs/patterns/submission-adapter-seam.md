# Submission Adapter Seam

## Problem statement

A bug-reporting component needs to create GitHub issues. The obvious implementation puts the GitHub API call directly inside the component — but this creates several problems.

First, **the token gets exposed.** Client-side components are bundled into the browser. A GitHub token passed as a prop ends up readable by anyone who opens DevTools. Some projects can't tolerate this and need the token to stay on a server.

Second, **the component becomes untestable in isolation.** Every test has to either mock the network or use real credentials. You can't test the form, validation, or success/error states without also setting up a GitHub API stub.

Third, **swapping submission targets requires editing the component.** If a project already has a backend and wants to route submissions through it, someone has to reach inside the component and change it. There's no configuration option — just a code change.

Without a seam, the component is welded to one specific way of submitting. Adding a second way means forking the component.

## Implementation in this codebase

The component lives in the UI layer. It renders the form and manages state (open/closed, submitting, error, success URL). It knows nothing about GitHub — it only knows it has a `submit` function, and that calling it with the form data will eventually return `{ url }` or throw an error.

```js
// src/IssueReporter.vue
const props = defineProps({
  submit: { type: Function, required: true },
  // ...
})

async function handleSubmit() {
  const result = await props.submit({
    title: form.title,
    description: form.description,
    type: form.type,
    context: contextText.value,
  })
  issueUrl.value = result.url
}
```

The caller — whoever mounts the component in their app — is responsible for providing a `submit` function. Two built-in options ship with the package:

```js
// Direct mode: calls GitHub from the browser using a token in the client environment
const submit = createDirectAdapter({ repo: 'owner/repo', token })

// Proxy mode: POSTs to your own backend, which calls GitHub server-side
const submit = createProxyAdapter() // defaults to POST /api/github/issues
```

Both return a function with the same signature:

```js
({ title, description, type, context }) => Promise<{ url: string }>
```

The component cannot tell which one it's calling. It just invokes `props.submit(...)` and handles whatever comes back.

You can also supply a completely custom function — useful for routing to Jira, a Slack webhook, or a different GitHub org:

```js
const submit = async ({ title, description, type, context }) => {
  const res = await fetch('/my/endpoint', {
    method: 'POST',
    body: JSON.stringify({ title, description, type, context }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return { url: data.url }
}
```

The seam is the `submit` prop — the place where submission behaviour can be changed without touching the component. Swap the adapter; everything else stays the same.

## Advantages

- **Credentials stay where they belong.** Direct adapters keep the token in the calling app's environment variables. Proxy adapters keep it on the server entirely. The component never sees it.
- **The component is testable without network calls.** Tests pass a `vi.fn()` as `submit` and assert on form states — spinner, inline error, success link — without touching the network or needing credentials.
- **Custom submission targets need no fork.** Any async function matching the signature works as an adapter. Projects with unusual requirements don't need to modify the component.

## Disadvantages

- **The caller must choose an adapter.** This is one more decision the integrating developer has to make upfront. There's no in-component fallback — `submit` is a required prop, and omitting it is a Vue warning.
- **The adapter contract is informal.** There's no TypeScript interface enforcing `({ title, description, type, context }) => Promise<{ url }>`. A custom adapter that returns `{ html_url }` instead of `{ url }` will silently break the success state without a runtime error.
- **Error handling is the adapter's responsibility.** The component shows an inline error only if the adapter throws. An adapter that catches and swallows errors will leave the UI in a perpetual submitting state.

## Key files

- `src/IssueReporter.vue` — accepts `submit` as a required prop; calls it in `handleSubmit()`; renders spinner, error, and success states based on the result
- `src/adapters.js` — `createDirectAdapter` and `createProxyAdapter`, both satisfying the adapter contract
- `src/index.js` — re-exports the component and both adapters as the package's public client-side surface
