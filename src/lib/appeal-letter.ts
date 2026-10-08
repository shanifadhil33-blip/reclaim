const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

const DATE_LABEL = new RegExp(`^(${MONTHS.join("|")}) \\d{1,2}, \\d{4}$`)

export type AppealFacts = {
  letterDate: string
  payerName: string
  patientName: string
  memberId: string
  dateOfService: string
  billedCode: string
  denialCode: string
  denialReason: string
  billedAmount: string
  paidAmount: string
  clinicalNotes: string
}

export function formatLetterDate(now: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(now)
}

/** Prefer the browser's local date when it is actually today. Otherwise use the server's. */
export function resolveLetterDate(clientDate: unknown, now: Date): string {
  if (typeof clientDate === "string" && DATE_LABEL.test(clientDate.trim())) {
    const parsed = Date.parse(clientDate.trim())
    if (Number.isFinite(parsed) && Math.abs(parsed - now.getTime()) < 1000 * 60 * 60 * 36) {
      return clientDate.trim()
    }
  }
  return formatLetterDate(now)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Force the date, the patient name, and the address placeholder.
 * Clinical wording is left to the prompt so notes are not rewritten here.
 */
export function applyLetterFacts(letter: string, facts: Pick<AppealFacts, "letterDate" | "patientName" | "memberId">): string {
  let text = letter.replaceAll("[Insurance Address]", "[Payer address]").replaceAll("[Insurance address]", "[Payer address]")
  const lines = text.split("\n")
  const first = lines.findIndex((line) => line.trim().length > 0)
  if (first >= 0 && DATE_LABEL.test(lines[first].trim())) {
    lines[first] = facts.letterDate
    text = lines.join("\n")
  } else if (!text.includes(facts.letterDate)) {
    text = `${facts.letterDate}\n\n${text.trim()}`
  }

  const name = facts.patientName.trim()
  const memberId = facts.memberId.trim()
  if (name && memberId && name.toLowerCase() !== memberId.toLowerCase()) {
    const namedById = new RegExp(`\\bPatient\\s+${escapeRegExp(memberId)}\\b`, "gi")
    text = text.replace(namedById, `Patient ${name}`)
  }
  return text
}

/** A letter built only from the fields and notes, for tests and for showing the shape without a model. */
export function composeAppealLetter(facts: AppealFacts): string {
  const notes = facts.clinicalNotes.trim()
  const reason = [facts.denialCode, facts.denialReason].filter(Boolean).join(" — ")
  return applyLetterFacts(
    `${facts.letterDate}

${facts.payerName}
Appeals Department
[Payer address]

Re: Claim denial
Patient name: ${facts.patientName}
Member ID: ${facts.memberId}
Date of service: ${facts.dateOfService}
Billed code: ${facts.billedCode}
Billed amount: ${facts.billedAmount}
Paid amount: ${facts.paidAmount}
Denial: ${reason}

To the Appeals Department,

Please reprocess this claim. The notes below are quoted as provided. Nothing has been added to them.

${notes}

Sincerely,
[Billing Representative]
[Practice / Provider]
`,
    facts
  )
}
