import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const PAGE = readFileSync(path.join(process.cwd(), "src/app/(base)/logout/page.tsx"), "utf8");
const CONFIG = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");

// Logging out walks the browser through every registered consumer's
// /api/logout/clear. Chrome applies `form-action` to each hop of that redirect
// chain, so a form submit could only survive if the CSP listed every consumer
// origin — and that list lives in the database, growing as clients are
// registered. Confirming a logout is a GET with three parameters; a link says
// that and is governed by navigation rules, which the fan-out can satisfy.
describe("the logout confirmation", () => {
	it("navigates rather than submitting a form", () => {
		expect(PAGE).not.toMatch(/<form/);
		expect(PAGE).toContain("href={fanoutUrl}");
	});

	it("still carries the three parameters the fan-out needs", () => {
		expect(PAGE).toContain('u.searchParams.set("step", "0")');
		expect(PAGE).toContain('u.searchParams.set("returnTo", returnTo)');
		expect(PAGE).toContain('u.searchParams.set("caller", callerOrigin)');
	});

	// If a form comes back here, this is the reminder of why it broke: the CSP
	// never listed the consumer origins, and cannot — they live in the database.
	it("has a form-action that does not pretend to cover the consumers", () => {
		const match = CONFIG.match(/"form-action ([^"]+)"/);
		expect(match).not.toBeNull();
		expect(match![1]).not.toContain("extranet.hostravel.com");
	});
});
