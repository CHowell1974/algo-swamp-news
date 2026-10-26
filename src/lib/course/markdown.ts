export type Inline =
  { type: "text"; text: string } | { type: "strong"; text: string } | { type: "em"; text: string };

export type MarkdownBlock =
  | { type: "p"; inlines: Inline[] }
  | { type: "ul"; items: Inline[][] }
  | { type: "ol"; items: Inline[][] }
  | { type: "table"; headers: Inline[][]; rows: Inline[][][] };

/** Inline marks used by the course file: **bold** and *italic*. */
export function parseInlines(input: string): Inline[] {
  const out: Inline[] = [];
  let buf = "";
  let i = 0;
  const flush = () => {
    if (!buf) return;
    out.push({ type: "text", text: buf });
    buf = "";
  };
  while (i < input.length) {
    if (input.startsWith("**", i)) {
      const end = input.indexOf("**", i + 2);
      if (end !== -1) {
        flush();
        out.push({ type: "strong", text: input.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (input[i] === "*") {
      const end = input.indexOf("*", i + 1);
      if (end !== -1) {
        flush();
        out.push({ type: "em", text: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    buf += input[i];
    i += 1;
  }
  flush();
  return out;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

/**
 * The course markdown is a small subset: paragraphs, bullet lists, numbered
 * lists, and pipe tables. Lists can follow a paragraph without a blank line.
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;
  const isUl = (line: string) => /^-\s+/.test(line);
  const isOl = (line: string) => /^\d+\.\s+/.test(line);
  const isTable = (line: string) => line.trim().startsWith("|");
  const isBlank = (line: string) => line.trim() === "";

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (isBlank(line)) {
      i += 1;
      continue;
    }
    if (isTable(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTable(lines[i] ?? "")) {
        tableLines.push(lines[i] ?? "");
        i += 1;
      }
      const rows = tableLines.map(splitRow);
      const header = rows[0] ?? [];
      const body = rows[1] && isSeparator(rows[1]) ? rows.slice(2) : rows.slice(1);
      blocks.push({
        type: "table",
        headers: header.map(parseInlines),
        rows: body.map((row) => row.map(parseInlines)),
      });
      continue;
    }
    if (isUl(line)) {
      const items: string[] = [];
      while (i < lines.length && isUl(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^-\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items: items.map(parseInlines) });
      continue;
    }
    if (isOl(line)) {
      const items: string[] = [];
      while (i < lines.length && isOl(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items: items.map(parseInlines) });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      !isBlank(lines[i] ?? "") &&
      !isTable(lines[i] ?? "") &&
      !isUl(lines[i] ?? "") &&
      !isOl(lines[i] ?? "")
    ) {
      para.push((lines[i] ?? "").trim());
      i += 1;
    }
    blocks.push({ type: "p", inlines: parseInlines(para.join(" ")) });
  }
  return blocks;
}
