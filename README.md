# @jamboid/gh-issue-reporter

A self-contained Vue component for reporting GitHub issues from any Vue + Vite app. Drop in a single component; get a floating button and modal form that submits directly to the GitHub Issues API.

## Purpose

Eliminates copy-pasting issue reporting code across projects. Install once as a local workspace dependency, mount one component, done.

## Functionality

- Fixed floating button (bottom-right) that opens a modal on click
- Form with title, issue type select, and description textarea
- Current app context (URL or custom string/object) appended to every issue body
- Submission is handled by a **submission adapter** you provide — use the built-in adapters or write your own
- Success state shows a link to the created issue; error state shows the failure message inline
- Fully self-contained styles — no dependency on the host app's design system

## Installation

Add to your project as a local workspace dependency:

```json
"dependencies": {
  "@jamboid/gh-issue-reporter": "file:../gh-issue-reporter"
}
```

Then run `npm install`.

For Vite projects, allow the package source to be served:

```js
// vite.config.js
server: { fs: { allow: ['..'] } }
```

## Usage

### Direct mode (client-only apps)

```js
import IssueReporter, { createDirectAdapter } from '@jamboid/gh-issue-reporter'

const token = import.meta.env.VITE_GITHUB_TOKEN
const submit = createDirectAdapter({ repo: 'owner/repo', token })
```

```vue
<IssueReporter :submit="submit" :context="currentRoute" />
```

### Proxy mode (apps with an Express backend)

```js
import IssueReporter, { createProxyAdapter } from '@jamboid/gh-issue-reporter'

const submit = createProxyAdapter() // defaults to /api/github/issues
```

```vue
<IssueReporter :submit="submit" :context="currentRoute" />
```

Register the server-side router in your Express app:

```js
import { githubRouter, githubService } from '@jamboid/gh-issue-reporter/server'

const token = process.env.GITHUB_TOKEN
app.use('/api/github', githubRouter(githubService({ repo: 'owner/repo', token })))
```

### Custom adapter

Supply any async function matching the signature:

```js
// ({ title, description, type, context }) => Promise<{ url: string }>
const submit = async ({ title, description, type, context }) => {
  const res = await fetch('/my/endpoint', { method: 'POST', body: JSON.stringify({ title, description, type, context }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message)
  return { url: data.url }
}
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `submit` | `Function` | — | **Required.** `({ title, description, type, context }) => Promise<{ url }>` |
| `context` | `String\|Object` | `null` | Falls back to `window.location.href` |
| `issueTypes` | `Array<{label, value}>` | Bug / Feature Request | Options for the type select |

## Demo

```
cp demo/.env.example demo/.env.local
# add your token to demo/.env.local
npm run demo
```
