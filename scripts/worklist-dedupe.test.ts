import assert from "node:assert/strict";
import { dedupeAgainstWorklist, duplicateWorklistNotice, worklistLineKey } from "../src/lib/worklist-dedupe.ts";

const orin93000 = {
  patientName: "Orin Hollowell",
  patientAccount: "ZZ4410087",
  dateOfService: "09/02/2026",
  billedCPT: "93000",
  billedAmount: "$95.00",
  denialCode: "CO-50",
};

const orin80053 = {
  patientName: "Orin Hollowell",
  patientAccount: "ZZ4410087",
  dateOfService: "09/02/2026",
  billedCPT: "80053",
  billedAmount: "$60.00",
  denialCode: "CO-197",
};

const secondUpload = dedupeAgainstWorklist([orin93000, orin80053], [orin93000, orin80053]);
assert.equal(secondUpload.fresh.length, 0);
assert.equal(secondUpload.alreadyThere, 2);
assert.equal(duplicateWorklistNotice(secondUpload.alreadyThere), "2 lines were already in your worklist");
assert.equal(duplicateWorklistNotice(1), "1 line was already in your worklist");

const formatted = dedupeAgainstWorklist(
  [orin93000],
  [{
    patientName: " orin   hollowell ",
    patientAccount: "zz4410087",
    dateOfService: "2026-09-02",
    billedCPT: "93000",
    billedAmount: "$95",
    denialCode: "co50",
  }],
);
assert.equal(formatted.fresh.length, 0);
assert.equal(formatted.alreadyThere, 1);
assert.equal(
  worklistLineKey(orin93000),
  worklistLineKey({
    patientName: " orin   hollowell ",
    patientAccount: "zz4410087",
    dateOfService: "2026-09-02",
    billedCPT: "93000",
    billedAmount: "$95",
    denialCode: "co50",
  }),
);

const differentAmount = dedupeAgainstWorklist(
  [orin93000],
  [{ ...orin93000, billedAmount: "$10.00" }],
);
assert.equal(differentAmount.fresh.length, 1);
assert.equal(differentAmount.alreadyThere, 0);

const differentCode = dedupeAgainstWorklist(
  [orin93000],
  [{ ...orin93000, denialCode: "CO-16" }],
);
assert.equal(differentCode.fresh.length, 1);

const firstUpload = dedupeAgainstWorklist([], [orin93000, orin93000, orin80053]);
assert.equal(firstUpload.fresh.length, 2);
assert.equal(firstUpload.alreadyThere, 0);

console.log("worklist dedupe checks passed");
