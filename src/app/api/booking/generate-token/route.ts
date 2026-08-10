import { NextRequest, NextResponse } from "next/server";
import { encryptBookingParams, generateSecureBookingUrl } from "@/app/(base)/booking/_utils";

/**
 * POST /api/booking/generate-token
 * 
 * Generate a secure booking token/URL
 * Requires Bearer token authentication
 * 
 * Request body:
 * {
 *   propertyId: string,
 *   checkin: string (YYYY-MM-DD),
 *   checkout: string (YYYY-MM-DD),
 *   nights?: number,
 *   search?: {
 *     adults: number,
 *     children?: number,
 *     childrenAges?: number[],
 *     pets?: boolean
 *   },
 *   rooms: [{
 *     id: string,
 *     rateId?: string,
 *     guests: number,
 *     children?: number,
 *     childrenAges?: number[],
 *     cribs?: number,
 *     pets?: boolean
 *   }],
 *   returnUrl?: boolean
 * }
 * 
 * Response:
 * { token: string } or { url: string }
 */
export async function POST(request: NextRequest) {
    try {
        // Validate Bearer token
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Missing or invalid authorization header" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        if (token !== (process.env.BEARER_TOKEN)) {
            return NextResponse.json(
                { error: "Invalid bearer token" },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { propertyId, rooms, checkin, checkout, nights, search, returnUrl } = body;

        // Validate required fields
        if (!propertyId || !rooms || !checkin || !checkout) {
            return NextResponse.json(
                { error: "Missing required fields: propertyId, rooms, checkin, checkout" },
                { status: 400 }
            );
        }

        // Validate rooms structure
        if (!Array.isArray(rooms) || rooms.length === 0) {
            return NextResponse.json(
                { error: "rooms must be a non-empty array" },
                { status: 400 }
            );
        }

        for (const room of rooms) {
            if (!room.id || typeof room.guests !== "number") {
                return NextResponse.json(
                    { error: "Each room must have id (string) and guests (number)" },
                    { status: 400 }
                );
            }
            if (room.children !== undefined && typeof room.children !== "number") {
                return NextResponse.json(
                    { error: "room.children must be a number when provided" },
                    { status: 400 }
                );
            }
            if (room.childrenAges !== undefined && !Array.isArray(room.childrenAges)) {
                return NextResponse.json(
                    { error: "room.childrenAges must be an array when provided" },
                    { status: 400 }
                );
            }
            if (room.cribs !== undefined && typeof room.cribs !== "number") {
                return NextResponse.json(
                    { error: "room.cribs must be a number when provided" },
                    { status: 400 }
                );
            }
            const childrenCount = typeof room.children === "number" ? room.children : 0;
            const cribsCount = typeof room.cribs === "number" ? room.cribs : 0;
            if (cribsCount > childrenCount) {
                return NextResponse.json(
                    { error: "room.cribs cannot exceed room.children" },
                    { status: 400 }
                );
            }
        }

        // Validate optional search criteria
        if (search !== undefined) {
            if (typeof search !== "object" || search === null || typeof search.adults !== "number") {
                return NextResponse.json(
                    { error: "search must be an object with numeric adults" },
                    { status: 400 }
                );
            }
        }

        // Validate optional nights
        if (nights !== undefined && (typeof nights !== "number" || nights <= 0)) {
            return NextResponse.json(
                { error: "nights must be a positive number when provided" },
                { status: 400 }
            );
        }

        // Validate date format (basic check)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(checkin) || !dateRegex.test(checkout)) {
            return NextResponse.json(
                { error: "Dates must be in YYYY-MM-DD format" },
                { status: 400 }
            );
        }

        const bookingParams = {
            propertyId,
            rooms,
            checkin,
            checkout,
            nights,
            search,
        };

        if (returnUrl) {
            const url = await generateSecureBookingUrl(bookingParams);
            return NextResponse.json({ url });
        } else {
            const secureToken = await encryptBookingParams(bookingParams);
            return NextResponse.json({ token: secureToken });
        }
    } catch (error) {
        console.error("Error generating booking token:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
