import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

const maxRemoteCoverBytes = 5 * 1024 * 1024;
const remoteCoverTimeoutMs = 8000;

type CoverAssetFileRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: CoverAssetFileRouteProps) {
  try {
    const { id } = await params;
    const asset = await prisma.coverAsset.findUnique({
      where: { id },
      select: {
        id: true,
        mimeType: true,
        originalName: true,
        storagePath: true,
        sourceType: true,
        remoteUrl: true,
      },
    });

    if (!asset) {
      return structuredError("Cover asset not found.", [], 404);
    }

    if (asset.sourceType === "remote_url") {
      return await readRemoteCover(asset.id, asset.remoteUrl, asset.originalName);
    }

    return await readLocalCover(asset.storagePath, asset.mimeType, asset.originalName);
  } catch (error) {
    return structuredError("Failed to read cover asset file.", [safeErrorMessage(error)], 500);
  }
}

async function readLocalCover(storagePath: string | null, mimeType: string, originalName: string) {
  if (!storagePath) {
    return structuredError("Cover asset file is missing.", ["Local cover asset does not have a storage path."], 404);
  }

  const uploadsRoot = path.join(process.cwd(), "uploads");
  const relativeStoragePath = storagePath.replace(/^uploads[\\/]/, "");
  const resolvedPath = path.join(uploadsRoot, relativeStoragePath);

  if (!path.resolve(resolvedPath).startsWith(path.resolve(uploadsRoot))) {
    return structuredError("Invalid cover asset path.", [], 400);
  }

  const file = await readFile(resolvedPath);

  return imageResponse(file, mimeType, originalName);
}

async function readRemoteCover(assetId: string, remoteUrl: string | null, originalName: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), remoteCoverTimeoutMs);

  try {
    const url = parseRemoteCoverUrl(remoteUrl);
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      await markRemoteCoverError(assetId, `Remote cover returned HTTP ${response.status}.`);
      return structuredError("Remote cover is not available.", [`HTTP ${response.status}`], 502);
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      await markRemoteCoverError(assetId, "Remote cover content type is not an image.");
      return structuredError("Remote cover is not an image.", ["Remote content-type must start with image/."], 415);
    }

    const contentLength = Number(response.headers.get("content-length"));

    if (Number.isFinite(contentLength) && contentLength > maxRemoteCoverBytes) {
      await markRemoteCoverError(assetId, "Remote cover is larger than allowed.");
      return structuredError("Remote cover is too large.", [`Maximum size is ${maxRemoteCoverBytes} bytes.`], 413);
    }

    const body = await readLimitedResponseBody(response);
    await prisma.coverAsset.update({
      where: { id: assetId },
      data: { status: "available", errorMessage: null },
    });

    return imageResponse(body, contentType, originalName);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Remote cover request timed out." : safeErrorMessage(error);
    await markRemoteCoverError(assetId, message);
    return structuredError("Failed to fetch remote cover.", [message], error instanceof TypeError ? 502 : 504);
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

async function markRemoteCoverError(assetId: string, errorMessage: string) {
  await prisma.coverAsset.update({
    where: { id: assetId },
    data: {
      status: "error",
      errorMessage: errorMessage.slice(0, 500),
    },
  });
}

function imageResponse(file: Buffer, mimeType: string, originalName: string) {
  const body = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": `inline; filename="${encodeURIComponent(originalName)}"`,
      "Content-Type": mimeType,
    },
  });
}

function structuredError(message: string, errors: string[], status: number) {
  return NextResponse.json({ success: false, message, errors }, { status });
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
