import { getApiDocs } from "@/lib/swagger";
import ReactSwagger from "@/components/swagger-ui";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DocsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/"); // Redirect to home if not authenticated
  }

  // Only system admins can access API docs
  if (!session.user.isSystemAdmin) {
    redirect("/profile"); // Redirect non-admins to dashboard
  }

  const spec = await getApiDocs();
  return (
    <div className="container mx-auto p-4 min-h-screen bg-transparent">
      <ReactSwagger spec={spec} />
    </div>
  );
}
