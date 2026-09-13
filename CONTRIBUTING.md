# Contributing

## Waterfall `next()` discipline

`image/plan` and `image/before-request` are waterfalls. A listener that only observes **must** call `next()`. Forgetting `next()` on `image/before-request` silently drops negative-patch injection and aspect-ratio locking. Reviewers reject that class of bug on sight (AC-EV-02 is the regression guard).

```ts
// observe
ctx.on('image/before-request', async (req, next) => {
  logger.debug(req.prompt)
  return next()
})

// decide, then still delegate
ctx.on('image/before-request', async (req, next) => {
  if (req.refUsage === 'analysis-only' && req.refImages?.length) {
    req = { ...req, refImages: undefined }
  }
  return next()
})
```

## Hard vs soft constraints

If a rule can be an assertion, it is a hard constraint in `preset.yaml` and the compiler / `image/before-request` hook. Soft aesthetic judgment stays in `CreativePlan.reasoning` for the user to read.

## Tests

```bash
npm ci
node --test --experimental-strip-types tests/*.test.ts
```

Cite acceptance IDs in PRs (`closes AC-SK-04`). P-level failures block merge.

## Config

No hardcoded knobs. If a deploy might want a different value, it belongs in `cordis.yml`. Secrets are `apiKeyEnv` names only.
