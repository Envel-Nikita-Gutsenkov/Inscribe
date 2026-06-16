import Link from "next/link";
import { MoveLeft, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "radial-gradient(at 50% 50%, rgba(139, 92, 246, 0.05) 0px, transparent 50%), var(--bg-primary)"
    }}>
      <div className="card" style={{
        maxWidth: "480px",
        width: "100%",
        padding: "40px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxShadow: "var(--shadow-glow)"
      }}>
        <div style={{
          background: "rgba(139, 92, 246, 0.1)",
          borderRadius: "50%",
          width: "80px",
          height: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
          color: "var(--accent-purple)"
        }}>
          <HelpCircle size={40} />
        </div>

        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "4rem",
          fontWeight: 800,
          lineHeight: 1,
          margin: "0 0 8px 0",
          background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          404
        </h1>

        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: "12px"
        }}>
          Page Not Found
        </h2>

        <p style={{
          fontSize: "0.95rem",
          color: "var(--text-secondary)",
          lineHeight: "1.6",
          marginBottom: "30px"
        }}>
          The page you are looking for does not exist, has been moved, or is temporarily unavailable.
        </p>

        <Link href="/" className="btn btn-primary" style={{
          padding: "12px 24px",
          fontSize: "0.9rem",
          fontWeight: 600,
          textDecoration: "none"
        }}>
          <MoveLeft size={16} />
          <span>Go Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
