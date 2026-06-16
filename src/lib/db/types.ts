export interface User {
  id: string;
  username: string;
  totpSecret: string;
  role: "superadmin" | "editor";
  projects: string[]; // List of project slugs
  lockedUntil?: number;
  failedAttempts?: number;
  recoveryCodes?: string; // Comma-separated list of hashed recovery codes
  oneTimeCode?: string;
}

export interface Project {
  slug: string;
  name: string;
  description: string;
  customDomain?: string;
  isPublic: boolean;
  passcode?: string;
  createdAt?: number;
  updatedAt?: number;
  historyMaxVersions?: number;
  historyRetentionDays?: number;
  historyBatchWindowMinutes?: number;
  webhookUrl?: string;
}

export interface ArticleRef {
  slug: string;
  title: string;
  isPublished?: boolean;
}

export interface Section {
  id: string;
  title: string;
  articles: ArticleRef[];
}

export interface Article {
  slug: string;
  projectSlug: string;
  sectionId: string;
  title: string;
  content: string;
  createdAt?: number;
  updatedAt?: number;
  contentHash?: string;
  searchText?: string;
  publishedContent?: string;
  isPublished?: boolean;
}

export interface ArticleHistoryEntry {
  id: string;
  projectSlug: string;
  articleSlug: string;
  content: string;
  changeSummary?: string;
  createdAt: number;
  createdById?: string;
  username?: string;
  isDelta?: boolean;
}

