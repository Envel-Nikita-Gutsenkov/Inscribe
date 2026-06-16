import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import BackupsManager from "@/components/admin/BackupsManager";

export default async function BackupsPage() {
  const session = await getSession();

  // Enforce superadmin authorization at server level
  if (!session || session.role !== "superadmin") {
    redirect("/admin");
  }

  return <BackupsManager />;
}
