"use server";

import { getSession } from "@/lib/auth";
import { getProjects, saveProject, deleteProject, getProjectBySlug, Project } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { projectSchema, slugSchema } from "@/lib/validation";

async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: admin session required");
  }
  return session;
}

export async function createProjectAction(
  name: string,
  slug: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();
    if (session.role !== "superadmin") {
      return { success: false, error: "Insufficient permissions to create projects" };
    }

    // Validate slug using Zod
    const slugParse = slugSchema.safeParse(slug);
    if (!slugParse.success) {
      return { success: false, error: slugParse.error.issues[0].message };
    }

    const existing = getProjectBySlug(slug);
    if (existing) {
      return { success: false, error: "Project with this address already exists" };
    }

    const newProject: Project = {
      slug,
      name,
      description,
      isPublic: true,
    };

    saveProject(newProject);
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/p/${slug}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProjectSettingsAction(
  oldSlug: string,
  projectData: Project
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();
    
    // Editors can edit if they are assigned. Superadmins can edit any.
    if (session.role !== "superadmin" && !session.projects.includes(oldSlug)) {
      return { success: false, error: "You do not have permission to modify settings of this project" };
    }

    // Validate projectData using Zod schema
    const projectParse = projectSchema.safeParse(projectData);
    if (!projectParse.success) {
      return { success: false, error: projectParse.error.issues[0].message };
    }


    saveProject(projectParse.data, oldSlug);
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/admin/projects/${projectParse.data.slug}`);
    revalidatePath(`/p/${projectParse.data.slug}`);
    revalidatePath(`/p/${oldSlug}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function deleteProjectAction(slug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();
    if (session.role !== "superadmin") {
      return { success: false, error: "Insufficient permissions to delete projects" };
    }

    deleteProject(slug);
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
