import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

const maxCoverSizeBytes = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const parsed = parseWorkForm(formData);

    if (parsed.errors.length) {
      return structuredError("作品信息校验失败。", parsed.errors, 400);
    }

    const work = await prisma.work.create({
      data: {
        author: parsed.author,
        category: parsed.category,
        coverFileName: parsed.coverUrl ? originalNameFromUrl(parsed.coverUrl) : null,
        coverUrl: parsed.coverUrl,
        currentCtr: parsed.currentCtr,
        currentFinish: parsed.currentFinish,
        currentPlays: parsed.currentPlays,
        description: parsed.description,
        externalId: parsed.externalId,
        notes: parsed.notes,
        title: parsed.title,
      },
    });

    if (parsed.coverUrl) {
      await prisma.coverAsset.create({
        data: {
          errorMessage: null,
          fileName: originalNameFromUrl(parsed.coverUrl),
          mimeType: "image/remote",
          originalName: originalNameFromUrl(parsed.coverUrl),
          remoteUrl: parsed.coverUrl,
          sizeBytes: 0,
          sourceType: "remote_url",
          status: "available",
          storagePath: null,
          workId: work.id,
        },
      });
    }

    const file = formData.get("coverFile");
    if (file instanceof File && file.size > 0) {
      await saveUploadedCover(work.id, file);
    }

    return NextResponse.json({
      success: true,
      data: {
        workId: work.id,
      },
    });
  } catch (error) {
    return structuredError("创建作品失败。", [error instanceof Error ? error.message : "未知错误"], 500);
  }
}

function parseWorkForm(formData: FormData) {
  const title = stringField(formData, "title");
  const author = optionalStringField(formData, "author");
  const category = optionalStringField(formData, "category");
  const description = optionalStringField(formData, "description") ?? "";
  const externalId = optionalStringField(formData, "externalId");
  const notes = optionalStringField(formData, "notes");
  const coverUrl = optionalStringField(formData, "coverUrl");
  const errors: string[] = [];

  if (!title) {
    errors.push("书名不能为空。");
  }
  if (coverUrl && !isHttpUrl(coverUrl)) {
    errors.push("封面 URL 必须以 http:// 或 https:// 开头。");
  }

  const currentPlays = parseNonNegativeInteger(optionalStringField(formData, "currentPlays"), "当前播放量", errors);
  const currentCtr = parseRate(optionalStringField(formData, "currentCtr"), "当前点击率", errors);
  const currentFinish = parseRate(optionalStringField(formData, "currentFinish"), "当前完播率", errors);

  return {
    author,
    category,
    coverUrl,
    currentCtr,
    currentFinish,
    currentPlays,
    description,
    errors,
    externalId,
    notes,
    title,
  };
}

async function saveUploadedCover(workId: string, file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("本地封面仅支持 JPG、PNG、WebP。");
  }
  if (file.size <= 0 || file.size > maxCoverSizeBytes) {
    throw new Error("本地封面大小必须在 1 byte 到 5MB 之间。");
  }

  const assetId = randomUUID();
  const extension = extensionByMimeType[file.type] ?? path.extname(file.name).toLowerCase();
  const fileName = `${assetId}${extension}`;
  const uploadDir = path.join(process.cwd(), "uploads", "covers", workId);
  const storagePath = path.join("uploads", "covers", workId, fileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

  await prisma.coverAsset.create({
    data: {
      id: assetId,
      errorMessage: null,
      fileName,
      mimeType: file.type,
      originalName: sanitizeOriginalName(file.name),
      remoteUrl: null,
      sizeBytes: file.size,
      sourceType: "local_upload",
      status: "available",
      storagePath,
      workId,
    },
  });
}

function parseNonNegativeInteger(value: string | null, label: string, errors: string[]): number | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) {
    errors.push(`${label}必须为非负整数。`);
    return null;
  }

  return Number(value);
}

function parseRate(value: string | null, label: string, errors: string[]): number | null {
  if (!value) return null;
  const normalized = value.endsWith("%") ? Number(value.slice(0, -1)) / 100 : Number(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    errors.push(`${label}必须为非负数字，可填写 0.12 或 12%。`);
    return null;
  }

  return normalized > 1 && !value.endsWith("%") ? normalized / 100 : normalized;
}

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringField(formData: FormData, key: string): string | null {
  return stringField(formData, key) || null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function originalNameFromUrl(value: string): string {
  try {
    const pathname = new URL(value).pathname;
    return sanitizeOriginalName(decodeURIComponent(path.basename(pathname))) || `remote-cover-${Date.now()}`;
  } catch {
    return `remote-cover-${Date.now()}`;
  }
}

function sanitizeOriginalName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 180) || "cover";
}

function structuredError(message: string, errors: string[], status: number) {
  return NextResponse.json({ success: false, message, errors }, { status });
}
