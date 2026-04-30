import { describe, it, expect, vi, afterEach } from 'vitest'
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

afterEach(() => vi.restoreAllMocks())

describe('githubService', () => {
  it('sends Authorization: Bearer header using construction-time token', async () => {
    const mock = mockSuccessFetch()
    const service = githubService({ repo: 'jamboid/gh-issue-reporter', token: 'my-token' })
    await service.createIssue({ title: 'T', body: 'B', label: 'bug' })
    expect(mock.mock.calls[0][1].headers.Authorization).toBe('Bearer my-token')
  })

  it('sends correct URL and request body', async () => {
    const mock = mockSuccessFetch()
    const service = githubService({ repo: 'jamboid/gh-issue-reporter', token: 'tok' })
    await service.createIssue({ title: 'My title', body: 'My body', label: 'enhancement' })
    const [url, opts] = mock.mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/jamboid/gh-issue-reporter/issues')
    expect(JSON.parse(opts.body)).toEqual({ title: 'My title', body: 'My body', labels: ['enhancement'] })
  })

  it('returns { url } on success', async () => {
    mockSuccessFetch()
    const service = githubService({ repo: 'jamboid/gh-issue-reporter', token: 'tok' })
    const result = await service.createIssue({ title: 'T', body: 'B', label: 'bug' })
    expect(result).toEqual({ url: ISSUE_URL })
  })

  it('throws { status, message } on GitHub API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))
    const service = githubService({ repo: 'jamboid/gh-issue-reporter', token: 'tok' })
    await expect(service.createIssue({ title: 'T', body: 'B', label: 'bug' }))
      .rejects.toMatchObject({ status: 422 })
  })

  it('throws 503 at construction when token is absent', () => {
    expect(() => githubService({ repo: 'jamboid/gh-issue-reporter' }))
      .toThrow(expect.objectContaining({ status: 503 }))
  })
})
