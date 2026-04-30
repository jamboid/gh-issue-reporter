export function githubService({ repo, token }) {
  if (!token) throw { status: 503, message: 'token is required' }

  return {
    async createIssue({ title, body, label }) {
      const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ title, body, labels: [label] }),
      })

      if (!res.ok) throw { status: res.status, message: `GitHub API error: ${res.status}` }
      const { html_url } = await res.json()
      return { url: html_url }
    },
  }
}
