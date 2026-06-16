"use client";

import { useState, useEffect } from "react";
import { Search, Loader, FileText } from "lucide-react";
import Link from "next/link";
import styles from "./HomeSearch.module.css";

interface SearchResult {
  projectSlug: string;
  slug: string;
  title: string;
  contentSnippet: string;
}

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data || []);
        }
      } catch (err) {
        console.error("Search fetch failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const renderSnippet = (snippet: string) => {
    if (!snippet) return null;
    const parts = snippet.split("==");
    return (
      <span className={styles.snippetText}>
        {parts.map((part, index) =>
          index % 2 === 1 ? (
            <mark key={index} className={styles.highlight}>
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchBar}>
        {isSearching ? (
          <Loader size={20} className={`spin ${styles.searchIcon}`} />
        ) : (
          <Search size={20} className={styles.searchIcon} />
        )}
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles and projects..." 
          className={styles.searchInput}
        />
      </div>

      {query.trim() && (
        <div className={styles.resultsDropdown}>
          {results.length > 0 ? (
            results.map((item) => (
              <Link 
                href={`/p/${item.projectSlug}/${item.slug}`} 
                key={`${item.projectSlug}-${item.slug}`} 
                className={styles.resultItem}
              >
                <div className={styles.resultCategory}>Project: {item.projectSlug}</div>
                <div className={styles.resultTitle}>
                  <FileText size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} />
                  {item.title}
                </div>
                <div className={styles.resultDesc}>{renderSnippet(item.contentSnippet)}</div>
              </Link>
            ))
          ) : (
            <div className={styles.noResults}>
              {isSearching ? "Searching..." : "No matches found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
