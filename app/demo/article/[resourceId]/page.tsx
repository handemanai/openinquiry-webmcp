// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublisherDecidesLive } from "@/src/components/demo/publisher-decides-live";
import {
  JOURNAL_GUIDELINE_CATALOG,
  findJournalGuideline,
} from "@/src/lib/demo/journal-guidelines-catalog";

type ArticlePageProps = Readonly<{
  params: Promise<{ resourceId: string }>;
  searchParams: Promise<{ view?: string }>;
}>;

export function generateStaticParams() {
  return JOURNAL_GUIDELINE_CATALOG.map(({ id }) => ({ resourceId: id }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const guideline = findJournalGuideline((await params).resourceId);
  if (!guideline) return {};
  return {
    title: `${guideline.title} · The Journal of Guidelines`,
    description: `Read the fictional ${guideline.title} guideline in the OpenInquiry journal demonstration.`,
  };
}

export default async function JournalGuidelinePage({ params, searchParams }: ArticlePageProps) {
  const guideline = findJournalGuideline((await params).resourceId);
  if (!guideline) notFound();
  return (
    <PublisherDecidesLive
      initialResourceId={guideline.id}
      initialToolEvidenceView={(await searchParams).view === "tool-evidence"}
    />
  );
}
