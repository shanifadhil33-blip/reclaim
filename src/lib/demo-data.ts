import type { DenialRow } from '@/stores/extraction-store'

/**
 * Sample EOB denial claims for the public Live Demo (/demo).
 * Fully client-side — never sent to extract/appeal APIs.
 */
export const DEMO_CLAIMS: DenialRow[] = [
  {
    id: 'demo-claim-001',
    patientAccount: 'PT-48291',
    patientName: 'Maria Chen',
    dateOfService: '02/14/2026',
    billedCPT: '99214',
    denialCode: 'CO-50',
    denialReason: 'These are non-covered services because this is not deemed a medical necessity by the payer.',
    billedAmount: '$285.00',
    paidAmount: '$0.00',
    payerName: 'Aetna',
    status: 'completed',
    clinicalNotes:
      'Established patient return visit for poorly controlled type 2 diabetes with neuropathy. A1C 9.2%. Medication reconciliation completed; metformin increased; added duloxetine for neuropathic pain. Discussed lifestyle modifications and scheduled lab follow-up in 90 days. Time spent: 30 minutes face-to-face; moderate medical decision making with prescription management and chronic disease coordination.',
    generatedLetter: `Re: Appeal of Denied Claim — CPT 99214
Patient: Maria Chen | Account: PT-48291 | DOS: 02/14/2026
Payer: Aetna | Denial: CO-50 (Medical Necessity)

To Whom It May Concern:

We are writing to formally appeal the denial of CPT 99214 performed on 02/14/2026 for the above-referenced patient. The denial cites lack of medical necessity (CO-50). The clinical record clearly supports a level-4 established outpatient E/M visit.

Clinical Justification:
On the date of service, Ms. Chen presented for management of poorly controlled type 2 diabetes with neuropathy (A1C 9.2%). The visit included medication reconciliation, intensification of metformin, initiation of duloxetine for neuropathic pain, counseling on lifestyle modification, and coordination of follow-up laboratory testing. Face-to-face time was 30 minutes with moderate complexity medical decision making involving prescription drug management and chronic disease coordination.

This level of care meets AMA CPT criteria for 99214 and was medically necessary to prevent acute decompensation and avoid emergency utilization. We respectfully request reconsideration and full payment of the originally billed amount of $285.00.

Please contact our billing office if additional documentation is required.

Sincerely,
Reclaim Appeals Desk
[Sample letter — Demo Mode]`,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'demo-claim-002',
    patientAccount: 'PT-77310',
    patientName: 'James Okonkwo',
    dateOfService: '01/28/2026',
    billedCPT: '72148',
    denialCode: 'CO-197',
    denialReason: 'Precertification/authorization/notification absent.',
    billedAmount: '$1,450.00',
    paidAmount: '$0.00',
    payerName: 'UnitedHealthcare',
    status: 'completed',
    clinicalNotes:
      'MRI lumbar spine without contrast ordered for progressive bilateral lower extremity radiculopathy lasting 8 weeks, failed conservative therapy (PT x 6 weeks, NSAIDs, activity modification). Positive straight-leg raise bilaterally; diminished Achilles reflex on left. Prior auth requested 01/20/2026 — authorization #UHC-991204 confirmed verbally with payer representative; written confirmation delayed in portal.',
    generatedLetter: `Re: Appeal of Denied Claim — CPT 72148
Patient: James Okonkwo | Account: PT-77310 | DOS: 01/28/2026
Payer: UnitedHealthcare | Denial: CO-197 (Authorization Absent)

To Whom It May Concern:

We appeal the denial of MRI lumbar spine (CPT 72148) performed on 01/28/2026. The claim was denied for missing precertification (CO-197). Authorization was obtained prior to service.

Supporting Facts:
1. Clinical indication: progressive bilateral lower extremity radiculopathy for 8 weeks after failed conservative care (physical therapy, NSAIDs, activity modification), with positive straight-leg raise and reflex changes — imaging was medically indicated.
2. Prior authorization was requested on 01/20/2026. Verbal authorization #UHC-991204 was confirmed with a UnitedHealthcare representative before the date of service. Written portal confirmation lagged behind the verbal approval but does not negate medical necessity or the prior authorization already secured.

We request overturn of the CO-197 denial and payment of $1,450.00. Enclosed please find clinical notes and the authorization reference above.

Sincerely,
Reclaim Appeals Desk
[Sample letter — Demo Mode]`,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'demo-claim-003',
    patientAccount: 'PT-55002',
    patientName: 'Elena Vasquez',
    dateOfService: '03/03/2026',
    billedCPT: '27447',
    denialCode: 'CO-97',
    denialReason: 'The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated.',
    billedAmount: '$18,200.00',
    paidAmount: '$0.00',
    payerName: 'Blue Cross Blue Shield',
    status: 'needs_notes',
    clinicalNotes:
      'Total knee arthroplasty, right (CPT 27447). Primary osteoarthritis Kellgren-Lawrence grade 4, failed NSAIDs, corticosteroid injection, and unloader bracing. Pre-op clearance obtained. Separately billed intraoperative nerve block (64447) paid; primary TKA denied as bundled. Operative report documents distinct surgical procedure with prosthetic implantation and cementing; not a duplicate of the regional anesthesia service.',
    generatedLetter: `Re: Appeal of Denied Claim — CPT 27447
Patient: Elena Vasquez | Account: PT-55002 | DOS: 03/03/2026
Payer: Blue Cross Blue Shield | Denial: CO-97 (Bundled / Included in Another Service)

To Whom It May Concern:

We are appealing the bundling denial (CO-97) for total knee arthroplasty, CPT 27447, date of service 03/03/2026.

The intraoperative nerve block (CPT 64447) was appropriately paid as anesthesia/pain management. Total knee arthroplasty is a distinct major surgical procedure involving bony resection, prosthetic implantation, and cement technique. It is not included in the allowance for the regional block under standard CCI/NCCI or commercial bundling edits when both services are reported with appropriate modifiers and documentation.

The operative report and clinical history establish primary osteoarthritis (Kellgren-Lawrence grade 4) after exhausted conservative therapy. We request separate reimbursement of the TKA at the contracted rate totaling $18,200.00 billed.

Sincerely,
Reclaim Appeals Desk
[Sample letter — Demo Mode]`,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: 'demo-claim-004',
    patientAccount: 'PT-11984',
    patientName: 'Robert Hale',
    dateOfService: '02/22/2026',
    billedCPT: '93306',
    denialCode: 'PR-204',
    denialReason: 'This service/equipment/drug is not covered under the patient’s current benefit plan.',
    billedAmount: '$620.00',
    paidAmount: '$0.00',
    payerName: 'Cigna',
    status: 'needs_notes',
    clinicalNotes:
      'Transthoracic echocardiogram complete with Doppler and color flow (93306) ordered for new-onset dyspnea, orthopnea, and elevated BNP (842). Exam revealed reduced EF 38% with moderate MR — findings changed management (initiated GDMT, cardiology referral). Benefit exclusion cited by plan appears inconsistent with covered diagnostic imaging for suspected heart failure under the patient’s PPO rider.',
    generatedLetter: `Re: Appeal of Denied Claim — CPT 93306
Patient: Robert Hale | Account: PT-11984 | DOS: 02/22/2026
Payer: Cigna | Denial: PR-204 (Not Covered Under Plan)

To Whom It May Concern:

We appeal the non-covered determination (PR-204) for complete transthoracic echocardiogram CPT 93306 performed on 02/22/2026.

Indication and Medical Necessity:
Mr. Hale presented with new-onset dyspnea, orthopnea, and BNP 842. Echo demonstrated reduced ejection fraction (38%) with moderate mitral regurgitation. Results directly altered clinical management, including initiation of guideline-directed medical therapy and urgent cardiology referral.

Diagnostic echocardiography for suspected heart failure is a standard covered benefit under most PPO riders when medical necessity criteria are met. We ask that the PR-204 decision be reversed and the claim of $620.00 be processed under the outpatient diagnostic imaging benefit.

Sincerely,
Reclaim Appeals Desk
[Sample letter — Demo Mode]`,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
  },
]
