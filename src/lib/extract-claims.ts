export type DeniedClaim = {
  patientAccount: string;
  patientName: string;
  dateOfService: string;
  billedCPT: string;
  denialCode: string;
  denialReason: string;
  billedAmount: string;
  paidAmount: string;
  payerName: string;
};

export type ParseResult = {
  claims: DeniedClaim[];
  warning?: string;
};

const DENIAL_CODE = /^(CO|PR|OA|PI|CR)-?\d+$/i;

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function pick(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

export function formatServiceDate(value: string): string {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!us) return value;
  const year = us[3].length === 2 ? `20${us[3]}` : us[3];
  return `${us[1].padStart(2, "0")}/${us[2].padStart(2, "0")}/${year}`;
}

export function formatMoney(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return trimmed || "Unknown";
  if (trimmed.startsWith("$")) return trimmed;
  const numeric = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return trimmed;
  return `$${numeric.toFixed(2)}`;
}

function formatDenialCode(value: string): string {
  const match = value.trim().match(/^(CO|PR|OA|PI|CR)\s*-?\s*(\d+)$/i);
  if (!match) return value.trim();
  return `${match[1].toUpperCase()}-${match[2]}`;
}

function cleanName(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim();
}

function isPaidLine(record: Record<string, unknown>, denialCode: string): boolean {
  const status = pick(record, ["status", "claimStatus", "lineStatus", "paymentStatus", "Status"]);
  if (/denied/i.test(status)) return false;
  if (/^paid$/i.test(status)) return true;
  if (!DENIAL_CODE.test(denialCode.replace(/\s/g, ""))) return status.toLowerCase() === "paid";
  return false;
}

export function normalizeClaim(item: unknown): DeniedClaim | null {
  const record = asRecord(item);
  const denialCode = formatDenialCode(
    pick(record, [
      "denialCode", "DenialCode", "denial_code", "remarkCode", "RemarkCode",
      "remark_code", "adjustmentCode", "AdjustmentCode", "reasonCode", "ReasonCode",
      "CARC", "carc",
    ])
  );
  if (isPaidLine(record, denialCode)) return null;
  if (!denialCode || denialCode.toLowerCase() === "unknown" || denialCode.toLowerCase() === "paid") {
    return null;
  }

  const patientName = cleanName(
    pick(record, [
      "patientName", "PatientName", "patient_name", "Patient", "patient",
      "name", "Name", "subscriberName", "SubscriberName",
    ])
  );
  const patientAccount = pick(record, [
    "patientAccount", "PatientAccount", "patient_account", "accountNumber",
    "memberID", "MemberID", "memberId", "member_id", "subscriberID",
    "claimNumber", "ClaimNumber", "claim_number",
  ]);

  return {
    patientAccount: patientAccount || patientName || "Unknown",
    patientName: patientName || "Unknown",
    dateOfService: formatServiceDate(
      pick(record, [
        "dateOfService", "DateOfService", "date_of_service", "dos", "DOS",
        "serviceDate", "ServiceDate", "service_date", "date", "Date",
      ]) || "Unknown"
    ),
    billedCPT: pick(record, [
      "billedCPT", "BilledCPT", "billed_cpt", "cptCode", "CPTCode", "cpt",
      "CPT", "procedureCode", "ProcedureCode", "procedure_code", "code", "Code",
    ]) || "Unknown",
    denialCode,
    denialReason: pick(record, [
      "denialReason", "DenialReason", "denial_reason", "reason", "Reason",
      "remarkDescription", "description", "Description", "explanation",
    ]) || "Unknown",
    billedAmount: formatMoney(
      pick(record, [
        "billedAmount", "BilledAmount", "billed_amount", "billed", "Billed",
        "chargeAmount", "charge", "Charge",
      ]) || "Unknown"
    ),
    paidAmount: formatMoney(
      pick(record, [
        "paidAmount", "PaidAmount", "paid_amount", "paid", "Paid",
        "paymentAmount", "allowedAmount", "AllowedAmount",
      ]) || "$0.00"
    ),
    payerName: cleanName(
      pick(record, [
        "payerName", "PayerName", "payer_name", "payer", "Payer",
        "insurance", "Insurance", "insuranceCompany", "carrier", "Carrier",
      ])
    ) || "Unknown",
  };
}

function claimsFromParsed(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  const record = asRecord(parsed);
  for (const key of ["claims", "denials", "deniedClaims", "items", "data", "results"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return null;
}

export function parseModelClaims(raw: string): ParseResult {
  let text = raw.trim();
  if (!text) return { claims: [], warning: "The model returned an empty response." };

  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  const objectAt = text.indexOf("{");
  const arrayAt = text.indexOf("[");
  let start = -1;
  if (objectAt === -1) start = arrayAt;
  else if (arrayAt === -1) start = objectAt;
  else start = Math.min(objectAt, arrayAt);

  if (start === -1) {
    return { claims: [], warning: "The model did not return a list of denials." };
  }

  const slice = text.slice(start);
  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch {
    const endChar = slice.startsWith("[") ? "]" : "}";
    const end = slice.lastIndexOf(endChar);
    if (end <= 0) return { claims: [], warning: "The model did not return a list of denials." };
    try {
      parsed = JSON.parse(slice.slice(0, end + 1));
    } catch {
      return { claims: [], warning: "The model did not return a list of denials." };
    }
  }

  const items = claimsFromParsed(parsed);
  if (!items) return { claims: [], warning: "The model did not return a list of denials." };

  const claims = items.flatMap((item) => {
    const claim = normalizeClaim(item);
    return claim ? [claim] : [];
  });
  return { claims };
}

function field(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  return match?.[1] ? cleanName(match[1]) : "";
}

type LineMatch = {
  date: string;
  cpt: string;
  reason: string;
  billed: string;
  paid: string;
  code: string;
};

function linesFromTable(text: string): LineMatch[] {
  const pattern = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Z]?\d{4,5})\s+(.+?)\s+(\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})\s+DENIED\s+((?:CO|PR|OA|PI|CR)-\d+)\s+(\d[\d,]*\.\d{2})(?:\s+\(([^)]+)\))?/gi;
  const lines: LineMatch[] = [];
  for (const match of text.matchAll(pattern)) {
    lines.push({
      date: match[1],
      cpt: match[2],
      reason: match[9]?.trim() || match[3].trim(),
      billed: match[8],
      paid: match[6],
      code: match[7],
    });
  }
  return lines;
}

function linesFromShortRows(text: string): LineMatch[] {
  const pattern = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Z]?\d{4,5})\s+\$?(\d[\d,]*\.\d{2})\s+\$?(\d[\d,]*\.\d{2})\s+((?:CO|PR|OA|PI|CR)-\d+)\s+DENIED/gi;
  const lines: LineMatch[] = [];
  for (const match of text.matchAll(pattern)) {
    lines.push({
      date: match[1],
      cpt: match[2],
      reason: "Denied on the EOB",
      billed: match[3],
      paid: match[4],
      code: match[5],
    });
  }
  return lines;
}

/** Read denied rows from EOB text when the page is a normal table. Paid rows are skipped. */
export function parseEobText(text: string): DeniedClaim[] {
  const lines = linesFromTable(text);
  const found = lines.length > 0 ? lines : linesFromShortRows(text);
  if (found.length === 0) return [];

  const patientName = field(text, /Patient:\s*([A-Za-z][A-Za-z .'-]+?)(?:\s+\(|\s+Member|\s+Claim|\r?\n|$)/i) || "Unknown";
  const patientAccount = field(text, /Member ID:\s*([A-Za-z0-9-]+)/i)
    || field(text, /Claim\s*#:\s*([A-Za-z0-9-]+)/i)
    || patientName;
  const payerName = field(text, /FROM:\s*([A-Za-z0-9][A-Za-z0-9 .'-]+?)(?:\s+\(|\s+Check|\s+Patient|\r?\n|$)/i)
    || field(text, /Payer:\s*([A-Za-z0-9][A-Za-z0-9 .'-]+?)(?:\s+\(|\r?\n|$)/i)
    || "Unknown";

  return found.map((line) => ({
    patientAccount,
    patientName,
    dateOfService: formatServiceDate(line.date),
    billedCPT: line.cpt,
    denialCode: formatDenialCode(line.code),
    denialReason: line.reason,
    billedAmount: formatMoney(line.billed),
    paidAmount: formatMoney(line.paid),
    payerName,
  }));
}

export function plainExtractWarning(raw: string): string {
  const model = raw.split(":")[0]?.trim() || "An extraction model";
  if (/404|no endpoints|not a valid model|model .*not found|is not available/i.test(raw)) {
    return `${model} is no longer available, so that attempt was skipped.`;
  }
  if (/timed out|timeout/i.test(raw)) {
    return `${model} took too long and was skipped.`;
  }
  if (/all models failed/i.test(raw)) {
    return "Every extraction model failed, so nothing was read from the file.";
  }
  if (/401|403|api key|unauthorized/i.test(raw)) {
    return "The extraction service rejected the request.";
  }
  if (/429|rate limit/i.test(raw)) {
    return "The extraction service is busy. Try again in a moment.";
  }
  if (/did not return a list|empty response|DENIED lines/i.test(raw)) {
    return raw.replace(/\s+/g, " ").slice(0, 220);
  }
  return `${model} could not read this file.`;
}
