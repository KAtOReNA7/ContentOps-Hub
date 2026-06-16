"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { StatusBadge, ratingTone, renameSuggestionLabel } from "@/components/status-badge";

type RatingStatus = "pending" | "running" | "success" | "failed" | "invalid" | string;
type RatingRun = {
  id: string;
  provider: string;
  model: string;
  promptVersion: string;
  status: RatingStatus;
  adopted: boolean;
  rating: string | null;
  score: number | null;
  confidence: number | null;
  renameSuggestion: string | null;
  reasonSummary: string;
  operationAdvice: string;
  riskNotes: string[];
  keyEvidence: string[];
  evidenceWeighting: Array<{ source: string; type: string; importance: string; effect: string; reason: string }>;
  missingEvidence: string[];
  missingEvidenceDetails?: Array<{ type: string; reason: string; shouldPenalize: boolean }>;
  titleOptimizationPotential: string;
  coverOptimizationPotential: string;
  hasIpAdaptationEvidence?: boolean;
  hasSocialHeatEvidence?: boolean;
  hasAuthorInfluenceEvidence?: boolean;
  searchResultAnalysis?: Array<{
    resultId: string;
    sameWorkDecision: string;
    sourceTier?: string;
    sourceCategory?: string;
    evidenceType?: string;
    claimStrength?: string;
    canAffectRating?: boolean;
    reason: string;
    extractedClaims?: string[];
  }>;
  acceptedEvidence?: Array<{
    resultId: string;
    source: string;
    sourceTier: string;
    evidenceType: string;
    claim: string;
    effect: string;
    importance: string;
    reason: string;
  }>;
  uncertainEvidence?: Array<{ resultId: string; reason: string }>;
  rejectedEvidence?: Array<{ resultId: string; reason: string }>;
  evidenceTags?: EvidenceTags;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  inputSnapshot: unknown;
  rawResponse?: unknown;
};
type EvidenceTags = {
  hasPrimaryPlatformEvidence?: boolean;
  primaryPlatforms?: string[];
  hasTrustedThirdPartyEvidence?: boolean;
  trustedThirdPartyPlatforms?: string[];
  hasAudioEvidence?: boolean;
  audioPlatforms?: string[];
  hasSocialHeatEvidence?: boolean;
  socialHeatSources?: string[];
  hasIpAdaptationEvidence?: boolean;
  ipAdaptationTypes?: string[];
  hasAuthorInfluenceEvidence?: boolean;
  authorInfluenceSources?: string[];
};
type Supplement = {
  id: string;
  sourceType: string;
  title: string;
  content: string;
  importance: string;
  evidencePlatform: string | null;
  evidenceUrl?: string | null;
};
type RunsData = {
  runs: RatingRun[];
  latestRun?: RatingRun | null;
  latestSuccessfulRun?: RatingRun | null;
  adoptedRun?: RatingRun | null;
  latestInvalidOrFailedRun?: RatingRun | null;
  legacyRating: { rating: string; score: number; label: string; provider?: string } | null;
};
type IdentificationStatus = { confirmed: boolean; confidence: number | null; hasIdentification: boolean; hasImportedAuthor: boolean };
type SearchEvidenceView = { resultId: string; title?: string; detail?: string; url?: string | null; sourceName?: string; sourcePlatform?: string; sourceTier?: number | string };

const sourceTypeOptions = [
  ["primary_platform", "首发/官方平台"],
  ["third_party_reading", "三方阅读平台"],
  ["audio_platform", "有声平台"],
  ["audio_drama_platform", "广播剧平台"],
  ["social_heat", "社媒热度"],
  ["ip_adaptation", "影视/IP证据"],
  ["ranking_sales", "榜单/销量"],
  ["author_influence", "作者影响力"],
  ["operation_note", "运营备注"],
  ["other", "其他"],
];

export function WorkRatingPanel({ identificationStatus, workId }: { identificationStatus: IdentificationStatus; workId: string }) {
  const [runs, setRuns] = useState<RatingRun[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [summary, setSummary] = useState<Omit<RunsData, "runs" | "legacyRating">>({});
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
    setSummary({
      adoptedRun: runData.adoptedRun,
      latestInvalidOrFailedRun: runData.latestInvalidOrFailedRun,
      latestRun: runData.latestRun,
      latestSuccessfulRun: runData.latestSuccessfulRun,
    });
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

  async function runRating(mode: "new" | "rerun" | "supplement") {
    setRunning(true);
    setError("");
    setMessage("");
    try {
      await request(`/api/works/${workId}/rating/run`, { method: "POST" });
      await reload();
      setMessage(mode === "supplement"
        ? "已基于当前人工补充证据重新生成 OpenAI 评级建议，请复核后再采用。"
        : "OpenAI 评级建议已生成。未点击采用前，不会覆盖当前评级。");
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setRunning(false);
    }
  }

  async function adopt(runId: string) {
    setError("");
    setMessage("");
    try {
      await request(`/api/works/${workId}/rating/runs/${runId}/adopt`, { method: "POST" });
      await reload();
      setMessage("已采用该 OpenAI 评级结果，当前评级投影已更新。");
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  async function addSupplement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await request(`/api/works/${workId}/rating-supplements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      form.reset();
      await reload();
      setMessage("补充证据已保存。可以基于补充证据重新评级。");
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  async function removeSupplement(item: Supplement) {
    if (!window.confirm(`确认删除补充证据「${item.title}」吗？`)) return;
    setError("");
    setMessage("");
    try {
      await request(`/api/works/${workId}/rating-supplements/${item.id}`, { method: "DELETE" });
      await reload();
      setMessage("补充证据已删除。");
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  const adopted = summary.adoptedRun ?? runs.find((run) => run.adopted) ?? null;
  const latestSuccess = summary.latestSuccessfulRun ?? runs.find((run) => run.status === "success") ?? null;
  const pendingSuggestion = latestSuccess && !latestSuccess.adopted ? latestSuccess : null;
  const latestProblem = summary.latestRun && (summary.latestRun.status === "invalid" || summary.latestRun.status === "failed")
    ? summary.latestRun
    : summary.latestInvalidOrFailedRun ?? null;
  const history = runs.slice(0, 10);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">OpenAI 作品价值评级中心</h2>
          <p className="mt-1 text-sm text-slate-600">正式评级只来自已人工采用的 OpenAI rating run。旧规则评级仅保留为历史参考。</p>
        </div>
        <StatusBadge tone={adopted ? "green" : "amber"}>{adopted ? "已有正式采用评级" : "未采用 OpenAI 评级"}</StatusBadge>
      </div>

      <WorkflowNotice status={identificationStatus} />
      {message ? <p className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</p> : null}
      {error ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-500">正在读取评级记录...</p> : null}

      <CurrentRatingCard adopted={adopted} legacyRating={legacyRating} />
      <RatingActionPanel hasLatest={Boolean(runs.length)} supplementCount={supplements.length} running={running} onRun={runRating} />
      {latestProblem ? <ProblemRunCard run={latestProblem} /> : null}
      {pendingSuggestion ? <PendingSuggestionCard current={adopted} run={pendingSuggestion} onAdopt={() => void adopt(pendingSuggestion.id)} onKeep={() => setMessage("已保留当前评级。待采用建议不会覆盖正式评级。")} /> : null}
      <SupplementPanel onAdd={addSupplement} onRemove={removeSupplement} supplements={supplements} />
      <RatingHistory runs={history} total={runs.length} onAdopt={(runId) => void adopt(runId)} />
      {legacyRating ? <LegacyRatingPanel legacyRating={legacyRating} /> : null}
    </section>
  );
}

function CurrentRatingCard({ adopted, legacyRating }: { adopted: RatingRun | null; legacyRating: RunsData["legacyRating"] }) {
  return (
    <div className="mt-5 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-950">当前采用评级</h3>
        {adopted ? <StatusBadge tone="green">正式 OpenAI 评级</StatusBadge> : <StatusBadge tone="amber">暂无正式 OpenAI 评级</StatusBadge>}
      </div>
      {adopted ? <RunSummary run={adopted} showDetails /> : (
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>当前作品尚未采用 OpenAI 价值评级。</p>
          {legacyRating ? <p className="rounded-md bg-stone-100 p-3 text-stone-700">存在历史规则评级：{legacyRating.rating} 级 / {legacyRating.score} 分。历史规则评级仅供参考，不参与当前正式评级。</p> : null}
        </div>
      )}
    </div>
  );
}

function RatingActionPanel({ hasLatest, onRun, running, supplementCount }: { hasLatest: boolean; running: boolean; supplementCount: number; onRun: (mode: "new" | "rerun" | "supplement") => void }) {
  return (
    <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-blue-950">OpenAI 评级操作</h3>
          <p className="mt-1 text-sm text-blue-800">主动运行会调用外部模型，可能产生费用。生成结果默认只是待采用建议，不会覆盖当前评级。</p>
          <p className="mt-1 text-xs text-blue-700">{supplementCount ? `当前已有 ${supplementCount} 条人工补充证据，重新评级会一并提交给 OpenAI。` : "当前没有人工补充证据，系统将仅基于作品信息和搜索证据重新评级。"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={running} onClick={() => onRun(hasLatest ? "rerun" : "new")} type="button">
            {running ? "评级运行中..." : hasLatest ? "基于当前信息重新评级" : "生成 OpenAI 评级"}
          </button>
          <button className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-800 disabled:opacity-50" disabled={running} onClick={() => onRun("supplement")} type="button">
            基于人工补充证据重新评级
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingSuggestionCard({ current, onAdopt, onKeep, run }: { current: RatingRun | null; run: RatingRun; onAdopt: () => void; onKeep: () => void }) {
  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-amber-950">待采用 OpenAI 评级建议</h3>
        <StatusBadge tone="amber">未采用，不覆盖当前评级</StatusBadge>
      </div>
      <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
        <CompareMetric label="评级" oldValue={current?.rating ?? "无"} newValue={run.rating ?? "-"} />
        <CompareMetric label="分数" oldValue={numberText(current?.score)} newValue={numberText(run.score)} />
        <CompareMetric label="置信度" oldValue={percentText(current?.confidence)} newValue={percentText(run.confidence)} />
      </div>
      <RunSummary run={run} showDetails />
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800" onClick={onAdopt} type="button">采用该评级结果</button>
        <button className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" onClick={onKeep} type="button">保留当前评级</button>
      </div>
    </div>
  );
}

function ProblemRunCard({ run }: { run: RatingRun }) {
  return (
    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-850">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="red">{statusLabel(run.status)}</StatusBadge>
        <h3 className="font-semibold text-red-900">{run.status === "invalid" ? "本次 OpenAI 评级结果未被采用" : "本次 OpenAI 评级未完成"}</h3>
      </div>
      <p className="mt-2">{run.errorMessage || "OpenAI 评级没有返回可采用结果。"}</p>
      <p className="mt-2 text-red-800">当前已采用评级不会被覆盖。可以重新生成评级，或补充人工证据后重新评级。</p>
      <details className="mt-3">
        <summary className="cursor-pointer font-medium">技术诊断</summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded bg-white/70 p-3 text-xs text-red-900">{JSON.stringify({ id: run.id, status: run.status, model: run.model, errorMessage: run.errorMessage, inputSnapshot: run.inputSnapshot, rawResponse: run.rawResponse }, null, 2)}</pre>
      </details>
    </div>
  );
}

function RunSummary({ run, showDetails = false }: { run: RatingRun; showDetails?: boolean }) {
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={statusTone(run.status)}>{statusLabel(run.status)}</StatusBadge>
        {run.rating ? <StatusBadge tone={ratingTone(run.rating)}>{run.rating} 级</StatusBadge> : null}
        {run.adopted ? <StatusBadge tone="green">当前采用</StatusBadge> : null}
        <span className="text-xs text-slate-500">OpenAI · {run.model || "未记录模型"} · {formatDate(run.updatedAt)}</span>
      </div>
      {run.status === "success" ? (
        <>
          <p className="mt-3 text-sm text-slate-700">{run.reasonSummary || "暂无评级摘要。"}</p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
            <Metric label="分数" value={numberText(run.score)} />
            <Metric label="置信度" value={percentText(run.confidence)} />
            <Metric label="多书名建议" value={renameSuggestionLabel(run.renameSuggestion)} />
            <Metric label="Prompt" value={run.promptVersion} />
          </div>
          <List title="关键证据" values={run.keyEvidence} />
          <List title="风险提示" values={run.riskNotes} />
          <p className="mt-3 text-sm text-blue-800">运营建议：{run.operationAdvice || "暂无"}</p>
          <p className="mt-2 text-sm text-slate-600">标题优化潜力：{potentialLabel(run.titleOptimizationPotential)} · 封面优化潜力：{potentialLabel(run.coverOptimizationPotential)}</p>
          {showDetails ? <RatingEvidenceAnalysis run={run} /> : (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-blue-800">查看完整证据分析</summary>
              <RatingEvidenceAnalysis run={run} />
            </details>
          )}
        </>
      ) : null}
    </div>
  );
}

function RatingEvidenceAnalysis({ run }: { run: RatingRun }) {
  const lookup = useMemo(() => buildEvidenceLookup(run.inputSnapshot), [run.inputSnapshot]);
  const accepted = run.acceptedEvidence ?? [];
  const uncertain = run.uncertainEvidence ?? [];
  const rejected = run.rejectedEvidence ?? [];
  return (
    <div className="mt-4 space-y-3">
      <SourceSummary diagnostics={ratingDiagnostics(run.inputSnapshot)} />
      <EvidenceTagsSummary tags={run.evidenceTags} />
      <div className="rounded-md border border-green-100 bg-green-50 p-3">
        <p className="text-sm font-semibold text-green-950">已采信证据 acceptedEvidence</p>
        <p className="mt-1 text-xs text-green-800">这些证据被 OpenAI 判断为与当前作品相关，并参与本次价值评级。</p>
        <div className="mt-3 space-y-2">{accepted.length ? accepted.map((item) => <AcceptedEvidenceItem item={item} key={`${item.resultId}-${item.claim}`} />) : <EmptyText text="暂无已采信证据。" />}</div>
      </div>
      <details className="rounded-md border border-amber-100 bg-amber-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-amber-950">不确定证据 uncertainEvidence ({uncertain.length})</summary>
        <p className="mt-1 text-xs text-amber-800">这些结果可能与当前作品相关，但证据不足，不能作为核心评级依据。</p>
        <PartitionList items={uncertain} lookup={lookup} tone="amber" />
      </details>
      <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">已拒绝证据 rejectedEvidence ({rejected.length})</summary>
        <p className="mt-1 text-xs text-slate-600">这些结果被判断为无关、重名、来源不可靠或不应参与评级。</p>
        <PartitionList items={rejected} lookup={lookup} tone="slate" />
      </details>
      <MissingEvidencePanel run={run} />
      <details className="rounded-md border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">搜索结果逐条理解 ({run.searchResultAnalysis?.length ?? 0})</summary>
        <div className="mt-3 space-y-2">{(run.searchResultAnalysis ?? []).map((item) => <SearchAnalysisItem item={item} key={item.resultId} lookup={lookup} />)}</div>
      </details>
      <details className="rounded-md border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">技术诊断：inputSnapshot / rawResponse</summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify({ inputSnapshot: run.inputSnapshot, rawResponse: run.rawResponse }, null, 2)}</pre>
      </details>
    </div>
  );
}

function AcceptedEvidenceItem({ item }: { item: NonNullable<RatingRun["acceptedEvidence"]>[number] }) {
  return (
    <div className={`rounded-md border p-3 text-sm ${item.importance === "high" ? "border-green-300 bg-white" : "border-green-100 bg-white/70"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={item.importance === "high" ? "green" : "stone"}>{importanceLabel(item.importance)}</StatusBadge>
        <StatusBadge tone={effectTone(item.effect)}>{effectLabel(item.effect)}</StatusBadge>
        <span className="font-medium text-slate-950">{item.source}</span>
        <span className="text-xs text-slate-500">{tierLabel(item.sourceTier)} · {evidenceTypeLabel(item.evidenceType)}</span>
      </div>
      <p className="mt-2 text-slate-800">{item.claim}</p>
      <p className="mt-1 text-xs text-slate-600">{item.reason}</p>
    </div>
  );
}

function PartitionList({ items, lookup, tone }: { items: Array<{ resultId: string; reason: string }>; lookup: Map<string, SearchEvidenceView>; tone: "amber" | "slate" }) {
  return <div className="mt-3 space-y-2">{items.length ? items.map((item) => {
    const source = lookup.get(item.resultId);
    return <div className={`rounded-md bg-white p-3 text-sm ${tone === "amber" ? "text-amber-950" : "text-slate-700"}`} key={`${item.resultId}-${item.reason}`}>
      <p className="font-medium">{source?.title || item.resultId}</p>
      <p className="mt-1 text-xs">{source?.sourceName || source?.sourcePlatform || "来源未记录"}{source?.url ? ` · ${source.url}` : ""}</p>
      <p className="mt-1">{item.reason}</p>
    </div>;
  }) : <EmptyText text="暂无记录。" />}</div>;
}

function SearchAnalysisItem({ item, lookup }: { item: NonNullable<RatingRun["searchResultAnalysis"]>[number]; lookup: Map<string, SearchEvidenceView> }) {
  const source = lookup.get(item.resultId);
  return (
    <div className="rounded-md bg-slate-50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={item.sameWorkDecision === "matched" ? "green" : item.sameWorkDecision === "rejected" ? "red" : "amber"}>{sameWorkLabel(item.sameWorkDecision)}</StatusBadge>
        <span className="font-medium text-slate-900">{source?.title || item.resultId}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{source?.sourceName || source?.sourcePlatform || "来源未记录"}{source?.url ? ` · ${source.url}` : ""}</p>
      <p className="mt-2 text-slate-700">{item.reason}</p>
      {item.extractedClaims?.length ? <p className="mt-1 text-xs text-slate-500">提取声明：{item.extractedClaims.join("；")}</p> : null}
    </div>
  );
}

function MissingEvidencePanel({ run }: { run: RatingRun }) {
  const items = run.missingEvidenceDetails?.length
    ? run.missingEvidenceDetails
    : run.missingEvidence.map((reason) => ({ type: "other", reason, shouldPenalize: false }));
  return (
    <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
      <p className="text-sm font-semibold text-blue-950">缺失证据 missingEvidence</p>
      <p className="mt-1 text-xs text-blue-800">证据缺失不等于负面表现。以下内容只是建议后续补充的信息，不会自动扣分。</p>
      <div className="mt-2 space-y-2">{items.length ? items.map((item) => <div className="rounded-md bg-white/80 p-2 text-sm text-blue-900" key={`${item.type}-${item.reason}`}><StatusBadge tone={item.shouldPenalize ? "red" : "blue"}>{item.shouldPenalize ? "可能扣分" : "不扣分"}</StatusBadge><span className="ml-2">{item.reason}</span></div>) : <EmptyText text="暂无缺失证据提示。" />}</div>
      {!run.hasIpAdaptationEvidence ? <p className="mt-2 text-sm text-blue-900">未发现可确认 IP 改编证据。</p> : null}
    </div>
  );
}

function EvidenceTagsSummary({ tags }: { tags?: EvidenceTags }) {
  const rows = [
    { label: "官方/首发平台证据", enabled: tags?.hasPrimaryPlatformEvidence, values: tags?.primaryPlatforms },
    { label: "可信三方平台证据", enabled: tags?.hasTrustedThirdPartyEvidence, values: tags?.trustedThirdPartyPlatforms },
    { label: "有声平台证据", enabled: tags?.hasAudioEvidence, values: tags?.audioPlatforms },
    { label: "社媒热度证据", enabled: tags?.hasSocialHeatEvidence, values: tags?.socialHeatSources },
    { label: "IP 改编证据", enabled: tags?.hasIpAdaptationEvidence, values: tags?.ipAdaptationTypes, emptyText: "未发现可确认 IP 改编证据。" },
    { label: "作者影响力证据", enabled: tags?.hasAuthorInfluenceEvidence, values: tags?.authorInfluenceSources },
  ];
  return (
    <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
      <p className="text-sm font-semibold text-blue-950">证据标签摘要 evidenceTags</p>
      <p className="mt-1 text-xs text-blue-800">标签只展示 OpenAI 从 acceptedEvidence 中确认的证据，不展示本地 preliminarySignals。</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">{rows.map((row) => (
        <div className="rounded-md bg-white/80 p-2 text-sm" key={row.label}>
          <div className="flex items-center gap-2"><StatusBadge tone={row.enabled ? "green" : "stone"}>{row.enabled ? "已发现" : "未确认"}</StatusBadge><span className="font-medium text-slate-900">{row.label}</span></div>
          <p className="mt-1 text-xs text-slate-600">{row.values?.length ? Array.from(new Set(row.values)).join("、") : row.emptyText || "暂无明确证据。"}</p>
        </div>
      ))}</div>
    </div>
  );
}

function SupplementPanel({ onAdd, onRemove, supplements }: { supplements: Supplement[]; onAdd: (event: FormEvent<HTMLFormElement>) => void; onRemove: (item: Supplement) => void }) {
  return (
    <details className="mt-5 rounded-lg border border-slate-200 p-4" open>
      <summary className="cursor-pointer font-medium text-slate-950">人工补充评级证据 ({supplements.length})</summary>
      <p className="mt-3 text-sm text-slate-600">当搜索结果缺失重要证据，或当前评级明显不合理时，可以补充平台热度、首发站点信息、榜单、销量、影视/IP官宣、作者影响力、社媒传播、有声平台表现等信息。重新评级时，OpenAI 会综合这些补充证据生成新的评级建议。</p>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onAdd}>
        <select className="rounded-md border p-2 text-sm" defaultValue="primary_platform" name="sourceType">{sourceTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select className="rounded-md border p-2 text-sm" defaultValue="medium" name="importance"><option value="high">高权重</option><option value="medium">中权重</option><option value="low">低权重</option></select>
        <input className="rounded-md border p-2 text-sm" name="title" placeholder="证据标题" required />
        <input className="rounded-md border p-2 text-sm" name="evidencePlatform" placeholder="来源平台（可选）" />
        <input className="rounded-md border p-2 text-sm" name="evidenceUrl" placeholder="证据链接（可选）" type="url" />
        <textarea className="rounded-md border p-2 text-sm md:col-span-2" name="content" placeholder="证据内容" required rows={3} />
        <button className="w-fit rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700" type="submit">保存补充证据</button>
      </form>
      <div className="mt-4 space-y-2">{supplements.length ? supplements.map((item) => (
        <div className={`flex flex-col justify-between gap-3 rounded-md p-3 text-sm md:flex-row ${item.importance === "high" ? "border border-green-200 bg-green-50" : "bg-slate-50"}`} key={item.id}>
          <div>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={item.importance === "high" ? "green" : "stone"}>{importanceLabel(item.importance)}</StatusBadge><b>{item.title}</b><span className="text-xs text-slate-500">{sourceTypeLabel(item.sourceType)}{item.evidencePlatform ? ` · ${item.evidencePlatform}` : ""}</span></div>
            <p className="mt-1 text-slate-600">{item.content}</p>
            {item.evidenceUrl ? <a className="mt-1 block break-all text-xs text-blue-700" href={item.evidenceUrl} rel="noreferrer" target="_blank">{item.evidenceUrl}</a> : null}
          </div>
          <button className="self-start text-red-700" onClick={() => onRemove(item)} type="button">删除</button>
        </div>
      )) : <EmptyText text="暂无人工补充证据。" />}</div>
    </details>
  );
}

function RatingHistory({ onAdopt, runs, total }: { runs: RatingRun[]; total: number; onAdopt: (runId: string) => void }) {
  return (
    <details className="mt-5 rounded-lg border border-slate-200 p-4">
      <summary className="cursor-pointer font-medium text-slate-950">OpenAI Rating Runs 历史 ({total}，显示最近 10 条)</summary>
      <div className="mt-3 space-y-3">{runs.length ? runs.map((run) => (
        <div className={`rounded-md border p-3 ${run.adopted ? "border-green-300 bg-green-50" : "border-slate-200"}`} key={run.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone(run.status)}>{statusLabel(run.status)}</StatusBadge>
              {run.rating ? <StatusBadge tone={ratingTone(run.rating)}>{run.rating} 级</StatusBadge> : null}
              {run.adopted ? <StatusBadge tone="green">当前采用</StatusBadge> : null}
              <span className="text-xs text-slate-500">{formatDate(run.createdAt)} · OpenAI · {run.model}</span>
            </div>
            {run.status === "success" && !run.adopted ? <button className="rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm text-green-800" onClick={() => onAdopt(run.id)} type="button">采用该评级结果</button> : null}
          </div>
          <p className="mt-2 text-sm text-slate-700">分数 {numberText(run.score)} · 置信度 {percentText(run.confidence)} · 多书名建议 {renameSuggestionLabel(run.renameSuggestion)}</p>
          {run.errorMessage ? <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-800">{run.errorMessage}</p> : null}
          <details className="mt-2 text-sm text-slate-700">
            <summary className="cursor-pointer">查看详情与诊断</summary>
            <RunSummary run={run} />
          </details>
        </div>
      )) : <EmptyText text="暂无 OpenAI rating run 历史。" />}</div>
    </details>
  );
}

function LegacyRatingPanel({ legacyRating }: { legacyRating: NonNullable<RunsData["legacyRating"]> }) {
  return (
    <details className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <summary className="cursor-pointer font-medium text-stone-800">legacy_rules 历史规则评级</summary>
      <p className="mt-3 text-sm text-stone-700">历史规则评级，仅供参考，不参与当前正式评级。</p>
      <p className="mt-2 text-sm text-stone-700">{legacyRating.rating} 级 / {legacyRating.score} 分</p>
    </details>
  );
}

function CompareMetric({ label, newValue, oldValue }: { label: string; oldValue: string; newValue: string }) {
  return <div className="rounded-md bg-white/70 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-600">当前：{oldValue}</p><p className="text-sm font-semibold text-amber-950">建议：{newValue}</p></div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-950">{value}</p></div>; }
function List({ title, values }: { title: string; values: string[] }) { return <div className="mt-3"><p className="text-sm font-medium text-slate-900">{title}</p>{values.length ? <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">{values.map((value, index) => <li key={`${value}-${index}`}>{value}</li>)}</ul> : <EmptyText text="暂无记录。" />}</div>; }
function EmptyText({ text }: { text: string }) { return <p className="text-sm text-slate-500">{text}</p>; }
function SourceSummary({ diagnostics }: { diagnostics: Record<string, number> }) { return <div className="grid gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3"><span>官方/首发来源：{diagnostics.tier1Count ?? 0} 条</span><span>三方阅读平台：{diagnostics.tier2Count ?? 0} 条</span><span>有声/广播剧平台：{diagnostics.tier3Count ?? 0} 条</span><span>社媒/IP 来源：{diagnostics.tier4Count ?? 0} 条</span><span>普通低权重来源：{diagnostics.tier5Count ?? 0} 条</span><span>已过滤盗版/采集：{diagnostics.piracyFilteredCount ?? 0} 条</span></div>; }

function ratingDiagnostics(snapshot: unknown): Record<string, number> { return isRecord(snapshot) && isRecord(snapshot.context) && isRecord(snapshot.context.sourceDiagnostics) ? snapshot.context.sourceDiagnostics as Record<string, number> : {}; }
function buildEvidenceLookup(snapshot: unknown) {
  const map = new Map<string, SearchEvidenceView>();
  if (isRecord(snapshot) && isRecord(snapshot.context) && Array.isArray(snapshot.context.searchEvidence)) {
    for (const item of snapshot.context.searchEvidence) {
      if (isRecord(item) && typeof item.resultId === "string") map.set(item.resultId, item as SearchEvidenceView);
    }
  }
  return map;
}
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
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error([payload.message, ...(payload.errors || [])].filter(Boolean).join(" | "));
  return payload.data as T;
}
function messageOf(error: unknown) { return error instanceof Error ? error.message : "未知错误"; }
function numberText(value: number | null | undefined) { return value === null || value === undefined ? "-" : String(Math.round(value * 10) / 10); }
function percentText(value: number | null | undefined) { return value === null || value === undefined ? "-" : `${Math.round(value * 100)}%`; }
function formatDate(value: string) { return new Date(value).toLocaleString("zh-CN", { hour12: false }); }
function statusLabel(value: string) { return ({ failed: "失败", invalid: "未通过校验", pending: "进行中", running: "进行中", success: "成功" } as Record<string, string>)[value] ?? value; }
function statusTone(value: string) { return value === "success" ? "green" : value === "failed" || value === "invalid" ? "red" : "amber"; }
function effectLabel(value: string) { return ({ decrease: "负向", increase: "正向", neutral: "中性" } as Record<string, string>)[value] ?? value; }
function effectTone(value: string) { return value === "increase" ? "green" : value === "decrease" ? "red" : "stone"; }
function importanceLabel(value: string) { return ({ high: "高权重", low: "低权重", medium: "中权重" } as Record<string, string>)[value] ?? value; }
function tierLabel(value: string) { return ({ tier0_filtered: "已过滤来源", tier1_primary: "官方/首发来源", tier2_trusted_distribution: "可信三方平台", tier3_audio_drama: "有声/广播剧平台", tier4_social_ip: "社媒/IP来源", tier5_low_weight: "普通低权重网页" } as Record<string, string>)[value] ?? value; }
function evidenceTypeLabel(value: string) { return ({ audio_performance: "音频表现", author_profile: "作者影响力", comments: "评论口碑", ip_adaptation: "IP改编", platform_presence: "平台存在", publication: "出版发行", ranking: "榜单", review: "评价", sales: "销量", social_heat: "社媒热度" } as Record<string, string>)[value] ?? value; }
function sameWorkLabel(value: string) { return ({ matched: "同作品", rejected: "已拒绝", uncertain: "不确定" } as Record<string, string>)[value] ?? value; }
function potentialLabel(value: string) { return ({ high: "高", low: "低", medium: "中" } as Record<string, string>)[value] ?? value; }
function sourceTypeLabel(value: string) { return sourceTypeOptions.find(([key]) => key === value)?.[1] ?? value; }
