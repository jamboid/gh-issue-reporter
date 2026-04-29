import { Router } from 'express'

export function githubRouter(service) {
  const router = Router()

  router.post('/issues', async (req, res) => {
    const { title, body, label } = req.body
    try {
      const result = await service.createIssue({ title, body, label })
      res.json(result)
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message })
    }
  })

  return router
}
