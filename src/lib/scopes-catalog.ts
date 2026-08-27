/**
 * Single source of truth for the Auth scope catalog.
 *
 * Every scope used by the Identity Hub MUST be listed here, with metadata
 * describing what it does, which microservice typically needs it, and what
 * risk level it carries. The admin UI reads this catalog to power the
 * /apikeys page (search, presets, descriptions).
 *
 * To add a new scope:
 *   1. Add the entry below.
 *   2. Reference it from the route handler that requires it
 *      (via withServiceAuth({ scopes: [...] })).
 *   3. Optionally add it to PRESETS or ROLE_RECOMMENDED_SCOPES.
 */

export type ScopeRisk = 'read' | 'write' | 'admin';

export interface ScopeDefinition {
    /** Canonical scope id, format `<resource>:<action>`. */
    id: string;
    /** Logical group used to render the catalog. */
    category:
        | 'session'
        | 'auth-flow'
        | 'jwt'
        | 'apikey'
        | 'admin'
        | 'notify'
        | 'wildcard';
    /** Human-readable short name. */
    label: string;
    /** What this scope authorizes. */
    description: string;
    /** Risk classification — drives UI color & warnings. */
    risk: ScopeRisk;
    /** Endpoints protected by this scope (informational). */
    endpoints: string[];
    /**
     * Microservices that typically need this scope.
     * Used to suggest the right scopes when onboarding a new client.
     */
    suggestedFor?: string[];
}

/* eslint-disable max-len */
export const SCOPES: ScopeDefinition[] = [
    // ── Sessions ──────────────────────────────────────────────────────────
    {
        id: 'session:verify',
        category: 'session',
        label: 'Verify session',
        description:
            'Validate a `qb.session_token` cookie / sessionToken and receive the user, session and memberships.',
        risk: 'read',
        endpoints: ['POST /api/auth/verify-session'],
        suggestedFor: ['pedido', 'auth', 'entrega', 'avisos'],
    },
    {
        id: 'session:revoke',
        category: 'session',
        label: 'Revoke session',
        description:
            'Sign the user out of one or all of their sessions. Used by logout flows and admin tooling.',
        risk: 'write',
        endpoints: ['POST /api/auth/revoke-session'],
        suggestedFor: ['pedido', 'auth'],
    },

    // ── Authentication flow ───────────────────────────────────────────────
    {
        id: 'callback:create',
        category: 'auth-flow',
        label: 'Mint callback token',
        description:
            'Create a single-use callback JWT that the user is redirected through to start the login flow on this client.',
        risk: 'write',
        endpoints: ['POST /api/auth/callback-token'],
        suggestedFor: ['entrega', 'auth'],
    },
    {
        id: 'callback:any',
        category: 'auth-flow',
        label: 'Mint callback token for any client',
        description:
            'Allow overriding the `clientId` when minting a callback token. Reserved for tools that proxy login on behalf of multiple clients.',
        risk: 'admin',
        endpoints: ['POST /api/auth/callback-token (with clientId override)'],
        suggestedFor: ['auth'],
    },
    {
        id: 'auth:exchange',
        category: 'auth-flow',
        label: 'Exchange auth code',
        description:
            'Trade the opaque `code` returned by /api/auth/callback for a usable session payload (sessionToken, user, memberships).',
        risk: 'read',
        endpoints: ['POST /api/auth/exchange'],
        suggestedFor: ['entrega', 'auth'],
    },

    // ── Inter-service JWT (RS256 + JWKS) ──────────────────────────────────
    {
        id: 'jwt:sign',
        category: 'jwt',
        label: 'Sign service JWT',
        description:
            'Mint an RS256 JWT signed by Auth. Receivers can verify it locally via /.well-known/jwks.json without calling the hub.',
        risk: 'write',
        endpoints: ['POST /api/auth/sign'],
        suggestedFor: ['pedido', 'auth', 'avisos'],
    },
    {
        id: 'jwt:verify',
        category: 'jwt',
        label: 'Verify service JWT',
        description:
            'Verify an RS256 JWT centrally via the hub. Prefer local JWKS verification with `createJwksVerifier()` for zero round-trip.',
        risk: 'read',
        endpoints: ['POST /api/auth/verify'],
        suggestedFor: ['pedido', 'avisos'],
    },

    // ── API keys ──────────────────────────────────────────────────────────
    {
        id: 'apikey:verify',
        category: 'apikey',
        label: 'Verify API key',
        description:
            'Validate an API key (format `qbk_<env>_<prefix>_<secret>`) presented by an external client and return its scopes.',
        risk: 'read',
        endpoints: ['POST /api/auth/api-keys/verify'],
        suggestedFor: ['pedido', 'avisos'],
    },

    // ── Notifications (Avisos integration) ─────────────────────────────
    {
        id: 'notify:send',
        category: 'notify',
        label: 'Send notification',
        description:
            'Trigger transactional notifications (email / SMS / push) through Avisos on behalf of this client.',
        risk: 'write',
        endpoints: ['POST {NOTIFY_URL}/notifications/send'],
        suggestedFor: ['pedido', 'auth', 'entrega'],
    },
    {
        id: 'notify:templates:read',
        category: 'notify',
        label: 'Read notification templates',
        description:
            'List and inspect notification templates managed by Avisos (read-only).',
        risk: 'read',
        endpoints: ['GET {NOTIFY_URL}/templates'],
        suggestedFor: ['auth'],
    },
    {
        id: 'notify:templates:manage',
        category: 'notify',
        label: 'Manage notification templates',
        description:
            'Create, update or delete notification templates in Avisos. Admin-only.',
        risk: 'admin',
        endpoints: ['POST/PUT/DELETE {NOTIFY_URL}/templates'],
        suggestedFor: ['auth'],
    },

    // ── Wildcard ──────────────────────────────────────────────────────────
    {
        id: '*',
        category: 'wildcard',
        label: 'Full access on Auth (super-client)',
        description:
            'Grants every current and future scope WHEN CALLING Auth endpoints. Does NOT bypass auth on other microservices (PEDIDO, Avisos…) — they enforce their own. Úsalo sólo para un cliente interno de administración y guarda su clave de firma donde se guardan los secretos.',
        risk: 'admin',
        endpoints: ['ALL endpoints exposed by Auth'],
        suggestedFor: ['auth'],
    },
];

export const SCOPE_BY_ID: Record<string, ScopeDefinition> = Object.fromEntries(
    SCOPES.map(s => [s.id, s]),
);

export function isKnownScope(id: string): boolean {
    return id in SCOPE_BY_ID;
}

/* ── Presets ──────────────────────────────────────────────────────────────
 * Curated scope bundles used to onboard new clients with one click.
 * Keep the list short and opinionated — the UI also allows custom selection.
 */

export interface ScopePreset {
    id: string;
    label: string;
    description: string;
    targetService: string;
    scopes: string[];
}

export const PRESETS: ScopePreset[] = [
    {
        id: 'consumer-backend',
        label: 'Consumer backend (PEDIDO style)',
        description:
            'Backend microservice that needs to verify sessions, sign/verify JWTs and validate API keys. No callback minting.',
        targetService: 'PEDIDO, Avisos',
        scopes: [
            'session:verify',
            'session:revoke',
            'jwt:sign',
            'jwt:verify',
            'apikey:verify',
        ],
    },
    {
        id: 'frontend-bff',
        label: 'Panel interno (estilo Auth)',
        description:
            'Backend-for-frontend that drives a browser app: login flow, session checks, plus JWT signing for downstream services.',
        targetService: 'auth',
        scopes: [
            'callback:create',
            'auth:exchange',
            'session:verify',
            'session:revoke',
            'jwt:sign',
            'jwt:verify',
            'apikey:verify',
        ],
    },
    {
        id: 'public-booking',
        label: 'Aplicación de campo (estilo Entrega)',
        description:
            'Public-facing app that only needs to start the login flow and verify the resulting session.',
        targetService: 'entrega',
        scopes: ['callback:create', 'auth:exchange', 'session:verify'],
    },
    {
        id: 'notification-publisher',
        label: 'Notification publisher',
        description:
            'Service that emits notifications via Avisos and verifies that the caller is logged in.',
        targetService: 'Avisos (consumer)',
        scopes: ['session:verify', 'notify:send', 'jwt:verify'],
    },
    {
        id: 'admin-super-client',
        label: 'Cliente de administración total',
        description:
            'Programmatic access to every endpoint. Use sparingly and store the key in a secrets manager.',
        targetService: 'auth',
        scopes: ['*'],
    },
];

export const PRESET_BY_ID: Record<string, ScopePreset> = Object.fromEntries(
    PRESETS.map(p => [p.id, p]),
);

/* ── Role → recommended scopes ────────────────────────────────────────────
 * Maps your business-level roles to a baseline scope set. Today only the
 * `system-admin` role exists in Auth; this map is here so when you add
 * more roles (e.g. `partner`, `support`) the UI already knows what to suggest.
 */
export const ROLE_RECOMMENDED_SCOPES: Record<string, string[]> = {
    'system-admin': ['*'],
    'partner-backend': [
        'session:verify',
        'jwt:verify',
        'apikey:verify',
        'notify:send',
    ],
    'support-readonly': ['session:verify', 'jwt:verify', 'apikey:verify'],
};

/* ── Microservices catalog ────────────────────────────────────────────────
 * Listed for the help section of the /apikeys page. */
export interface MicroserviceInfo {
    id: string;
    name: string;
    role: string;
    baseUrl?: string;
}
/**
 * Las aplicaciones de Procovar que entran por aquí.
 *
 * Esta lista se quedó con los servicios del producto de reservas del que salió este
 * código —qb-back, qb-booking, qb-panel, todos en hostravel.com—, así que la pantalla de
 * Aplicaciones documentaba un sistema que no existe. Quien fuera a dar de alta un
 * servicio nuevo se guiaba por ejemplos de otra empresa.
 */
export const MICROSERVICES: MicroserviceInfo[] = [
    {
        id: 'auth',
        name: 'Auth (centro de accesos)',
        role: 'Dueño de las personas, las sesiones, las claves de firma y las de API. Es este mismo.',
        baseUrl: 'https://auth.procovar.cloud',
    },
    {
        id: 'pedido',
        name: 'PEDIDO',
        role: 'Pedidos, clientes y vendedores de las ocho sucursales. Verifica sesiones y lee clientes para las demás.',
        baseUrl: 'https://pedidos.procovar.cloud',
    },
    {
        id: 'analitics',
        name: 'Analitics',
        role: 'Informes de ventas, gestores y productos. Sólo lee.',
        baseUrl: 'https://analitics.procovar.cloud',
    },
    {
        id: 'rutas',
        name: 'Rutas',
        role: 'Recorridos de los vendedores sobre el mapa, a partir de los GPX.',
        baseUrl: 'https://rutas.procovar.cloud',
    },
    {
        id: 'delivery',
        name: 'Delivery',
        role: 'Reparto y planificación de rutas. Espejo de los pedidos de PEDIDO.',
        baseUrl: 'https://delivery.procovar.cloud',
    },
    {
        id: 'entrega',
        name: 'Entrega (delivery-apk)',
        role: 'La aplicación de los repartidores y su panel. Calcula el costo del domicilio y se lo manda a PEDIDO.',
        baseUrl: 'https://entrega.procovar.cloud',
    },
    {
        id: 'caja',
        name: 'Caja',
        role: 'Cobros y cierres de caja.',
        baseUrl: 'https://caja.procovar.cloud',
    },
    {
        id: 'traslado',
        name: 'Traslado',
        role: 'Movimientos de mercancía entre sucursales.',
        baseUrl: 'https://traslado.procovar.cloud',
    },
    {
        id: 'ccsa',
        name: 'Tablero Parranda',
        role: 'El tablero de Parranda / CCSA.',
        baseUrl: 'https://ccsa.procovar.cloud',
    },
    {
        id: 'avisos',
        name: 'Avisos',
        role: 'Manda los avisos por correo y dentro de la aplicación. Pregunta aquí quién llama.',
        baseUrl: 'https://avisos-api.procovar.cloud',
    },
];

