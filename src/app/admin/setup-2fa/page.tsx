import React from "react";
import { getSession, generateTotp } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { redirect } from "next/navigation";
import Setup2FAForm from "@/components/admin/Setup2FAForm";

export default async function Setup2FAPage() {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  const user = getUserById(session.userId);
  if (!user) {
    redirect("/admin/login");
  }

  // If already set up, send to admin dashboard
  if (user.totpSecret !== "PENDING") {
    redirect("/admin");
  }

  // Generate a temporary TOTP key for this setup session
  const { secret, uri } = generateTotp(user.username);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at top right, #1e1b4b, #09090b)",
      padding: "20px",
    }}>
      <Setup2FAForm secret={secret} uri={uri} username={user.username} />
    </div>
  );
}
