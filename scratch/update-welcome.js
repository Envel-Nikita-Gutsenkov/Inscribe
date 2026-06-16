const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");

const dbPath = path.join(__dirname, "../data/db.sqlite");
const db = new Database(dbPath);

const content = `# Welcome to Inscribe!\n\nInscribe is a beautiful, self-hosted, multi-project documentation platform.\n\n### Key Features\n- 📂 **Multi-Project Management**: Host separate workspaces for different products.\n- 🌐 **Custom Domains**: Bind individual hosts/domains to specific documentation projects.\n- 🔒 **Role-Based Access**: Distribute editing permissions among multiple users.\n- 📝 **Markdown Editor**: Simple, clean editing workspace with instant live previews.\n\n### Code Highlight Example\n\`\`\`typescript\n// Revalidate cache on-demand\nexport async function revalidateProject(slug: string) {\n  revalidatePath(\`/p/\${slug}\`);\n  console.log(\`[Cache] Evicted CDN pages for project: \${slug}\`);\n}\n\`\`\`\n\n### System Architecture (Mermaid Diagram)\n\`\`\`mermaid\ngraph TD\n  User((User)) -->|HTTP| Proxy[Inscribe Proxy]\n  Proxy -->|Reads Custom Domain| DB[(SQLite Database)]\n  Proxy -->|Serves Static Pages| NextJS[Next.js App Router]\n\`\`\``;

const hash = crypto.createHash("sha256").update(content).digest("hex");
const searchText = content.replace(/[#*`~_\[\]()\-+=\>!]/g, " ").replace(/\s+/g, " ").trim();

try {
  // Update both the draft content and the published content for the welcome article
  const stmt = db.prepare(`
    UPDATE articles 
    SET content = ?, contentHash = ?, searchText = ?, publishedContent = ?, isPublished = 1
    WHERE slug = 'welcome'
  `);
  const info = stmt.run(content, hash, searchText, content);
  console.log("Database update successful. Changes applied:", info.changes);
} catch (err) {
  console.error("Database update failed:", err);
} finally {
  db.close();
}
