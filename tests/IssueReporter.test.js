import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import IssueReporter from '../src/IssueReporter.vue'

const defaultProps = {
  mode: 'direct',
  repo: 'jamboid/gh-issue-reporter',
  token: 'test-token',
}

describe('IssueReporter', () => {
  afterEach(() => vi.restoreAllMocks())

  it('proxy mode posts to backend endpoint without token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://github.com/jamboid/gh-issue-reporter/issues/1' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const wrapper = mount(IssueReporter, {
      props: { mode: 'proxy', context: 'test' },
    })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="title"]').setValue('Proxy bug')
    await wrapper.find('[data-testid="submit"]').trigger('click')

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/github/issues')
    expect(options.headers.Authorization).toBeUndefined()
    const body = JSON.parse(options.body)
    expect(body.title).toBe('Proxy bug')
  })

  it('renders floating trigger button', () => {
    const wrapper = mount(IssueReporter, { props: defaultProps })
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true)
  })

  it('modal is hidden initially', () => {
    const wrapper = mount(IssueReporter, { props: defaultProps })
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
  })

  it('clicking trigger opens modal', async () => {
    const wrapper = mount(IssueReporter, { props: defaultProps })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(true)
  })

  it('clicking backdrop closes modal', async () => {
    const wrapper = mount(IssueReporter, { props: defaultProps })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="modal"]').trigger('click')
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
  })

  it('context falls back to window.location.href when not provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html_url: 'https://github.com/jamboid/gh-issue-reporter/issues/1' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const wrapper = mount(IssueReporter, { props: defaultProps })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="submit"]').trigger('click')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.body).toContain(window.location.href)
  })

  it('success state shows issue URL as a link', async () => {
    const issueUrl = 'https://github.com/jamboid/gh-issue-reporter/issues/42'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html_url: issueUrl }),
    }))

    const wrapper = mount(IssueReporter, { props: defaultProps })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="submit"]').trigger('click')
    await wrapper.vm.$nextTick()

    const link = wrapper.find('[data-testid="issue-link"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe(issueUrl)
    expect(wrapper.find('[data-testid="title"]').exists()).toBe(false)
  })

  it('error state shows error message and keeps form visible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'Validation failed' }),
    }))

    const wrapper = mount(IssueReporter, { props: defaultProps })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="submit"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="title"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Validation failed')
  })

  it('direct mode submit sends correct payload to GitHub API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html_url: 'https://github.com/jamboid/gh-issue-reporter/issues/1' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const wrapper = mount(IssueReporter, {
      props: { ...defaultProps, context: 'page:/test' },
    })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="title"]').setValue('My bug')
    await wrapper.find('[data-testid="type"]').setValue('bug')
    await wrapper.find('[data-testid="description"]').setValue('It broke')
    await wrapper.find('[data-testid="submit"]').trigger('click')

    const [url, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(url).toBe('https://api.github.com/repos/jamboid/gh-issue-reporter/issues')
    expect(options.headers.Authorization).toBe('Bearer test-token')
    expect(body.title).toBe('My bug')
    expect(body.labels).toEqual(['bug'])
    expect(body.body).toContain('It broke')
    expect(body.body).toContain('page:/test')
  })
})
