"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Image as ImageIcon } from "lucide-react";
import { getImagesData, ImageMeta } from "@/app/actions/imageActions";
import styles from "./ImagePickerModal.module.css";

const SCALE_OPTIONS = ["100%", "75%", "50%", "25%"];
const ALIGN_OPTIONS = [
  { value: "none", label: "Default" },
  { value: "left", label: "Left ←" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right →" },
] as const;

interface ImagePickerModalProps {
  onClose: () => void;
  /** Called with the markdown string to insert */
  onInsert: (markdown: string) => void;
}

export function ImagePickerModal({ onClose, onInsert }: ImagePickerModalProps) {
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ImageMeta | null>(null);

  // Insert options
  const [alt, setAlt] = useState("");
  const [scale, setScale] = useState("100%");
  const [customScale, setCustomScale] = useState("");
  const [align, setAlign] = useState<"none" | "left" | "center" | "right">("none");

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
      setAlt(selected.alt || "");
    }
  }, [selected]);

  const filtered = images.filter(
    (img) =>
      img.filename.toLowerCase().includes(search.toLowerCase()) ||
      img.alt.toLowerCase().includes(search.toLowerCase()) ||
      img.label.toLowerCase().includes(search.toLowerCase())
  );

  const buildMarkdown = (): string => {
    if (!selected) return "";

    const finalScale = scale === "custom" ? customScale || "100%" : scale;
    const src = `/images/${selected.filename}`;
    const altText = alt || selected.originalName;

    // Encode width into alt text so our custom img component picks it up
    const altWithWidth =
      finalScale !== "100%"
        ? `${altText}{width=${finalScale}}`
        : altText;

    const imgMd = `![${altWithWidth}](${src})`;

    if (align === "none" || align === "left") {
      return imgMd;
    }

    // For center/right wrapping: use div — rehype-raw will render it
    return `<div style="text-align:${align}">\n\n${imgMd}\n\n</div>`;
  };

  const handleInsert = () => {
    const md = buildMarkdown();
    if (md) {
      onInsert(md);
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <ImageIcon size={16} />
            Insert Image
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Gallery column */}
          <div className={styles.galleryCol}>
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.grid}>
              {loading ? (
                <div className={styles.emptyState}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div className={styles.emptyState}>
                  {search ? "No results found" : "No images"}
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
                    <div className={styles.cardName}>{img.originalName}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Options column */}
          <div className={styles.optionsCol}>
            {selected ? (
              <>
                {/* Preview */}
                <div className={styles.preview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/${selected.filename}`}
                    alt={selected.alt}
                    className={styles.previewImg}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Alt text</label>
                  <input
                    className={styles.fieldInput}
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    placeholder="Image description"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Scale</label>
                  <div className={styles.scaleButtons}>
                    {SCALE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        className={`${styles.scaleBtn} ${scale === s ? styles.scaleBtnActive : ""}`}
                        onClick={() => setScale(s)}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      className={`${styles.scaleBtn} ${scale === "custom" ? styles.scaleBtnActive : ""}`}
                      onClick={() => setScale("custom")}
                    >
                      Custom
                    </button>
                  </div>
                  {scale === "custom" && (
                    <input
                      className={styles.fieldInput}
                      value={customScale}
                      onChange={(e) => setCustomScale(e.target.value)}
                      placeholder="e.g. 60% or 400px"
                      style={{ marginTop: 6 }}
                    />
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Alignment</label>
                  <div className={styles.alignButtons}>
                    {ALIGN_OPTIONS.map((a) => (
                      <button
                        key={a.value}
                        className={`${styles.alignBtn} ${align === a.value ? styles.alignBtnActive : ""}`}
                        onClick={() => setAlign(a.value)}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Markdown preview */}
                <div className={styles.mdPreview}>
                  <div className={styles.mdPreviewLabel}>Markdown Output:</div>
                  <pre className={styles.mdPreviewCode}>{buildMarkdown()}</pre>
                </div>

                <button className={styles.btnInsert} onClick={handleInsert}>
                  <ImageIcon size={14} />
                  Insert into Editor
                </button>
              </>
            ) : (
              <div className={styles.noSelection}>
                <ImageIcon size={32} />
                <span>Select an image from the gallery</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
