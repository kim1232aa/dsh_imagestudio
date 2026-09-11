# Third-party notices

This repository is an **interface-level** port. It does not vendor Nova Image Studio source.

## Nova Image Studio

- Project: https://github.com/tianjiangqiji/nova-image-studio
- License: GNU Affero General Public License v3.0
- What we took: capability map (multi-provider routing, task/artifact lifecycle, reverse prompt, compose). Not the Next.js app, PWA, infinite canvas, or server.js queue.
- If you copy Nova implementation files into this tree, switch this repo to AGPL-3.0. Do not mix licenses.

## FANTASY visual skills

Authored as FANTASY / 梵想美学 skill packs. This plugin wraps them with `preset.yaml` so dsh can enforce constraints the prose cannot.

| Pack | Upstream |
|---|---|
| cinema-dna-21x9x3 | https://github.com/dacnay816y62-hub/cinema-dna-21x9x3 |
| life-force-portrait | https://github.com/dacnay816y62-hub/fantasy-life-force-portrait-photography |
| photography-simulation | https://github.com/dacnay816y62-hub/fantasy-photography-simulation-github |
| movie-poster | https://github.com/dacnay816y62-hub/fantasy-movie-poster-skill |
| character-casting | https://github.com/dacnay816y62-hub/character-casting-studio-skill |

Skill markdown remains the authors' work. Cite the upstream repository when you redistribute a pack.

## DeepSeek Harness / Cordis

Plugin shape follows `@deepseek-ai/cordis` and `@deepseek-ai/dsh-tools` public contracts. Those packages remain peer dependencies of the host and are not bundled here.
