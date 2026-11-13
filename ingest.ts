import { readCiaHtml } from "./cia-html.ts";
import { cleanEdition, layoutPageJoins, columns, listedHeadings, pipeline, runningFurniture, type SplitPage } from "@rtm/ingest";

/**
 * Each chapter's name is printed as a rotated tab in the page's bleed margin
 * ("Regime Strategic / Intent", "Regime Finance / and Procurement"), outside
 * the CropBox (x 612-634 on a 684-point MediaBox; printed p. 5 of Regime
 * Strategic Intent, PDF p. 37). pdftotext reads it as words at the far right
 * of a line ("He was        Regime Strategic") or on a line of their own far
 * to the right, where it splices into the text ("con- Regime Strategic
 * cealed": reportsthatmatter-1l4). It is the shadow's text that the edition
 * is aligned to and, with `words: "pdf"`, served from, so the tab is taken
 * off: a tab word set off by three spaces or more at the end of a line,
 * starting at column 30 or beyond, or alone on a line indented 10 or more
 * (the chapter's title page, PDF p. 133, loses its title too: the edition's
 * heading carries it).
 */
const TAB = /(^|\S)(\s{3,})(Regime Strategic|Intent|Regime Finance|and Procurement)\s*$/;
const TAB_LINE = /^\s{10,}(Regime Strategic|Intent|Regime Finance|and Procurement)\s*$/;

function chapterTab(): { readonly name: string; readonly stage: "volume"; run(pages: SplitPage[]): SplitPage[] } {
  return {
    name: "chapterTab",
    stage: "volume",
    run(pages) {
      return pages.map((page) => ({
        ...page,
        body: page.body.map((line) => {
          if (TAB_LINE.test(line)) return "";
          const m = line.match(TAB);
          if (!m || !m[1] || m.index! + m[1].length + m[2].length < 30) return line;
          return line.slice(0, m.index! + m[1].length).trimEnd();
        }),
      }));
    },
  };
}

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
    // The text and structure come from the CIA's own HTML edition
    // (reference/raw/, the cia.gov reading-room pages via the Wayback Machine;
    // see cia-html.ts for what its markup means). The PDF is still read by
    // every pass below, as the shadow ingest: its page markers say which page
    // carries which printed number, each block is stamped with the page its
    // first word aligns to, and every stretch where the HTML (the 2004 text)
    // and the PDF (the revised 2005 printing) disagree is listed in fidelity.md
    // (reportsthatmatter-ivg.4).
    cleanEdition({
      dir: import.meta.dirname,
      files: [
        { path: "reference/raw/acknowledgements.html", sha256: "a1e2287106eec08976d3ffe87f33df1325a512f12c45cc2ec3c0cf5bc4fb01c8" },
        { path: "reference/raw/note.html", sha256: "412a6738be8ec21a5c0bbc5a73570528ff6188adf6c7089b6aa2d74ef0af8dbd" },
        { path: "reference/raw/transmittal.html", sha256: "a48ce0470c41ca428ff6e1eb6c44832634e12500e610350bcab50391515c7196" },
        { path: "reference/raw/scope.html", sha256: "95809e2cc9cf94d4a1103ddd2f648ae468b77a1713edad9ad7afd2a824bd48d7" },
        { path: "reference/raw/chap1.html", sha256: "43ce660972b8a1d6bacb61c2f12c2c3bcccf019152c720a6a980db7a7c7cdf32" },
        { path: "reference/raw/chap1_annxA.html", sha256: "9794e616d80c50d8fc349e2b58f4b40ec9028714c3c731024d045e2889d6ba39" },
        { path: "reference/raw/chap1_annxB.html", sha256: "80a360a3fc5d86794f856fa72ba2d7cda0af47b9f6174503325183e143c5d46e" },
        { path: "reference/raw/chap1_annxC.html", sha256: "88ea7e2e1d4060de42044d5cd5cb2ac2c478ebd12874e581d8ccffde692fbad9" },
        { path: "reference/raw/chap1_annxD.html", sha256: "52d0cc135fe7d7964c42789599c6d34fdd0374737aed73794c3d216fe2bde220" },
        { path: "reference/raw/chap2.html", sha256: "0b14cbab7f1f83e21f112076b06e348bcfcc8b875517344b5f9294488a5486b7" },
        { path: "reference/raw/chap2_annxA.html", sha256: "a8d812736d28453c1a6fadba3bfdcc20e184f1e8a945c96a8de606753434378c" },
        { path: "reference/raw/chap2_annxB.html", sha256: "323d3aeafb9a92cfa045449437c3d411b0f5ed3be0838f78d1aff7051c950180" },
        { path: "reference/raw/chap2_annxC.html", sha256: "5a09e2a227a69a8f2d51a2f19cd18e9a25609d44251e26daf966a738a4ea9398" },
        { path: "reference/raw/chap2_annxD.html", sha256: "61cd0c2460e244cc5f0ce2cfb2fc3ddf9517e7efa49d74ee32540236e2ca37bd" },
        { path: "reference/raw/chap2_annxE.html", sha256: "0fdb5c0fb330eb96a42bd3bc489bcfd3220ba619f5c3395c604ab72116b58b71" },
        { path: "reference/raw/chap2_annxF.html", sha256: "1ab258cebe4bf217168fd896a5f66e653f4e2b7cdf0689bd05e8d7a3fdd10f60" },
        { path: "reference/raw/chap2_annxG.html", sha256: "ba92e0d32fade83d218c36e9d86441f77286672ac21a2c015b3f9a3cd5d01a7d" },
        { path: "reference/raw/chap2_annxH.html", sha256: "ad90ac5e6f3ccfb90c261647c79a02ec26d6d6661d1c9383b6b643c28f511bb7" },
        { path: "reference/raw/chap2_annxI.html", sha256: "f143d9f81d497b767ca7ca1942f564c4493e32f1a506387f34b0e4946fee7426" },
        { path: "reference/raw/chap2_annxJ.html", sha256: "f49a4e1536c7164e870c9ea9ce5578eef666478a585e3ae8ff4e44b163bbd880" },
        { path: "reference/raw/chap2_annxK.html", sha256: "2266686f6e5346ccdad3447b69e58f5228729072a4119be3a772b8492a820ecb" },
        { path: "reference/raw/chap2_annxL.html", sha256: "9ef5e1636ad9d82a6eafdd87c257b5c66ddd65bc50dd906843ebb6f3608120b9" },
        { path: "reference/raw/WMD_Timeline_Events.html", sha256: "b669b9ed843ff56276df44c49b12046b3ed9c49fee2082955a4306cded6015af" },
      ],
      read: readCiaHtml,
      // The HTML is the 30 September 2004 text; the PDF is the revised 2005
      // printing (respelled Arabic names, corrected terms and figures: its
      // printed p. 3 note). Where the two disagree inside a paragraph, the
      // PDF's words are served, and every such place is listed in fidelity.md.
      words: "pdf",
    }),
    // Take the bleed-margin chapter tab out of the shadow's text first.
    chapterTab(),
    // A paragraph run over a page break that opens on a capital, a digit or a
    // quotation mark (or follows a full stop on a justified page) joins when the
    // layout says it runs on: no first-line indent, same face (reportsthatmatter-38s.10).
    layoutPageJoins(),
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
