import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type CoverAssetFileRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: CoverAssetFileRouteProps) {
  try {
    const { id } = await params;
    const asset = await prisma.coverAsset.findUnique({
      where: { id },
      select: {
        mimeType: true,
        originalName: true,
        storagePath: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ success: false, message: "Cover asset not found.", errors: [] }, { status: 404 });
    }

    const uploadsRoot = path.join(process.cwd(), "uploads");
    const relativeStoragePath = asset.storagePath.replace(/^uploads[\\/]/, "");
    const resolvedPath = path.join(uploadsRoot, relativeStoragePath);

    if (!path.resolve(resolvedPath).startsWith(path.resolve(uploadsRoot))) {
      return NextResponse.json({ success: false, message: "Invalid cover asset path.", errors: [] }, { status: 400 });
    }

    const file = await readFile(resolvedPath);

    return new Response(file, {
      headers: {
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": `inline; filename="${encodeURIComponent(asset.originalName)}"`,
        "Content-Type": asset.mimeType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to read cover asset file.",
        errors: [error instanceof Error ? error.message : "Unknown error."],
      },
      { status: 500 },
    );
  }
}
