import type { ReactNode } from "react";
import { parseInlines, parseMarkdown, type Inline } from "@/lib/course/markdown";

function InlineText({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((inline, index) => {
        if (inline.type === "strong") return <strong key={index}>{inline.text}</strong>;
        if (inline.type === "em") return <em key={index}>{inline.text}</em>;
        return <span key={index}>{inline.text}</span>;
      })}
    </>
  );
}

export function CourseMarkdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className={`space-y-4 text-sm leading-relaxed text-pretty text-fg ${className}`}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function renderBlock(block: ReturnType<typeof parseMarkdown>[number], index: number): ReactNode {
  if (block.type === "p") {
    return (
      <p key={index}>
        <InlineText inlines={block.inlines} />
      </p>
    );
  }
  if (block.type === "ul" || block.type === "ol") {
    const List = block.type === "ul" ? "ul" : "ol";
    return (
      <List
        key={index}
        className={`space-y-2 pl-5 ${block.type === "ul" ? "list-disc" : "list-decimal"}`}
      >
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>
            <InlineText inlines={item} />
          </li>
        ))}
      </List>
    );
  }
  return (
    <div key={index} className="overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <thead className="bg-surface-2 text-muted">
          <tr>
            {block.headers.map((cell, cellIndex) => (
              <th key={cellIndex} className="px-3 py-2 font-medium">
                <InlineText inlines={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-line">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 align-top">
                  <InlineText inlines={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InlineMarkdown({ text }: { text: string }) {
  return <InlineText inlines={parseInlines(text)} />;
}
