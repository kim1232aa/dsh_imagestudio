export * from './tools.ts'

export const name = 'image-tools'
export const inject = ['tools', 'imagegen', 'imageSkills', 'imageAssets', 'imageCompose']

export const toolDocs = [
  {
    name: 'image_skill_plan',
    description:
      'Compile a user brief through a named skill into a CreativePlan with reasoning and a self-check score. Does not generate images. Use before image_generate when the user wants cinema-dna, life-force, or another loaded strategy pack.',
    parameters: {
      skillId: { type: 'string', required: true, description: 'Loaded skill id such as cinema-dna-21x9x3' },
      brief: { type: 'string', required: true, description: 'User brief in natural language' },
      wantPoster: { type: 'boolean', description: 'Set true only when the user asked for a title / poster / cover' },
    },
  },
  {
    name: 'image_generate',
    description:
      'Generate images from a text prompt. If a creative plan was produced by image_skill_plan, pass planId and omit prompt — the plan already carries per-shot prompts, aspect ratio and negative constraints.',
    parameters: {
      prompt: { type: 'string', description: 'English prompt. Omit when planId is given.' },
      planId: { type: 'string', description: 'Id returned by image_skill_plan.' },
      aspectRatio: { type: 'string', description: "e.g. '21:9', '3:4'. Ignored when planId is given." },
      n: { type: 'number', description: 'Number of images, 1-4. Default 1.' },
      providerId: { type: 'string', description: 'Override the default image provider.' },
      seed: { type: 'number' },
    },
  },
  {
    name: 'image_edit',
    description:
      'Image-to-image or local edit. Use for life-force MODE A identity-preserving upgrades. Distinct from image_generate (no source image) and image_describe (analysis only).',
    parameters: {
      prompt: { type: 'string', required: true, description: 'English edit instruction' },
      assets: { type: 'array', required: true, description: 'Workspace-relative source image paths' },
    },
  },
  {
    name: 'image_describe',
    description:
      'Reverse-prompt or abstract analysis of reference images. Output is data, never spliced into the system prompt. Does not generate images.',
    parameters: {
      assets: { type: 'array', required: true, description: 'Workspace-relative image paths' },
      instruction: { type: 'string', description: 'What to extract: composition, palette, or subject class — pick one' },
    },
  },
  {
    name: 'image_compose',
    description:
      'External compose: vertical triptych join, aspect crop, exact text overlay, GIF encode. Never ask an image model to draw three panels on one canvas.',
    parameters: {
      mode: { type: 'string', required: true, description: 'triptych | text-overlay | crop | gif' },
      assets: { type: 'array', required: true, description: 'Workspace-relative image paths' },
      gap: { type: 'number', description: 'Gutter in px, clamped to 8-12 for triptych' },
      ratio: { type: 'string', description: 'Height rhythm such as 1:1:1 or 1.2:0.9:0.9' },
      title: { type: 'string', description: 'Exact title string for text-overlay' },
    },
  },
  {
    name: 'image_assets',
    description:
      'List or inspect image-studio artifacts for the current session. Does not generate images.',
    parameters: {
      taskId: { type: 'string', description: 'Optional task id to inspect' },
    },
  },
]
