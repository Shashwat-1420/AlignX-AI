/*
Create a lightweight heuristic SMART goal analysis utility.
*/

export type RiskLabel = "on_track" | "at_risk" | "off_track";

export interface SmartAnalysis {
	title: string;
	description: string;
	combinedText: string;
	isVague: boolean;
	hasMeasurableLanguage: boolean;
	hasTimeBoundLanguage: boolean;
	qualityScore: number;
	riskLabel: RiskLabel;
	suggestions: string[];
	smartRewrite: string;
}

const VAGUE_WORDS = [
	"improve",
	"increase",
	"enhance",
	"optimize",
	"grow",
	"boost",
	"better",
	"more",
	"less",
	"sales",
	"performance",
	"efficiency",
	"quality",
	"engagement",
];

const ACTION_VERBS = [
	"increase",
	"reduce",
	"decrease",
	"launch",
	"deliver",
	"implement",
	"achieve",
	"improve",
	"expand",
	"grow",
	"complete",
	"raise",
];

const TIME_PATTERNS = [
	/\bQ[1-4]\b/i,
	/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i,
	/\b(?:week|month|quarter|year|by|before|end of|deadline)\b/i,
	/\b\d{4}\b/,
	/\bin\s+\d+\s+(?:days?|weeks?|months?|quarters?|years?)\b/i,
	/\bby\s+(?:the\s+)?(?:end of\s+)?(?:this|next)\s+(?:month|quarter|year|week)\b/i,
];

const MEASURABLE_PATTERNS = [
	/\b\d+(?:\.\d+)?\s?%\b/,
	/\b\d+(?:\.\d+)?\b/,
	/\b(?:kpi|metric|target|goal|revenue|users|customers|leads|conversion|retention|churn|sla)\b/i,
];

function normalizeText(title: string, description: string): string {
	return `${title || ""} ${description || ""}`.trim();
}

function hasAnyPattern(text: string, patterns: RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(text));
}

function countKeywords(text: string, keywords: string[]): number {
	return keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? 1 : 0), 0);
}

function inferActionVerb(text: string): string {
	for (const verb of ACTION_VERBS) {
		if (text.includes(verb)) return verb;
	}
	return "increase";
}

function inferMetric(text: string): string {
	if (text.includes("sales") || text.includes("revenue")) return "revenue";
	if (text.includes("lead")) return "qualified leads";
	if (text.includes("customer") || text.includes("user")) return "customer count";
	if (text.includes("conversion")) return "conversion rate";
	if (text.includes("retention")) return "retention rate";
	return "target metric";
}

function inferTimeframe(text: string): string {
	if (/\bq1\b/i.test(text)) return "Q1";
	if (/\bq2\b/i.test(text)) return "Q2";
	if (/\bq3\b/i.test(text)) return "Q3";
	if (/\bq4\b/i.test(text)) return "Q4";
	if (text.includes("month")) return "this month";
	if (text.includes("quarter")) return "this quarter";
	if (text.includes("year")) return "this year";
	return "the next quarter";
}

function buildSmartRewrite(text: string): string {
	const normalized = text.toLowerCase();
	if (normalized.includes("sales")) {
		return "Increase regional sales revenue by 15% in Q2 through dealer expansion.";
	}
    if (!text.trim()) {
        return "Define a measurable business goal with a clear target and timeline.";
    }

	const verb = inferActionVerb(normalized);
	const metric = inferMetric(normalized);
	const timeframe = inferTimeframe(normalized);
	return `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${metric} by 15% in ${timeframe} with clear execution milestones.`;
}

function buildSuggestions(isVague: boolean, measurable: boolean, timeBound: boolean, score: number): string[] {
	const suggestions: string[] = [];
	if (isVague) suggestions.push("Make the goal more specific by naming the exact outcome and scope.");
	if (!measurable) suggestions.push("Add a measurable target such as a percentage, count, or KPI.");
	if (!timeBound) suggestions.push("Add a deadline or time window.");
	if (score < 70) suggestions.push("Include clearer actions and enough detail to track progress.");
    return [...new Set(suggestions)];
}

function calculateScore(text: string, isVague: boolean, measurable: boolean, timeBound: boolean): number {
	const wordCount = text.split(/\s+/).filter(Boolean).length;
	const lower = text.toLowerCase();
	const specificity = Math.max(0, 25 - countKeywords(lower, VAGUE_WORDS) * 4);
	const measurableScore = measurable ? 25 : 0;
	const timeScore = timeBound ? 20 : 0;
	const actionScore = hasAnyPattern(lower, [new RegExp(`\\b(${ACTION_VERBS.join("|")})\\b`, "i")]) ? 15 : 0;
	const detailScore = wordCount >= 6 ? 15 : wordCount >= 3 ? 8 : 0;
	const vaguePenalty = isVague ? 10 : 0;
	return Math.max(0, Math.min(100, specificity + measurableScore + timeScore + actionScore + detailScore - vaguePenalty));
}

function riskFromScore(score: number): RiskLabel {
	if (score >= 80) return "on_track";
	if (score >= 50) return "at_risk";
	return "off_track";
}

export function analyzeGoalText(title: string, description: string): SmartAnalysis {
	const combinedText = normalizeText(title, description);
	const lower = combinedText.toLowerCase();
	const isVague = countKeywords(lower, VAGUE_WORDS) >= 2 || combinedText.split(/\s+/).filter(Boolean).length < 4;
	const hasMeasurableLanguage = hasAnyPattern(combinedText, MEASURABLE_PATTERNS);
	const hasTimeBoundLanguage = hasAnyPattern(combinedText, TIME_PATTERNS);
	const qualityScore = calculateScore(combinedText, isVague, hasMeasurableLanguage, hasTimeBoundLanguage);

	return {
		title,
		description,
		combinedText,
		isVague,
		hasMeasurableLanguage,
		hasTimeBoundLanguage,
		qualityScore,
		riskLabel: riskFromScore(qualityScore),
		suggestions: buildSuggestions(isVague, hasMeasurableLanguage, hasTimeBoundLanguage, qualityScore),
		smartRewrite: buildSmartRewrite(combinedText),
	};
}

export function suggestSmartGoal(vagueTitle: string): string {
	return buildSmartRewrite(vagueTitle || "");
}

