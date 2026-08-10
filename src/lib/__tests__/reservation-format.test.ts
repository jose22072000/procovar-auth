import { describe, it, expect } from "vitest";
import { currencySymbol, formatStayDate, nightsBetween } from "../reservation-format";

describe("currencySymbol", () => {
	it("maps EUR and USD, passes through unknown", () => {
		expect(currencySymbol("EUR")).toBe("€");
		expect(currencySymbol("USD")).toBe("$");
		expect(currencySymbol("GBP")).toBe("GBP");
	});
});

describe("formatStayDate", () => {
	it("formats a date-only ISO in UTC (no -1 day shift)", () => {
		// 2027-07-10T00:00:00Z must render as the 10th, not the 9th
		expect(formatStayDate("2027-07-10T00:00:00.000Z", "en-US")).toContain("10");
		expect(formatStayDate("2027-07-10T00:00:00.000Z", "en-US")).toContain("2027");
	});
});

describe("nightsBetween", () => {
	it("counts whole UTC nights", () => {
		expect(nightsBetween("2027-07-10T00:00:00.000Z", "2027-07-17T00:00:00.000Z")).toBe(7);
	});
});
