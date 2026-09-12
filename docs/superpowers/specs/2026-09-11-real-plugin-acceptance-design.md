# Real DSH plugin + real acceptance

> Date: 2026-09-11
> Status: approved-by-manuscript (attachments 01/02/03) — this spec only records *how* we close remaining gaps
> Binding: `attachments/01-设计文档.md` §0 / §1.3 / §2, `02-设计规范.md`, `03-验收规范.md`
> Upstream: https://github.com/deepseek-ai/deepseek-harness
> Plugin packaging: https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish

## Classification

Architectural. This is not a UI tweak. The product is a **dsh-plugin** that loads inside official DeepSeek Harness. A custom film-lab, MiniTools host, or `--patch` file URL is not the product.

## Verdict (current tree)

| Claim | Reality |
|---|---|
| Live preview is DeepSeek Harness | **Partial pass.** `dsh web` is on the preview port. Title is `DeepSeek Harness`. Sidebar / chat / Settings / Plugins exist. This is official GUI, not a clone. |
| User always sees that GUI | **Fail historically.** Earlier preview was a TanStack "Image Studio". Grok thumbnail `app-builder-preview.png` was that film-lab. User report matches that stale surface. |
| Plugin is a dsh plugin | **Partial.** Modules export `name` / `inject` / Schemastery `Config` / `apply` and call `defineTool`. |
| Plugin is *installable* | **Fail.** Root `package.json` has **no** `dsh.bundle`. Official install is `dsh plugin --profile web add <pkg>`. Today we 手戳 `--patch` with absolute `file://` TypeScript paths. |
| Model sees `image_*` tools | **Fail / unproven.** Host `--patch` rewrites `system-prompt.personaPrefix`, but the `standard` preset's `persona` **shadows** the deployment default. A prior session used `bash` and said it had no image tools. |
| Acceptance per 03 | **Fail.** `node:test` against MiniTools / in-process `bootStudio` / a private `ImageEventBus`. That is not AC-LC-01 "全量插件按 cordis.yml 加载" on real dsh. CI has never booted `dsh web` and asserted fibers + `ctx.tools.schemas()`. |
| 01 §1.3 non-goals | **Violated by the landing app.** `src/routes/index.tsx` is a Nova-style studio (plan / reel / score). Design: do not rebuild agent chat or a parallel web product. Live path must stay `dsh web`. Vercel may keep a *docs landing*, never the runtime. |

MiniTools tests are allowed as **offline unit** (验收 §0: no API keys). They are not permission to call the plugin "accepted".

## Approaches

| | A. Keep `--patch` + MiniTools | B. Official bundle + real dsh AC | C. Vendor full harness source |
|---|---|---|---|
| `dsh plugin add` | no | yes | n/a |
| Matches 02 §1 / publish doc | no | yes | overkill |
| User-visible Harness | already | already | already |
| Agent sees tools | unproven | `defineTool` on host registry + `ctx.systemPrompt.section` | same |
| Acceptance | fake host | dump-config + live fibers + schemas + mock generate | same |
| Effort | zero | this pass | weeks |

**Chosen: B.** A is what the user already rejected（精简 / 手戳 / 能力不对）. C is not a plugin.

## Architecture (B)

```
$DSH_HOME/profiles/web
  package.json dsh.profile.bundles:
    - @deepseek-ai/dsh-base
    - @deepseek-ai/dsh-web-app
    - dsh-imagestudio          ← official bundle, not --patch

dsh-imagestudio/
  package.json
    name: dsh-imagestudio
    dsh.bundle.patch: ./cordis.patch.yml
    exports: ./core ./compose ./guard ./assets ./skills
             ./provider-mock ./provider-openai ./tools
  cordis.patch.yml
    insert host-plane rows (services + tools), package specifiers only
  skills/  cinema-dna + life-force + … with SKILL.md + preset.yaml
```

Live preview remains official `dsh web`. The sandbox proxy only exists because the CLI refuses `--host 0.0.0.0`. No MiniTools on that path. `packages/host` stays **test-only**.

### Host vs agent plane

- **Host plane (bundle patch):** `imagegen` / `imageSkills` / `imageAssets` / `imageCompose` / providers / `image-tools`. Same reason `fs` and the tools *registry* stay host-side: consumers exist before any session.
- **Model visibility:** `ctx.tools.register(defineTool(...))` on the host registry is enough for native schemas (dsh-tools README). Do **not** rely on patching `personaPrefix`; the standard preset shadows it.
- **Prompt copy:** `image-tools.apply` registers `ctx.systemPrompt.section({ name: 'image-studio', ... })` in Chinese, naming the six tools. This is a section, not a persona fight.
- **Agent-plane persona patch is out of scope** unless dump-config proves the section is stripped.

### Non-goals this pass

- Human AC-HQ sampling of 10 subjects
- AC-PF-04/05 soak
- Gemini / Nova real upstream
- Replacing the deterministic compiler with live `ctx.llm` directors
- npm publish / `dsh-plugin` GitHub topic on a public repo we do not control
- Rewriting every import to `lib/*.js` + publint (tracked as AC-CP-02 remaining)

## Acceptance — how we actually sign off

Two layers. Both must be green before anyone says "对齐文稿 / 达到验收标准".

### Layer 1 — Offline unit (mock, no keys)

Existing `tests/*.test.ts` keep covering machine-checkable skill / guard / compose / path-escape cases. Host is MiniTools. This satisfies 验收 §0 "CI 无真实 API Key".

### Layer 2 — Real dsh (P, new)

A Node test file that does **not** import MiniTools:

1. `dsh --profile web --dump-config` (with the bundle on the profile, or `--patch` of the **bundle** `cordis.patch.yml`) contains `id: image-core` … `image-tools` and **no** `file:///…/image-studio-boot.ts`.
2. Root `package.json` has `dsh.bundle.patch`.
3. `cordis.patch.yml` `name:` values are package specifiers (`dsh-imagestudio/tools`), never absolute paths.
4. Boot the same graph the web profile boots (or query a running `dsh web`): plugin inventory lists those ids `ACTIVE`; `ctx.tools.schemas()` includes the six `image_*` names; `output` / `execute` are absent from the projected schemas (AC-TL-02).
5. Call `image_skill_plan` then `image_generate` against mock; assert `shot-*.png` under `.dsh/image-studio/` (AC-AS-01/02); score `<82` does not increment mock.calls (AC-SK-17).

Until Layer 2 is green, the honest status is: **plugin-shaped library, not an accepted dsh plugin.**

### Mapping to 03 P-level

Layer 2 is the missing proof for AC-LC-01, AC-TL-01/02/09, AC-CP-04/05. Layer 1 already has most AC-SK / AC-SEC-06 / AC-AS-08..10. Remaining P items that stay open after this pass are listed in `docs/verified-against.md`.

## Preview contract

- Preview process = official `dsh web` + this bundle.
- User-visible: DeepSeek Harness chrome, Settings → Plugins → `image-*` ACTIVE, chat input, Trajectory.
- User-invisible: TanStack film-lab, MiniTools, `bootStudio`, `src/lib/studio`.
- Deployed Vercel build may render a static explanation that the runtime is Harness; it must not pretend to be the plugin host.
