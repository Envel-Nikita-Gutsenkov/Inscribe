/**
 * Tests for compression.ts utilities.
 *
 * Coverage:
 *  - Unit: compress → decompress round-trip
 *  - Unit: handles Buffer input in decompress
 *  - Unit: handles plain string (legacy uncompressed) input
 *  - Unit: handles null/undefined gracefully
 *  - Property-based: random strings survive compress/decompress
 *  - Performance: large content compression ratio assertion
 */

import { describe, it, expect } from "vitest";
import { compress, decompress } from "../src/lib/db/compression";
import crypto from "crypto";

describe("Compression utilities", () => {
  describe("round-trip correctness", () => {
    it("compresses and decompresses ASCII text correctly", () => {
      const original = "Hello, World! This is a test article content.";
      expect(decompress(compress(original))).toBe(original);
    });

    it("compresses and decompresses multiline Markdown", () => {
      const md = `# Title\n\n## Subtitle\n\nParagraph with **bold** and *italic* text.\n\n\`\`\`js\nconsole.log("code");\n\`\`\``;
      expect(decompress(compress(md))).toBe(md);
    });

    it("compresses and decompresses empty string", () => {
      expect(decompress(compress(""))).toBe("");
    });

    it("compresses and decompresses Unicode and emoji", () => {
      const unicode = "Привет мир 🌍 日本語 한국어 العربية";
      expect(decompress(compress(unicode))).toBe(unicode);
    });

    it("compresses and decompresses content with null bytes", () => {
      const withNull = "before\x00after\x00\x00end";
      expect(decompress(compress(withNull))).toBe(withNull);
    });

    it("compresses and decompresses 100KB content", () => {
      const large = "x".repeat(100_000);
      expect(decompress(compress(large))).toBe(large);
    });
  });

  describe("decompress input variants", () => {
    it("returns plain string unchanged (legacy uncompressed storage)", () => {
      expect(decompress("plain text")).toBe("plain text");
    });

    it("returns empty string for null input", () => {
      expect(decompress(null as any)).toBe("");
    });

    it("returns empty string for undefined input", () => {
      expect(decompress(undefined as any)).toBe("");
    });

    it("handles corrupted buffer gracefully (falls back to toString)", () => {
      const corruptBuffer = Buffer.from("not valid deflate data");
      const result = decompress(corruptBuffer);
      expect(typeof result).toBe("string");
    });
  });

  describe("compression ratio", () => {
    it("compresses repetitive text to less than 20% of original size", () => {
      const repetitive = "the quick brown fox jumps over the lazy dog ".repeat(500);
      const compressed = compress(repetitive);
      const ratio = compressed.length / Buffer.byteLength(repetitive, "utf-8");
      expect(ratio).toBeLessThan(0.20);
    });

    it("compress output is always a Buffer", () => {
      expect(compress("any content")).toBeInstanceOf(Buffer);
    });
  });

  describe("property-based: random strings survive round-trip", () => {
    for (let i = 0; i < 20; i++) {
      it(`random string #${i + 1} round-trips correctly`, () => {
        const random = crypto.randomBytes(Math.floor(Math.random() * 2000)).toString("utf-8");
        const roundTripped = decompress(compress(random));
        expect(roundTripped).toBe(random);
      });
    }
  });
});
