import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { getProfileByUserId } from '@/lib/db/profiles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });

        // Check if user exists in Supabase Auth
        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) {
          console.error('Error listing users:', error);
          return null;
        }

        const user = users.find(u => u.email === credentials.email);

        if (!user) {
          return null;
        }

        // Verify password
        // Note: Supabase Auth handles password hashing, but we need to use signInWithPassword
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password
        });

        if (signInError || !authData.user) {
          return null;
        }

        // Get user profile
        const profile = await getProfileByUserId(authData.user.id);

        return {
          id: authData.user.id,
          email: authData.user.email!,
          profile: profile || undefined
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.profile = user.profile;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.profile = token.profile as any;
      }
      return session;
    }
  },
  pages: {
    signIn: '/signin',
    signOut: '/',
    error: '/signin'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
