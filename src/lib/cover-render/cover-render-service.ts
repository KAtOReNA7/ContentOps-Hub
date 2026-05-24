import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { CoverRenderRatio, CoverRenderView } from "@/lib/cover-render/cover-render-types";
import { saveCoverRender, toCoverRenderView } from "@/lib/cover-render/cover-render-repository";
import type { CoverStrategy } from "@/lib/cover/cover-types";
import { prisma } from "@/server/db";

const renderSizes: Record<CoverRenderRatio, { width: number; height: number }> = {
  "1:1": { width: 1200, height: 1200 },
  "3:4": { width: 1200, height: 1600 },
};

const maxRemoteCoverBytes = 5 * 1024 * 1024;
const remoteCoverTimeoutMs = 8000;

export type RenderCoverParams = {
  workId: string;
  titleText: string;
  strategy: CoverStrategy;
  ratios: CoverRenderRatio[];
};

export async function renderCoverVariants(params: RenderCoverParams): Promise<CoverRenderView[]> {
  if (!params.titleText.trim()) {
    throw new Error("titleText is required.");
  }

  if (params.strategy !== "keep_and_replace_title" && params.strategy !== "keep_and_optimize_layout") {
    throw new Error("Only keep_and_replace_title and keep_and_optimize_layout are supported for V1 cover render.");
  }

  const [asset, generation] = await Promise.all([
    prisma.coverAsset.findFirst({
      where: { workId: params.workId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workTitleIntroGeneration.findFirst({
      where: { workId: params.workId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!asset) {
    throw new Error("Cover asset is required before rendering.");
  }

  const source = await readCoverAssetBytes(asset);
  const renders: CoverRenderView[] = [];

  for (const ratio of uniqueRatios(params.ratios)) {
    const size = renderSizes[ratio];
    const fileName = `${randomUUID()}-${ratio.replace(":", "x")}.png`;
    const storagePath = path.join("uploads", "cover-renders", params.workId, fileName);
    const outputPath = path.join(process.cwd(), storagePath);
    const outputDir = path.dirname(outputPath);
    const svgOverlay = buildTitleOverlaySvg(params.titleText, params.strategy, size.width, size.height);
    const output = await sharp(source)
      .rotate()
      .resize(size.width, size.height, { fit: "cover", position: "center" })
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .png({ quality: 92 })
      .toBuffer();

    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, output);

    const saved = await saveCoverRender({
      workId: params.workId,
      coverAssetId: asset.id,
      titleIntroGenerationId: generation?.id ?? null,
      titleText: params.titleText.trim(),
      strategy: params.strategy,
      outputRatio: ratio,
      outputPath: storagePath,
    });

    renders.push(toCoverRenderView(saved));
  }

  return renders;
}

async function readCoverAssetBytes(asset: {
  sourceType: string;
  storagePath: string | null;
  remoteUrl: string | null;
}): Promise<Buffer> {
  if (asset.sourceType === "remote_url") {
    return fetchRemoteCover(asset.remoteUrl);
  }

  if (!asset.storagePath) {
    throw new Error("Local cover asset storage path is missing.");
  }

  const uploadsRoot = path.join(process.cwd(), "uploads");
  const relativeStoragePath = asset.storagePath.replace(/^uploads[\\/]/, "");
  const resolvedPath = path.join(uploadsRoot, relativeStoragePath);

  if (!path.resolve(resolvedPath).startsWith(path.resolve(uploadsRoot))) {
    throw new Error("Invalid cover asset path.");
  }

  return readFile(resolvedPath);
}

async function fetchRemoteCover(remoteUrl: string | null): Promise<Buffer> {
  const url = parseRemoteCoverUrl(remoteUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), remoteCoverTimeoutMs);

  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Remote cover returned HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      throw new Error("Remote cover content type is not an image.");
    }

    const contentLength = Number(response.headers.get("content-length"));

    if (Number.isFinite(contentLength) && contentLength > maxRemoteCoverBytes) {
      throw new Error("Remote cover is larger than allowed.");
    }

    return readLimitedResponseBody(response);
  } finally {
    clearTimeout(timeout);
  }
}

function parseRemoteCoverUrl(value: string | null): URL {
  if (!value) {
    throw new Error("Remote cover URL is missing.");
  }

  const url = new URL(value);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Remote cover URL must use http or https.");
  }

  if (isBlockedHost(url.hostname)) {
    throw new Error("Remote cover URL points to a blocked host.");
  }

  return url;
}

function isBlockedHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");

  if (normalized === "localhost" || normalized === "::1") {
    return true;
  }

  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (!ipv4) {
    return false;
  }

  const [first, second, third, fourth] = ipv4.slice(1).map(Number);

  if ([first, second, third, fourth].some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

async function readLimitedResponseBody(response: Response): Promise<Buffer> {
  if (!response.body) {
    return Buffer.from(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxRemoteCoverBytes) {
      throw new Error("Remote cover is larger than allowed.");
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}

function uniqueRatios(ratios: CoverRenderRatio[]): CoverRenderRatio[] {
  const filtered = ratios.filter((ratio): ratio is CoverRenderRatio => ratio === "1:1" || ratio === "3:4");
  const unique = Array.from(new Set(filtered));

  return unique.length ? unique : ["1:1", "3:4"];
}

function buildTitleOverlaySvg(titleText: string, strategy: CoverStrategy, width: number, height: number): string {
  const isLayoutOptimization = strategy === "keep_and_optimize_layout";
  const safeTitle = escapeXml(titleText.trim());
  const maxCharsPerLine = width >= height ? 8 : 9;
  const lines = wrapText(safeTitle, maxCharsPerLine).slice(0, 4);
  const fontSize = Math.max(54, Math.min(132, Math.floor((width * 0.68) / Math.max(...lines.map((line) => line.length), 1))));
  const lineHeight = Math.round(fontSize * 1.18);
  const blockHeight = lines.length * lineHeight + 110;
  const yStart = height - blockHeight - Math.round(height * 0.035);
  const bgOpacity = isLayoutOptimization ? 0.78 : 0.58;
  const boxX = Math.round(width * 0.06);
  const boxWidth = Math.round(width * 0.88);

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shadow" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.62"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${Math.max(0, yStart - 120)}" width="${width}" height="${height - yStart + 120}" fill="url(#shadow)"/>
  <rect x="${boxX}" y="${yStart}" width="${boxWidth}" height="${blockHeight}" rx="34" fill="#111111" fill-opacity="${bgOpacity}"/>
  ${isLayoutOptimization ? `<rect x="${boxX + 22}" y="${yStart + 22}" width="${boxWidth - 44}" height="${blockHeight - 44}" rx="22" fill="none" stroke="#f8e7b1" stroke-width="4" stroke-opacity="0.85"/>` : ""}
  ${lines
    .map((line, index) => {
      const y = yStart + 70 + index * lineHeight;
      return `<text x="${width / 2}" y="${y}" text-anchor="middle" dominant-baseline="hanging" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif" font-size="${fontSize}" font-weight="900" fill="#fff7df" stroke="#1a1208" stroke-width="6" paint-order="stroke">${line}</text>`;
    })
    .join("")}
</svg>`;
}

function wrapText(value: string, maxCharsPerLine: number): string[] {
  const compact = value.replace(/\s+/g, "");

  if (!compact) {
    return ["新版封面"];
  }

  const lines: string[] = [];

  for (let index = 0; index < compact.length; index += maxCharsPerLine) {
    lines.push(compact.slice(index, index + maxCharsPerLine));
  }

  return lines;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
