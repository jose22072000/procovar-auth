import { NextRequest } from "next/server";

/**
 * Auth servidor-a-servidor para las apps conectadas (delivery, pedido, analitics…).
 * Header `x-api-key` que debe coincidir con SERVICE_API_KEY. Sin sesión de usuario.
 */
export function isValidServiceKey(req: NextRequest): boolean {
    const key = req.headers.get("x-api-key");
    return !!process.env.SERVICE_API_KEY && key === process.env.SERVICE_API_KEY;
}
