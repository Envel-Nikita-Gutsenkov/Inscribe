"use server";

import { getSession, generateTotp, generateRecoveryCodes } from "@/lib/auth";
import { getUsers, saveUser, deleteUser, User, getUserById } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { userSchema } from "@/lib/validation";

async function requireSuperadmin() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    throw new Error("Unauthorized: Superadmin access required");
  }
}

export async function createUserAction(
  username: string,
  role: "superadmin" | "editor",
  projects: string[]
): Promise<{ success: boolean; oneTimeCode?: string; error?: string }> {
  try {
    await requireSuperadmin();

    const oneTimeCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser: User = {
      id: "user-" + Math.random().toString(36).substring(2, 9),
      username,
      totpSecret: "PENDING",
      role,
      projects,
      oneTimeCode,
    };

    // Validate using Zod schema
    const userParse = userSchema.safeParse(newUser);
    if (!userParse.success) {
      return { success: false, error: userParse.error.issues[0].message };
    }

    const users = getUsers();
    const existing = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      return { success: false, error: "User with this username already exists" };
    }

    saveUser(userParse.data);
    revalidatePath("/admin/users");
    return { success: true, oneTimeCode };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUserAction(
  id: string,
  username: string,
  role: "superadmin" | "editor",
  projects: string[],
  reset2FA?: boolean
): Promise<{ success: boolean; oneTimeCode?: string; error?: string }> {
  try {
    await requireSuperadmin();
    
    const existing = getUserById(id);
    if (!existing) {
      return { success: false, error: "User not found" };
    }

    let oneTimeCode: string | undefined = undefined;
    let totpSecret = existing.totpSecret;
    let recoveryCodes = existing.recoveryCodes;

    if (reset2FA) {
      oneTimeCode = Math.floor(100000 + Math.random() * 900000).toString();
      totpSecret = "PENDING";
      recoveryCodes = undefined;
    }

    const updatedUser: User = {
      ...existing,
      username,
      role,
      projects,
      totpSecret,
      recoveryCodes,
      oneTimeCode: oneTimeCode ?? existing.oneTimeCode,
    };

    // Validate using Zod schema
    const userParse = userSchema.safeParse(updatedUser);
    if (!userParse.success) {
      return { success: false, error: userParse.error.issues[0].message };
    }

    saveUser(userParse.data);
    revalidatePath("/admin/users");
    return { success: true, oneTimeCode };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function deleteUserAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperadmin();
    
    const session = await getSession();
    if (session && session.userId === id) {
      return { success: false, error: "You cannot delete yourself" };
    }

    deleteUser(id);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function regenerateUserRecoveryCodesAction(id: string): Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }> {
  try {
    await requireSuperadmin();

    const user = getUserById(id);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.totpSecret === "PENDING") {
      return { success: false, error: "Cannot generate recovery codes for a user with pending 2FA setup" };
    }

    const recovery = generateRecoveryCodes();
    user.recoveryCodes = recovery.hashedCodes;

    saveUser(user);
    revalidatePath("/admin/users");
    return { success: true, recoveryCodes: recovery.plainCodes };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

