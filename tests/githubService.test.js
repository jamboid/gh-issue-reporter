import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { githubService } from '../src/githubService.js'

const ISSUE_URL = 'https://github.com/jamboid/gh-issue-reporter/issues/1'

function mockSuccessFetch() {
  const mock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ html_url: ISSUE_URL }),
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('githubService', () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'test-token'
  })

  afterEach(() => {
    delete process.env.GITHUB_TOKEN
    vi.restoreAllMocks()
  })

  it('returns {url} on success', async () => {
    mockSuccessFetch()
    const service = githubService({ repo: 'jamboid/gh-issue-reporter' })
    const result = await service.createIssue({ title: 'Test', body: 'Body', label: 'bug' })
    expect(result).toEqual({ url: ISSUE_URL })
  })

  it('sends Authorization: Bearer header', async () => {
    const mock = mockSuccessFetch()
    const service = githubService({ repo: 'jamboid/gh-issue-reporter' })
    await service.createIssue({ title: 'Test', body: 'Body', label: 'bug' })
    expect(mock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token')
  })

  it('sends correct URL and request body', async () => {
    const mock = mockSuccessFetch()
    const service = githubService({ repo: 'jamboid/gh-issue-reporter' })
    await service.createIssue({ title: 'My title', body: 'My body', label: 'enhancement' })
    const [url, options] = mock.mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/jamboid/gh-issue-reporter/issues')
    expect(JSON.parse(options.body)).toEqual({ title: 'My title', body: 'My body', labels: ['enhancement'] })
  })

  it('throws {status, message} on GitHub API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))
    const service = githubService({ repo: 'jamboid/gh-issue-reporter' })
    await expect(service.createIssue({ title: 'T', body: 'B', label: 'bug' }))
      .rejects.toMatchObject({ status: 422 })
  })

  it('throws 503 when GITHUB_TOKEN is absent', async () => {
    delete process.env.GITHUB_TOKEN
    const service = githubService({ repo: 'jamboid/gh-issue-reporter' })
    await expect(service.createIssue({ title: 'T', body: 'B', label: 'bug' }))
      .rejects.toMatchObject({ status: 503 })
  })
})
