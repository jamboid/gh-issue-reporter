import { postGitHubIssue } from './githubService.js'

export function createDirectAdapter({ repo, token }) {
  return ({ title, description, type, context }) => {
    const body = `${description}\n\n---\n**Context:** ${context}`
    return postGitHubIssue({ repo, token, title, body, labels: [type] })
  }
}

export function createProxyAdapter({ url = '/api/github/issues' } = {}) {
  return async ({ title, description, type, context }) => {
    const body = `${description}\n\n---\n**Context:** ${context}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, label: type }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Submission failed')
    return { url: data.url }
  }
}
