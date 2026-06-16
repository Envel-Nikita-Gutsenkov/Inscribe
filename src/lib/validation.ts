import { z } from "zod";

// Base validators
export const slugSchema = z
  .string()
  .min(1, "Slug cannot be empty")
  .max(50, "Slug is too long")
  .regex(/^[a-z0-9-]+$/, "Invalid URL slug format (use lowercase, numbers, and dashes)");

export const customDomainSchema = z
  .string()
  .max(100, "Domain name is too long")
  .regex(
    /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}(:\d+)?$/i,
    "Invalid domain name format (e.g. docs.example.com)"
  )
  .optional()
  .or(z.literal("").transform(() => undefined));

// Project validation
export const projectSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional().default(""),
  customDomain: customDomainSchema,
  isPublic: z.boolean(),
  passcode: z.string().max(50, "Passcode is too long").optional().or(z.literal("").transform(() => undefined)),
  historyMaxVersions: z.number().min(1).max(500).optional(),
  historyRetentionDays: z.number().min(1).max(365).optional(),
  webhookUrl: z
    .string()
    .url("Invalid URL format")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// User validation
export const userSchema = z.object({
  id: z.string().min(1, "ID is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username must contain only alphanumeric characters, dashes, and underscores"),
  totpSecret: z.string().min(1, "2FA secret is required"),
  role: z.enum(["superadmin", "editor"]),
  projects: z.array(z.string()),
  recoveryCodes: z.string().optional(),
  oneTimeCode: z.string().optional(),
});
