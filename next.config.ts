import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Generate build info
let buildHash = "unknown";
try {
  buildHash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
} catch {
  try {
    buildHash = require("crypto").randomBytes(16).toString("hex");
  } catch {}
}

const buildInfo = {
  buildHash,
  buildDate: new Date().toISOString(),
};

const buildInfoPath = path.join(__dirname, "src/lib/build-info.json");
if (!fs.existsSync(path.dirname(buildInfoPath))) {
  fs.mkdirSync(path.dirname(buildInfoPath), { recursive: true });
}
fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["es-toolkit"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://api.qrserver.com; font-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
        ],
      },
    ];
  },
};


export default nextConfig;
