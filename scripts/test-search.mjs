import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getSearchProviderConfig, identifyWorkWithConfiguredProvider } from "../src/lib/adapters/search-adapter.ts";

loadEnvFile(".env");
loadEnvFile(".env.local");

const samples = [
  { label: "黑暗生存游戏 曹操不迟到", title: "黑暗生存游戏", author: "曹操不迟到" },
  { label: "一手遮天 一手捶地", title: "一手遮天 一手捶地", author: null },
  { label: "一手遮天 一手捶地 芒果TV 影视原著", title: "一手遮天 一手捶地", author: null },
];
const config = getSearchProviderConfig();

console.log(`SEARCH_PROVIDER=${config.provider}`);
console.log(`SEARCH_BASE_URL_HOST=${safeHost(config.baseUrl) ?? "-"}`);

for (const sample of samples) {
  const result = await identifyWorkWithConfiguredProvider({
    title: sample.title,
    author: sample.author,
    intro: "搜索解析测试样例，用于验证平台归一化、IP 证据和热度证据。",
    category: "小说",
    coverFileName: null,
    remark: null,
    externalId: null,
  });
  const summary = result.sourceSummary;

  console.log(`\n=== ${sample.label} ===`);
  console.log(`query=${result.searchQuery}`);
  console.log(`provider=${result.searchProvider}`);
  console.log(`baseURLHost=${summary.baseURLHost ?? "-"}`);
  console.log(`rawResultCount=${summary.rawResultCount ?? result.searchResults.length}`);
  console.log(`validCandidateCount=${summary.normalizedResultCount ?? result.candidates.length}`);
  console.log(`filteredResultCount=${summary.filteredResultCount ?? 0}`);
  console.log(`relevanceGatePassed=${result.candidates.length}`);
  console.log(`sourceCategorySummary=${formatCategorySummary(summary.categorySummary)}`);
  console.log(`canonicalSourceSummary=${formatPlatformSummary(summary.platformSummary)}`);
  console.log(`ipEvidenceCount=${summary.ipEvidenceCount ?? 0}`);
  console.log(`heatEvidenceCount=${summary.heatEvidenceCount ?? 0}`);
  console.log(`excludedIpEvidenceCount=${summary.excludedIpEvidenceCount ?? 0}`);
  console.log(`excludedHeatEvidenceCount=${summary.excludedHeatEvidenceCount ?? 0}`);
  console.log(`filterReasons=${summary.filterReasons?.length ? summary.filterReasons.join("；") : "-"}`);

  for (const [index, candidate] of result.candidates.slice(0, 5).entries()) {
    console.log(`\n#${index + 1}`);
    console.log(`title=${candidate.title}`);
    console.log(`author=${candidate.author}`);
    console.log(`canonicalSourceName=${candidate.canonicalSourceName ?? candidate.sourceName ?? candidate.platform}`);
    console.log(`sourceCategory=${candidate.sourceCategory ?? candidate.sourceType ?? "unknown"}`);
    console.log(`relevanceScore=${candidate.relevanceScore ?? "-"}`);
    console.log(`valueSignalScore=${candidate.valueSignalScore ?? "-"}`);
    console.log(`url=${candidate.url ?? "-"}`);
    console.log(`snippet=${(candidate.snippet ?? candidate.summary).slice(0, 120)}`);
    console.log(`ipEvidence=${formatEvidence(candidate.ipEvidence?.map((item) => item.evidenceText))}`);
    console.log(`heatEvidence=${formatEvidence(candidate.heatEvidence?.map((item) => item.evidenceText))}`);
  }

  if (summary.excludedResults?.length) {
    console.log("\nfilteredResults=");
    for (const [index, item] of summary.excludedResults.slice(0, 5).entries()) {
      console.log(
        `#${index + 1} title=${item.title} source=${item.canonicalSourceName ?? item.sourceName} relevance=${item.relevanceScore} value=${item.valueSignalScore} reasons=${item.filterReasons.join("/")}`,
      );
    }
  }
}

function loadEnvFile(fileName) {
  const path = resolve(fileName);

  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function safeHost(value) {
  if (!value) return null;

  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function formatCategorySummary(items) {
  return items?.length ? items.map((item) => `${item.sourceCategory}:${item.platformCount}平台/${item.resultCount}条`).join("；") : "-";
}

function formatPlatformSummary(items) {
  return items?.length ? items.slice(0, 8).map((item) => `${item.canonicalSourceName}:${item.resultCount}`).join("；") : "-";
}

function formatEvidence(items) {
  return items?.length ? items.join("；").slice(0, 160) : "-";
}
