import type {
  ResumeBlocks,
  AnyEntryBlock,
  BulletBlock,
  ExperienceEntryBlock,
  EducationEntryBlock,
  ProjectEntryBlock,
  SkillsBlock,
} from './block-types'
import type { BankBlocks } from './bank-types'
import type { BlockEditOperation } from './block-edit-types'

export interface BlockApplyResult {
  newBlocks: ResumeBlocks
  error?: string
}

// ---------------------------------------------------------------------------
// Apply a single validated operation to a ResumeBlocks tree.
// Pure: returns a new ResumeBlocks; does not mutate the input.
// ---------------------------------------------------------------------------

export function applyBlockOp(
  blocks: ResumeBlocks,
  bank: BankBlocks,
  op: BlockEditOperation,
): BlockApplyResult {
  const next = deepCopyBlocks(blocks)
  try {
    switch (op.type) {
      case 'replace_bullet':
        replaceBullet(next, op.targetId, op.text)
        break
      case 'insert_bullet':
        insertBullet(next, op.afterId, op.text)
        break
      case 'delete_bullet':
        deleteBullet(next, op.targetId)
        break
      case 'edit_skills':
        editSkills(next, op.categoryLabel, op.items)
        break
      case 'add_bullet_from_bank':
        addBulletFromBank(next, bank, op.bankId, op.afterId)
        break
      case 'add_entry_from_bank':
        addEntryFromBank(next, bank, op.bankId, op.position)
        break
      case 'add_skill_from_bank':
        addSkillFromBank(next, op.categoryLabel, op.bankItems)
        break
    }
    return { newBlocks: next }
  } catch (err) {
    return { newBlocks: blocks, error: String(err) }
  }
}

// ---------------------------------------------------------------------------
// Locators
// ---------------------------------------------------------------------------

interface BulletLocation {
  entry: AnyEntryBlock
  bulletIdx: number
}

function locateBullet(blocks: ResumeBlocks, bulletId: string): BulletLocation {
  for (const entry of allEntries(blocks)) {
    const idx = entry.bullets.findIndex((b) => b.id === bulletId)
    if (idx !== -1) return { entry, bulletIdx: idx }
  }
  throw new Error(`Bullet "${bulletId}" not found`)
}

function locateEntry(blocks: ResumeBlocks, entryId: string): AnyEntryBlock {
  for (const entry of allEntries(blocks)) {
    if (entry.id === entryId) return entry
  }
  throw new Error(`Entry "${entryId}" not found`)
}

function allEntries(blocks: ResumeBlocks): AnyEntryBlock[] {
  return [...blocks.experience, ...blocks.education, ...blocks.projects]
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function replaceBullet(blocks: ResumeBlocks, targetId: string, text: string): void {
  const { entry, bulletIdx } = locateBullet(blocks, targetId)
  entry.bullets[bulletIdx] = { ...entry.bullets[bulletIdx], text }
}

function deleteBullet(blocks: ResumeBlocks, targetId: string): void {
  const { entry, bulletIdx } = locateBullet(blocks, targetId)
  entry.bullets.splice(bulletIdx, 1)
}

function insertBullet(blocks: ResumeBlocks, afterId: string, text: string): void {
  const { entry, idx } = resolveInsertionPoint(blocks, afterId)
  const newBullet: BulletBlock = {
    kind: 'bullet',
    id: mintBulletId(entry),
    text,
  }
  entry.bullets.splice(idx, 0, newBullet)
}

function addBulletFromBank(
  blocks: ResumeBlocks,
  bank: BankBlocks,
  bankId: string,
  afterId: string,
): void {
  const bankBullet = findBankBullet(bank, bankId)
  const { entry, idx } = resolveInsertionPoint(blocks, afterId)
  const fresh: BulletBlock = {
    kind: 'bullet',
    id: mintBulletId(entry),
    text: bankBullet.text,
  }
  entry.bullets.splice(idx, 0, fresh)
}

function addEntryFromBank(
  blocks: ResumeBlocks,
  bank: BankBlocks,
  bankId: string,
  position: number | undefined,
): void {
  if (bankId.startsWith('bank-exp-')) {
    const src = bank.experience.find((e) => e.id === bankId)
    if (!src) throw new Error(`Bank experience "${bankId}" not found`)
    const fresh = reIdExperience(src, blocks.experience.length)
    insertAt(blocks.experience, fresh, position)
  } else if (bankId.startsWith('bank-proj-')) {
    const src = bank.projects.find((p) => p.id === bankId)
    if (!src) throw new Error(`Bank project "${bankId}" not found`)
    const fresh = reIdProject(src, blocks.projects.length)
    insertAt(blocks.projects, fresh, position)
  } else {
    throw new Error(`Unsupported bank entry kind for ID "${bankId}"`)
  }
}

function editSkills(blocks: ResumeBlocks, label: string, items: string[]): void {
  const skills = blocks.skills
  if (!skills) throw new Error('No skills section to edit')
  const existing = skills.categories.find(
    (c) => c.label.toLowerCase() === label.toLowerCase(),
  )
  if (existing) {
    existing.items = [...items]
  } else {
    skills.categories.push({ label, items: [...items] })
  }
}

function addSkillFromBank(
  blocks: ResumeBlocks,
  label: string,
  bankItems: string[],
): void {
  const skills = blocks.skills
  if (!skills) throw new Error('No skills section to add to')
  const existing = skills.categories.find(
    (c) => c.label.toLowerCase() === label.toLowerCase(),
  )
  if (!existing) throw new Error(`Category "${label}" not on resume`)
  const existingSet = new Set(existing.items.map((i) => i.toLowerCase()))
  for (const item of bankItems) {
    if (!existingSet.has(item.toLowerCase())) existing.items.push(item)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * `afterId` may be an entry ID (append to that entry) or a bullet ID (insert
 * after that bullet). Returns the host entry and the splice index to use.
 */
function resolveInsertionPoint(
  blocks: ResumeBlocks,
  afterId: string,
): { entry: AnyEntryBlock; idx: number } {
  // Try entry first
  const entry = allEntries(blocks).find((e) => e.id === afterId)
  if (entry) return { entry, idx: entry.bullets.length }
  // Otherwise it must be a bullet
  const { entry: host, bulletIdx } = locateBullet(blocks, afterId)
  return { entry: host, idx: bulletIdx + 1 }
}

function mintBulletId(entry: AnyEntryBlock): string {
  // Find the highest existing item suffix and add 1, so re-runs don't collide.
  let max = -1
  for (const b of entry.bullets) {
    const m = b.id.match(/-item-(\d+)$/)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > max) max = n
    }
  }
  return `${entry.id}-item-${max + 1}`
}

function findBankBullet(bank: BankBlocks, bankId: string): BulletBlock {
  for (const e of bank.experience) {
    const b = e.bullets.find((x) => x.id === bankId)
    if (b) return b
  }
  for (const p of bank.projects) {
    const b = p.bullets.find((x) => x.id === bankId)
    if (b) return b
  }
  throw new Error(`Bank bullet "${bankId}" not found`)
}

function reIdExperience(
  src: ExperienceEntryBlock,
  newIdx: number,
): ExperienceEntryBlock {
  const id = `exp-${newIdx}`
  return {
    ...src,
    id,
    bullets: src.bullets.map((b, i) => ({
      kind: 'bullet',
      id: `${id}-item-${i}`,
      text: b.text,
    })),
  }
}

function reIdProject(src: ProjectEntryBlock, newIdx: number): ProjectEntryBlock {
  const id = `proj-${newIdx}`
  return {
    ...src,
    id,
    bullets: src.bullets.map((b, i) => ({
      kind: 'bullet',
      id: `${id}-item-${i}`,
      text: b.text,
    })),
  }
}

function insertAt<T>(arr: T[], item: T, position: number | undefined): void {
  if (position == null || position < 0 || position > arr.length) arr.push(item)
  else arr.splice(position, 0, item)
}

function deepCopyBlocks(blocks: ResumeBlocks): ResumeBlocks {
  return {
    header: { ...blocks.header },
    experience: blocks.experience.map(copyEntry) as ExperienceEntryBlock[],
    education: blocks.education.map(copyEntry) as EducationEntryBlock[],
    projects: blocks.projects.map(copyEntry) as ProjectEntryBlock[],
    skills: blocks.skills ? copySkills(blocks.skills) : null,
  }
}

function copyEntry(e: AnyEntryBlock): AnyEntryBlock {
  return { ...e, bullets: e.bullets.map((b) => ({ ...b })) }
}

function copySkills(s: SkillsBlock): SkillsBlock {
  return {
    ...s,
    categories: s.categories.map((c) => ({ label: c.label, items: [...c.items] })),
  }
}
