import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Settings from "@/app/components/settings";

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  return <Settings userId={session.user.id} />;
} 