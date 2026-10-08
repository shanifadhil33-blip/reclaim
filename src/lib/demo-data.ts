import type { DenialRow } from '@/stores/extraction-store'

const FICTIONAL_BANNER =
  'FICTIONAL SAMPLE. Not a real patient, not a real payer, and not a letter to send.'

/**
 * Made-up denial rows for the public Live Demo (/demo).
 * Fully client-side — never sent to extract/appeal APIs.
 */
export const DEMO_CLAIMS: DenialRow[] = [
  {
    id: 'demo-claim-001',
    patientAccount: 'DEMO-1001',
    patientName: 'Alex Example',
    dateOfService: '02/14/2026',
    billedCPT: '99214',
    denialCode: 'CO-50',
    denialReason: 'Fictional denial: the sample payer said this visit was not medically necessary.',
    billedAmount: '$285.00',
    paidAmount: '$0.00',
    payerName: 'Fictional Payer A',
    status: 'completed',
    clinicalNotes:
      'FICTIONAL SAMPLE. These notes are made up for the demo.\n\nAlex Example is not a real person. Placeholder visit for a made-up chronic condition. The A1C figure in older copies of this demo has been removed so it is not mistaken for a lab result. Face-to-face time and decision-making in this row are sample text only.',
    generatedLetter: `${FICTIONAL_BANNER}

Re: Sample appeal — CPT 99214
Patient: Alex Example (fictional) | Account: DEMO-1001 | DOS: 02/14/2026
Payer: Fictional Payer A | Denial: CO-50

To the Appeals Department,

This is a made-up letter so you can see the shape of an appeal. It cites a placeholder office visit and asks the fictional payer to look again. Nothing in it comes from a chart.

Sincerely,
Sample Appeals Desk
[Made-up letter — Demo Mode]`,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'demo-claim-002',
    patientAccount: 'DEMO-1002',
    patientName: 'Jordan Sample',
    dateOfService: '01/28/2026',
    billedCPT: '72148',
    denialCode: 'CO-197',
    denialReason: 'Fictional denial: precertification was marked absent on this sample claim.',
    billedAmount: '$1,450.00',
    paidAmount: '$0.00',
    payerName: 'Fictional Payer B',
    status: 'completed',
    clinicalNotes:
      'FICTIONAL SAMPLE. These notes are made up for the demo.\n\nJordan Sample is not a real person. Placeholder imaging visit. The sample authorization number is DEMO-AUTH-1002. There is no real payer confirmation behind it.',
    generatedLetter: `${FICTIONAL_BANNER}

Re: Sample appeal — CPT 72148
Patient: Jordan Sample (fictional) | Account: DEMO-1002 | DOS: 01/28/2026
Payer: Fictional Payer B | Denial: CO-197

To the Appeals Department,

This sample says an authorization number DEMO-AUTH-1002 was already on file. That number is invented. The letter only shows how a prior-auth appeal is laid out.

Sincerely,
Sample Appeals Desk
[Made-up letter — Demo Mode]`,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'demo-claim-003',
    patientAccount: 'DEMO-1003',
    patientName: 'Casey Placeholder',
    dateOfService: '03/03/2026',
    billedCPT: '27447',
    denialCode: 'CO-97',
    denialReason: 'Fictional denial: the sample payer bundled this procedure into another line.',
    billedAmount: '$18,200.00',
    paidAmount: '$0.00',
    payerName: 'Fictional Payer C',
    status: 'needs_notes',
    clinicalNotes:
      'FICTIONAL SAMPLE. These notes are made up for the demo.\n\nCasey Placeholder is not a real person. This row pretends a surgery was denied as bundled with a separate sample line. No operative report exists.',
    generatedLetter: `${FICTIONAL_BANNER}

Re: Sample appeal — CPT 27447
Patient: Casey Placeholder (fictional) | Account: DEMO-1003 | DOS: 03/03/2026
Payer: Fictional Payer C | Denial: CO-97

To the Appeals Department,

This sample argues that two made-up services should be paid separately. It is layout practice only.

Sincerely,
Sample Appeals Desk
[Made-up letter — Demo Mode]`,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: 'demo-claim-004',
    patientAccount: 'DEMO-1004',
    patientName: 'Riley Fictional',
    dateOfService: '02/22/2026',
    billedCPT: '93306',
    denialCode: 'PR-204',
    denialReason: 'Fictional denial: the sample plan said this test was not a covered benefit.',
    billedAmount: '$620.00',
    paidAmount: '$0.00',
    payerName: 'Fictional Payer D',
    status: 'needs_notes',
    clinicalNotes:
      'FICTIONAL SAMPLE. These notes are made up for the demo.\n\nRiley Fictional is not a real person. Placeholder imaging row. Any measurement that used to look like a real BNP or ejection fraction has been removed.',
    generatedLetter: `${FICTIONAL_BANNER}

Re: Sample appeal — CPT 93306
Patient: Riley Fictional (fictional) | Account: DEMO-1004 | DOS: 02/22/2026
Payer: Fictional Payer D | Denial: PR-204

To the Appeals Department,

This sample asks a made-up plan to treat a made-up test as covered. Do not send it anywhere.

Sincerely,
Sample Appeals Desk
[Made-up letter — Demo Mode]`,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
  },
]
