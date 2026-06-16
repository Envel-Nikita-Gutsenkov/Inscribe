import React from "react";
import { getSession } from "@/lib/auth";
import { getProjectBySlug, getProjectToc } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Workspace from "@/components/admin/Workspace";

interface ProjectAdminPageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function ProjectAdminPage({ params }: ProjectAdminPageProps) {
  const { projectSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  const project = getProjectBySlug(projectSlug);
  if (!project) {
    notFound();
  }

  // Check project edit permissions
  const isSuper = session.role === "superadmin";
  const hasAccess = isSuper || session.projects.includes(projectSlug);

  if (!hasAccess) {
    redirect("/admin");
  }

  const toc = getProjectToc(projectSlug);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Workspace initialProject={project} initialToc={toc} isSuper={isSuper} />
    </div>
  );
}
