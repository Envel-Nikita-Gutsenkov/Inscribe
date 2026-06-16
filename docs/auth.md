# Authentication & Security Model

Inscribe incorporates a robust, multi-layered security model designed to protect administrative access and project data.

## 1. Initial Setup & Credentials
Upon the first installation, `setup.sh` generates a highly secure, randomized `superadmin` username and a 6-digit one-time entry code. These credentials are intentionally stored strictly in your `.env.production` file and are only printed to the console once. This prevents automated unauthorized access that plagues many default installations of CMS and documentation systems.

## 2. Token-Based Authentication (JWT)
Inscribe uses stateless JSON Web Tokens (JWT) for session management:
- **Stateless & Performant**: JWTs eliminate the need for constant database session lookups on every request, making API and page requests extremely fast.
- **Secure Cookies**: The token is stored in an `HttpOnly`, `Secure` (in production), and `SameSite=Strict` cookie, effectively neutralizing Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) attack vectors.
- **Short-Lived Sessions**: Tokens are signed using a robust `HS256` algorithm with the `INSCRIBE_JWT_SECRET`.

## 3. Two-Factor Authentication (2FA/TOTP)
Administrative security goes beyond passwords:
- **Mandatory 2FA**: All administrative actions and dashboard access require 2FA to be configured. During the first login with the one-time code, the user is forced to set up an Authenticator app (like Google Authenticator or Authy) using a generated QR code.
- **TOTP Standards**: Uses Time-based One-Time Passwords (TOTP) ensuring that even if a session or password is compromised, access cannot be gained without the physical device.

## 4. Role-Based Access Control (RBAC)
Inscribe supports fine-grained role authorization:
- **Superadmin**: Full system access, including user management, global settings, and database operations.
- **Editor**: Restricted access limited strictly to assigned documentation projects. Editors can create, draft, and publish articles but cannot modify system settings or users.

## 5. Rate Limiting & Brute-Force Protection
To protect against automated attacks and brute-forcing:
- **Token-Bucket Rate Limiter**: Implemented in `src/lib/rateLimit.ts`, it limits the number of login attempts or sensitive API calls (like search) per IP address.
- **Lockouts**: Repeated failed login or 2FA attempts will trigger temporary IP lockouts, mitigating credential stuffing and dictionary attacks.

## 6. Access Controls on Custom Domains
Inscribe allows proxying documentation to custom domains. However, administrative routes (`/admin/*`) are strictly firewalled:
- The system can enforce an `INSCRIBE_ADMIN_DOMAIN` environment variable. If set, any attempt to access the administration panel from a public documentation domain is rejected instantly, ensuring your admin panel isn't exposed across all public endpoints.
