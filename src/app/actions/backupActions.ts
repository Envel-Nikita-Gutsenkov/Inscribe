"use server";

import { getSession } from "@/lib/auth";
import {
  getBackupsList,
  backupDb,
  getBackupConfig,
  saveBackupConfig,
  restoreDb,
  deleteBackupFile,
  BackupConfig
} from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireSuperadmin() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    throw new Error("Unauthorized: Superadmin access required");
  }
}

export async function getBackupsListAction() {
  try {
    await requireSuperadmin();
    const list = getBackupsList();
    return { success: true, backups: list };
  } catch (err: any) {
    return { success: false, error: err.message, backups: [] };
  }
}

export async function triggerBackupAction() {
  try {
    await requireSuperadmin();
    const backupPath = backupDb();
    const filename = backupPath.split(/[/\\]/).pop() || "backup.sqlite";
    revalidatePath("/admin/backups");
    return { success: true, filename };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getBackupConfigAction() {
  try {
    await requireSuperadmin();
    const config = getBackupConfig();
    return { success: true, config };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveBackupConfigAction(config: Partial<BackupConfig>) {
  try {
    await requireSuperadmin();
    saveBackupConfig(config);
    revalidatePath("/admin/backups");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function restoreBackupAction(filename: string) {
  try {
    await requireSuperadmin();
    restoreDb(filename);
    revalidatePath("/admin/backups");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteBackupAction(filename: string) {
  try {
    await requireSuperadmin();
    deleteBackupFile(filename);
    revalidatePath("/admin/backups");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
