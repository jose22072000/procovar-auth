import { describe, it, expect } from "vitest";
import { parseBlocks } from "../markdown";
import { LEGAL_DOCS } from "../../_content";

describe("parseBlocks", () => {
    it("parses headings at level 2 and 3", () => {
        const blocks = parseBlocks("## Uno\n\n### Dos");
        expect(blocks).toEqual([
            { type: "heading", level: 2, text: "Uno" },
            { type: "heading", level: 3, text: "Dos" },
        ]);
    });

    it("joins wrapped lines into a single paragraph and splits on blank lines", () => {
        const blocks = parseBlocks("linea uno\nlinea dos\n\notro parrafo");
        expect(blocks).toEqual([
            { type: "paragraph", text: "linea uno linea dos" },
            { type: "paragraph", text: "otro parrafo" },
        ]);
    });

    it("parses unordered and ordered lists separately", () => {
        const blocks = parseBlocks("- a\n- b\n\n1. uno\n2. dos");
        expect(blocks).toEqual([
            { type: "list", ordered: false, items: ["a", "b"] },
            { type: "list", ordered: true, items: ["uno", "dos"] },
        ]);
    });

    it("parses a pipe table with its header and rows", () => {
        const blocks = parseBlocks("| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |");
        expect(blocks).toEqual([
            { type: "table", header: ["A", "B"], rows: [["1", "2"], ["3", "4"]] },
        ]);
    });

    it("does not treat a lone pipe row as a table", () => {
        const blocks = parseBlocks("| A | B |");
        expect(blocks[0]?.type).toBe("paragraph");
    });

    it("continues parsing after a table", () => {
        const blocks = parseBlocks("| A |\n|---|\n| 1 |\n\n## Después");
        expect(blocks.map((b) => b.type)).toEqual(["table", "heading"]);
    });

    it("groups consecutive blockquote lines", () => {
        const blocks = parseBlocks("> uno\n> dos\n\ntexto");
        expect(blocks[0]).toEqual({ type: "quote", lines: ["uno", "dos"] });
        expect(blocks[1]).toEqual({ type: "paragraph", text: "texto" });
    });

    it("parses horizontal rules", () => {
        expect(parseBlocks("---")).toEqual([{ type: "rule" }]);
    });
});

describe("legal corpus", () => {
    it("every document has a unique slug, a title and a body", () => {
        const slugs = LEGAL_DOCS.map((d) => d.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
        for (const doc of LEGAL_DOCS) {
            expect(doc.title.length).toBeGreaterThan(0);
            expect(doc.summary.length).toBeGreaterThan(0);
            expect(doc.body.length).toBeGreaterThan(500);
        }
    });

    it("every document parses without producing empty blocks", () => {
        for (const doc of LEGAL_DOCS) {
            const blocks = parseBlocks(doc.body);
            expect(blocks.length).toBeGreaterThan(5);
            for (const block of blocks) {
                if (block.type === "paragraph") expect(block.text.trim()).not.toBe("");
                if (block.type === "table") expect(block.header.length).toBeGreaterThan(0);
            }
        }
    });

    it("internal links point at documents that exist", () => {
        const slugs = new Set(LEGAL_DOCS.map((d) => d.slug));
        for (const doc of LEGAL_DOCS) {
            for (const match of doc.body.matchAll(/\]\(\/legal\/([a-z-]+)\)/g)) {
                expect(slugs, `${doc.slug} links to /legal/${match[1]}`).toContain(match[1]!);
            }
        }
    });
});
