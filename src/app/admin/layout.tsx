import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Users, Database, LogOut, ArrowLeft, Shield } from "lucide-react";
import { logoutAction } from "@/app/actions/authActions";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getSession();
  
  // We don't want layout authentication to block the login page itself.
  // We can check the URL under the hood or let page components handle it,
  // but wait: App Router paths under /admin/login are children of /admin layout!
  // Oh! If the path is /admin/login, we should NOT redirect or render the admin sidebar!
  // To avoid wrapping /admin/login inside this layout, we can use Route Groups!
  // Or, in Next.js layout, we can check if there's no session, but we don't know the pathname easily in a Server Component layout.
  // The most standard Next.js App Router pattern is to use Route Groups:
  // - `/admin/(dashboard)/layout.tsx` for layout-protected routes.
  // - `/admin/login/page.tsx` outside of the dashboard route group.
  // That is an AMAZING, extremely clean design decision that prevents layout leaking!
  // Let's reorganize our folders:
  // We will put the protected pages inside `src/app/admin/(dashboard)/`:
  // - `src/app/admin/(dashboard)/page.tsx`
  // - `src/app/admin/(dashboard)/layout.tsx`
  // - `src/app/admin/(dashboard)/users/page.tsx`
  // - `src/app/admin/(dashboard)/projects/[projectSlug]/page.tsx`
  // This is beautiful!
  
  return <>{children}</>;
}
