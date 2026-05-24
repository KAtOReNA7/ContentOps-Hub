import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getLatestCoverAsset, getLatestCoverEvaluation, toCoverAssetView, toCoverEvaluationView } from "@/lib/cover/cover-repository";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

const maxCoverSizeBytes = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

type CoverRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: CoverRouteProps) {
  try {
    const { id } = await params;
    const [asset, evaluation] = await Promise.all([getLatestCoverAsset(id), getLatestCoverEvaluation(id)]);

    return NextResponse.json({
      success: true,
      data: {
        asset: asset ? toCoverAssetView(asset) : null,
        evaluation: evaluation ? toCoverEvaluationView(evaluation) : null,
      },
    });
  } catch (error) {
    return structuredError("Failed to read cover asset.", [errorMessage(error)], 500);
  }
}

export async function POST(request: Request, { params }: CoverRouteProps) {
  try {
    const { id } = await params;
    const work = await prisma.work.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!work) {
      return structuredError("Work not found.", ["No work exists for the provided id."], 404);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return structuredError("Cover file is required.", ["Use multipart/form-data with a file field named file."], 400);
    }

    if (!allowedMimeTypes.has(file.type)) {
      return structuredError("Unsupported cover file type.", ["Only JPEG, PNG, and WebP images are supported."], 400);
    }

    if (file.size <= 0 || file.size > maxCoverSizeBytes) {
      return structuredError("Cover file size is invalid.", [`File size must be between 1 byte and ${maxCoverSizeBytes} bytes.`], 400);
    }

    const assetId = randomUUID();
    const extension = extensionByMimeType[file.type] ?? path.extname(file.name).toLowerCase();
    const fileName = `${assetId}${extension}`;
    const uploadDir = path.join(process.cwd(), "uploads", "covers", id);
    const storagePath = path.join("uploads", "covers", id, fileName);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

    const asset = await prisma.coverAsset.create({
      data: {
        id: assetId,
        workId: id,
        fileName,
        originalName: sanitizeOriginalName(file.name),
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        asset: toCoverAssetView(asset),
      },
    });
  } catch (error) {
    return structuredError("Failed to upload cover asset.", [errorMessage(error)], 500);
  }
}

function sanitizeOriginalName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 180) || "cover";
}

function structuredError(message: string, errors: string[], status: number) {
  return NextResponse.json({ success: false, message, errors }, { status });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
