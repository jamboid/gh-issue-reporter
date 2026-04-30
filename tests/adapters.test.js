import { describe, it, expect, vi, afterEach } from 'vitest'
import { createDirectAdapter, createProxyAdapter } from '../src/adapters.js'

afterEach(() => vi.restoreAllMocks())

const FORM = { title: 'My bug', description: 'It broke', type: 'bug', context: 'page:/test' }

describe('createDirectAdapter', () => {
  it('POSTs to GitHub API with correct URL, headers, and body', async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html_url: 'https://github.com/owner/repo/issues/1' }),
    })
    vi.stubGlobal('fetch', mock)

    const submit = createDirectAdapter({ repo: 'owner/repo', token: 'tok' })
    await submit(FORM)

    const [url, opts] = mock.mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/owner/repo/issues')
    expect(opts.headers.Authorization).toBe('Bearer tok')
    expect(opts.headers.Accept).toBe('application/vnd.github+json')
    const body = JSON.parse(opts.body)
    expect(body.title).toBe('My bug')
    expect(body.labels).toEqual(['bug'])
    expect(body.body).toContain('It broke')
    expect(body.body).toContain('page:/test')
  })

  it('returns { url } on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html_url: 'https://github.com/owner/repo/issues/1' }),
    }))
    const result = await createDirectAdapter({ repo: 'owner/repo', token: 'tok' })(FORM)
    expect(result).toEqual({ url: 'https://github.com/owner/repo/issues/1' })
  })

  it('throws Error with message on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Bad credentials' }),
    }))
    await expect(createDirectAdapter({ repo: 'owner/repo', token: 'bad' })(FORM))
      .rejects.toThrow('Bad credentials')
  })
})

describe('createProxyAdapter', () => {
  it('POSTs to /api/github/issues by default', async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://github.com/owner/repo/issues/1' }),
    })
    vi.stubGlobal('fetch', mock)
    await createProxyAdapter()(FORM)
    expect(mock.mock.calls[0][0]).toBe('/api/github/issues')
  })

  it('uses custom URL when provided', async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://github.com/owner/repo/issues/1' }),
    })
    vi.stubGlobal('fetch', mock)
    await createProxyAdapter({ url: '/custom/issues' })(FORM)
    expect(mock.mock.calls[0][0]).toBe('/custom/issues')
  })

  it('returns { url } on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://github.com/owner/repo/issues/1' }),
    }))
    const result = await createProxyAdapter()(FORM)
    expect(result).toEqual({ url: 'https://github.com/owner/repo/issues/1' })
  })

  it('throws Error with message on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    }))
    await expect(createProxyAdapter()(FORM)).rejects.toThrow('Server error')
  })
})
