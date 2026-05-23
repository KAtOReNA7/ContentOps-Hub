"use client";

import { useState } from "react";
import type { CandidateWork, FinalMatch } from "@/lib/adapters/search-adapter";

export type WorkIdentificationView = {
  identificationId: string;
  candidates: CandidateWork[];
  finalMatch: FinalMatch | null;
  confidence: number;
  reason: string;
  risks: string[];
  confirmed: boolean;
  confirmedTitle: string | null;
  confirmedAuthor: string | null;
};

type IdentifyResponse =
  | {
      success: true;
      data: Omit<WorkIdentificationView, "confirmed" | "confirmedTitle" | "confirmedAuthor">;
      message?: string;
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type ConfirmResponse =
  | {
      success: true;
      message: string;
      data: {
        identificationId: string;
        confirmed: boolean;
        confirmedTitle: string | null;
        confirmedAuthor: string | null;
      };
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

type WorkIdentificationPanelProps = {
  workId: string;
  initialIdentification: WorkIdentificationView | null;
};

export function WorkIdentificationPanel({
  workId,
  initialIdentification,
}: WorkIdentificationPanelProps) {
  const [identification, setIdentification] = useState(initialIdentification);
  const [confirmedTitle, setConfirmedTitle] = useState(initialIdentification?.confirmedTitle ?? initialIdentification?.finalMatch?.title ?? "");
  const [confirmedAuthor, setConfirmedAuthor] = useState(initialIdentification?.confirmedAuthor ?? initialIdentification?.finalMatch?.author ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function runIdentification() {
    setIsRunning(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/works/${workId}/identify`, { method: "POST" });
      const payload = (await response.json()) as IdentifyResponse;

      if (!response.ok || !payload.success) {
        throw new Error(formatApiError(response.status, payload));
      }

      const nextIdentification: WorkIdentificationView = {
        ...payload.data,
        confirmed: false,
        confirmedTitle: null,
        confirmedAuthor: null,
      };
      setIdentification(nextIdentification);
      setConfirmedTitle(nextIdentification.finalMatch?.title ?? "");
      setConfirmedAuthor(nextIdentification.finalMatch?.author ?? "");
      setMessage("作品识别完成");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "网络请求失败");
    } finally {
      setIsRunning(false);
    }
  }

  async function confirmIdentification() {
    setIsConfirming(true);
    setMessage("");
    setError("");

    try {
      if (!identification?.identificationId) {
        throw new Error("identificationId 缺失，请先运行识别");
      }

      const response = await fetch(`/api/works/${workId}/identify/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identificationId: identification.identificationId,
          confirmedTitle,
          confirmedAuthor,
        }),
      });
      const payload = (await response.json()) as ConfirmResponse;

      if (!response.ok || !payload.success) {
        throw new Error(formatApiError(response.status, payload));
      }

      setIdentification({
        ...identification,
        confirmed: payload.data.confirmed,
        confirmedTitle: payload.data.confirmedTitle,
        confirmedAuthor: payload.data.confirmedAuthor,
      });
      setMessage(payload.message);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "网络请求失败");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold text-stone-950">作品识别 Mock</h2>
          <p className="mt-1 text-sm text-stone-600">
            状态：{identification ? (identification.confirmed ? "已人工确认" : "已识别，待确认") : "未识别"}
          </p>
        </div>
        <button
          className="w-fit rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={isRunning}
          onClick={runIdentification}
          type="button"
        >
          {isRunning ? "识别中" : "运行识别"}
        </button>
      </div>

      {message ? <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {identification ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">最终匹配结果</p>
            <h3 className="mt-2 font-semibold text-stone-950">
              {identification.finalMatch?.title || "-"} / {identification.finalMatch?.author || "-"}
            </h3>
            <p className="mt-2 text-sm text-stone-700">
              置信度：{identification.confidence} | {identification.reason}
            </p>
            <p className="mt-2 text-sm text-stone-600">
              风险：{identification.risks.length ? identification.risks.join("；") : "暂无明显风险"}
            </p>
          </div>

          <div className="rounded-md border border-stone-200 p-4">
            <p className="font-medium text-stone-950">人工确认</p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                onChange={(event) => setConfirmedTitle(event.target.value)}
                placeholder="确认作品名"
                value={confirmedTitle}
              />
              <input
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                onChange={(event) => setConfirmedAuthor(event.target.value)}
                placeholder="确认作者"
                value={confirmedAuthor}
              />
              <button
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 disabled:opacity-50"
                disabled={isConfirming}
                onClick={confirmIdentification}
                type="button"
              >
                {isConfirming ? "确认中" : "人工确认"}
              </button>
            </div>
            {identification.confirmed ? (
              <p className="mt-3 text-sm text-green-700">
                已人工确认：{identification.confirmedTitle || "-"} / {identification.confirmedAuthor || "-"}
              </p>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-3 py-3">候选作品名</th>
                  <th className="px-3 py-3">作者</th>
                  <th className="px-3 py-3">来源平台</th>
                  <th className="px-3 py-3">简介摘要</th>
                  <th className="px-3 py-3">分数</th>
                  <th className="px-3 py-3">匹配理由</th>
                  <th className="px-3 py-3">排除理由</th>
                  <th className="px-3 py-3">疑似重名</th>
                </tr>
              </thead>
              <tbody>
                {identification.candidates.map((candidate) => (
                  <tr className="border-t border-stone-100" key={`${candidate.platform}-${candidate.title}`}>
                    <td className="px-3 py-3 font-medium text-stone-950">{candidate.title}</td>
                    <td className="px-3 py-3 text-stone-600">{candidate.author}</td>
                    <td className="px-3 py-3 text-stone-600">{candidate.platform}</td>
                    <td className="px-3 py-3 text-stone-600">{candidate.summary}</td>
                    <td className="px-3 py-3 text-stone-950">{candidate.score}</td>
                    <td className="px-3 py-3 text-stone-600">{candidate.matchReasons.join("；")}</td>
                    <td className="px-3 py-3 text-stone-600">
                      {candidate.excludeReasons.length ? candidate.excludeReasons.join("；") : "暂无明显排除理由"}
                    </td>
                    <td className="px-3 py-3 text-stone-600">{candidate.possibleDuplicate ? "是" : "否"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-stone-600">尚未运行识别。</p>
      )}
    </section>
  );
}

function formatApiError(
  status: number,
  payload: { success: false; message: string; errors: string[] } | { success: true },
): string {
  if (payload.success) {
    return `HTTP ${status}`;
  }

  return [`HTTP ${status}`, payload.message, payload.errors.join("；")].filter(Boolean).join(" | ");
}
