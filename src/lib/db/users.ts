import { db } from "./connection";
import { User } from "./types";
import { backupDbDebounced } from "./backup";

const selectAllUsers = db.prepare("SELECT * FROM users");
const selectUserProjects = db.prepare("SELECT projectSlug FROM user_projects WHERE userId = ?");
const selectUserById = db.prepare("SELECT * FROM users WHERE id = ?");
const selectUserByUsername = db.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)");

const upsertUser = db.prepare(`
  INSERT INTO users (id, username, totpSecret, role, lockedUntil, failedAttempts, recoveryCodes, oneTimeCode)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    username = excluded.username,
    totpSecret = excluded.totpSecret,
    role = excluded.role,
    lockedUntil = excluded.lockedUntil,
    failedAttempts = excluded.failedAttempts,
    recoveryCodes = excluded.recoveryCodes,
    oneTimeCode = excluded.oneTimeCode
`);

const deleteUserProjects = db.prepare("DELETE FROM user_projects WHERE userId = ?");
const insertUserProject = db.prepare("INSERT INTO user_projects (userId, projectSlug) VALUES (?, ?)");
const deleteUserStmt = db.prepare("DELETE FROM users WHERE id = ?");

interface UserRow {
  id: string;
  username: string;
  totpSecret: string;
  role: "superadmin" | "editor";
  lockedUntil: number;
  failedAttempts: number;
  recoveryCodes: string | null;
  oneTimeCode: string | null;
}

interface ProjectSlugRow {
  projectSlug: string;
}

export function getUsers(): User[] {
  const rows = selectAllUsers.all() as UserRow[];
  return rows.map((r) => {
    const projectRows = selectUserProjects.all(r.id) as ProjectSlugRow[];
    return {
      id: r.id,
      username: r.username,
      totpSecret: r.totpSecret,
      role: r.role,
      lockedUntil: r.lockedUntil,
      failedAttempts: r.failedAttempts,
      recoveryCodes: r.recoveryCodes || undefined,
      oneTimeCode: r.oneTimeCode || undefined,
      projects: projectRows.map((p) => p.projectSlug),
    };
  });
}

export function getUserById(id: string): User | null {
  const r = selectUserById.get(id) as UserRow | undefined;
  if (!r) return null;
  const projectRows = selectUserProjects.all(r.id) as ProjectSlugRow[];
  return {
    id: r.id,
    username: r.username,
    totpSecret: r.totpSecret,
    role: r.role,
    lockedUntil: r.lockedUntil,
    failedAttempts: r.failedAttempts,
    recoveryCodes: r.recoveryCodes || undefined,
    oneTimeCode: r.oneTimeCode || undefined,
    projects: projectRows.map((p) => p.projectSlug),
  };
}

export function getUserByUsername(username: string): User | null {
  const r = selectUserByUsername.get(username) as UserRow | undefined;
  if (!r) return null;
  const projectRows = selectUserProjects.all(r.id) as ProjectSlugRow[];
  return {
    id: r.id,
    username: r.username,
    totpSecret: r.totpSecret,
    role: r.role,
    lockedUntil: r.lockedUntil,
    failedAttempts: r.failedAttempts,
    recoveryCodes: r.recoveryCodes || undefined,
    oneTimeCode: r.oneTimeCode || undefined,
    projects: projectRows.map((p) => p.projectSlug),
  };
}

export function saveUser(user: User) {
  const transaction = db.transaction(() => {
    upsertUser.run(
      user.id,
      user.username,
      user.totpSecret,
      user.role,
      user.lockedUntil || 0,
      user.failedAttempts || 0,
      user.recoveryCodes || null,
      user.oneTimeCode || null
    );
    deleteUserProjects.run(user.id);
    for (const slug of user.projects) {
      insertUserProject.run(user.id, slug);
    }
  });

  transaction();
  backupDbDebounced();
}

export function deleteUser(id: string) {
  deleteUserStmt.run(id);
  backupDbDebounced();
}
