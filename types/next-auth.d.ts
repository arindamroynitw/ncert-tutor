import 'next-auth';
import { Profile } from '@/lib/types';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    profile?: Profile;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      profile?: Profile;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    profile?: Profile;
  }
}
