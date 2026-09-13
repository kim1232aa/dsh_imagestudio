#!/usr/bin/env node
/**
 * Automated P-level HTTP acceptance against MemoryWebServer (same graph as dsh boot).
 * Does not replace official-shell click of AC-UI-01.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootStudio } from '../packages/host/src/boot.ts'

const skillsDir = fileURLToPath(new URL('../skills', import.meta.url))
const dir = await mkdtemp(join(tmpdir(), 'dsh-accept-'))
const rows = []
const check = (id, ok, detail) => {
  rows.push({ id, ok: !!ok, detail: detail || '' })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${id}  ${detail || ''}`)
}

try {
  const host = await bootStudio({
    workspaceRoot: dir,
    skillsDir,
    enabledSkills: [
      'cinema-dna-21x9x3',
      'life-force-portrait',
      'photography-simulation',
      'movie-poster',
      'character-casting',
    ],
    enableXai: false,
  })
  const page = await host.web.fetch('GET', '/imagestudio')
  check('AC-UI-04', page.status === 200 && /Image Studio/.test(page.text), `status=${page.status}`)
  check('AC-UI-03', /回对话/.test(page.text) && /href="\/"/.test(page.text), 'back link')
  check('AC-UI-05', ['cinema-dna-21x9x3', 'life-force-portrait', 'photography-simulation', 'movie-poster', 'character-casting']
    .every((id) => page.text.includes(id)), 'five skill ids in HTML')
  check('AC-UI-S2', /data-brief/.test(page.text), 'inspiration chips')

  const meta = await host.web.fetch('GET', '/imagestudio/api/meta')
  const skills = (meta.json?.skills || []).map((s) => s.id).sort()
  check('AC-SK-20', skills.includes('cinema-dna-21x9x3') && skills.length >= 5, skills.join(','))

  const gen = await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({
    prompt: '一只青瓷茶盏',
    aspectRatio: '1:1',
    n: 1,
  }))
  check('AC-UI-06', gen.status === 200 && (gen.json?.images || []).length >= 1, `status=${gen.status}`)

  const plan = await host.web.fetch('POST', '/imagestudio/api/plan', JSON.stringify({
    skillId: 'cinema-dna-21x9x3',
    brief: '明代夜审账房放榜',
  }))
  const aspect = plan.json?.plan?.shots?.[0]?.aspectRatio
  check('AC-UI-07', aspect === '21:9', `aspect=${aspect}`)

  const veto = await host.web.fetch('POST', '/imagestudio/api/plan', JSON.stringify({
    skillId: 'cinema-dna-21x9x3',
    brief: '游戏CG应拒',
  }))
  check('AC-UI-08', veto.json?.passed === false && veto.json?.planId, `score=${veto.json?.score}`)
  const still = await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({
    planId: veto.json?.planId,
    prompt: '游戏CG应拒',
    n: 1,
  }))
  check('AC-UI-08-gen', still.status === 200 && (still.json?.images || []).length >= 1, 'low score still generates')

  const a = await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({ prompt: 'a', n: 1 }))
  const b = await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({ prompt: 'b', n: 1 }))
  const c = await host.web.fetch('POST', '/imagestudio/api/generate', JSON.stringify({ prompt: 'c', n: 1 }))
  const paths = [a, b, c].flatMap((r) => (r.json?.images || []).map((i) => i.path))
  const mock = host.ctx.imagegen.resolve('mock')
  const before = mock.calls
  const composed = await host.web.fetch('POST', '/imagestudio/api/compose', JSON.stringify({
    mode: 'triptych',
    assets: paths.slice(0, 3),
    gap: 10,
    ratios: '1:1:1',
  }))
  check('AC-UI-09', composed.status === 200 && mock.calls === before, `compose status=${composed.status}`)

  const assets = await host.web.fetch('GET', '/imagestudio/api/assets')
  check('AC-UI-10', /shot-|studio/.test(assets.text), 'assets index')

  const esc = await host.web.fetch('GET', '/imagestudio/api/file?path=../etc/passwd')
  check('AC-SEC-file', esc.status === 403, `status=${esc.status}`)

  host.web.uninstall()
  const after = await host.web.fetch('GET', '/imagestudio')
  check('AC-UI-11', after.status !== 200, `status=${after.status}`)

  const names = host.tools.schemas().map((s) => s.name)
  check('AC-UI-13', !names.includes('generate_image') && names.includes('istudio_generate'), names.join(','))
} finally {
  await rm(dir, { recursive: true, force: true })
}

const failed = rows.filter((r) => !r.ok)
console.log(`\n${rows.length - failed.length}/${rows.length} PASS`)
if (failed.length) process.exit(1)
