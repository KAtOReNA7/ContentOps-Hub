import { NextResponse } from "next/server";
import { createBatchJob, startBatchJobInBackground, toPublicBatchError } from "@/lib/batch-jobs/batch-job-service";
import { isBatchJobStatus, isBatchJobStep, type BatchJobStep, type BatchJobType } from "@/lib/batch-jobs/batch-job-types";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page") || "1") || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "20") || 20, 1), 100);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const where = {
      ...(status && isBatchJobStatus(status) ? { status } : {}),
      ...(type ? { type } : {}),
    };
    const [jobs, total] = await Promise.all([
      prisma.batchJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.batchJob.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return structuredError("读取批量任务列表失败。", [safeErrorMessage(error)], 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseCreateBody(body);

    if (parsed.errors.length > 0) {
      return structuredError("批量任务参数不正确。", parsed.errors, 400);
    }

    const job = await createBatchJob(parsed.value);
    if (!job) {
      return structuredError("批量任务创建失败。", ["未能读取新建任务。"], 500);
    }

    startBatchJobInBackground(job.id, {
      identifyProviderMode: parsed.value.identifyProviderMode,
      titleIntroProvider: parsed.value.titleIntroProvider,
    });

    return NextResponse.json({
      success: true,
      data: job,
    });
  } catch (error) {
    const batchError = toPublicBatchError(error);
    const status =
      batchError.errorCode === "COST_RISK_NOT_ACCEPTED" ||
      batchError.errorCode === "OPENAI_CONFIG_MISSING" ||
      batchError.errorCode === "OPENAI_RATING_BATCH_LIMIT_EXCEEDED" ? 400 : 500;

    return structuredError(batchError.errorMessage, [`${batchError.errorCode}: ${batchError.hint}`], status);
  }
}

function parseCreateBody(body: unknown): {
  value: {
    type: BatchJobType;
    workIds: string[];
    steps: BatchJobStep[];
    costRiskAccepted: boolean;
    note: string | null;
    identifyProviderMode: "mock" | "configured";
    titleIntroProvider: "mock" | "openai";
  };
  errors: string[];
} {
  const errors: string[] = [];
  const value = isRecord(body) ? body : {};
  const workIds = Array.isArray(value.workIds) ? value.workIds.filter((item): item is string => typeof item === "string") : [];
  const steps = Array.isArray(value.steps) ? value.steps.filter(isBatchJobStep) : [];
  const rawProvider = value.titleIntroProvider || value.provider;
  const titleIntroProvider = rawProvider === "openai" ? "openai" : "mock";
  const identifyProviderMode = value.identifyProviderMode === "configured" ? "configured" : "mock";
  const inferredType = steps.length === 1 ? steps[0] : "mixed";

  if (!Array.isArray(value.workIds)) errors.push("workIds 必须是数组。");
  if (!Array.isArray(value.steps)) errors.push("steps 必须是数组。");
  if (workIds.length === 0) errors.push("请至少选择一个作品。");
  if (steps.length === 0) errors.push("请至少选择一个批量执行步骤。");

  return {
    value: {
      type: typeof value.type === "string" ? (value.type as BatchJobType) : inferredType,
      workIds,
      steps,
      costRiskAccepted: value.costRiskAccepted === true,
      note: typeof value.note === "string" ? value.note : null,
      identifyProviderMode,
      titleIntroProvider,
    },
    errors,
  };
}

function structuredError(message: string, errors: string[], status: number) {
  return NextResponse.json({ success: false, message, errors }, { status });
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误。";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
