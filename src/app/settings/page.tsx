import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Settings from "@/app/components/settings";
import { authOptions } from "@/app/lib/auth";

export default async function SettingsPage() {
  console.log("Settings page component rendering"); // Debug log
  
  const session = await getServerSession(authOptions);
  console.log("Session in settings page:", session); // Debug session

  if (!session?.user?.id) {
    console.log("No session, redirecting to home"); // Debug redirect
    redirect("/");
  }

  return <Settings userId={session.user.id} />;
} 