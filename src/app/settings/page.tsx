import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Settings from "@/app/components/settings";

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