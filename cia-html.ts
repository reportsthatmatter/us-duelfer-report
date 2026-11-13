/**
 * Reads the CIA's own HTML edition of the Comprehensive Report's Volume I
 * (reference/raw/*.html: the reading-room pages on cia.gov, captured by the
 * Wayback Machine in 2007 and 2011) into the blocks the hybrid source mode
 * serves (@rtm/ingest `cleanEdition`).
 *
 * What the markup means is a property of this source, so it lives here:
 *
 * - One Plone page per part, in the PDF's order (`PARTS`): Acknowledgements,
 *   the 2005 Note, the Transmittal Message, the Scope Note, the Regime
 *   Strategic Intent chapter and its annexes A-D, the Regime Finance and
 *   Procurement chapter and its annexes A-L, and the timeline. The text sits
 *   in `<div class="plain">`, up to the page's `relatedItems` block.
 * - A part's title is the page's `h1.documentFirstHeading` (level 2); an
 *   annex is titled "Annex A: …" as the PDF's annex title page names it.
 * - `<h3>` is a heading the chapter's contents lists at its top level (level
 *   3: one section page each); a paragraph that is bold throughout, short and
 *   unpunctuated ("Saddam's Place in the Regime<br>The Apex of Power") is a
 *   subhead (level 4), one per `<br>`-separated line.
 * - A box (the PDF's shaded sidebars: "Note on Methodological Approach") is
 *   set between two `<hr class="centerline">`. Its title and text are floats,
 *   the title a bold paragraph rather than a heading, so a box never heads the
 *   body text that follows it.
 * - The HTML's own contents (an `<h3>` "Contents" and "Annexes" with lists of
 *   links), its "[Top of page]" and "[PDF Version]" links and the Adobe
 *   disclaimer are the website's, not the report's, and are left out.
 * - `<ul>`/`<ol>`: a list; `<table>`: a table (a float: the PDF places it
 *   where the page has room); `p.caption`: an italic caption (a float);
 *   `<blockquote>`: a quotation; images are not served.
 * - No notes: the report has none (a table's "a" is set as text).
 */
import { htmlEvents, inlineMarkdown, type Edition, type EditionBlock, type HtmlEvent, type InlinePiece } from "@rtm/ingest";

export const PARTS = [
  "acknowledgements",
  "note",
  "transmittal",
  "scope",
  "chap1",
  ...["A", "B", "C", "D"].map((a) => `chap1_annx${a}`),
  "chap2",
  ...["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((a) => `chap2_annx${a}`),
  "WMD_Timeline_Events",
];

type Cur = { kind: "paragraph" | "quote"; pieces: InlinePiece[]; float: boolean; caption: boolean };

const hasText = (pieces: InlinePiece[]) => pieces.some((p) => "text" in p && p.text.replace(/ /g, " ").trim());
const plain = (pieces: InlinePiece[]) =>
  pieces
    .map((p) => ("text" in p ? p.text : ""))
    .join("")
    .replace(/[\s ]+/g, " ")
    .trim();

/** A paragraph that is the website's, not the report's. */
const SITE_ONLY = /^(?:\[?\s*Top of page\s*\]?|\[\s*PDF Version.*\]|Top of page)$/i;

function bodyOf(html: string, path: string): { title: string; body: string } {
  const titleMatch = html.match(/<h1 class="documentFirstHeading">([\s\S]*?)<\/h1>/);
  const start = html.indexOf('<div class="plain">');
  const end = html.lastIndexOf("<div", html.indexOf("elatedItems", start));
  if (!titleMatch || start < 0 || end < 0) throw new Error(`cia-html: page layout not recognised in ${path}`);
  return { title: titleMatch[1], body: html.slice(start + '<div class="plain">'.length, end) };
}

function partTitle(file: string, raw: string): string {
  const title = plain(htmlEvents(raw).flatMap((e) => (e.kind === "text" ? [{ text: e.text }] : [])));
  const annex = file.match(/_annx([A-L])$/);
  return annex ? `Annex ${annex[1]}: ${title}` : title;
}

export function readCiaHtml(files: Array<{ path: string; text: string }>): Edition {
  const blocks: EditionBlock[] = [];
  const problems: string[] = [];
  const byName = new Map(files.map((f) => [f.path.replace(/^.*\//, "").replace(/\.html$/, ""), f]));
  const missing = PARTS.filter((p) => !byName.has(p));
  if (missing.length) throw new Error(`cia-html: missing parts ${missing.join(", ")}`);

  for (const name of PARTS) {
    const file = byName.get(name)!;
    const { title, body } = bodyOf(file.text, file.path);
    const source = { file: file.path };
    const emit = (block: EditionBlock) => blocks.push({ ...block, source });
    emit({ kind: "heading", level: 2, text: partTitle(name, title) });
    readPart(htmlEvents(body), emit, name, problems);
  }
  if (problems.length) throw new Error(`cia-html: ${problems.length} problem(s):\n  ${problems.slice(0, 20).join("\n  ")}`);
  return { blocks: rejoin(blocks), notes: [] };
}

/** Headings compared as words: "Saddam’s Effect …" in the contents, "Saddam’s Effect … " as the heading. */
const key = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

function readPart(events: HtmlEvent[], emitBlock: (b: EditionBlock) => void, name: string, problems: string[]): void {
  const chapter = /^chap\d$/.test(name);
  /** The chapter's top-level parts, as its own contents lists them (links to "#sectN"): the section pages. */
  const topLevel = new Set<string>();
  let contentsLink: string | null = null;
  let lastLevel = 2;
  const emit = (b: EditionBlock) => {
    if (b.kind === "heading") lastLevel = b.level;
    emitBlock(b);
  };
  const stack: Array<{ tag: string; pop?: () => void }> = [];
  const style = { em: 0, strong: 0 };
  let box = false;
  let hrs = 0;
  let stray = 0;
  const strays: string[] = [];
  let cur: Cur | null = null;
  /** Lines of a paragraph split at <br>, to tell a stack of subheads from prose. */
  let lines: InlinePiece[][] = [];
  let list: { items: string[] } | null = null;
  let item: InlinePiece[] | null = null;
  let listDepth = 0;
  let table: { rows: InlinePiece[][][]; cell: InlinePiece[] | null; depth: number } | null = null;
  let heading: { level: number; pieces: InlinePiece[] } | null = null;
  let linkOnly = true; // the current paragraph's text is all inside <a href> so far
  let inHref = 0;
  let quote = 0;
  let skipContents = false; // inside the HTML's own contents: "Contents" / "Annexes" and their link lists

  const closeList = () => {
    if (list?.items.length) emit({ kind: "list", items: list.items, ...(box ? { float: true } : {}) });
    list = null;
  };

  /** A line set bold throughout, short and unpunctuated: a subhead ("The Apex of Power"), not a bold sentence. */
  const isSubhead = (l: InlinePiece[]): boolean => {
    if (!hasText(l)) return false;
    const allStrong = l.every((p) => !("text" in p) || !p.text.replace(/\u00a0/g, " ").trim() || p.strong);
    const t = plain(l);
    return allStrong && t.split(" ").length <= 14 && !/[.:;,]$/.test(t) && !/^[•·]/.test(t);
  };

  const flush = () => {
    const c = cur;
    cur = null;
    const wasLinkOnly = linkOnly;
    linkOnly = true;
    // the paragraph's lines, as its <br>s divide it
    const ls = c ? [...lines, c.pieces.slice(lines.flat().length)].filter(hasText) : [];
    lines = [];
    if (!c || !hasText(c.pieces)) return;
    const t = plain(c.pieces);
    if (SITE_ONLY.test(t) || (wasLinkOnly && !box)) return;
    if (skipContents) return;
    // Subheads open a paragraph, each on a line of its own: "<p><strong><br>Saddam’s Place in the Regime<br>The
    // Apex of Power</strong></p>", or "<p><strong><br>Approval and Authorization of Supplemental Funding</strong><br>
    // <em><strong>While Saddam was …" (heading, then its paragraph). In a box the title is a bold line, not a heading.
    let rest = c.pieces;
    if (c.kind === "paragraph" && !c.caption) {
      let k = 0;
      while (k < ls.length && isSubhead(ls[k])) k++;
      if (k > 0) {
        closeList();
        for (const l of ls.slice(0, k)) {
          if (box) emit({ kind: "paragraph", text: inlineMarkdown([{ text: plain(l), strong: true }]), float: true });
          // a subhead under a part is level 4; one under a level-4 heading ("The Apex of Power" under "Saddam’s
          // Place in the Regime"), level 5
          else emit({ kind: "heading", level: lastLevel >= 4 ? 5 : 4, text: plain(l) });
        }
        rest = ls.slice(k).flat();
        if (!hasText(rest)) return;
      }
    }
    const pieces = c.caption ? rest.map((p) => ("text" in p ? { ...p, em: true } : p)) : rest;
    const text = inlineMarkdown(pieces);
    if (!text) return;
    if (!list || box || c.float) closeList();
    emit({ kind: c.kind, text, ...(c.float || box ? { float: true } : {}) });
  };

  const open = (kind: Cur["kind"], caption = false) => {
    flush();
    cur = { kind, pieces: [], float: caption, caption };
  };

  const add = (piece: InlinePiece) => {
    if (heading) {
      heading.pieces.push(piece);
      return;
    }
    if (table?.cell) {
      table.cell.push(piece);
      return;
    }
    if (table) return; // text between cells
    if (item) {
      item.push(piece);
      return;
    }
    if (!cur) {
      if ("text" in piece && !piece.text.replace(/ /g, " ").trim()) return;
      open(quote ? "quote" : "paragraph");
    }
    if ("text" in piece && piece.text.trim() && !inHref) linkOnly = false;
    cur!.pieces.push(piece);
  };

  const text = (t: string) => add({ text: t, ...(style.em ? { em: true } : {}), ...(style.strong ? { strong: true } : {}) });

  /**
   * Whether the rule at `at` opens a box. After its title's `<hN>`, if any, a
   * box's text sits in a `<div>` or opens in italics ("<p><em>"), and an
   * `<h4>` straight after a rule is a box's title; the one rule
   * in the Regime Finance and Procurement chapter over its roman Key Findings
   * opens nothing.
   */
  const opensBox = (at: number): boolean => {
    let i = at + 1;
    const skipSpace = () => {
      for (; i < events.length; i++) {
        const x = events[i];
        if (x.kind === "text" && !x.text.replace(/\u00a0/g, " ").trim()) continue;
        if (x.kind === "end" && (x.tag === "hr" || x.tag === "br")) continue;
        break;
      }
    };
    skipSpace();
    const h = events[i];
    // a box's title is often an <h4>, which the report's own subheads never are straight after a rule
    if (h?.kind === "start" && h.tag === "h4") return true;
    if (h?.kind === "start" && /^h[1-6]$/.test(h.tag)) {
      while (i < events.length && !(events[i].kind === "end" && (events[i] as { tag: string }).tag === h.tag)) i++;
      i++;
      skipSpace();
    }
    const d = events[i];
    if (d?.kind === "start" && d.tag === "div") return true;
    if (!(d?.kind === "start" && d.tag === "p")) return false;
    // a box's text is set in italics: "<p><em>…", where the report's own text opens in roman
    i++;
    skipSpace();
    const first = events[i];
    return first?.kind === "start" && (first.tag === "em" || first.tag === "i");
  };

  for (let ei = 0; ei < events.length; ei++) {
    const e = events[ei];
    if (e.kind === "text") {
      if (contentsLink !== null) contentsLink += e.text;
      text(e.text);
      continue;
    }
    const tag = e.tag;
    if (e.kind === "start") {
      if (tag === "img" || tag === "meta" || tag === "link" || tag === "input") continue;
      if (tag === "br") {
        if (heading || table?.cell || item) text(" ");
        else if (cur) {
          lines.push(cur.pieces.slice(lines.flat().length));
          text(" ");
        }
        continue;
      }
      if (tag === "hr") {
        flush();
        closeList();
        if (box) box = false;
        else if (opensBox(ei)) box = true;
        else {
          stray++;
          strays.push(events.slice(ei, ei + 12).map((x) => (x.kind === "text" ? x.text.trim().slice(0, 30) : `${x.kind === "end" ? "/" : ""}${x.tag}`)).filter(Boolean).join(" "));
        }
        hrs++;
        continue;
      }
      const frame: { tag: string; pop?: () => void } = { tag };
      stack.push(frame);
      const cls = e.attrs.class ?? "";
      switch (tag) {
        case "p":
        case "div":
          if (heading) break;
          if (table?.cell) {
            table.cell.push({ text: " " });
            break;
          }
          if (item) {
            item.push({ text: " " });
            break;
          }
          if (tag === "div") {
            flush();
            frame.pop = flush;
            break;
          }
          if (cls === "disclaimer") {
            flush();
            const was = skipContents;
            skipContents = true;
            frame.pop = () => {
              cur = null;
              lines = [];
              skipContents = was;
            };
            break;
          }
          open(quote ? "quote" : "paragraph", cls === "caption");
          frame.pop = flush;
          break;
        case "blockquote":
          flush();
          quote++;
          frame.pop = () => {
            flush();
            quote--;
          };
          break;
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6": {
          if (table?.cell || item) break;
          flush();
          heading = { level: Number(tag.slice(1)), pieces: [] };
          frame.pop = () => {
            const h = heading!;
            heading = null;
            const t = plain(h.pieces);
            if (!t) return;
            if (/^(Contents|Annexes)$/.test(t)) {
              skipContents = true;
              return;
            }
            skipContents = false;
            if (box) {
              emit({ kind: "paragraph", text: inlineMarkdown([{ text: t, strong: true }]), float: true });
              return;
            }
            closeList();
            // the annex pages repeat their chapter's name over the text ("Regime Strategic Intent - Annex A")
            if (/ - Annex [A-L]$/.test(t)) return;
            // a date under a title ("(12 September 2004 2330)", "23 September 2004") is a line of its own
            if (/^\(?\d{1,2} \w+ \d{4}[\d )]*$/.test(t)) {
              emit({ kind: "paragraph", text: inlineMarkdown([{ text: t }]) });
              return;
            }
            // a chapter's top-level parts are level 3, one section page each; every other heading is level 4
            const level = chapter && topLevel.has(key(t)) ? 3 : 4;
            emit({ kind: "heading", level, text: t });
          };
          break;
        }
        case "a":
          if (e.attrs.name && /^sect\d+$/.test(e.attrs.name)) skipContents = false;
          if (e.attrs.href) {
            inHref++;
            const contents = skipContents && /#sect\d+$/.test(e.attrs.href);
            if (contents) contentsLink = "";
            frame.pop = () => {
              inHref--;
              if (contents && contentsLink !== null) topLevel.add(key(contentsLink));
              contentsLink = null;
            };
          }
          break;
        case "ul":
        case "ol":
          if (table?.cell) break;
          flush();
          listDepth++;
          if (listDepth > 1) {
            frame.pop = () => listDepth--;
            break;
          }
          closeList();
          list = { items: [] };
          frame.pop = () => {
            listDepth--;
            if (!skipContents) closeList();
            else list = null;
          };
          break;
        case "li":
          if (table?.cell || !list) break;
          if (item) {
            item.push({ text: " " });
            break;
          }
          item = [];
          frame.pop = () => {
            const pieces = item ?? [];
            item = null;
            const t = inlineMarkdown(pieces);
            if (t && list) list.items.push(t);
          };
          break;
        case "table":
          if (table) {
            table.depth++;
            frame.pop = () => table && table.depth--;
            break;
          }
          flush();
          closeList();
          table = { rows: [], cell: null, depth: 0 };
          frame.pop = () => {
            const t = table!;
            table = null;
            const rows = t.rows.map((row) => row.map((cell) => inlineMarkdown(cell))).filter((row) => row.some(Boolean));
            if (rows.length && !skipContents) emit({ kind: "table", rows, header: false, float: true });
          };
          break;
        case "tr":
          if (table && table.depth === 0) table.rows.push([]);
          break;
        case "td":
        case "th":
          if (table && table.depth === 0) {
            table.cell = [];
            table.rows[table.rows.length - 1]?.push(table.cell);
            frame.pop = () => {
              if (table) table.cell = null;
            };
          } else if (table?.cell) table.cell.push({ text: " " });
          break;
        case "em":
        case "i":
          style.em++;
          frame.pop = () => style.em--;
          break;
        case "strong":
        case "b":
          style.strong++;
          frame.pop = () => style.strong--;
          break;
      }
      continue;
    }
    if (["img", "br", "meta", "link", "hr", "input"].includes(tag)) continue;
    for (let k = stack.length - 1; k >= 0; k--) {
      if (stack[k].tag !== tag) continue;
      const popped = stack.splice(k);
      for (const f of popped.reverse()) f.pop?.();
      break;
    }
  }
  for (const f of stack.reverse()) f.pop?.();
  flush();
  closeList();
  if (chapter && topLevel.size < 3) problems.push(`${name}: its contents list ${topLevel.size} parts`);
  if (box) problems.push(`${name}: a box left open (${hrs} rules)`);
  if (stray > 1) problems.push(`${name}: ${stray} rules that open no box: ${strays.join(" | ")}`);
}

/**
 * The web edition sometimes closes a block mid-sentence and opens the next on the rest of it: "… or to the head
 * of the Presidential </li></ul><p>Secretariat. The latter, …" (Regime Finance and Procurement, printed p. 12),
 * which the PDF prints as one bullet. A list item or paragraph that ends on a letter (no full stop, colon or
 * closing quotation), followed by a paragraph of the same part that is not a float or set in italics (and, after
 * a paragraph, opens in lower case), is one block.
 */
function rejoin(blocks: EditionBlock[]): EditionBlock[] {
  const out: EditionBlock[] = [];
  const open = (t: string) => /[\p{L}\p{N},]$/u.test(t.trim());
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (b.kind === "paragraph" && !b.float && prev && !prev.float && prev.source && b.source && "file" in prev.source && "file" in b.source && prev.source.file === b.source.file) {
      // not an italic note that follows a list ("*This portion of the Report is largely based …*")
      if (prev.kind === "list" && open(prev.items[prev.items.length - 1]) && !b.text.startsWith("*")) {
        prev.items[prev.items.length - 1] = `${prev.items[prev.items.length - 1].trim()} ${b.text}`;
        continue;
      }
      if (prev.kind === "paragraph" && open(prev.text) && /^\p{Ll}/u.test(b.text)) {
        prev.text = `${prev.text.trim()} ${b.text}`;
        continue;
      }
    }
    out.push(b);
  }
  return out;
}
