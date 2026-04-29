# @jamboid/gh-issue-reporter

A self-contained Vue component for reporting GitHub issues from any Vue + Vite app. Drop in a single component; get a floating button and modal form that submits directly to the GitHub Issues API.

## Purpose

Eliminates copy-pasting issue reporting code across projects. Install once as a local workspace dependency, mount one component, done.

## Functionality

- Fixed floating button (bottom-right) that opens a modal on click
- Form with title, issue type select, and description textarea
- Current app context (URL or custom string/object) appended to every issue body
- Two auth modes:
  - **direct** — component calls the GitHub API from the browser using a token prop
  - **proxy** — component posts to your app's Express backend (`/api/github/issues`), keeping the token server-side
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

```vue
<IssueReporter
  mode="direct"
  repo="owner/repo"
  :token="token"
  :context="currentRoute"
/>
```

```js
import IssueReporter from '@jamboid/gh-issue-reporter'
const token = import.meta.env.VITE_GITHUB_TOKEN
```

### Proxy mode (apps with an Express backend)

```vue
<IssueReporter mode="proxy" :context="currentRoute" />
```

Register the server-side router in your Express app:

```js
import { githubRouter, githubService } from '@jamboid/gh-issue-reporter/server'
app.use('/api/github', githubRouter(githubService({ repo: 'owner/repo' })))
```

The service reads `GITHUB_TOKEN` from `process.env`.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `mode` | `String` | — | **Required.** `'direct'` or `'proxy'` |
| `repo` | `String` | `''` | Required for direct mode. `'owner/repo'` |
| `token` | `String` | `''` | Required for direct mode |
| `context` | `String\|Object` | `null` | Falls back to `window.location.href` |
| `issueTypes` | `Array<{label, value}>` | Bug / Feature Request | Options for the type select |

## Demo

```
cp demo/.env.example demo/.env.local
# add your token to demo/.env.local
npm run demo
```
