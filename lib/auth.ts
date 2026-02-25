import { User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "./prisma";

function toAuthUser(user: Pick<User, "id" | "email">) {
  return {
    id: user.id,
    email: user.email,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(
        credentials: { email?: string; password?: string } | undefined,
      ): Promise<{ id: string; email: string } | null> {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          select: {
            id: true,
            email: true,
            passwordHash: true,
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return toAuthUser(user);
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: Session; token: { sub?: string | null } }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
};
