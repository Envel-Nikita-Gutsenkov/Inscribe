import zlib from "zlib";

export function compress(content: string): Buffer {
  return zlib.deflateSync(Buffer.from(content, "utf-8"));
}

export function decompress(val: Buffer | string | null | undefined): string {
  if (!val) return "";
  if (val instanceof Buffer) {
    try {
      return zlib.inflateSync(val).toString("utf-8");
    } catch {
      return val.toString("utf-8");
    }
  }
  return typeof val === "string" ? val : "";
}
