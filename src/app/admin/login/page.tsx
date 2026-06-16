import React from "react";
import { getUsers } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import LoginForm from "@/components/admin/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/admin");
  }

  const users = getUsers();
  const reqHeaders = await headers();
  const host = reqHeaders.get("host") || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

  const showSetupNotice = users.length === 1 && users[0].totpSecret === "PENDING" && isLocal;
  const initialAdmin = showSetupNotice ? { username: users[0].username, code: users[0].oneTimeCode || "" } : undefined;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "radial-gradient(at 50% 50%, rgba(139, 92, 246, 0.05) 0px, transparent 50%), var(--bg-primary)"
    }}>
      <LoginForm showSetupNotice={showSetupNotice} initialAdmin={initialAdmin} />
    </div>
  );
}
