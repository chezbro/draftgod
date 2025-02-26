import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import TwitterProvider from "next-auth/providers/twitter";
import { createClient } from "@supabase/supabase-js";
import { Session } from "next-auth";

// Check if required environment variables are defined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only create the Supabase client if both URL and key are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Define the types for the callback parameters
interface JWTCallbackParams {
  token: JWT;
  account: any;
  user: any;
}

// Define the session callback parameters
interface SessionCallbackParams {
  session: Session;
  token: JWT & {
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
  };
}

// Extend the session type to include our custom properties
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
    };
    accessToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      version: "2.0",
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: JWTCallbackParams) {
      if (account && user) {
        token.userId = user.id;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }: SessionCallbackParams) {
      if (token.userId) {
        session.user.id = token.userId;
      }
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || 'a-default-secret-for-development',
}; 