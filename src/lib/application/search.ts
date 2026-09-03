// SPDX-License-Identifier: Apache-2.0

import type {
  ContentSection,
  SyntheticResource,
  SyntheticVideo,
  VideoTranscriptSegment,
} from "../../data/index";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "at", "for", "from", "in", "is", "of", "on",
  "or", "the", "to", "what", "when", "where", "which", "with", "adult",
  "adults", "aim", "each", "explain", "guideline", "how", "include", "included",
  "much", "open", "plan", "recommend", "relevant", "review", "section", "should",
  "week", "weekly",
]);

export function searchTokens(value: string): string[] {
  return [...new Set(
    (value.normalize("NFKC").toLocaleLowerCase("en-US").match(/[\p{L}\p{N}]+/gu) ?? [])
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  )];
}

function occurrences(value: string, tokens: readonly string[]): number {
  const indexedTokens = new Set(
    value
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .match(/[\p{L}\p{N}]+/gu) ?? [],
  );
  return tokens.reduce(
    (count, token) => count + (indexedTokens.has(token) ? 1 : 0),
    0,
  );
}

function sectionScore(section: ContentSection, tokens: readonly string[]): number {
  return occurrences(section.heading, tokens) * 4
    + occurrences(section.keywords.join(" "), tokens) * 3
    + occurrences(section.text, tokens);
}

export interface RankedResourceUnit {
  unit: ContentSection | VideoTranscriptSegment;
  score: number;
}

export function rankResourceUnits(
  resource: SyntheticResource | SyntheticVideo,
  query: string,
): RankedResourceUnit[] {
  const tokens = searchTokens(query);
  const units = "transcriptSegments" in resource
    ? resource.transcriptSegments
    : resource.sections;
  return units
    .map((unit) => ({ unit, score: sectionScore(unit, tokens) }))
    .sort((left, right) => right.score - left.score || left.unit.id.localeCompare(right.unit.id));
}

export interface RankedResource<T extends SyntheticResource | SyntheticVideo> {
  resource: T;
  score: number;
  matchedTokenCount: number;
  selectedUnit?: ContentSection | VideoTranscriptSegment;
}

function resourceSearchText(resource: SyntheticResource | SyntheticVideo): string {
  const units = "transcriptSegments" in resource
    ? resource.transcriptSegments
    : resource.sections;
  return [
    resource.title,
    resource.keywords.join(" "),
    resource.abstract,
    ...units.map((unit) => unit.keywords.join(" ")),
  ].join(" ");
}

export function rankResource<T extends SyntheticResource | SyntheticVideo>(
  resource: T,
  query: string,
): RankedResource<T> {
  const tokens = searchTokens(query);
  const rankedUnits = rankResourceUnits(resource, query);
  const selected = rankedUnits[0];
  const matchedTokenCount = occurrences(resourceSearchText(resource), tokens);
  const score = occurrences(resource.title, tokens) * 5
    + occurrences(resource.keywords.join(" "), tokens) * 3
    + occurrences(resource.abstract, tokens) * 2
    + (selected?.score ?? 0);
  return {
    resource,
    score,
    matchedTokenCount,
    ...(selected && selected.score > 0 ? { selectedUnit: selected.unit } : {}),
  };
}

export function bestResourceUnit(
  resource: SyntheticResource | SyntheticVideo,
  focusedQuery?: string,
): ContentSection | VideoTranscriptSegment | undefined {
  const units = "transcriptSegments" in resource
    ? resource.transcriptSegments
    : resource.sections;
  if (!focusedQuery) return units[0];
  return rankResource(resource, focusedQuery).selectedUnit ?? units[0];
}
