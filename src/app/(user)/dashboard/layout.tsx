import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";

/**
 * El panel de toda Procovar: solo para el Super Admin.
 *
 * Ya no monta su propia fila de pestañas encima del contenido. La navegación
 * vive entera en la barra lateral del armazón — dos niveles de menú para siete
 * apartados era esconder la mitad de las cosas a dos clics.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: user } = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.isSystemAdmin) redirect("/profile");
  return <>{children}</>;
}
