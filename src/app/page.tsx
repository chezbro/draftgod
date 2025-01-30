'use client';

import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Twitter } from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleSignIn = async () => {
    await signIn("twitter", {
      callbackUrl: `${window.location.origin}/dashboard`,
    });
  };

  if (session) {
    return null; // Return null while redirecting
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-8 text-center">
      <h1 className="text-4xl font-bold sm:text-6xl">
        Welcome to DraftGod
      </h1>
      <p className="max-w-[600px] text-lg text-foreground/60">
        Generate engaging tweet replies automatically with AI. Monitor accounts,
        customize your style, and never miss an opportunity to engage.
      </p>
      <button
        onClick={handleSignIn}
        className="flex items-center gap-2 rounded-full bg-[#1DA1F2] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Twitter className="h-5 w-5" />
        Sign in with Twitter
      </button>
    </div>
  );
}
