# Design Patterns

- [Submission Adapter Seam](submission-adapter-seam.md) — how the component accepts a swappable `submit` function so callers control where issues go and tokens never reach the UI layer
- [Factory-Configured Adapter](factory-configured-adapter.md) — how adapters capture config (repo, token) at construction time via a closure, keeping credentials out of component state
- [Shared API Primitive with Thin Wrappers](shared-api-primitive.md) — how `postGitHubIssue` centralises all GitHub API mechanics so client and server paths share one implementation
