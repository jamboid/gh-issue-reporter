export function createDirectAdapter({ repo, token }) {
  return async ({ title, description, type, context }) => {
    const body = `${description}\n\n---\n**Context:** ${context}`
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title, body, labels: [type] }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Submission failed')
    return { url: data.html_url }
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
