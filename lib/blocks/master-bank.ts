import type { BankBlocks } from './bank-types'

// ---------------------------------------------------------------------------
// Master content bank — the superset of experiences, projects, and skill items
// the LLM is allowed to pull from when tailoring a resume to a JD.
//
// Editing rules:
//   - IDs MUST stay stable; the LLM references them in operations.
//   - Bullets follow the same \b{...} convention as on-resume bullets.
//   - Add new entries with the next available index; do NOT renumber existing
//     entries (it would invalidate older saved sessions).
//   - Skill categories should match the labels used on the actual resume so
//     `add_skill_from_bank` can target them by label.
// ---------------------------------------------------------------------------

export const masterBank: BankBlocks = {
  experience: [
    {
      kind: 'experience-entry',
      id: 'bank-exp-0',
      role: 'Software Engineer',
      dates: 'June 2023 -- Present',
      company: 'Acme Corp',
      location: 'San Francisco, CA',
      bullets: [
        {
          kind: 'bullet',
          id: 'bank-exp-0-item-0',
          text: 'Designed and shipped a \\b{microservices} migration plan that moved 12 monolith endpoints to \\b{Kubernetes}, reducing deploy time by 70%',
        },
        {
          kind: 'bullet',
          id: 'bank-exp-0-item-1',
          text: 'Led an on-call rotation across a 6-engineer team, cutting P1 incident response time from 45m to under 10m',
        },
        {
          kind: 'bullet',
          id: 'bank-exp-0-item-2',
          text: 'Mentored 2 junior engineers through their first production launches via weekly 1:1s and code-review pairing',
        },
      ],
    },
  ],
  projects: [
    {
      kind: 'project-entry',
      id: 'bank-proj-0',
      name: 'StreamLint',
      link: 'github.com/alexchen/streamlint',
      description: 'Real-time log analyzer',
      stack: 'Go, Kafka, ClickHouse',
      bullets: [
        {
          kind: 'bullet',
          id: 'bank-proj-0-item-0',
          text: 'Built a streaming pipeline ingesting 200k log lines/sec with \\b{Kafka} and \\b{ClickHouse} for sub-second analytics',
        },
        {
          kind: 'bullet',
          id: 'bank-proj-0-item-1',
          text: 'Implemented anomaly detection using a sliding-window heuristic, surfacing 3 production incidents during beta',
        },
      ],
    },
  ],
  skills: [
    { label: 'Languages', items: ['Rust', 'Kotlin', 'Bash'] },
    { label: 'Frameworks', items: ['Next.js', 'Django', 'Spring Boot'] },
    { label: 'Tools', items: ['Kubernetes', 'Terraform', 'Kafka', 'ClickHouse', 'Grafana'] },
  ],
}
