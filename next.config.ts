import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.ggpht.com',
      }
    ],
  },
  /**
   * Baseline security headers for the payment domain.
   *
   * `frame-ancestors 'self'` (rather than a blanket X-Frame-Options) is what
   * keeps the checkout from being embedded by a third party, while still
   * allowing us to embed Redsys's own iframe — the direction that matters for
   * InSite is `frame-src`, added here for the Redsys hosted card fields.
   * A full Content-Security-Policy (script-src/style-src) is deliberately NOT
   * enabled yet: it needs a nonce-based setup for Next's inline bootstrap and
   * HeroUI's injected styles, and a broken CSP on the pay page is worse than
   * no CSP. Tracked in docs/legal/AUDITORIA-REDSYS-INSITE.md.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
          {
            key: "Content-Security-Policy",
            value: [
              "frame-ancestors 'self'",
              // Redsys hosted card fields (InSite) + the SumUp widget's iframe.
              "frame-src 'self' https://sis.redsys.es https://sis-t.redsys.es https://sis-t.redsys.es:25443 https://gateway.sumup.com",
              // The redirect gateway auto-submits a form to the Redsys hosted page.
              //
              // The :25443 entry is not redundant. Redsys serves its SANDBOX on
              // that port, and a CSP source with no port only matches the
              // scheme's default (443) — so `https://sis-t.redsys.es` alone let
              // the browser block the submit to sis-t.redsys.es:25443 and the
              // guest never reached the payment page. Production is on 443 and
              // needs no port.
              "form-action 'self' https://sis.redsys.es https://sis-t.redsys.es https://sis-t.redsys.es:25443 https://gateway.sumup.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
