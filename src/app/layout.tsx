import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

/**
 * Tres letras, tres papeles. Nada de una familia para todo.
 *
 * · Archivo es la del logotipo: estrecha, de remates planos, industrial. Titula
 *   y rotula. Estrecha importa de verdad aquí: los nombres cubanos completos son
 *   largos y en una fuente ancha no caben en la columna de una tabla.
 * · Plex Sans lee el texto corrido sin cansar a las ocho horas.
 * · Plex Mono es para los CÓDIGOS —CAM, HOL, `pedido.read`, un folio, una IP—,
 *   que se comparan carácter a carácter. En proporcional, un 1 y una l se
 *   confunden y una IP mal leída manda a alguien a buscar donde no es.
 *
 * Antes había cuatro cargadas (Geist, Geist Mono, Montserrat, Poppins): el
 * paquete genérico que viene con cualquier plantilla, y ninguna era de la marca.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Procovar — Cuentas",
  description: "Centro de identidad de Procovar",
  icons: {
    // El isotipo de Procovar. En claro sale el cuadrado azul; en oscuro se
    // invierte, porque un cuadrado azul sobre una pestaña negra se pierde.
    icon: [
      { url: "/favicon-oscuro.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/favicon-claro.svg", type: "image/svg+xml" },
    ],
    apple: "/logo-512.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${archivo.variable} ${plex.variable} ${plexMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <div className="flex min-h-svh flex-col">
              <div className="flex-1">{children}</div>
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
