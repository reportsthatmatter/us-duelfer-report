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
      // The printed chapter name ("Regime Strategic Intent" / "Regime Finance
      // and Procurement") is set as a rotated tab in the PDF's bleed margin,
      // outside its trimmed page: `pdfinfo -box` reports CropBox 612x792 but
      // MediaBox 684x864, and `pdftotext -bbox` puts the tab at x 612-634 —
      // beyond the CropBox's right edge. Read at full MediaBox width (the
      // default), it reaches the line stream and, because it sits at a fixed
      // x rather than a page top/bottom edge, `runningFurniture()` cannot
      // catch it: it lands at an arbitrary point in reading order on
      // whichever pages carry it, splicing into 142 sentences (measured
      // without this crop). No real content extends past x=576 in a sample
      // of 20 pages, so cropping at x<610 has ~35pt of margin on both sides.
      // reportsthatmatter-1l4.
      crop: { x: 0, y: 0, width: 610, height: 828 },
    },
  ],
  passes: [
    // Many pages set intelligence-community-style analysis as two columns of
    // bullet points (e.g. printed pp.64-66); left unsplit, poppler's raw
    // text order weaves the two columns' bullets together mid-sentence.
    columns(),
    // Belt and braces: catches any furniture that does repeat at a page
    // edge. The chapter-tab banner itself is excluded at extraction (the
    // volume's `crop`, above), not by this pass.
    runningFurniture(),
    // Each chapter opens with a full contents list of its own subsections.
    // Without this, names in captured-document facsimiles, table cells and
    // people's names set on their own line (e.g. a source list "Engineer
    // Azmy Khrisat ... Mr. Thamir Abbas Ghadban") pass for headings one by
    // one. Only a heading the contents names is kept.
    listedHeadings(),
  ],
});
