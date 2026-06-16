import React from "react";
import { getSession } from "@/lib/auth";
import { getUsers, getProjects } from "@/lib/db";
import { redirect } from "next/navigation";
import UserManager from "@/components/admin/UserManager";

export default async function UsersAdminPage() {
  const session = await getSession();

  // Protect page to only allow superadmins
  if (!session || session.role !== "superadmin") {
    redirect("/admin");
  }

  const users = getUsers();
  const projects = getProjects();

  return (
    <div>
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
          User Accounts
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Manage admin and editor users, generate TOTP codes, and assign project access permissions.
        </p>
      </div>

      <UserManager initialUsers={users} projects={projects} />
    </div>
  );
}
