import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SecurityManager from "@/components/admin/SecurityManager";

export default async function SecurityPage() {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <SecurityManager username={session.username} role={session.role} />
  );
}
