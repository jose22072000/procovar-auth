import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        termsAcceptance: {
            create: vi.fn(),
        },
    },
}));

import { recordTermsAcceptance, clientIpFromHeaders, CHECKOUT_CONSENT_DOCUMENTS } from "../terms-acceptance";
import { COMPANY } from "../company";
import { prisma } from "@/lib/prisma";

const mockCreate = vi.mocked((prisma as unknown as { termsAcceptance: { create: ReturnType<typeof vi.fn> } }).termsAcceptance.create);

beforeEach(() => {
    vi.resetAllMocks();
    mockCreate.mockResolvedValue({ id: "ta_1", createdAt: new Date(0) });
});

describe("recordTermsAcceptance", () => {
    it("stamps the current terms version and the checkout document set by default", async () => {
        await recordTermsAcceptance({ authUserId: "u_1", invoiceId: "inv_1", ipAddress: "1.2.3.4", userAgent: "UA" });

        expect(mockCreate).toHaveBeenCalledTimes(1);
        const data = mockCreate.mock.calls[0]![0].data;
        expect(data).toMatchObject({
            authUserId: "u_1",
            invoiceId: "inv_1",
            termsVersion: COMPANY.termsVersion,
            ipAddress: "1.2.3.4",
            userAgent: "UA",
        });
        expect(data.documents).toEqual([...CHECKOUT_CONSENT_DOCUMENTS]);
    });

    it("normalizes missing optional fields to null instead of undefined", async () => {
        await recordTermsAcceptance({ authUserId: "u_2" });

        const data = mockCreate.mock.calls[0]![0].data;
        expect(data.invoiceId).toBeNull();
        expect(data.reservationId).toBeNull();
        expect(data.ipAddress).toBeNull();
        expect(data.userAgent).toBeNull();
    });

    it("keeps an explicit document list", async () => {
        await recordTermsAcceptance({ authUserId: "u_3", documents: ["condiciones"] });
        expect(mockCreate.mock.calls[0]![0].data.documents).toEqual(["condiciones"]);
    });
});

describe("clientIpFromHeaders", () => {
    it("prefers cf-connecting-ip", () => {
        const h = new Headers({ "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" });
        expect(clientIpFromHeaders(h)).toBe("9.9.9.9");
    });

    it("takes the first entry of x-forwarded-for", () => {
        const h = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" });
        expect(clientIpFromHeaders(h)).toBe("1.1.1.1");
    });

    it("falls back to x-real-ip", () => {
        expect(clientIpFromHeaders(new Headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    });

    it("returns null when no client-ip header is present", () => {
        expect(clientIpFromHeaders(new Headers())).toBeNull();
    });
});
