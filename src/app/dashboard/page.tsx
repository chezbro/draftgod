import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Dashboard from "@/app/components/dashboard";
import TweetReplyGenerator from "@/app/components/tweet-reply-generator";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="space-y-8">
      <TweetReplyGenerator />
      <hr className="border-foreground/10" />
      <Dashboard userId={session.user.id} />
    </div>
  );
} 