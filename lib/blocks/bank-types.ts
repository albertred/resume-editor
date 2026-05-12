// ---------------------------------------------------------------------------
// Content bank — a user-maintained superset of experiences, projects, and
// skills the LLM is allowed to pull from. Same block shapes as the on-resume
// model, but with the `bank-` ID prefix so the validator can keep namespaces
// separate (you can't `replace_bullet` against a bank ID, etc.).
// ---------------------------------------------------------------------------

import type {
  ExperienceEntryBlock,
  ProjectEntryBlock,
  SkillsCategory,
  BulletBlock,
} from './block-types'

export interface BankBlocks {
  /** IDs: "bank-exp-<n>", with bullets "bank-exp-<n>-item-<m>" */
  experience: ExperienceEntryBlock[]
  /** IDs: "bank-proj-<n>", with bullets "bank-proj-<n>-item-<m>" */
  projects: ProjectEntryBlock[]
  /** Pool of skill items per category (labels should match the resume's labels). */
  skills: SkillsCategory[]
}

/** Flat lookup over every bank ID for fast validation. */
export function buildBankMap(
  bank: BankBlocks,
): Map<string, ExperienceEntryBlock | ProjectEntryBlock | BulletBlock> {
  const map = new Map<string, ExperienceEntryBlock | ProjectEntryBlock | BulletBlock>()
  for (const e of bank.experience) {
    map.set(e.id, e)
    for (const b of e.bullets) map.set(b.id, b)
  }
  for (const p of bank.projects) {
    map.set(p.id, p)
    for (const b of p.bullets) map.set(b.id, b)
  }
  return map
}
