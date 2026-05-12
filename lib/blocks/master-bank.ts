import type { BankBlocks } from './bank-types'

// ---------------------------------------------------------------------------
// Empty default bank. Real bank content is built up at runtime by:
//   - importFromComments() — pulls alternates from a resume's commented blocks
//   - importProjectsTex()  — pulls projects from a \input{projects.tex} file
// The store persists the resulting bank in localStorage.
// ---------------------------------------------------------------------------

export const masterBank: BankBlocks = {
  experience: [],
  projects: [],
  skills: [],
}
