/**
 * El correo que se le ENSEÑA a la gente, o nada.
 *
 * `better-auth` exige un correo por cuenta, y mucha gente de PEDIDO no tiene: entran
 * con `yasmani`, `claudia.hab`, `rene`. A esos se les pone uno interno
 * (`usuario@procovar.local`) que no existe, no recibe nada y nadie tiene por qué
 * saberse. Es una clave técnica, no una dirección.
 *
 * Enseñarlo como si fuera un correo hace que alguien le escriba y el mensaje se pierda,
 * o que se copie a un listado creyendo que es bueno. Así que donde se pinte un correo,
 * se pinta ESTE: el real, o nada.
 */
const INTERNO = '@procovar.local';

export function esCorreoInterno(email?: string | null): boolean {
    return Boolean(email && email.toLowerCase().endsWith(INTERNO));
}

/** El correo si es real; `null` si es de los inventados. */
export function correoVisible(email?: string | null): string | null {
    if (!email || esCorreoInterno(email)) return null;
    return email;
}
