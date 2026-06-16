"use client";

import React, { useState, useTransition } from "react";
import { Shield, KeyRound, Copy, Check, AlertTriangle, RefreshCw, Eye } from "lucide-react";
import { resetMy2FAAction, regenerateMyRecoveryCodesAction } from "@/app/actions/authActions";
import { useRouter } from "next/navigation";

interface SecurityManagerProps {
  username: string;
  role: string;
}

export default function SecurityManager({ username, role }: SecurityManagerProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // States for modals/results
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [oneTimeCode, setOneTimeCode] = useState<string | null>(null);
  
  const [showConfirm2FA, setShowConfirm2FA] = useState(false);
  const [showConfirmCodes, setShowConfirmCodes] = useState(false);
  
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleReset2FA = () => {
    setError(null);
    startTransition(async () => {
      const res = await resetMy2FAAction();
      if (res.success && res.oneTimeCode) {
        setOneTimeCode(res.oneTimeCode);
        setShowConfirm2FA(false);
      } else {
        setError(res.error || "Failed to reset 2FA");
      }
    });
  };

  const handleRegenerateCodes = () => {
    setError(null);
    startTransition(async () => {
      const res = await regenerateMyRecoveryCodesAction();
      if (res.success && res.recoveryCodes) {
        setRecoveryCodes(res.recoveryCodes);
        setShowConfirmCodes(false);
      } else {
        setError(res.error || "Failed to regenerate recovery codes");
      }
    });
  };

  const handleCopyCodes = () => {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>
          Security & Access Settings
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Manage your two-factor authentication keys, emergency recovery codes, and account security.
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
          marginBottom: "24px"
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Profile Security Card */}
        <div className="card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div style={{
              background: "rgba(139, 92, 246, 0.1)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              borderRadius: "12px",
              padding: "10px",
              color: "var(--accent-purple)"
            }}>
              <Shield size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Active Session Details</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Logged in as <strong style={{ color: "var(--text-primary)" }}>{username}</strong> ({role})
              </p>
            </div>
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Your console session is protected by cryptographic tokens and will expire after 3 hours of inactivity.
          </div>
        </div>

        {/* Two-Factor Authentication Card */}
        <div className="card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                background: "rgba(6, 182, 212, 0.1)",
                border: "1px solid rgba(6, 182, 212, 0.2)",
                borderRadius: "12px",
                padding: "10px",
                color: "var(--accent-cyan)"
              }}>
                <KeyRound size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Two-Factor Authentication (TOTP)</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span className="badge badge-success">Enabled</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Using Authenticator App</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowConfirm2FA(true)}
              className="btn btn-danger"
              style={{ gap: "8px" }}
              disabled={isPending}
            >
              <RefreshCw size={14} className={isPending ? "spin" : ""} />
              <span>Reset 2FA Authenticator</span>
            </button>
          </div>

          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Resetting your 2FA will invalidate your current TOTP secret key. You will receive a new one-time login code and be redirected to verify a new authenticator key immediately.
          </div>
        </div>

        {/* Recovery Codes Card */}
        <div className="card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                background: "rgba(234, 179, 8, 0.1)",
                border: "1px solid rgba(234, 179, 8, 0.2)",
                borderRadius: "12px",
                padding: "10px",
                color: "#e5c07b"
              }}>
                <Eye size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Emergency Recovery Codes</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                  Used to bypass 2FA if you lose access to your authenticator application
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowConfirmCodes(true)}
              className="btn"
              style={{ gap: "8px", border: "1px solid var(--border-color)" }}
              disabled={isPending}
            >
              <RefreshCw size={14} />
              <span>Regenerate Recovery Codes</span>
            </button>
          </div>

          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            For security reasons, recovery codes are stored as hashed records and cannot be retrieved in plain text. Regenerating recovery codes will invalidate all existing recovery codes.
          </div>
        </div>

      </div>

      {/* CONFIRM RESET 2FA MODAL */}
      {showConfirm2FA && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "500px", width: "100%", padding: "32px", boxShadow: "var(--shadow-glow)" }}>
            <div style={{ color: "#f43f5e", display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <AlertTriangle size={48} />
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 600, textAlign: "center", marginBottom: "12px" }}>Reset Two-Factor Authentication?</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", lineHeight: 1.5, marginBottom: "24px" }}>
              This will disable your current authenticator credentials. You will need to scan a new QR code immediately to restore access to your account.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowConfirm2FA(false)} className="btn" style={{ flex: 1, justifyContent: "center" }} disabled={isPending}>
                Cancel
              </button>
              <button onClick={handleReset2FA} className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }} disabled={isPending}>
                {isPending ? "Resetting..." : "Yes, Reset 2FA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REGENERATE CODES MODAL */}
      {showConfirmCodes && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "500px", width: "100%", padding: "32px", boxShadow: "var(--shadow-glow)" }}>
            <div style={{ color: "#e5c07b", display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <AlertTriangle size={48} />
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 600, textAlign: "center", marginBottom: "12px" }}>Regenerate Recovery Codes?</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", lineHeight: 1.5, marginBottom: "24px" }}>
              This will instantly invalidate all of your current recovery codes. The new codes will only be shown once, so you must copy them immediately.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowConfirmCodes(false)} className="btn" style={{ flex: 1, justifyContent: "center" }} disabled={isPending}>
                Cancel
              </button>
              <button onClick={handleRegenerateCodes} className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={isPending}>
                {isPending ? "Generating..." : "Yes, Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ONE-TIME CODE DISPLAY MODAL */}
      {oneTimeCode && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "460px", width: "100%", textAlign: "center", padding: "36px", boxShadow: "var(--shadow-glow)" }}>
            <h3 style={{ fontSize: "1.5rem", color: "var(--accent-cyan)", fontWeight: 700, marginBottom: "12px" }}>
              2FA Successfully Reset
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: 1.5 }}>
              Your current 2FA key has been deactivated. Below is your emergency one-time entry code.
              Please click "Configure 2FA Now" to configure your new authenticator app.
            </p>
            
            <div style={{
              background: "rgba(0,0,0,0.3)",
              padding: "16px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              fontFamily: "monospace",
              fontSize: "1.6rem",
              fontWeight: "bold",
              color: "#e5c07b",
              marginBottom: "24px",
              letterSpacing: "0.1em",
              userSelect: "all"
            }}>
              {oneTimeCode}
            </div>

            <button
              onClick={() => {
                setOneTimeCode(null);
                router.push("/admin/setup-2fa");
                router.refresh();
              }}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Configure 2FA Now
            </button>
          </div>
        </div>
      )}

      {/* RECOVERY CODES DISPLAY MODAL */}
      {recoveryCodes && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "36px", boxShadow: "var(--shadow-glow)" }}>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700, textAlign: "center", marginBottom: "8px" }}>
              Your New Recovery Codes
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textAlign: "center", marginBottom: "24px" }}>
              Please copy these codes and save them securely. You will not be able to view them again!
            </p>

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
                onClick={() => setRecoveryCodes(null)}
                className="btn btn-primary"
                style={{ justifyContent: "center", width: "100%" }}
              >
                I Have Saved These Codes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
