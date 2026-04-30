import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import IssueReporter from '../src/IssueReporter.vue'

const ISSUE_URL = 'https://github.com/owner/repo/issues/1'

let submit
beforeEach(() => { submit = vi.fn().mockResolvedValue({ url: ISSUE_URL }) })
afterEach(() => vi.restoreAllMocks())

describe('IssueReporter', () => {
  it('renders floating trigger button', () => {
    const wrapper = mount(IssueReporter, { props: { submit } })
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true)
  })

  it('modal is hidden initially', () => {
    const wrapper = mount(IssueReporter, { props: { submit } })
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
  })

  it('clicking trigger opens modal', async () => {
    const wrapper = mount(IssueReporter, { props: { submit } })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(true)
  })

  it('clicking backdrop closes modal', async () => {
    const wrapper = mount(IssueReporter, { props: { submit } })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="modal"]').trigger('click')
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
  })

  it('calls submit prop with form fields and resolved context', async () => {
    const wrapper = mount(IssueReporter, { props: { submit, context: 'page:/test' } })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="title"]').setValue('My bug')
    await wrapper.find('[data-testid="type"]').setValue('enhancement')
    await wrapper.find('[data-testid="description"]').setValue('It broke')
    await wrapper.find('[data-testid="submit"]').trigger('click')

    expect(submit).toHaveBeenCalledWith({
      title: 'My bug',
      description: 'It broke',
      type: 'enhancement',
      context: 'page:/test',
    })
  })

  it('context falls back to window.location.href when not provided', async () => {
    const wrapper = mount(IssueReporter, { props: { submit } })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="submit"]').trigger('click')

    expect(submit.mock.calls[0][0].context).toBe(window.location.href)
  })

  it('shows issue URL as a link on success', async () => {
    const wrapper = mount(IssueReporter, { props: { submit } })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="submit"]').trigger('click')
    await wrapper.vm.$nextTick()

    const link = wrapper.find('[data-testid="issue-link"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe(ISSUE_URL)
    expect(wrapper.find('[data-testid="title"]').exists()).toBe(false)
  })

  it('resets to form state when reopened after success', async () => {
    const wrapper = mount(IssueReporter, { props: { submit } })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="submit"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="issue-link"]').exists()).toBe(true)

    await wrapper.find('[data-testid="modal"]').trigger('click') // close via backdrop
    await wrapper.find('[data-testid="trigger"]').trigger('click') // reopen

    expect(wrapper.find('[data-testid="title"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="issue-link"]').exists()).toBe(false)
  })

  it('shows error message and keeps form visible on failure', async () => {
    submit.mockRejectedValue(new Error('Validation failed'))
    const wrapper = mount(IssueReporter, { props: { submit } })
    await wrapper.find('[data-testid="trigger"]').trigger('click')
    await wrapper.find('[data-testid="submit"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="title"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Validation failed')
  })
})
