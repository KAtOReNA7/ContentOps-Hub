import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

type CoverRenderFileRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: CoverRenderFileRouteProps) {
  try {
    const { id } = await params;
    const render = await prisma.workCoverRender.findUnique({
      where: { id },
      select: {
        outputPath: true,
        outputRatio: true,
        titleText: true,
      },
    });

    if (!render) {
      return structuredError("Cover render not found.", [], 404);
    }

    const uploadsRoot = path.join(process.cwd(), "uploads");
    const relativePath = render.outputPath.replace(/^uploads[\\/]/, "");
    const resolvedPath = path.join(uploadsRoot, relativePath);

    if (!path.resolve(resolvedPath).startsWith(path.resolve(uploadsRoot))) {
      return structuredError("Invalid cover render path.", [], 400);
    }

    const file = await readFile(resolvedPath);
    const body = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": `inline; filename="${encodeURIComponent(`cover-${render.outputRatio}-${render.titleText}.png`)}"`,
        "Content-Type": "image/png",
      },
    });
  } catch (error) {
    return structuredError("Failed to read cover render file.", [errorMessage(error)], 500);
  }
}

function structuredError(message: string, errors: string[], status: number) {
  return NextResponse.json({ success: false, message, errors }, { status });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
