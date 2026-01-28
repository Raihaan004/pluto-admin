import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// We want to protect everything except the sign-in/sign-up pages if they exist
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)", 
  "/sign-up(.*)", 
  "/", 
  "/api/verify-license" // Allow external access to license verification
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // If the user is not logged in and trying to access a protected route
  if (!userId && !isPublicRoute(req)) {
    return (await auth()).redirectToSignIn();
  }

  // We are removing the metadata check from the middleware because 
  // publicMetadata is often missing from the session JWT.
  // The check is now handled in the DashboardLayout server component.
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
