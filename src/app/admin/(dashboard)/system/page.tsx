import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SystemManager from "@/components/admin/SystemManager";

export default async function SystemPage() {
  const session = await getSession();

  // Enforce superadmin authorization at server level
  if (!session || session.role !== "superadmin") {
    redirect("/admin");
  }

  return <SystemManager />;
}
