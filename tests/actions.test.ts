import { describe, it, expect, vi, beforeEach } from "vitest";
import { loginAction, logoutAction } from "../src/app/actions/authActions";
import { 
  getArticleContentAction, 
  saveArticleContentAction, 
  saveProjectTocAction, 
  publishArticleAction, 
  rollbackArticleAction 
} from "../src/app/actions/articleActions";
import { createProjectAction, updateProjectSettingsAction, deleteProjectAction } from "../src/app/actions/projectActions";
import { createUserAction, updateUserAction, deleteUserAction } from "../src/app/actions/userActions";
import { getBackupsListAction, triggerBackupAction } from "../src/app/actions/backupActions";
import { getSession } from "../src/lib/auth";
import { saveUser, saveProject, getProjectBySlug, getUserByUsername } from "../src/lib/db";

// Mock dependencies
const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
const mockHeaders = {
  get: vi.fn().mockReturnValue("127.0.0.1"),
};

vi.mock("next/headers", () => ({
  cookies: async () => mockCookies,
  headers: async () => mockHeaders,
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

vi.mock("../src/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/auth")>();
  return {
    ...actual,
    getSession: vi.fn(),
  };
});

describe("Server Actions Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Actions", () => {
    it("should handle logout by deleting session and redirecting", async () => {
      await logoutAction();
      expect(mockCookies.delete).toHaveBeenCalledWith("inscribe_session");
      expect(mockRedirect).toHaveBeenCalledWith("/admin/login");
    });

    it("should fail login on empty fields", async () => {
      const formData = new FormData();
      const res = await loginAction({}, formData);
      expect(res.success).toBe(false);
      expect(res.error).toBe("All fields are required");
    });
  });

  describe("Project Settings Actions", () => {
    it("should reject project creation by non-superadmins", async () => {
      // Mock session as editor
      vi.mocked(getSession).mockResolvedValue({
        userId: "editor-id",
        username: "editor",
        role: "editor",
        projects: [],
      });

      const res = await createProjectAction("Test Proj", "test-proj", "Desc");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Insufficient permissions");
    });

    it("should allow project creation by superadmins", async () => {
      // Mock session as superadmin
      vi.mocked(getSession).mockResolvedValue({
        userId: "admin-id",
        username: "admin",
        role: "superadmin",
        projects: [],
      });

      const res = await createProjectAction("Test Super Proj", "super-proj", "Desc");
      expect(res.success).toBe(true);

      const created = getProjectBySlug("super-proj");
      expect(created).toBeDefined();
      expect(created?.name).toBe("Test Super Proj");
    });
  });

  describe("Article Operations Actions", () => {
    it("should allow editors assigned to the project to save articles", async () => {
      // Create project
      saveProject({
        slug: "assigned-proj",
        name: "Assigned Project",
        description: "",
        isPublic: true,
      });

      vi.mocked(getSession).mockResolvedValue({
        userId: "editor-id",
        username: "editor",
        role: "editor",
        projects: ["assigned-proj"],
      });

      const res = await saveArticleContentAction("assigned-proj", "art-slug", "New text content");
      expect(res.success).toBe(true);
      expect(mockRevalidatePath).toHaveBeenCalled();
    });

    it("should block editors not assigned to the project", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "editor-id",
        username: "editor",
        role: "editor",
        projects: ["other-proj"],
      });

      const res = await saveArticleContentAction("assigned-proj", "art-slug", "Hack content");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Unauthorized: you do not have permission");
    });
  });

  describe("User Management Actions", () => {
    it("should block non-superadmins from managing users", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "editor-id",
        username: "editor",
        role: "editor",
        projects: [],
      });

      const res = await createUserAction("newuser", "editor", "SECRET", []);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Superadmin access required");
    });

    it("should prevent a superadmin from deleting themselves", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "admin-id",
        username: "admin",
        role: "superadmin",
        projects: [],
      });

      const res = await deleteUserAction("admin-id");
      expect(res.success).toBe(false);
      expect(res.error).toContain("You cannot delete yourself");
    });
  });

  describe("Backup Actions", () => {
    it("should deny backup retrieval to editors", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "editor-id",
        username: "editor",
        role: "editor",
        projects: [],
      });

      const res = await getBackupsListAction();
      expect(res.success).toBe(false);
      expect(res.error).toContain("Superadmin access required");
    });
  });
});
