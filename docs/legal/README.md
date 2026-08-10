# Documentación legal — HOSTRAVEL / `account.hostravel.com`

Corpus legal publicado en la aplicación + auditoría de cumplimiento para la activación del TPV Virtual de Redsys en modalidad **InSite**.

## Dónde vive cada cosa

| Elemento | Ubicación |
|---|---|
| **Datos de la empresa** (razón social, CIF, correos, descriptor, plazos…) | [`src/lib/legal/company.ts`](../../src/lib/legal/company.ts) — **único sitio a editar** |
| **Textos legales** (7 documentos, markdown) | [`src/app/legal/_content/`](../../src/app/legal/_content/) |
| Registro/orden de los documentos | [`src/app/legal/_content/index.ts`](../../src/app/legal/_content/index.ts) |
| Renderizador markdown + tests | [`src/app/legal/_lib/markdown.tsx`](../../src/app/legal/_lib/markdown.tsx) |
| Páginas publicadas | `/legal` y `/legal/[slug]` |
| Pie de página global | [`src/components/layout/site-footer.tsx`](../../src/components/layout/site-footer.tsx) |
| Consentimiento en el checkout | [`src/app/(base)/booking/_components/terms-consent.tsx`](../../src/app/(base)/booking/_components/terms-consent.tsx) |
| Evidencia de aceptación (BD) | modelo `TermsAcceptance` + `src/lib/legal/terms-acceptance.ts` |
| Auditoría (interno, no publicable) | [AUDITORIA-REDSYS-INSITE.md](./AUDITORIA-REDSYS-INSITE.md) |
| **Qué falta por aportar** | [DATOS-PENDIENTES.md](./DATOS-PENDIENTES.md) |

## Documentos publicados

| Ruta | Documento |
|---|---|
| `/legal/aviso-legal` | Aviso Legal (art. 10 LSSI) |
| `/legal/condiciones` | Condiciones Generales de Contratación |
| `/legal/pagos` | Política de Pagos y Seguridad |
| `/legal/cancelaciones` | Política de Cancelaciones y Reembolsos |
| `/legal/privacidad` | Política de Privacidad (RGPD / LOPDGDD) |
| `/legal/cookies` | Política de Cookies |
| `/legal/organizaciones` | Condiciones para Organizaciones y Propietarios |

## Antes de publicar

1. Rellenar los 12 campos de `company.ts` — ver [DATOS-PENDIENTES.md](./DATOS-PENDIENTES.md).
2. Verificar: `npx tsx scripts/check-legal-placeholders.ts` (falla mientras quede algún dato sin rellenar).
3. Aplicar la migración `20260806150000_add_terms_acceptances` en el despliegue.
4. Subir `termsVersion` cada vez que se modifique un texto: queda registrado con cada aceptación de cliente.
5. **Revisión jurídica externa recomendada**: los textos están redactados a partir del comportamiento real del sistema, no sustituyen el criterio de un abogado.
