import assert from "node:assert/strict";
import { DEMO_CLAIMS, sortDemoClaims } from "../src/lib/demo-data.ts";
import { parseEobText, parseModelClaims, plainExtractWarning } from "../src/lib/extract-claims.ts";

const sampleText = `
FICTIONAL SAMPLE - NOT REAL PATIENT DATA
EXPLANATION OF BENEFITS
FROM: HARBORLIGHT HEALTH PLAN (fictional payer)
Check #: 5520913   Check Date: 2026-09-22   Provider: Lakeside Family Clinic (fictional)
Patient: Orin Hollowell (fictional)   Member ID: ZZ4410087   Claim #: HHP-30451
DOS         CPT    Description                    Billed    Allowed  Paid    Status   Adj
2026-09-02  99214  Office visit, est. patient     185.00    120.00   120.00  PAID     CO-45 65.00
2026-09-02  93000  Electrocardiogram, complete    95.00     0.00     0.00    DENIED   CO-50 95.00 (not medically necessary)
2026-09-02  80053  Comprehensive metabolic panel  60.00     0.00     0.00    DENIED   CO-197 60.00 (precertification absent)
Claim Totals: Billed 340.00  Paid 120.00
`;

const fromText = parseEobText(sampleText);
assert.equal(fromText.length, 2, "paid 99214 must be skipped");
assert.deepEqual(
  fromText.map((row) => [row.patientName, row.patientAccount, row.billedCPT, row.denialCode, row.billedAmount, row.dateOfService, row.payerName]),
  [
    ["Orin Hollowell", "ZZ4410087", "93000", "CO-50", "$95.00", "09/02/2026", "HARBORLIGHT HEALTH PLAN"],
    ["Orin Hollowell", "ZZ4410087", "80053", "CO-197", "$60.00", "09/02/2026", "HARBORLIGHT HEALTH PLAN"],
  ]
);
assert.match(fromText[0].denialReason, /not medically necessary/);
assert.match(fromText[1].denialReason, /precertification absent/);

const wrappedPdfText = `FICTIONAL SAMPLE - NOT REAL PATIENT DATA
EXPLANATION OF BENEFITS
FROM: HARBORLIGHT HEALTH PLAN (fictional payer)
Check #: 5520913   Check Date: 2026-09-22   Provider: Lakeside Family Clinic 
(fictional)
Patient: Orin Hollowell (fictional)   Member ID: ZZ4410087   Claim #: HHP-30451
DOS         CPT    Description                    Billed    Allowed  Paid    
Status   Adj
2026-09-02  99214  Office visit, est. patient     185.00    120.00   120.00  
PAID     CO-45 65.00
2026-09-02  93000  Electrocardiogram, complete    95.00     0.00     0.00    
DENIED   CO-50 95.00 (not medically necessary)
2026-09-02  80053  Comprehensive metabolic panel  60.00     0.00     0.00    
DENIED   CO-197 60.00 (precertification absent)
Claim Totals: Billed 340.00  Paid 120.00
Remark codes: N115, M127
`;
const fromPdfWrap = parseEobText(wrappedPdfText);
assert.equal(fromPdfWrap.length, 2, "wrapped PDF text must still yield both denials");
assert.equal(fromPdfWrap[0].billedCPT, "93000");
assert.equal(fromPdfWrap[1].denialCode, "CO-197");
assert.equal(fromPdfWrap[0].payerName, "HARBORLIGHT HEALTH PLAN");

const modelObject = `
Here is the JSON:
\`\`\`json
{
  "claims": [
    {
      "patientName": "Orin Hollowell",
      "patientAccount": "ZZ4410087",
      "dateOfService": "2026-09-02",
      "billedCPT": "99214",
      "denialCode": "CO-45",
      "denialReason": "contractual adjustment",
      "billedAmount": "185.00",
      "paidAmount": "120.00",
      "payerName": "Harborlight Health Plan",
      "status": "PAID"
    },
    {
      "patient": "Orin Hollowell",
      "memberID": "ZZ4410087",
      "dos": "2026-09-02",
      "cpt": "93000",
      "remarkCode": "CO-50",
      "reason": "not medically necessary",
      "billed": "95.00",
      "paid": "0.00",
      "payer": "Harborlight Health Plan",
      "status": "DENIED"
    },
    {
      "patientName": "Orin Hollowell",
      "patientAccount": "ZZ4410087",
      "dateOfService": "09/02/2026",
      "billedCPT": "80053",
      "denialCode": "CO-197",
      "denialReason": "precertification absent",
      "billedAmount": "$60.00",
      "paidAmount": "$0.00",
      "payerName": "Harborlight Health Plan",
      "status": "DENIED"
    }
  ]
}
\`\`\`
`;

const fromModel = parseModelClaims(modelObject);
assert.equal(fromModel.claims.length, 2);
assert.equal(fromModel.claims[0].billedCPT, "93000");
assert.equal(fromModel.claims[0].denialCode, "CO-50");
assert.equal(fromModel.claims[0].billedAmount, "$95.00");
assert.equal(fromModel.claims[0].dateOfService, "09/02/2026");
assert.equal(fromModel.claims[1].billedCPT, "80053");
assert.equal(fromModel.claims[1].paidAmount, "$0.00");

const rawArray = JSON.stringify([
  {
    patientName: "Orin Hollowell",
    patientAccount: "ZZ4410087",
    dateOfService: "09/02/2026",
    billedCPT: "93000",
    denialCode: "CO-50",
    denialReason: "not medically necessary",
    billedAmount: "$95.00",
    paidAmount: "$0.00",
    payerName: "Harborlight Health Plan",
  },
]);
assert.equal(parseModelClaims(rawArray).claims.length, 1);

const garbage = parseModelClaims("I could not find a table.");
assert.equal(garbage.claims.length, 0);
assert.match(garbage.warning || "", /did not return a list/);

const shortLayout = parseEobText("Payer: Northwind Plan\nPatient: Orin Hollowell\nMember ID: ZZ4410087\n09/02/2026 93000 $95.00 $0.00 CO-50 DENIED\n");
assert.equal(shortLayout.length, 1);
assert.equal(shortLayout[0].payerName, "Northwind Plan");
assert.equal(shortLayout[0].denialCode, "CO-50");

assert.match(
  plainExtractWarning("google/gemini-2.0-flash-001: HTTP 404: No endpoints found"),
  /no longer available/
);

const newest = sortDemoClaims(DEMO_CLAIMS, "found").map((row) => row.dateOfService);
assert.deepEqual(newest, ["03/03/2026", "02/22/2026", "02/14/2026", "01/28/2026"]);
const byAmount = sortDemoClaims(DEMO_CLAIMS, "amount").map((row) => row.patientName);
assert.deepEqual(byAmount, ["Casey Placeholder", "Jordan Sample", "Riley Fictional", "Alex Example"]);

console.log("parse-sample-eob: ok");
