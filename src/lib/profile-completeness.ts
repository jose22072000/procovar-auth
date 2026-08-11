/**
 * Los datos que una persona puede rellenar de sí misma.
 *
 * Solo su nombre y su teléfono. Antes había además nacionalidad, dirección y
 * número de pasaporte: eran de los huéspedes del producto de alojamientos del
 * que salió este código. A una operadora de Camagüey no se le piden esos datos
 * para facturar, y guardarlos sería quedarse con información personal que aquí
 * no hace falta para nada.
 *
 * El fichero conserva el nombre por lo que se llamaba antes —había un anillo de
 * progreso con el porcentaje de perfil completado, y confeti al llegar al cien—.
 * Eso es de un producto que necesita que un desconocido rellene sus datos; aquí
 * entra gente de la casa a cambiar su teléfono.
 */
export type ProfileFieldKey = 'name' | 'phone'

export const PROFILE_FIELDS: ReadonlyArray<{
	key: ProfileFieldKey
	icon: string
}> = [
	{ key: 'name', icon: 'lucide:user' },
	{ key: 'phone', icon: 'lucide:phone' },
]
