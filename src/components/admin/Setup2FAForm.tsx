"use client";

import React, { useState, useTransition } from "react";
import { confirm2FAAction } from "@/app/actions/authActions";
import { KeyRound, Shield, AlertCircle, CheckCircle2, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface Setup2FAFormProps {
  secret: string;
  uri: string;
  username: string;
}

export default function Setup2FAForm({ secret, uri, username }: Setup2FAFormProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (token.length !== 6 || !/^\d+$/.test(token)) {
      setError("Please enter a valid 6-digit numeric code");
      return;
    }

    startTransition(async () => {
      const res = await confirm2FAAction(secret, token);
      if (res.success && res.recoveryCodes) {
        setRecoveryCodes(res.recoveryCodes);
      } else {
        setError(res.error || "Failed to verify. Please try again.");
      }
    });
  };

  const handleCopyCodes = () => {
    if (!recoveryCodes) return;
    const text = recoveryCodes.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleComplete = () => {
    router.push("/admin");
    router.refresh();
  };

  if (recoveryCodes) {
    return (
      <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "40px", boxShadow: "var(--shadow-glow)" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "50%",
            padding: "12px",
            color: "var(--accent-emerald)",
            marginBottom: "16px"
          }}>
            <CheckCircle2 size={32} />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700, marginBottom: "8px" }}>
            2FA Successfully Set Up!
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Store these emergency recovery codes. You will need them if you lose access to your authenticator app.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          background: "rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "20px",
          fontFamily: "monospace",
          fontSize: "1.1rem",
          color: "#e5c07b",
          marginBottom: "24px"
        }}>
          {recoveryCodes.map((code) => (
            <div key={code} style={{ padding: "4px 0", userSelect: "all", textAlign: "center" }}>
              {code}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={handleCopyCodes}
            className="btn"
            style={{ justifyContent: "center", width: "100%", gap: "8px", border: "1px solid var(--border-color)" }}
          >
            {copied ? (
              <>
                <Check size={16} style={{ color: "var(--accent-emerald)" }} />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy Recovery Codes</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleComplete}
            className="btn btn-primary"
            style={{ justifyContent: "center", width: "100%" }}
          >
            I Have Saved These Codes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "40px", boxShadow: "var(--shadow-glow)" }}>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(139, 92, 246, 0.1)",
          border: "1px solid rgba(139, 92, 246, 0.2)",
          borderRadius: "50%",
          padding: "12px",
          color: "var(--accent-purple)",
          marginBottom: "16px"
        }}>
          <Shield size={32} />
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700, marginBottom: "8px" }}>
          Configure Two-Factor Auth
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
          Scan the QR code below using your authenticator app (Google Authenticator, Authy, Aegis) to initialize 2FA.
        </p>
      </div>

      {error && (
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
          marginBottom: "20px"
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
        {/* QR Code */}
        <div style={{
          background: "#ffffff",
          padding: "12px",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          border: "1px solid var(--border-color)",
        }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(uri)}`}
            alt="TOTP Setup QR Code"
            width={160}
            height={160}
            style={{ display: "block" }}
          />
        </div>

        {/* Text Secret for Manual entry */}
        <div style={{ width: "100%", textAlign: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
            Or enter the code manually:
          </span>
          <div style={{
            background: "var(--bg-input)",
            padding: "10px 14px",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            color: "var(--accent-cyan)",
            border: "1px solid var(--border-color)",
            fontWeight: "bold",
            userSelect: "all",
            display: "inline-block"
          }}>
            {secret}
          </div>
        </div>
      </div>

      <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            Enter 6-digit verification code
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="password"
              required
              maxLength={6}
              pattern="[0-9]{6}"
              placeholder="••••••"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ""))}
              disabled={isPending}
              style={{ width: "100%", paddingLeft: "38px", letterSpacing: "0.2em" }}
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
          style={{ width: "100%", justifyContent: "center", padding: "12px" }}
        >
          {isPending ? "Verifying..." : "Verify & Complete Setup"}
        </button>
      </form>
    </div>
  );
}
