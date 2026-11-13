# The Duelfer Report — Volume I

The Comprehensive Report of the Special Advisor to the Director of Central
Intelligence on Iraq's WMD, with Addendums (the "Duelfer Report"), Volume I:
Regime Strategic Intent, and Regime Finance and Procurement. Submitted 30
September 2004 by Charles Duelfer, Special Advisor to the DCI on Iraq's WMD,
following the Iraq Survey Group's investigation; this printing (25 April 2005)
adds six addendums and minor corrections.

## Scope: Volume I only, for now

The Comprehensive Report was published in three volumes plus addendums:

| Part | Contents | In this repo? |
| --- | --- | --- |
| Volume I | Regime Strategic Intent; Regime Finance and Procurement (each opening with its own Key Findings) | Yes |
| Volume II | Delivery Systems; (Nuclear) | No — follow-up |
| Volume III | (Biological); Chemical Warfare | No — follow-up |
| Addendums | Residual proliferation, detainees, the Military Industrial Commission, and more | No — follow-up |

**Decision (2026-09-28):** ship Volume I first. Each volume is a
free-standing document — its own cover, its own contents page, its own Key
Findings — not a continuously paginated part of one book (unlike, say,
Saville's multi-volume inquiry), so a reader gets a complete, citable unit
from Volume I alone: the report's Key Findings sections are the *opening*
section of each Volume I chapter, so scoping to "Key Findings and Volume I"
means Volume I in full. Volumes II and III were not added in the same pass —
at 270 and 232 pages of dense, evidence-heavy chemical/biological/missile
detail, giving each the same page-by-page defect check as Volume I (see
`PROCESSING.md` once written, and the site's `docs/report-preparation.md`)
was judged to need its own pass rather than being folded in "because it was
already open." Follow-up: `reportsthatmatter-d0h` tracks ingesting Volumes
II–III and the Addendums as the same report gains more parts.

## Source

`archive/duelfer-report-vol1.pdf` — Volume I as published by the U.S.
Government Publishing Office at govinfo.gov (package `GPO-DUELFERREPORT`,
part 1): <https://www.govinfo.gov/content/pkg/GPO-DUELFERREPORT/pdf/GPO-DUELFERREPORT-1.pdf>.
SHA-256 `a62d23e5107b94075b727fa1692c1206cfc71356fe3e813a34f151efaa1713a0`,
453 pages. A born-digital PDF (not a scan); its text layer is clean.

Public domain — a work of the U.S. Government (Central Intelligence Agency /
Iraq Survey Group), distributed by GPO. See `datapackage.json`.

The CIA's own former hosting of this report
(`cia.gov/library/reports/general-reports-1/iraq_wmd_2004/`) now 404s; govinfo.gov
is the current, stable official source, and is the born-digital original GPO
printed from (ISBN 978-0-16-072488-6, Vol. 1).

## The web edition (structure)

Since 2026-11 the text is served from the CIA's own HTML edition with the PDF's page anchors and words (`cleanEdition` in `ingest.ts`, the adapter `cia-html.ts`; reportsthatmatter-ivg.4). The 23 pages of Volume I are in `reference/raw/`, each pinned by SHA-256 in `ingest.ts`: `acknowledgements`, `note`, `transmittal`, `scope`, `chap1` and `chap1_annxA`-`D`, `chap2` and `chap2_annxA`-`L`, `WMD_Timeline_Events` (`.html`). They are the Wayback Machine's raw (`id_`) captures of `https://www.cia.gov/library/reports/general-reports-1/iraq_wmd_2004/<page>.html`: `chap1` and `chap2` from 2011-02-02 (the scorer's reference copies; their text is identical to the 2007 captures), the rest from 2007-06-13. `contents.html` and `correction.html` (the April 2007 removal of the Niro Atomizer section) are kept for the record and not read.

The web pages are the 30 September 2004 text; the PDF is the revised 2005 printing. Measured on the first build: 1,864 disagreement stretches (respelled names, "Security Council" to "UNSC", corrected figures, rewordings). So `words: "pdf"` serves the PDF's words wherever a disagreement is short and in place, and lists each one in `fidelity.md`; the rest stay the web edition's and are listed too. `PROCESSING.md` says what this means for a reader.

`chapterTab()` in `ingest.ts` takes the bleed-margin chapter tab out of the shadow's text (reportsthatmatter-1l4); the old crop approach (ingest PR #22, branch `banner-fix`) is not needed.

## Build

`ingest.ts` declares how the report is turned into Markdown. Rebuild from the
site repo with `pnpm ingest run us-duelfer-report`.
