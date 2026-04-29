import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { githubRouter } from '../src/githubRouter.js'

function makeApp(mockService) {
  return express().use(express.json()).use('/', githubRouter(mockService))
}

describe('githubRouter POST /issues', () => {
  let mockService

  beforeEach(() => {
    mockService = { createIssue: vi.fn() }
  })

  it('returns 200 with url on success', async () => {
    mockService.createIssue.mockResolvedValue({ url: 'https://github.com/jamboid/gh-issue-reporter/issues/1' })
    const res = await request(makeApp(mockService))
      .post('/issues')
      .send({ title: 'Bug report', body: 'Something broke', label: 'bug' })
    expect(res.status).toBe(200)
    expect(res.body.url).toBe('https://github.com/jamboid/gh-issue-reporter/issues/1')
  })

  it('passes title, body, label to service', async () => {
    mockService.createIssue.mockResolvedValue({ url: 'https://github.com/x' })
    await request(makeApp(mockService))
      .post('/issues')
      .send({ title: 'T', body: 'B', label: 'L' })
    expect(mockService.createIssue).toHaveBeenCalledWith({ title: 'T', body: 'B', label: 'L' })
  })

  it('propagates service error status', async () => {
    const err = new Error('Not authorized')
    err.status = 401
    mockService.createIssue.mockRejectedValue(err)
    const res = await request(makeApp(mockService)).post('/issues').send({})
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Not authorized')
  })

  it('returns 500 when service throws without .status', async () => {
    mockService.createIssue.mockRejectedValue(new Error('Network failure'))
    const res = await request(makeApp(mockService)).post('/issues').send({})
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Network failure')
  })
})
