import type { ReactNode } from "react";

/**
 * Minimal Markdown renderer for the legal documents in `../_content`.
 *
 * Deliberately NOT a general-purpose Markdown implementation and deliberately
 * not a new dependency: it supports exactly the subset the legal texts use —
 * `##`/`###` headings, paragraphs, `-` and `1.` lists, `>` blockquotes, `---`
 * rules, GFM pipe tables, and inline `**bold**`, `` `code` `` and
 * `[text](url)` links. Anything else is rendered as literal text, which is the
 * safe failure mode for a legal document: nothing disappears.
 *
 * Input is trusted, author-written content compiled into the bundle — never
 * user input — so no HTML is ever emitted from the source string (inline
 * parsing produces React elements, never `dangerouslySetInnerHTML`).
 */

export type Block =
    | { type: "heading"; level: 2 | 3; text: string }
    | { type: "paragraph"; text: string }
    | { type: "list"; ordered: boolean; items: string[] }
    | { type: "quote"; lines: string[] }
    | { type: "table"; header: string[]; rows: string[][] }
    | { type: "rule" };

const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_DIVIDER = /^\s*\|[\s:|-]+\|\s*$/;

function splitRow(line: string): string[] {
    const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return inner.split("|").map((cell) => cell.trim());
}

/** Parse a Markdown document into the block list the renderer walks. */
export function parseBlocks(markdown: string): Block[] {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const blocks: Block[] = [];
    let paragraph: string[] = [];

    const flushParagraph = () => {
        if (paragraph.length > 0) {
            blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
            paragraph = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        const trimmed = line.trim();

        if (trimmed === "") {
            flushParagraph();
            continue;
        }

        if (trimmed === "---" || trimmed === "***") {
            flushParagraph();
            blocks.push({ type: "rule" });
            continue;
        }

        const heading = /^(#{2,3})\s+(.*)$/.exec(trimmed);
        if (heading) {
            flushParagraph();
            blocks.push({
                type: "heading",
                level: heading[1]!.length === 2 ? 2 : 3,
                text: heading[2]!.trim(),
            });
            continue;
        }

        // Table: a pipe row immediately followed by a `|---|` divider.
        if (TABLE_ROW.test(line) && TABLE_DIVIDER.test(lines[i + 1] ?? "")) {
            flushParagraph();
            const header = splitRow(line);
            const rows: string[][] = [];
            i += 2;
            while (i < lines.length && TABLE_ROW.test(lines[i] ?? "")) {
                rows.push(splitRow(lines[i]!));
                i++;
            }
            i--; // the outer loop advances past the last consumed line
            blocks.push({ type: "table", header, rows });
            continue;
        }

        const quote = /^>\s?(.*)$/.exec(trimmed);
        if (quote) {
            flushParagraph();
            const quoteLines = [quote[1]!.trim()];
            while (i + 1 < lines.length) {
                const next = /^>\s?(.*)$/.exec((lines[i + 1] ?? "").trim());
                if (!next) break;
                quoteLines.push(next[1]!.trim());
                i++;
            }
            blocks.push({ type: "quote", lines: quoteLines.filter(Boolean) });
            continue;
        }

        const unordered = /^[-*]\s+(.*)$/.exec(trimmed);
        const ordered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
        if (unordered || ordered) {
            flushParagraph();
            const isOrdered = !!ordered;
            const items = [(unordered ?? ordered)![1]!.trim()];
            while (i + 1 < lines.length) {
                const nextTrimmed = (lines[i + 1] ?? "").trim();
                const nextMatch = isOrdered
                    ? /^\d+[.)]\s+(.*)$/.exec(nextTrimmed)
                    : /^[-*]\s+(.*)$/.exec(nextTrimmed);
                if (!nextMatch) break;
                items.push(nextMatch[1]!.trim());
                i++;
            }
            blocks.push({ type: "list", ordered: isOrdered, items });
            continue;
        }

        paragraph.push(trimmed);
    }

    flushParagraph();
    return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/** Render inline `**bold**`, `` `code` `` and `[text](url)` as React nodes. */
export function renderInline(text: string, keyPrefix = ""): ReactNode[] {
    const parts = text.split(INLINE).filter((part) => part !== "" && part !== undefined);

    return parts.map((part, index) => {
        const key = `${keyPrefix}-${index}`;

        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            return (
                <strong key={key} className="font-semibold text-gray-900">
                    {part.slice(2, -2)}
                </strong>
            );
        }

        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
            return (
                <code key={key} className="rounded-sm bg-gray-100 px-1 py-0.5 text-[0.85em] text-gray-800">
                    {part.slice(1, -1)}
                </code>
            );
        }

        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
            const href = link[2]!;
            const external = /^https?:\/\//.test(href);
            return (
                <a
                    key={key}
                    href={href}
                    className="underline underline-offset-2"
                    style={{ color: "#1e3a8a" }}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                    {link[1]}
                </a>
            );
        }

        return <span key={key}>{part}</span>;
    });
}

export function Markdown({ source }: { source: string }) {
    const blocks = parseBlocks(source);

    return (
        <div className="space-y-4 text-sm leading-relaxed text-gray-700">
            {blocks.map((block, index) => {
                const key = `b${index}`;

                switch (block.type) {
                    case "heading":
                        return block.level === 2 ? (
                            <h2 key={key} className="pt-4 text-base font-bold uppercase tracking-wide text-gray-900">
                                {renderInline(block.text, key)}
                            </h2>
                        ) : (
                            <h3 key={key} className="pt-2 text-sm font-bold text-gray-900">
                                {renderInline(block.text, key)}
                            </h3>
                        );

                    case "paragraph":
                        return <p key={key}>{renderInline(block.text, key)}</p>;

                    case "list":
                        return block.ordered ? (
                            <ol key={key} className="list-decimal space-y-1 pl-5">
                                {block.items.map((item, i) => (
                                    <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
                                ))}
                            </ol>
                        ) : (
                            <ul key={key} className="list-disc space-y-1 pl-5">
                                {block.items.map((item, i) => (
                                    <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
                                ))}
                            </ul>
                        );

                    case "quote":
                        return (
                            <blockquote
                                key={key}
                                className="rounded-sm border-l-4 px-4 py-3"
                                style={{ borderColor: "#1e3a8a", backgroundColor: "rgba(30,58,138,0.05)" }}
                            >
                                {block.lines.map((line, i) => (
                                    <p key={`${key}-${i}`}>{renderInline(line, `${key}-${i}`)}</p>
                                ))}
                            </blockquote>
                        );

                    case "table":
                        return (
                            <div key={key} className="overflow-x-auto">
                                <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
                                    <thead>
                                        <tr>
                                            {block.header.map((cell, i) => (
                                                <th
                                                    key={`${key}-h${i}`}
                                                    className="border border-gray-200 bg-gray-50 px-3 py-2 font-semibold text-gray-900"
                                                >
                                                    {renderInline(cell, `${key}-h${i}`)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {block.rows.map((row, r) => (
                                            <tr key={`${key}-r${r}`}>
                                                {row.map((cell, c) => (
                                                    <td key={`${key}-r${r}c${c}`} className="border border-gray-200 px-3 py-2 align-top">
                                                        {renderInline(cell, `${key}-r${r}c${c}`)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );

                    case "rule":
                        return <hr key={key} className="border-gray-200" />;
                }
            })}
        </div>
    );
}
