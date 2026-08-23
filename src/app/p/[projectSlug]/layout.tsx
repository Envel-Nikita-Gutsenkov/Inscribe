import React from "react";
import { notFound } from "next/navigation";
import { getProjectBySlug, getProjectToc, getProjects } from "@/lib/db";
import { hasProjectPasscodeAccess } from "@/lib/sectionAuth";
import ReaderLayoutClient from "@/components/ReaderLayoutClient";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectSlug: string }>;
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const { projectSlug } = await params;
  const project = getProjectBySlug(projectSlug);

  if (!project) {
    notFound();
  }

  // If private project requires passcode and user has no access, do not leak TOC in sidebar
  const hasAccess = project.isPublic || (await hasProjectPasscodeAccess(projectSlug, project.passcode));

  const toc = hasAccess ? getProjectToc(projectSlug) : [];
  const publicProjects = getProjects()
    .filter((p) => p.isPublic)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
    }));

  const formattedProject = {
    slug: project.slug,
    name: project.name,
    description: project.description ?? null,
    customDomain: project.customDomain ?? null,
  };

  const { getSystemSetting } = await import("@/lib/db");
  const siteLanguage = getSystemSetting("site_language", "en");

  const formattedToc = toc.map((section) => ({
    id: section.id,
    title: section.title,
    isProtected: Boolean(section.isProtected),
    articles: section.articles.map((a) => ({
      slug: a.slug,
      title: a.title,
      isPublished: !!a.isPublished,
    })),
  }));

  return (
    <ReaderLayoutClient project={formattedProject} projects={publicProjects} toc={formattedToc} locale={siteLanguage}>
      {children}
    </ReaderLayoutClient>
  );
}

