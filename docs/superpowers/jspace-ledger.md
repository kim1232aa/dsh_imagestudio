# J-space ledger — dsh_imagestudio

Pass: loop

## Goal
03-core slice T1–T8 (`sandbox/tasks.json`). Red lines stay: no-skill generate, score never blocks. Host is `scripts/preview.mjs`. No UI-slice / GIF / plaza / score-gate.

## Core (on stage, max 2)
1. T1 JobStore — elapsed seconds, AbortSignal cancel, boot failRunningOnBoot
2. T2 mock raster — 9 ratios, 1K/2K/4K distinct pixel areas

## Off stage
T3 history · T4 gallery · T5 video · T6 canvas · T7 ecom · T8 shots

## Verified
- plan-loop `sandbox/tasks.json` is the execution source (`validate_plan.py` ok)

## Open
- Official `dsh web` binary is not this host; preview.mjs `/imagestudio` 200 is the slice host

## Next
T1+T2 only. Failing tests first. Do not restore veto.

## Dispatch
- Parallel cap: 2
- T1 files: packages/core/src/jobs.ts, pipeline signal, ui /cancel /jobs, host boot
- T2 files: packages/provider-mock pixelsFor + clarity
- Do not start T3–T8 in this seam
