"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { StatusBadge, ratingTone } from "@/components/status-badge";

type RatingRun = {
  id: string; provider: string; model: string; promptVersion: string; status: string; adopted: boolean;
  rating: string | null; score: number | null; confidence: number | null; renameSuggestion: string | null;
  reasonSummary: string; operationAdvice: string; riskNotes: string[]; keyEvidence: string[];
  evidenceWeighting: Array<{ source: string; type: string; importance: string; effect: string; reason: string }>;
  missingEvidence: string[]; titleOptimizationPotential: string; coverOptimizationPotential: string;
  hasIpAdaptationEvidence?: boolean; hasSocialHeatEvidence?: boolean; hasAuthorInfluenceEvidence?: boolean;
  searchResultAnalysis?: Array<{ resultId: string; sameWorkDecision: string; reason: string }>;
  acceptedEvidence?: Array<{ resultId: string; source: string; claim: string; importance: string }>;
  uncertainEvidence?: Array<{ resultId: string; reason: string }>;
  rejectedEvidence?: Array<{ resultId: string; reason: string }>;
  evidenceTags?: { primaryPlatforms?: string[]; trustedThirdPartyPlatforms?: string[]; audioPlatforms?: string[]; socialHeatSources?: string[]; ipAdaptationTypes?: string[]; authorInfluenceSources?: string[] };
  errorMessage: string | null; createdAt: string; updatedAt: string; inputSnapshot: unknown;
};
type Supplement = { id: string; sourceType: string; title: string; content: string; importance: string; evidencePlatform: string | null };
type RunsData = { runs: RatingRun[]; legacyRating: { rating: string; score: number; label: string } | null };
type IdentificationStatus = { confirmed: boolean; confidence: number | null; hasIdentification: boolean; hasImportedAuthor: boolean };

export function WorkRatingPanel({ identificationStatus, workId }: { identificationStatus: IdentificationStatus; workId: string }) {
  const [runs, setRuns] = useState<RatingRun[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [legacyRating, setLegacyRating] = useState<RunsData["legacyRating"]>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const reload = useCallback(async () => {
    const [runData, supplementData] = await Promise.all([
      request<RunsData>(`/api/works/${workId}/rating/runs`),
      request<Supplement[]>(`/api/works/${workId}/rating-supplements`),
    ]);
    setRuns(runData.runs);
    setLegacyRating(runData.legacyRating);
    setSupplements(supplementData);
  }, [workId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try { await reload(); }
      catch (caught) { if (!cancelled) setError(messageOf(caught)); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [reload]);

  async function runRating() {
    setRunning(true); setError(""); setMessage("");
    try {
      await request(`/api/works/${workId}/rating/run`, { method: "POST" });
      await reload();
      setMessage("OpenAI 评级已完成。请核对结果后人工采用。");
    } catch (caught) { setError(messageOf(caught)); }
    finally { setRunning(false); }
  }

  async function adopt(runId: string) {
    setError(""); setMessage("");
    try {
      await request(`/api/works/${workId}/rating/runs/${runId}/adopt`, { method: "POST" });
      await reload();
      setMessage("已采用该 OpenAI 评级，后续生成和导出将使用这条结果。");
    } catch (caught) { setError(messageOf(caught)); }
  }

  async function addSupplement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await request(`/api/works/${workId}/rating-supplements`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      event.currentTarget.reset(); await reload(); setMessage("补充证据已保存。");
    } catch (caught) { setError(messageOf(caught)); }
  }

  async function removeSupplement(id: string) {
    await request(`/api/works/${workId}/rating-supplements/${id}`, { method: "DELETE" });
    await reload();
  }

  const latest = runs[0] ?? null;
  const adopted = runs.find((run) => run.adopted) ?? null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">OpenAI 作品价值评级中心</h2>
          <p className="mt-1 text-sm text-slate-600">正式评级只由 OpenAI 生成。本地规则仅保留为辅助校验，不会直接写入最终评级。</p>
        </div>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={running} onClick={runRating} type="button">
          {running ? "OpenAI 评级中..." : latest ? "重新运行 OpenAI 评级" : "运行 OpenAI 评级"}
        </button>
      </div>

      <WorkflowNotice status={identificationStatus} />
      {legacyRating ? <p className="mt-3 rounded-md bg-stone-100 p-3 text-sm text-stone-700">历史规则评级，仅供参考，不参与当前正式评级：{legacyRating.rating} 级 / {legacyRating.score} 分。</p> : null}
      {message ? <p className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</p> : null}
      {error ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-500">正在读取评级记录...</p> : null}

      {adopted ? <div className="mt-5"><h3 className="text-sm font-semibold text-slate-950">当前已采用评级</h3><div className="mt-2"><RunCard onAdopt={() => void adopt(adopted.id)} run={adopted} /></div></div> : !loading ? <p className="mt-4 text-sm text-slate-500">当前作品尚未生成并采用 OpenAI 价值评级。</p> : null}
      {latest && latest.id !== adopted?.id ? <div className="mt-5"><h3 className="text-sm font-semibold text-slate-950">最新待采用建议</h3><div className="mt-2"><RunCard onAdopt={() => void adopt(latest.id)} run={latest} /></div></div> : null}

      <details className="mt-5 rounded-md border border-slate-200 p-4">
        <summary className="cursor-pointer font-medium text-slate-950">OpenAI 评级历史 ({runs.length})</summary>
        <div className="mt-3 space-y-3">{runs.map((run) => <RunCard compact key={run.id} onAdopt={() => void adopt(run.id)} run={run} />)}</div>
      </details>

      <details className="mt-5 rounded-md border border-slate-200 p-4">
        <summary className="cursor-pointer font-medium text-slate-950">人工补充证据 ({supplements.length})</summary>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={addSupplement}>
          <input className="rounded-md border p-2 text-sm" name="title" placeholder="证据标题" required />
          <select className="rounded-md border p-2 text-sm" defaultValue="medium" name="importance"><option value="high">高权重</option><option value="medium">中权重</option><option value="low">低权重</option></select>
          <input className="rounded-md border p-2 text-sm" name="evidencePlatform" placeholder="来源平台（可选）" />
          <input className="rounded-md border p-2 text-sm" name="evidenceUrl" placeholder="证据链接（可选）" />
          <input className="rounded-md border p-2 text-sm" name="sourceType" placeholder="来源类型，例如人工核验" defaultValue="manual" />
          <textarea className="rounded-md border p-2 text-sm md:col-span-2" name="content" placeholder="证据内容" required />
          <button className="w-fit rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" type="submit">保存补充证据</button>
        </form>
        <div className="mt-4 space-y-2">{supplements.map((item) => <div className="flex justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm" key={item.id}><div><b>{item.title}</b><p className="mt-1 text-slate-600">{item.content}</p></div><button className="text-red-700" onClick={() => void removeSupplement(item.id)} type="button">删除</button></div>)}</div>
      </details>
    </section>
  );
}

function RunCard({ compact = false, onAdopt, run }: { compact?: boolean; onAdopt: () => void; run: RatingRun }) {
  const diagnostics = ratingDiagnostics(run.inputSnapshot);
  const filteredOut = filteredResults(run.inputSnapshot);
  return <div className={`rounded-md border p-4 ${run.adopted ? "border-green-300 bg-green-50" : "border-slate-200"}`}>
    <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={run.status === "success" ? "green" : run.status === "failed" || run.status === "invalid" ? "red" : "amber"}>{run.status}</StatusBadge>{run.rating ? <StatusBadge tone={ratingTone(run.rating)}>{run.rating} 级</StatusBadge> : null}{run.adopted ? <StatusBadge tone="green">已采用</StatusBadge> : null}<span className="text-xs text-slate-500">provider=openai · {run.model}</span></div>
    {run.status === "failed" || run.status === "invalid" ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p className="font-medium">{run.status === "invalid" ? "本次 OpenAI 评级结果未被采用" : "本次 OpenAI 评级未完成"}</p><p className="mt-1">{run.errorMessage}</p><p className="mt-2 text-red-700">当前已采用评级不会被覆盖。可以重新生成评级，或补充人工证据后重新评级。</p></div> : null}
    {run.status === "success" ? <><p className="mt-3 text-sm text-slate-700">{run.reasonSummary}</p><p className="mt-2 text-sm font-medium text-slate-900">分数 {run.score}/100 · 置信度 {Math.round((run.confidence ?? 0) * 100)}%</p>{!compact ? <><SourceSummary diagnostics={diagnostics} /><EvidencePartitionSummary run={run} />{run.hasIpAdaptationEvidence ? null : <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">未发现可确认 IP 改编证据。文学平台证据不代表影视 / IP 改编。</p>}<List title="OpenAI 已采信证据" values={run.keyEvidence} /><List title="风险与不确定证据" values={run.riskNotes} /><div className="mt-3 rounded-md bg-blue-50 p-3 text-sm text-blue-800"><p className="font-medium">证据缺失不等于负面表现</p><List title="" values={run.missingEvidence} /></div><p className="mt-3 text-sm text-blue-800">运营建议：{run.operationAdvice}</p><p className="mt-2 text-sm text-slate-600">标题优化潜力：{run.titleOptimizationPotential} · 封面优化潜力：{run.coverOptimizationPotential}</p><details className="mt-3 text-sm text-slate-600"><summary className="cursor-pointer">查看证据权重</summary><pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(run.evidenceWeighting, null, 2)}</pre></details><details className="mt-2 text-sm text-slate-600"><summary className="cursor-pointer">查看已过滤 / 不参与评级结果 ({filteredOut.length})</summary><pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(filteredOut, null, 2)}</pre></details></> : null}{!run.adopted ? <button className="mt-3 rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm text-green-800" onClick={onAdopt} type="button">采用该评级</button> : null}</> : null}
  </div>;
}
function List({ title, values }: { title: string; values: string[] }) { return <div className="mt-3"><p className="text-sm font-medium text-slate-900">{title}</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">{values.map((value) => <li key={value}>{value}</li>)}</ul></div>; }
function SourceSummary({ diagnostics }: { diagnostics: Record<string, number> }) { return <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3"><span>首发/官方来源：{diagnostics.tier1Count ?? 0} 条</span><span>三方阅读平台：{diagnostics.tier2Count ?? 0} 条</span><span>有声/广播剧平台：{diagnostics.tier3Count ?? 0} 条</span><span>社媒/IP 来源：{diagnostics.tier4Count ?? 0} 条</span><span>普通低权重来源：{diagnostics.tier5Count ?? 0} 条</span><span>已过滤盗版/采集：{diagnostics.piracyFilteredCount ?? 0} 条</span></div>; }
function EvidencePartitionSummary({ run }: { run: RatingRun }) {
  const tags = run.evidenceTags;
  const tagValues = [...(tags?.primaryPlatforms ?? []), ...(tags?.trustedThirdPartyPlatforms ?? []), ...(tags?.audioPlatforms ?? []), ...(tags?.socialHeatSources ?? []), ...(tags?.ipAdaptationTypes ?? []), ...(tags?.authorInfluenceSources ?? [])];
  return <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900"><div className="grid gap-2 sm:grid-cols-3"><span>已采信证据：{run.acceptedEvidence?.length ?? 0} 条</span><span>不确定证据：{run.uncertainEvidence?.length ?? 0} 条</span><span>已拒绝证据：{run.rejectedEvidence?.length ?? 0} 条</span></div><p className="mt-2">OpenAI 证据标签：{tagValues.length ? Array.from(new Set(tagValues)).join("、") : "暂无已确认标签"}</p></div>;
}
function ratingDiagnostics(snapshot: unknown): Record<string, number> { return isRecord(snapshot) && isRecord(snapshot.context) && isRecord(snapshot.context.sourceDiagnostics) ? snapshot.context.sourceDiagnostics as Record<string, number> : {}; }
function filteredResults(snapshot: unknown): unknown[] { return isRecord(snapshot) && isRecord(snapshot.context) && Array.isArray(snapshot.context.filteredOutSummary) ? snapshot.context.filteredOutSummary : []; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function WorkflowNotice({ status }: { status: IdentificationStatus }) {
  const text = !status.hasImportedAuthor
    ? "基础信息缺少作者。仍可运行 OpenAI 评级，但搜索匹配置信度会降低；建议先补充作品作者。"
    : !status.hasIdentification
      ? "尚未进行作品识别。仍可运行 OpenAI 评级，但证据不足时模型应降低置信度。"
      : status.confirmed
        ? "已存在历史人工确认信息。正式评级仍以作品基础信息中的书名和作者为权威基准。"
        : "已完成作品识别。人工确认不是评级前置条件，正式评级以作品基础信息中的书名和作者为权威基准。";
  return <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">{text}</p>;
}
async function request<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init); const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error([payload.message, ...(payload.errors || [])].filter(Boolean).join(" | "));
  return payload.data as T;
}
function messageOf(error: unknown) { return error instanceof Error ? error.message : "未知错误"; }
