import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const handler = NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
    }),
  ],
  pages: {
    signIn: '/',
    error: '/', // Error code passed in query string as ?error=
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user) return false;

      try {
        // Store the user in Supabase
        const { error } = await supabase.from("users").upsert({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          twitter_access_token: account.access_token,
          twitter_refresh_token: account.refresh_token,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;

        // Create default preferences if they don't exist
        const { error: prefsError } = await supabase
          .from("user_preferences")
          .upsert({
            user_id: user.id,
            monitored_accounts: [],
            style_accounts: [],
            custom_instructions: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (prefsError) throw prefsError;

        return true;
      } catch (error) {
        console.error("Error saving user:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!; // Use the OAuth provider's user ID
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
});

export { handler as GET, handler as POST };
