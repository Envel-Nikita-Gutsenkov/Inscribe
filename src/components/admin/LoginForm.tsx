"use client";

import { useActionState, useEffect } from "react";
import { loginAction } from "@/app/actions/authActions";
import { KeyRound, User, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  showSetupNotice: boolean;
  initialAdmin?: { username: string; code: string };
}

export default function LoginForm({ showSetupNotice, initialAdmin }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push("/admin");
      router.refresh();
    }
  }, [state, router]);

  return (
    <div style={{ maxWidth: "420px", width: "100%" }}>
      <div className="card" style={{ padding: "40px", boxShadow: "var(--shadow-glow)" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            fontWeight: 700,
            background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "8px"
          }}>Inscribe Admin</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Enter credentials and security code
          </p>
        </div>

        {state?.error && (
          <div style={{
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.2)",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            color: "#fda4af",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px"
          }}>
            <AlertCircle size={16} />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Username */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Username
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                name="username"
                required
                placeholder="admin"
                disabled={isPending}
                style={{ width: "100%", paddingLeft: "38px" }}
              />
              <User size={16} style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)"
              }} />
            </div>
          </div>

          {/* Security Code */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Security Code
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                name="token"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="••••••"
                disabled={isPending}
                style={{ width: "100%", paddingLeft: "38px", letterSpacing: "0.2em", textAlign: "left" }}
              />
              <KeyRound size={16} style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)"
              }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
            style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: "8px" }}
          >
            {isPending ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>

      {showSetupNotice && initialAdmin && (
        <div className="card" style={{
          marginTop: "24px",
          padding: "20px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          fontSize: "0.85rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px"
        }}>
          <div style={{ width: "100%" }}>
            <h3 style={{
              fontFamily: "var(--font-display)",
              color: "var(--accent-cyan)",
              marginBottom: "8px",
              fontWeight: 600,
              textAlign: "center"
            }}>First Run Setup</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "12px", textAlign: "center" }}>
              Only default account found. Use the temporary credentials below to log in. You will then be prompted to configure your 2FA device.
            </p>
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", background: "rgba(0,0,0,0.15)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Username:</span>
              <strong style={{ color: "var(--text-primary)" }}>{initialAdmin.username}</strong>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", background: "rgba(0,0,0,0.15)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)" }}>Security Code:</span>
              <strong style={{ color: "var(--accent-purple)", fontFamily: "monospace", fontSize: "1.1rem" }}>{initialAdmin.code}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
