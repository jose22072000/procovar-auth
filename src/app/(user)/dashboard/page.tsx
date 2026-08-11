import { redirect } from "next/navigation";

/**
 * `/dashboard` no es una pantalla: es la puerta del panel.
 *
 * Lleva a las sucursales, que es donde empieza el trabajo — dar de alta gente y
 * ponerle su rol. Antes llevaba a Ajustes, que ya no existe: su único contenido
 * propio era un campo de "minutos para completar la reserva", del negocio de
 * alojamientos del que salió este código.
 *
 * Quien no sea Super Admin no llega hasta aquí: lo para el armazón del panel.
 */
export default function DashboardPage() {
    redirect("/dashboard/organizations");
}
