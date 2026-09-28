import { columns, listedHeadings, pipeline, runningFurniture } from "@rtm/ingest";

/**
 * How this report is built. Owned by the report: every decision that shaped
 * its text is named here, and the passes it composes are library code, so a
 * fix to a shared pass reaches every report that calls it.
 *
 * Volume I only, for now — see README.md for the scoping decision. Each of
 * its two chapters (Regime Strategic Intent; Regime Finance and Procurement)
 * opens with its own Key Findings section, so this covers "Key Findings and
 * Volume I" in full.
 */
export default pipeline({
  id: "us-duelfer-report",
  title: "Comprehensive Report of the Special Advisor to the DCI on Iraq's WMD, Volume I",
  authors: "Charles Duelfer, Special Advisor to the Director of Central Intelligence",
  published_at: "30 September 2004",
  source_url: "https://www.govinfo.gov/content/pkg/GPO-DUELFERREPORT/pdf/GPO-DUELFERREPORT-1.pdf",
  repo: ".",
  volumes: [
    {
      path: "archive/duelfer-report-vol1.pdf",
      sha256: "a62d23e5107b94075b727fa1692c1206cfc71356fe3e813a34f151efaa1713a0",
    },
  ],
  passes: [
    // Many pages set intelligence-community-style analysis as two columns of
    // bullet points (e.g. printed pp.64-66); left unsplit, poppler's raw
    // text order weaves the two columns' bullets together mid-sentence.
    columns(),
    // Every page carries the chapter name as a rotated side-banner graphic
    // ("Regime Strategic Intent" / "Regime Finance and Procurement"), which
    // repeats verbatim across the whole volume.
    runningFurniture(),
    // Each chapter opens with a full contents list of its own subsections.
    // Without this, names in captured-document facsimiles, table cells and
    // people's names set on their own line (e.g. a source list "Engineer
    // Azmy Khrisat ... Mr. Thamir Abbas Ghadban") pass for headings one by
    // one. Only a heading the contents names is kept.
    listedHeadings(),
  ],
});
