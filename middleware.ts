import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/sign-in",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/alerts/:path*",
    "/accounts/:path*",
  ],
};
