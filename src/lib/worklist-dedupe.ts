/** Fields that decide whether a denied line is already on the worklist. */
export type WorklistIdentity = {
  patientName?: string | null;
  patientAccount?: string | null;
  dateOfService?: string | null;
  billedCPT?: string | null;
  billedAmount?: string | null;
  denialCode?: string | null;
};

function text(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function memberId(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function code(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function denial(value: string | null | undefined): string {
  const compact = (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const match = compact.match(/^(CO|PR|OA|PI|CR)-?(\d+)$/);
  if (!match) return compact;
  return `${match[1]}-${match[2]}`;
}

function serviceDate(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!us) return raw.toLowerCase();
  const year = us[3].length === 2 ? `20${us[3]}` : us[3];
  return `${us[1].padStart(2, "0")}/${us[2].padStart(2, "0")}/${year}`;
}

function money(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  const numeric = Number(raw.replace(/[$,]/g, ""));
  if (!Number.isFinite(numeric)) return raw.toLowerCase();
  return numeric.toFixed(2);
}

export function worklistLineKey(row: WorklistIdentity): string {
  return [
    text(row.patientName),
    memberId(row.patientAccount),
    serviceDate(row.dateOfService),
    code(row.billedCPT),
    money(row.billedAmount),
    denial(row.denialCode),
  ].join("\u001f");
}

export function duplicateWorklistNotice(count: number): string {
  if (count === 1) return "1 line was already in your worklist";
  return `${count} lines were already in your worklist`;
}

/**
 * Keep lines that are not already on the worklist.
 * A repeat of a line inside this same batch is dropped and does not count as already listed.
 */
export function dedupeAgainstWorklist<T extends WorklistIdentity>(
  existing: readonly WorklistIdentity[],
  incoming: readonly T[],
): { fresh: T[]; alreadyThere: number } {
  const listed = new Set(existing.map(worklistLineKey));
  const seen = new Set<string>();
  const fresh: T[] = [];
  let alreadyThere = 0;

  for (const row of incoming) {
    const key = worklistLineKey(row);
    if (listed.has(key)) {
      alreadyThere += 1;
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(row);
  }

  return { fresh, alreadyThere };
}
