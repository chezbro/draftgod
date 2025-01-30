import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Dashboard from "@/app/components/dashboard";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  return <Dashboard userId={session.user.id} />;
} 