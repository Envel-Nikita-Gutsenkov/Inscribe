import { useState } from "react";
import { Section, ArticleRef } from "@/lib/db/types";
import { saveProjectTocAction } from "@/app/actions/articleActions";

interface PromptConfig {
  isOpen: boolean;
  title: string;
  description?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function useContentActions(
  projectSlug: string,
  toc: Section[],
  setToc: (t: Section[]) => void,
  activeArticle: ArticleRef | null,
  setActiveArticle: (art: ArticleRef | null) => void
) {
  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    isOpen: false,
    title: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const closePrompt = () => setPromptConfig((prev) => ({ ...prev, isOpen: false }));

  const handleSaveToc = async (newToc: Section[]) => {
    const res = await saveProjectTocAction(projectSlug, newToc);
    if (res.success) {
      setToc(newToc);
    } else {
      alert(res.error || "Failed to update navigation outline");
    }
  };

  const handleAddSection = () => {
    setPromptConfig({
      isOpen: true,
      title: "Add New Section",
      description: "Enter a name for the new documentation section:",
      defaultValue: "",
      onConfirm: (title: string) => {
        closePrompt();
        if (!title || !title.trim()) return;
        const newSection: Section = {
          id: "sec-" + Math.random().toString(36).substring(2, 9),
          title: title.trim(),
          articles: [],
        };
        handleSaveToc([...toc, newSection]);
      },
      onCancel: closePrompt,
    });
  };

  const handleRenameSection = (id: string, currentTitle: string) => {
    setPromptConfig({
      isOpen: true,
      title: "Rename Section",
      description: "Enter a new name for this section:",
      defaultValue: currentTitle,
      onConfirm: (newTitle: string) => {
        closePrompt();
        if (!newTitle || !newTitle.trim() || newTitle === currentTitle) return;
        const updated = toc.map((s) => (s.id === id ? { ...s, title: newTitle.trim() } : s));
        handleSaveToc(updated);
      },
      onCancel: closePrompt,
    });
  };

  const handleDeleteSection = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete section "${title}"? This deletes all articles in it.`)) {
      handleSaveToc(toc.filter((s) => s.id !== id));
      const section = toc.find((s) => s.id === id);
      if (section && activeArticle) {
        if (section.articles.some((a) => a.slug === activeArticle.slug)) {
          setActiveArticle(null);
        }
      }
    }
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newToc = [...toc];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newToc.length) return;

    const temp = newToc[index];
    newToc[index] = newToc[targetIdx];
    newToc[targetIdx] = temp;
    handleSaveToc(newToc);
  };

  const handleAddArticle = (sectionId: string) => {
    setPromptConfig({
      isOpen: true,
      title: "Add New Article",
      description: "Enter a name for the new article:",
      defaultValue: "",
      onConfirm: (title: string) => {
        closePrompt();
        if (!title || !title.trim()) return;

        let finalSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        if (!finalSlug) finalSlug = "article";
        
        let suffix = 1;
        let checkSlug = finalSlug;
        while (toc.some((s) => s.articles.some((a) => a.slug === checkSlug))) {
          checkSlug = `${finalSlug}-${suffix}`;
          suffix++;
        }
        finalSlug = checkSlug;

        const newArticle: ArticleRef = { slug: finalSlug, title: title.trim(), isPublished: false };
        const updated = toc.map((s) =>
          s.id === sectionId ? { ...s, articles: [...s.articles, newArticle] } : s
        );

        handleSaveToc(updated);
        setActiveArticle(newArticle);
      },
      onCancel: closePrompt,
    });
  };

  const handleRenameArticle = (sectionId: string, oldSlug: string, currentTitle: string) => {
    setPromptConfig({
      isOpen: true,
      title: "Rename Article",
      description: "Enter a new name for this article:",
      defaultValue: currentTitle,
      onConfirm: (newTitle: string) => {
        closePrompt();
        if (!newTitle || !newTitle.trim() || newTitle === currentTitle) return;

        const updated = toc.map((s) => {
          if (s.id === sectionId) {
            return {
              ...s,
              articles: s.articles.map((a) => (a.slug === oldSlug ? { ...a, title: newTitle.trim() } : a)),
            };
          }
          return s;
        });

        handleSaveToc(updated);
        if (activeArticle && activeArticle.slug === oldSlug) {
          setActiveArticle({ ...activeArticle, title: newTitle.trim() });
        }
      },
      onCancel: closePrompt,
    });
  };

  const handleDeleteArticle = (sectionId: string, slug: string, title: string) => {
    if (confirm(`Are you sure you want to delete article "${title}"?`)) {
      const updated = toc.map((s) =>
        s.id === sectionId ? { ...s, articles: s.articles.filter((a) => a.slug !== slug) } : s
      );
      handleSaveToc(updated);
      if (activeArticle && activeArticle.slug === slug) {
        setActiveArticle(null);
      }
    }
  };

  const handleMoveArticle = (sectionId: string, artIndex: number, direction: "up" | "down") => {
    const updated = toc.map((s) => {
      if (s.id === sectionId) {
        const articles = [...s.articles];
        const targetIdx = direction === "up" ? artIndex - 1 : artIndex + 1;
        if (targetIdx < 0 || targetIdx >= articles.length) return s;

        const temp = articles[artIndex];
        articles[artIndex] = articles[targetIdx];
        articles[targetIdx] = temp;
        return { ...s, articles };
      }
      return s;
    });
    handleSaveToc(updated);
  };

  return {
    promptConfig,
    handleAddSection,
    handleRenameSection,
    handleDeleteSection,
    handleMoveSection,
    handleAddArticle,
    handleRenameArticle,
    handleDeleteArticle,
    handleMoveArticle,
  };
}
