<template>
  <main class="demo">
    <h1>gh-issue-reporter demo</h1>
    <p>Click the button in the bottom-right corner to report an issue against this package's repo.</p>
    <IssueReporter
      mode="direct"
      repo="jamboid/gh-issue-reporter"
      :token="token"
      context="demo page"
    />
  </main>
</template>

<script setup>
import IssueReporter from '@jamboid/gh-issue-reporter'

const token = import.meta.env.VITE_GITHUB_TOKEN || ''
</script>

<style>
body { font-family: system-ui, sans-serif; margin: 0; }
.demo { padding: 48px; max-width: 640px; }
h1 { font-size: 24px; margin-bottom: 12px; }
p { color: #555; line-height: 1.5; }
</style>
