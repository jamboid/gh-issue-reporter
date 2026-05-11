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
  if (!res.ok) {
    const err = new Error(data.message || `GitHub API error: ${res.status}`)
    err.status = res.status
    throw err
  }
  return { url: data.html_url }
}

export function githubService({ repo, token }) {
  if (!token) throw { status: 503, message: 'token is required' }
  return {
    createIssue({ title, body, label }) {
      return postGitHubIssue({ repo, token, title, body, labels: [label] })
    },
  }
}
