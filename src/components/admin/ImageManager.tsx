"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  Trash2,
  Search,
  X,
  Sparkles,
  Image as ImageIcon,
  Tag,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  ExternalLink,
  ZapOff,
} from "lucide-react";
import { getImagesData, updateImageMeta, getImageUsages, ImageMeta } from "@/app/actions/imageActions";
import styles from "./ImageManager.module.css";

interface UploadResult {
  filename: string;
  originalName: string;
  originalSize?: number;
  newSize: number;
  width: number;
  height: number;
}

interface ImageManagerProps {
  onInsert?: (filename: string, alt: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageManager({ onInsert }: ImageManagerProps) {
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ImageMeta | null>(null);
  const [usages, setUsages] = useState<string[]>([]);
  const [usagesLoading, setUsagesLoading] = useState(false);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup state
  const [cleanupPreview, setCleanupPreview] = useState<ImageMeta[]>([]);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupDone, setCleanupDone] = useState<string | null>(null);

  // Edit meta state
  const [editAlt, setEditAlt] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [metaSaving, setMetaSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteUsages, setDeleteUsages] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getImagesData();
    setImages(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selected) {
      setEditAlt(selected.alt);
      setEditLabel(selected.label);
      setUsages([]);
      setUsagesLoading(true);
      getImageUsages(selected.filename).then((u) => {
        setUsages(u);
        setUsagesLoading(false);
      });
    }
  }, [selected]);

  const filtered = images.filter(
    (img) =>
      img.filename.toLowerCase().includes(search.toLowerCase()) ||
      img.alt.toLowerCase().includes(search.toLowerCase()) ||
      img.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length) uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setUploadResults([]);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        const results: UploadResult[] = data.images.map((img: ImageMeta) => ({
          filename: img.filename,
          originalName: img.originalName,
          newSize: img.size,
          width: img.width,
          height: img.height,
        }));
        setUploadResults(results);
        await load();
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttempt = async (filename: string) => {
    const res = await fetch("/api/images/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    const data = await res.json();

    if (res.status === 409 && data.usages) {
      setDeleteUsages(data.usages);
      setDeleteConfirm(filename);
    } else if (data.success) {
      setImages((prev) => prev.filter((img) => img.filename !== filename));
      if (selected?.filename === filename) setSelected(null);
    }
  };

  const handleForceDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const res = await fetch("/api/images/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: deleteConfirm }),
    });
    const data = await res.json();
    if (data.success) {
      setImages((prev) => prev.filter((img) => img.filename !== deleteConfirm));
      if (selected?.filename === deleteConfirm) setSelected(null);
    }
    setDeleteConfirm(null);
    setDeleteUsages([]);
    setDeleting(false);
  };

  const handleSaveMeta = async () => {
    if (!selected) return;
    setMetaSaving(true);
    await updateImageMeta(selected.filename, { alt: editAlt, label: editLabel });
    setImages((prev) =>
      prev.map((img) =>
        img.filename === selected.filename
          ? { ...img, alt: editAlt, label: editLabel }
          : img
      )
    );
    setSelected((prev) => prev ? { ...prev, alt: editAlt, label: editLabel } : null);
    setMetaSaving(false);
  };

  const handleCleanupPreview = async () => {
    setCleanupLoading(true);
    setCleanupDone(null);
    const res = await fetch("/api/images/cleanup");
    const data = await res.json();
    setCleanupPreview(data.unused ?? []);
    setCleanupLoading(false);
  };

  const handleCleanupRun = async () => {
    setCleanupLoading(true);
    const res = await fetch("/api/images/cleanup", { method: "POST" });
    const data = await res.json();
    setCleanupDone(`Deleted ${data.deleted?.length ?? 0} images`);
    setCleanupPreview([]);
    await load();
    setCleanupLoading(false);
  };

  const copyPath = (filename: string) => {
    navigator.clipboard.writeText(`/images/${filename}`);
  };

  return (
    <div className={styles.manager}>
      <div className={styles.gallery}>
        {/* Top toolbar */}
        <div className={styles.galleryToolbar}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search by name, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch("")}>
                <X size={12} />
              </button>
            )}
          </div>

          <button
            className={styles.btnCleanup}
            onClick={handleCleanupPreview}
            disabled={cleanupLoading}
            title="Find and delete unused images"
          >
            {cleanupLoading ? (
              <Loader2 size={14} className={styles.spin} />
            ) : (
              <ZapOff size={14} />
            )}
            Auto-cleanup
          </button>
        </div>

        {/* Cleanup result banner */}
        {cleanupDone && (
          <div className={styles.cleanupSuccess}>
            <CheckCircle2 size={14} />
            {cleanupDone}
            <button onClick={() => setCleanupDone(null)}><X size={12} /></button>
          </div>
        )}

        {/* Cleanup preview */}
        {cleanupPreview.length > 0 && (
          <div className={styles.cleanupPanel}>
            <div className={styles.cleanupTitle}>
              <AlertTriangle size={14} />
              Found {cleanupPreview.length} unused images:
            </div>
            <div className={styles.cleanupList}>
              {cleanupPreview.map((img) => (
                <span key={img.filename} className={styles.cleanupTag}>
                  {img.filename}
                </span>
              ))}
            </div>
            <div className={styles.cleanupActions}>
              <button className={styles.btnDanger} onClick={handleCleanupRun} disabled={cleanupLoading}>
                <Trash2 size={13} /> Delete all {cleanupPreview.length}
              </button>
              <button className={styles.btnGhost} onClick={() => setCleanupPreview([])}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ""} ${uploading ? styles.dropZoneUploading : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) uploadFiles(files);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <>
              <Loader2 size={20} className={styles.spin} />
              <span>Uploading and optimizing...</span>
            </>
          ) : (
            <>
              <Upload size={18} />
              <span>Drag images here or <strong>click to select</strong></span>
              <span className={styles.dropZoneHint}>PNG, JPG, GIF, WEBP → converted to optimized WebP</span>
            </>
          )}
        </div>

        {/* Upload results */}
        {uploadResults.length > 0 && (
          <div className={styles.uploadResults}>
            <div className={styles.uploadResultsTitle}>
              <CheckCircle2 size={13} /> Uploaded {uploadResults.length} files:
            </div>
            {uploadResults.map((r) => (
              <div key={r.filename} className={styles.uploadResultItem}>
                <Sparkles size={11} className={styles.sparkle} />
                <span className={styles.uploadResultName}>{r.originalName}</span>
                <span className={styles.uploadResultSize}>→ {formatBytes(r.newSize)} · {r.width}×{r.height}</span>
              </div>
            ))}
            <button className={styles.closeResults} onClick={() => setUploadResults([])}>
              <X size={12} /> Hide
            </button>
          </div>
        )}

        {/* Image grid */}
        <div className={styles.grid}>
          {loading ? (
            <div className={styles.emptyState}>
              <Loader2 size={24} className={styles.spin} />
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <ImageIcon size={36} />
              <span>{search ? "No results found" : "No uploaded images"}</span>
            </div>
          ) : (
            filtered.map((img) => (
              <div
                key={img.filename}
                className={`${styles.card} ${selected?.filename === img.filename ? styles.cardActive : ""}`}
                onClick={() => setSelected(img)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/images/${img.filename}`}
                  alt={img.alt}
                  className={styles.cardImg}
                  loading="lazy"
                />
                <div className={styles.cardOverlay}>
                  <span className={styles.cardName}>{img.originalName}</span>
                  <span className={styles.cardMeta}>
                    {img.width}×{img.height} · {formatBytes(img.size)}
                  </span>
                  {img.label && (
                    <span className={styles.cardLabel}>{img.label}</span>
                  )}
                </div>
                {onInsert && (
                  <button
                    className={styles.cardInsertBtn}
                    title="Insert into editor"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInsert(img.filename, img.alt || img.originalName);
                    }}
                  >
                    Insert
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {selected && (
        <div className={styles.detail}>
          <div className={styles.detailHeader}>
            <span className={styles.detailTitle}>Image Details</span>
            <button className={styles.detailClose} onClick={() => setSelected(null)}>
              <X size={16} />
            </button>
          </div>

          {/* Preview */}
          <div className={styles.detailPreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/images/${selected.filename}`}
              alt={selected.alt}
              className={styles.detailImg}
            />
          </div>

          {/* Info */}
          <div className={styles.detailInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>File</span>
              <span className={styles.infoVal}>{selected.filename}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Size</span>
              <span className={styles.infoVal}>{selected.width}×{selected.height}px · {formatBytes(selected.size)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Uploaded</span>
              <span className={styles.infoVal}>{new Date(selected.uploadedAt).toLocaleDateString("en-US")}</span>
            </div>
          </div>

          {/* Path copy */}
          <button className={styles.copyPathBtn} onClick={() => copyPath(selected.filename)}>
            <Copy size={13} /> Copy path /images/{selected.filename}
          </button>

          {/* Meta edit */}
          <div className={styles.metaEdit}>
            <div className={styles.metaField}>
              <label className={styles.metaLabel}>
                <FileText size={11} /> Alt text
              </label>
              <input
                className={styles.metaInput}
                value={editAlt}
                onChange={(e) => setEditAlt(e.target.value)}
                placeholder="Image description..."
              />
            </div>
            <div className={styles.metaField}>
              <label className={styles.metaLabel}>
                <Tag size={11} /> Label / category
              </label>
              <input
                className={styles.metaInput}
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="e.g. screenshot, icon..."
              />
            </div>
            <button
              className={styles.btnSaveMeta}
              onClick={handleSaveMeta}
              disabled={metaSaving}
            >
              {metaSaving ? <Loader2 size={13} className={styles.spin} /> : <CheckCircle2 size={13} />}
              Save metadata
            </button>
          </div>

          {/* Usages */}
          <div className={styles.usagesSection}>
            <div className={styles.usagesTitle}>
              <ExternalLink size={12} /> Used in articles
            </div>
            {usagesLoading ? (
              <Loader2 size={14} className={styles.spin} />
            ) : usages.length === 0 ? (
              <span className={styles.usagesEmpty}>Not used anywhere</span>
            ) : (
              <div className={styles.usagesList}>
                {usages.map((u) => (
                  <span key={u} className={styles.usageItem}>
                    <FileText size={11} /> {u}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={styles.detailActions}>
            {onInsert && (
              <button
                className={styles.btnInsert}
                onClick={() => onInsert(selected.filename, selected.alt || selected.originalName)}
              >
                <ImageIcon size={14} /> Insert into article
              </button>
            )}
            <button
              className={styles.btnDeleteDetail}
              onClick={() => handleDeleteAttempt(selected.filename)}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => { setDeleteConfirm(null); setDeleteUsages([]); }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>
              <AlertTriangle size={24} />
            </div>
            <h4 className={styles.modalTitle}>Image in use!</h4>
            <p className={styles.modalText}>
              This image is referenced in the following articles:
            </p>
            <div className={styles.modalUsages}>
              {deleteUsages.map((u) => (
                <span key={u} className={styles.usageItem}><FileText size={11} /> {u}</span>
              ))}
            </div>
            <p className={styles.modalWarning}>
              Deleting it will result in broken image links in these articles.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnGhost} onClick={() => { setDeleteConfirm(null); setDeleteUsages([]); }}>
                Cancel
              </button>
              <button className={styles.btnDanger} onClick={handleForceDelete} disabled={deleting}>
                {deleting ? <Loader2 size={13} className={styles.spin} /> : <Trash2 size={13} />}
                Force delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
