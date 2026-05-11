# Design Patterns

- [Submission Adapter Seam](submission-adapter-seam.md) — how the component accepts a swappable `submit` function so callers control where issues go and tokens never reach the UI layer
- [Factory-Configured Adapter](factory-configured-adapter.md) — how adapters capture config (repo, token) at construction time via a closure, keeping credentials out of component state
- [Shared API Primitive with Thin Wrappers](shared-api-primitive.md) — how `postGitHubIssue` centralises all GitHub API mechanics so client and server paths share one implementation
- [Dual Entry Points](dual-entry-points.md) — how `package.json` exports separate client and server surfaces so browser bundlers never see Express
- [Injected Service Router](injected-service-router.md) — how `githubRouter` accepts a service parameter instead of constructing one, enabling full HTTP test coverage without a network
- [Typed Error with HTTP Status](submission-error.md) — how `SubmissionError` gives failures a consistent shape that both the router (needs `.status`) and the component (needs `.message`) can rely on
