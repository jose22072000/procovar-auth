import { describe, it, expect } from "vitest";
import { clampHoldMinutes } from "../system-config";

describe("clampHoldMinutes", () => {
	it("defaults to 15 for missing / non-numeric", () => {
		expect(clampHoldMinutes(undefined)).toBe(15);
		expect(clampHoldMinutes(null)).toBe(15);
		expect(clampHoldMinutes("abc")).toBe(15);
	});
	it("parses + rounds numeric strings", () => {
		expect(clampHoldMinutes("20")).toBe(20);
		expect(clampHoldMinutes("19.6")).toBe(20);
	});
	it("clamps to [1, 1440]", () => {
		expect(clampHoldMinutes("0")).toBe(1);
		expect(clampHoldMinutes(-5)).toBe(1);
		expect(clampHoldMinutes(99999)).toBe(1440);
	});
});
