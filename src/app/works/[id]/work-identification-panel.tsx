"use client";

import { useState } from "react";
import type { CandidateWork, FinalMatch, SearchEvidence, SearchResultItem, SourceSummary } from "@/lib/adapters/search-adapter";

export type WorkIdentificationView = {
  identificationId: string;
  candidates: CandidateWork[];
  finalMatch: FinalMatch | null;
  confidence: number;
  reason: string;
  risks: string[];
  searchProvider: string;
  searchQuery: string;
  searchResults: SearchResultItem[];
  evidence: SearchEvidence[];
  riskHints: string[];
  sourceSummary: SourceSummary | null;
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
  const [showAllCandidates, setShowAllCandidates] = useState(false);

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
          <h2 className="font-semibold text-stone-950">作品识别与搜索证据</h2>
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

          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard label="搜索 provider" value={identification.searchProvider || "mock"} />
            <InfoCard label="搜索 query" value={identification.searchQuery || "-"} />
            <InfoCard
              label="来源摘要"
              value={
                identification.sourceSummary
                  ? `原始 ${identification.sourceSummary.rawResultCount ?? identification.searchResults.length} / 有效 ${identification.sourceSummary.normalizedResultCount ?? identification.candidates.length} / 过滤 ${identification.sourceSummary.filteredResultCount ?? 0}`
                  : "-"
              }
            />
          </div>

          {identification.sourceSummary ? <SourceSummaryPanel summary={identification.sourceSummary} /> : null}

          <div className="rounded-md border border-stone-200 p-4">
            <p className="font-medium text-stone-950">为什么是这本</p>
            {identification.evidence.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-700">
                {identification.evidence.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    {item.detail}
                    {item.url ? (
                      <a className="ml-2 text-red-700 hover:text-red-900" href={item.url} rel="noreferrer" target="_blank">
                        查看来源
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-stone-600">暂无搜索证据。</p>
            )}
            {identification.riskHints.length ? (
              <p className="mt-3 text-sm text-amber-700">证据风险：{identification.riskHints.join("；")}</p>
            ) : null}
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
            {identification.candidates.length ? (
              <div className="space-y-2">
                {identification.candidates.slice(0, showAllCandidates ? undefined : 5).map((candidate, index) => (
                  <details
                    className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
                    key={`${candidate.rawRank ?? index}-${candidate.url ?? candidate.platform}-${candidate.title}`}
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-stone-100 px-2 py-1 text-xs text-stone-700">
                          {candidate.canonicalSourceName ?? candidate.sourceName ?? candidate.platform}
                        </span>
                        <span className="max-w-xl truncate font-medium text-stone-950">{candidate.title}</span>
                        <span className="text-stone-500">作者：{candidate.author}</span>
                        <span className="text-stone-500">匹配 {candidate.relevanceScore ?? candidate.score}</span>
                        <span className="text-stone-500">价值信号 {candidate.valueSignalScore ?? 0}</span>
                        {candidateTags(candidate).map((tag) => (
                          <span className={`rounded px-2 py-1 text-xs ${candidateTagClass(tag)}`} key={tag}>
                            {tag}
                          </span>
                        ))}
                        {candidate.possibleDuplicate ? <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">疑似重名</span> : null}
                        <span className="ml-auto text-xs text-red-700">展开详情</span>
                      </div>
                    </summary>
                    <div className="mt-3 grid gap-2 border-t border-stone-100 pt-3 text-sm text-stone-600 md:grid-cols-2">
                      <p>完整标题：{candidate.title}</p>
                      <p>作者：{candidate.author}</p>
                      <p>sourceCategory：{candidate.sourceCategory ?? candidate.sourceType ?? "unknown"}</p>
                      <p>canonicalSourceName：{candidate.canonicalSourceName ?? candidate.sourceName ?? candidate.platform}</p>
                      <p>rawRank：{candidate.rawRank ?? "-"}</p>
                      <p>relevanceScore：{candidate.relevanceScore ?? "-"}</p>
                      <p>valueSignalScore：{candidate.valueSignalScore ?? "-"}</p>
                      <p>
                        URL：
                        {candidate.url ? (
                          <a className="text-red-700 hover:text-red-900" href={candidate.url} rel="noreferrer" target="_blank">
                            {candidate.url}
                          </a>
                        ) : (
                          "-"
                        )}
                      </p>
                      <p className="md:col-span-2">摘要：{candidate.summary}</p>
                      <p className="md:col-span-2">匹配理由：{candidate.matchReasons.join("；")}</p>
                      <p className="md:col-span-2">
                        排除理由：{candidate.excludeReasons.length ? candidate.excludeReasons.join("；") : "暂无明显排除理由"}
                      </p>
                      <p className="md:col-span-2">
                        IP/热度证据：
                        {[...(candidate.ipEvidence ?? []).map((item) => item.evidenceText), ...(candidate.heatEvidence ?? []).map((item) => item.evidenceText)].join("；") || "-"}
                      </p>
                    </div>
                  </details>
                ))}
                {identification.candidates.length > 5 ? (
                  <button className="text-sm font-medium text-red-700 hover:text-red-900" onClick={() => setShowAllCandidates((value) => !value)} type="button">
                    {showAllCandidates ? "收起候选" : `显示更多候选（剩余 ${identification.candidates.length - 5} 条）`}
                  </button>
                ) : null}
              </div>
            ) : (
              <EmptyCandidateDiagnostics identification={identification} />
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-stone-600">尚未运行识别。</p>
      )}
    </section>
  );
}

function candidateTagClass(tag: string) {
  if (/书名命中|作者命中/.test(tag)) return "bg-green-50 text-green-700";
  if (/简介命中/.test(tag)) return "bg-blue-50 text-blue-700";
  if (/原作平台/.test(tag)) return "bg-purple-50 text-purple-700";
  if (/影视|IP/.test(tag)) return "bg-orange-50 text-orange-700";
  if (/社媒|热度/.test(tag)) return "bg-pink-50 text-pink-700";
  if (/风险|重名/.test(tag)) return "bg-red-50 text-red-700";
  return "bg-stone-100 text-stone-700";
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-stone-950">{value}</p>
    </div>
  );
}

function candidateTags(candidate: CandidateWork): string[] {
  const tags = new Set<string>();

  for (const tag of candidate.relevanceTags ?? []) {
    tags.add(tag);
  }
  if (candidate.sourceCategory === "ebook_platform") tags.add("原作平台");
  if (candidate.sourceCategory === "audio_platform") tags.add("有声书");
  if (candidate.ipEvidence?.length) tags.add("影视/IP");
  if (candidate.heatEvidence?.length) tags.add("社媒热度");

  return Array.from(tags).slice(0, 5);
}

function SourceSummaryPanel({ summary }: { summary: SourceSummary }) {
  const categories = [
    { key: "audio_platform", label: "有声书" },
    { key: "ebook_platform", label: "电子书" },
    { key: "video_platform", label: "影视/IP" },
    { key: "social_media", label: "社媒热度" },
    { key: "encyclopedia", label: "百科" },
    { key: "news", label: "新闻" },
    { key: "search_engine", label: "搜索引擎" },
    { key: "unknown", label: "其他" },
  ];

  return (
    <div className="rounded-md border border-stone-200 p-4">
      <p className="font-medium text-stone-950">来源平台摘要</p>
      <div className="mt-3 grid gap-2 text-sm text-stone-700 md:grid-cols-4">
        <p>原始结果：{summary.rawResultCount ?? "-"}</p>
        <p>有效候选：{summary.normalizedResultCount ?? "-"}</p>
        <p>过滤结果：{summary.filteredResultCount ?? 0}</p>
        <p>作者匹配：{summary.authorMatchCount}</p>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-stone-700 md:grid-cols-2">
        {categories.map((item) => {
          const stat = summary.categorySummary?.find((entry) => entry.sourceCategory === item.key);

          return (
            <p key={item.key}>
              {item.label}：{stat?.platformCount ?? 0} 个平台 / {stat?.resultCount ?? 0} 条结果
            </p>
          );
        })}
      </div>
      {summary.platformSummary?.length ? (
        <div className="mt-3 border-t border-stone-100 pt-3 text-sm text-stone-700">
          <p className="font-medium text-stone-950">平台明细</p>
          <p className="mt-2">
            {summary.platformSummary.map((item) => `${item.canonicalSourceName}：${item.resultCount} 条`).join("；")}
          </p>
        </div>
      ) : null}
      {summary.ipEvidenceCount || summary.heatEvidenceCount ? (
        <p className="mt-3 text-sm text-red-700">
          IP 证据 {summary.ipEvidenceCount ?? 0} 条 / 热度证据 {summary.heatEvidenceCount ?? 0} 条
        </p>
      ) : null}
    </div>
  );
}

function EmptyCandidateDiagnostics({ identification }: { identification: WorkIdentificationView }) {
  const summary = identification.sourceSummary;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">识别完成，但没有可展示候选。请优先检查搜索结果过滤信息。</p>
      <dl className="mt-3 grid gap-2 md:grid-cols-2">
        <div>
          <dt className="text-amber-700">原始搜索结果数量</dt>
          <dd>{summary?.rawResultCount ?? identification.searchResults.length}</dd>
        </div>
        <div>
          <dt className="text-amber-700">规范化候选数量</dt>
          <dd>{summary?.normalizedResultCount ?? identification.candidates.length}</dd>
        </div>
        <div>
          <dt className="text-amber-700">被过滤数量</dt>
          <dd>{summary?.filteredResultCount ?? 0}</dd>
        </div>
        <div>
          <dt className="text-amber-700">provider / baseURL host</dt>
          <dd>
            {identification.searchProvider || "-"} / {summary?.baseURLHost || "-"}
          </dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-amber-700">搜索 query</dt>
          <dd className="break-all">{identification.searchQuery || "-"}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-amber-700">主要过滤原因</dt>
          <dd>{summary?.filterReasons?.length ? summary.filterReasons.join("；") : "暂无过滤原因记录"}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-amber-700">被排除的 IP / 热度证据</dt>
          <dd>
            IP {summary?.excludedIpEvidenceCount ?? 0} 条 / 热度 {summary?.excludedHeatEvidenceCount ?? 0} 条
          </dd>
        </div>
      </dl>
    </div>
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
