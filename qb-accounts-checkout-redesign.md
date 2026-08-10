# Prompt — Rediseño y corrección de la página de Checkout en qb-accounts

> Pásale este archivo al proyecto **qb-accounts** (hostravel/qb-auth).
> La pantalla `/booking?secure=<token>` tiene bugs críticos y un diseño incorrecto.
> Este documento describe exactamente qué está mal (basado en un test real en producción),
> qué datos llegan, y cómo debe quedar.

---

## 0. Hallazgos del test real en producción (Mayo 2026)

Se ejecutó una reserva completa en QuickBookTravelFrontend → redirigió a qb-accounts.
Aquí están los problemas confirmados con el navegador abierto:

### 0.1 JWT real recibido (decodificado)

```json
{
  "propertyId": "2",
  "checkin": "2026-05-15",
  "checkout": "2026-05-16",
  "nights": 1,
  "search": {
    "adults": 2,
    "children": 0,
    "childrenAges": [],
    "pets": false
  },
  "rooms": [
    {
      "id": "1009",
      "rateId": "3966",
      "guests": 2,
      "children": 0,
      "childrenAges": [],
      "pets": false,
      "cribs": 0
    }
  ],
  "iat": 1778878046,
  "exp": 1778964446
}
```

> **Importante:** `rateId` **siempre viene informado**. No existe el caso de `rateId: null`
> porque el frontend solo permite reservar cuando existe una tarifa válida.
> `rooms[].id` es el **roomTypeId**.

### 0.2 Error en consola del navegador

```
Failed to load resource: the server responded with a status of 401 ()
```

La llamada a `POST /api/reservations/verify-booking` falla con **HTTP 401**.
Esto hace que qb-accounts no tenga precios y muestre `€0.00` en toda la página.

### 0.3 Lo que muestra actualmente qb-accounts (INCORRECTO)

La página muestra esto como bloque principal de la selección:

```
[foto de la propiedad]  DozzZe Romeo  0
                        C/ de Claudio Coello, 16, 03010 Alicante
                        Alicante, ES
                        [✓ Shower] [P Parking] [✓ Free WiFi] [❄ Air conditioning]
```

**Esto es incorrecto por tres razones:**
1. Se muestra la **propiedad** como elemento principal (nombre, dirección, amenities de la propiedad)
2. El `0` suelto es un campo numérico sin guard (rating, conteo, etc.)
3. Los amenities mostrados son de la **propiedad**, no del **room type**

### 0.4 Lo que DEBE mostrarse (CORRECTO)

El usuario reservó un **tipo de habitación** ("Studio Apartment"), no la propiedad entera.
El bloque principal debe mostrar:

```
[foto del room type]  Studio Apartment
                      Apartamento entero · 1 cama doble · 30 m²
                      2 huéspedes · Max 4 huéspedes
                      [WiFi] [AC] [Ducha] ...amenities del room type
```

El nombre/dirección de la propiedad puede aparecer como **contexto secundario** (texto pequeño
debajo), pero el **título principal es siempre el room type**.

---

## 1. JWT — estructura completa

El frontend llama a `POST /api/reservations/redirect-url` y recibe una URL firmada.
El payload es exactamente el mostrado en §0.1. Campos relevantes:

| Campo            | Tipo     | Descripción                                           |
|------------------|----------|-------------------------------------------------------|
| `propertyId`     | `string` | ID de la propiedad — para llamar a verify-booking     |
| `rooms[].id`     | `string` | **roomTypeId** — ID del tipo de habitación            |
| `rooms[].rateId` | `string` | ID de la tarifa — **siempre presente**, nunca null    |
| `rooms[].guests` | `number` | Adultos asignados a esa habitación                    |
| `nights`         | `number` | Número de noches                                      |
| `checkin`        | `string` | Fecha entrada YYYY-MM-DD                              |
| `checkout`       | `string` | Fecha salida YYYY-MM-DD                               |

> Los precios **no viajan en el JWT**. Se obtienen de `verify-booking`.

---

## 2. Fix crítico — verify-booking da 401

**El fix más urgente.** Sin precios, la página es inutilizable.

```ts
// En la Server Action o fetch de qb-accounts que llama al backend:
const response = await fetch(`${process.env.QB_BACK_URL}/api/reservations/verify-booking`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.QB_BEARER_TOKEN}`,  // ← verificar que existe en .env
  },
  body: JSON.stringify(jwtPayload),
});

if (!response.ok) {
  // Log para debug — nunca mostrar el error al usuario
  console.error('[verify-booking] HTTP', response.status);
}
```

**Checklist para resolver el 401:**
- [ ] ¿Existe `QB_BEARER_TOKEN` en el `.env` / variables de entorno del deploy?
- [ ] ¿El token es el correcto para el entorno de producción vs staging?
- [ ] ¿El header se llama `Authorization: Bearer ...` (no `X-Api-Key` ni otro)?

---

## 3. Estructura de verify-booking response

```jsonc
{
  "property": {
    "id": "2",
    "name": "DozzZe Romeo",
    "address": "C/ de Claudio Coello, 16",
    "city": "Alicante",
    "country": "ES",
    "coverImage": "https://...",
    "amenities": [ ... ]   // amenities de la PROPIEDAD — usar solo en contexto secundario
  },
  "rooms": [
    {
      "roomTypeId": "1009",
      "roomTypeName": "Studio Apartment",    // ← TÍTULO PRINCIPAL del bloque
      "rateId": "3966",
      "rateName": "Standard",
      "pricePerNight": 21500,               // centavos → dividir entre 100
      "totalForStay": 21500,               // centavos → dividir entre 100
      "maxGuests": 4,
      "guests": 2,
      "children": 0,
      "childSurchargePerNight": 0,
      "childSurchargeForStay": 0,
      "unitTypeSummary": "Apartamento entero",
      "bedSummary": "1 cama doble · 1 sofá cama",
      "areaSummary": "30 m²",
      "images": ["https://...jpg"],         // imagen del room type
      "amenities": [                        // amenities del room type (NO de la propiedad)
        { "id": "5",  "key": "wifi",         "name": "Free WiFi",    "isPaid": false },
        { "id": "6",  "key": "parking",      "name": "Parking",      "isPaid": true, "price": 10 },
        { "id": "7",  "key": "pets_allowed", "name": "Pets allowed", "isPaid": true, "price": 20 }
      ]
    }
  ],
  "currency": "EUR",
  "nights": 1,
  "taxRate": 0.10
}
```

> Los precios vienen en **centavos**. Dividir siempre entre 100 antes de mostrar.

---

## 4. Fix — Bloque "Tu Selección" corregido

Reemplazar el bloque actual (que muestra la propiedad) por este:

```tsx
{/* ✅ CORRECTO: título principal = room type, NO la propiedad */}
<div className="rounded-sm border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--page-builder-card)] p-4">

  {rooms.map((room, i) => (
    <div key={room.roomTypeId} className={i > 0 ? 'mt-4 pt-4 border-t border-gray-100 dark:border-white/5' : ''}>
      <div className="flex items-start gap-3">
        {/* Imagen del room type */}
        <img
          src={room.images?.[0] ?? property.coverImage}
          className="h-20 w-20 rounded-sm object-cover shrink-0"
          alt={room.roomTypeName}
        />
        <div className="min-w-0">
          {/* TÍTULO: nombre del room type */}
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {room.roomTypeName}
          </h2>

          {/* Subtítulo: layout */}
          {(room.unitTypeSummary || room.bedSummary || room.areaSummary) && (
            <p className="text-xs text-[var(--color-dozegray)] mt-0.5">
              {[room.unitTypeSummary, room.bedSummary, room.areaSummary]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}

          {/* Capacidad */}
          <p className="mt-1 text-xs text-[var(--color-dozegray)]">
            {room.guests} guests
            {room.maxGuests > 0 && ` · Max ${room.maxGuests} guests`}
          </p>
        </div>
      </div>

      {/* Amenities FREE del room type (NO de la propiedad) */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {room.amenities
          .filter(a => !a.isPaid)
          .slice(0, 5)
          .map(a => (
            <span
              key={a.key}
              className="inline-flex items-center gap-1 rounded-sm bg-dozeblue/10 px-2.5 py-1 text-xs font-medium text-dozeblue dark:bg-dozeblue/20 dark:text-[var(--color-dozeblue)]"
            >
              {a.name}
            </span>
          ))}
      </div>
    </div>
  ))}

  {/* Nombre de la propiedad — solo como contexto de ubicación, pequeño */}
  <p className="mt-3 text-[11px] text-[var(--color-dozegray)] border-t border-gray-100 dark:border-white/5 pt-2">
    {property.name} · {property.city}, {property.country}
  </p>
</div>
```

---

## 5. Fix — El "0" suelto junto al nombre

Buscar cualquier campo numérico que se renderice como hermano del nombre de la propiedad:

```tsx
// ❌ INCORRECTO:
<h3>{property.name}</h3>
<span>{property.rating}</span>   {/* → muestra "0" si rating = 0 */}

// ✅ CORRECTO:
<h3>{property.name}</h3>
{property.rating != null && property.rating > 0 && (
  <span className="ml-1 text-sm text-amber-500">★ {property.rating}</span>
)}
```

Aplicar el mismo patrón a cualquier campo numérico (`roomCount`, `reviewCount`, etc.)
que pueda ser `0`.

---

## 6. Fix — Extras opcionales no actualizan el total

```tsx
// Estado local para los extras seleccionados
const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

const toggleExtra = (key: string) =>
  setSelectedExtras(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );

// Paid amenities de todos los rooms combinados (sin duplicados por key)
const paidAmenities = useMemo(() => {
  const seen = new Set<string>();
  return rooms.flatMap(r => r.amenities.filter(a => a.isPaid)).filter(a => {
    if (seen.has(a.key)) return false;
    seen.add(a.key);
    return true;
  });
}, [rooms]);

// Extras seleccionados con su total
const selectedExtrasLines = selectedExtras.map(key => {
  const a = paidAmenities.find(x => x.key === key)!;
  return { key, name: a.name, total: (a.price / 100) * nights };
});

const amenityTotal = selectedExtrasLines.reduce((sum, e) => sum + e.total, 0);
```

---

## 7. Cálculo de totales correcto

```ts
const toCents = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? v / 100 : 0;

const baseRooms      = rooms.reduce((sum, r) => sum + toCents(r.totalForStay), 0);
const childSurcharge = rooms.reduce((sum, r) => sum + toCents(r.childSurchargeForStay), 0);
const amenityTotal   = selectedExtrasLines.reduce((sum, e) => sum + e.total, 0);
const subtotal       = baseRooms + childSurcharge + amenityTotal;
const taxes          = subtotal * (taxRate ?? 0);
const grandTotal     = subtotal + taxes;
```

---

## 8. Diseño — tokens de color

```css
:root {
  --background:            #fafafa;
  --foreground:            #01072c;
  --color-dozeblue:        #1e3a8a;    /* azul marino — headers, CTAs, botones */
  --qb-nav-bg:             #0A2252;    /* fondo navbar */
  --qb-nav-accent:         #0a5bd3;    /* links y acentos nav */
  --color-dozebg1:         #f8f8f6;
  --color-dozebg2:         #e6e4ff;
  --color-dozegray:        #4b5563;
  --page-builder-bg:       linear-gradient(180deg, #eef2ff 0%, #f9faff 55%, #ffffff 100%);
  --page-builder-card:     rgba(255, 255, 255, 0.97);
  --page-builder-border:   rgba(30, 58, 138, 0.15);
}

.dark {
  --background:            #121212;
  --foreground:            #a09f9f;
  --color-dozeblue:        #60a5fa;
  --color-dozebg1:         #1e1e1e;
  --color-dozebg2:         #2a2a2a;
  --color-dozegray:        #9ca3af;
  --page-builder-bg:       linear-gradient(180deg, #050b1f 0%, #0d1c34 55%, #04080f 100%);
  --page-builder-card:     rgba(11, 20, 39, 0.95);
  --page-builder-border:   rgba(191, 219, 254, 0.12);
}
```

---

## 9. Tipografía

| Rol      | Fuente           | Uso                                    |
|----------|------------------|----------------------------------------|
| body     | Geist Sans       | Texto general                          |
| heading  | Montserrat       | Títulos de sección, botones CTA        |
| ui       | Poppins          | Labels pequeñas, badges                |
| display  | Playfair Display | Hero, headline principal (si aplica)   |

Cargar con `next/font/google`. Border-radius estándar: `rounded-sm` (4 px).

### Tailwind config

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      dozeblue: 'var(--color-dozeblue)',
      dozegray: 'var(--color-dozegray)',
      dozebg1:  'var(--color-dozebg1)',
    },
    fontFamily: {
      montserrat: ['var(--font-montserrat)', 'sans-serif'],
      poppins:    ['var(--font-poppins)',    'sans-serif'],
    },
    borderRadius: { sm: '4px' },
  },
},
```

---

## 10. Layout de la página

```
┌──────────────────────────────────────────────────┐
│  Navbar  (bg #0A2252)  Logo + Steps 1 > 2 > 3   │
├───────────────────────────┬──────────────────────┤
│  Panel izquierdo          │  Sidebar (sticky)    │
│  (flex-1, max-w-2xl)      │  (w-80)              │
│                           │                      │
│  ① Tu Selección           │  Price Summary       │
│    [room type card]       │  (card con totales)  │
│                           │                      │
│  ② Detalles estancia      │                      │
│    check-in/out, guests   │                      │
│                           │                      │
│  ③ Extras Opcionales      │                      │
│    (paid amenities)       │                      │
│                           │                      │
│  [Continuar →]            │                      │
└───────────────────────────┴──────────────────────┘
```

Breakpoint de columna: `lg` (1024 px). Bajo eso → stack vertical.

---

## 11. Sidebar "Price Summary"

```tsx
<div className="rounded-sm border border-gray-200 bg-white shadow-sm
                dark:border-white/10 dark:bg-[var(--page-builder-card)]">

  <div className="rounded-t-sm bg-dozeblue px-4 py-3"
       style={{ backgroundColor: 'var(--color-dozeblue)' }}>
    <h2 className="text-sm font-bold text-white">Price Summary</h2>
  </div>

  <div className="px-4 py-3 space-y-2">

    {/* Property mini-card — solo contexto, tamaño pequeño */}
    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/10">
      <img src={property.coverImage} className="h-10 w-10 rounded-sm object-cover" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{property.name}</p>
        <p className="text-[10px] text-[var(--color-dozegray)]">{property.city}, {property.country}</p>
      </div>
    </div>

    {/* Fechas */}
    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400
                    pb-2 border-b border-gray-100 dark:border-white/10">
      <div className="flex justify-between">
        <span>Check-in</span>
        <span className="font-semibold text-gray-900 dark:text-white">{formatDate(checkin)}</span>
      </div>
      <div className="flex justify-between">
        <span>Check-out</span>
        <span className="font-semibold text-gray-900 dark:text-white">{formatDate(checkout)}</span>
      </div>
      <div className="flex justify-between">
        <span>Length of stay</span>
        <span className="font-semibold text-gray-900 dark:text-white">{nights} nights</span>
      </div>
    </div>

    {/* Líneas por room type */}
    {rooms.map(room => (
      <div key={room.roomTypeId} className="flex justify-between text-xs
                                            text-gray-600 dark:text-gray-400">
        <span className="truncate pr-2">
          {room.roomTypeName}<br />
          <span className="text-[10px] text-gray-400">
            {formatCurrency(currency, room.pricePerNight / 100)} × {nights} noches
          </span>
        </span>
        <span className="shrink-0 font-semibold text-gray-900 dark:text-white">
          {formatCurrency(currency, room.totalForStay / 100)}
        </span>
      </div>
    ))}

    {/* Extras seleccionados */}
    {selectedExtrasLines.map(e => (
      <div key={e.key} className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
        <span>{e.name} ({nights} noches)</span>
        <span className="font-semibold">+{formatCurrency(currency, e.total)}</span>
      </div>
    ))}

    {/* Suplemento niños */}
    {childSurcharge > 0 && (
      <div className="flex justify-between text-xs text-sky-700 dark:text-sky-400">
        <span>Suplemento niños</span>
        <span className="font-semibold">+{formatCurrency(currency, childSurcharge)}</span>
      </div>
    )}

    {/* Subtotal sin impuestos */}
    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400
                    border-t border-gray-100 dark:border-white/10 pt-2">
      <span>Alojamiento ({nights} noches)</span>
      <span className="font-semibold text-gray-900 dark:text-white">
        {formatCurrency(currency, subtotal)}
      </span>
    </div>

    {/* Impuestos */}
    {taxRate > 0 && (
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>Impuestos ({Math.round(taxRate * 100)}%)</span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCurrency(currency, taxes)}
        </span>
      </div>
    )}

    {/* Total */}
    <div className="flex justify-between items-baseline
                    border-t border-gray-200 dark:border-white/10 pt-2 mt-1">
      <span className="text-sm font-bold text-gray-900 dark:text-white">Total</span>
      <div className="text-right">
        <span className="text-xl font-bold" style={{ color: 'var(--color-dozeblue)' }}>
          {formatCurrency(currency, grandTotal)}
        </span>
        <p className="text-[10px] text-[var(--color-dozegray)] uppercase">{currency}</p>
      </div>
    </div>

  </div>
</div>
```

---

## 12. Función `formatCurrency`

```ts
export function formatCurrency(currency: string, amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency ?? 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
```

---

## 13. Checklist de bugs — prioridad

- [ ] **[CRÍTICO] 401 en verify-booking** → arreglar `QB_BEARER_TOKEN` en `.env`
- [ ] **[CRÍTICO] Mostrar room type como título principal**, NO la propiedad
- [ ] **[ALTO] Usar `room.images[0]`** como imagen principal (fallback: `property.coverImage`)
- [ ] **[ALTO] Amenities del room type** en los chips (no de la propiedad)
- [ ] **[ALTO] Conectar checkboxes de extras al cálculo del total** en tiempo real
- [ ] **[MEDIO] El "0" suelto** junto al nombre → guard `value > 0`
- [ ] **[MEDIO] `rateId` nunca es null** — eliminar cualquier lógica especial para ese caso
- [ ] **[BAJO] Título de la página** — cambiar "Create Next App" por el nombre del room type
