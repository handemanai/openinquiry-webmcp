// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";

import { PublisherDecidesLive } from "@/src/components/demo/publisher-decides-live";

export const metadata: Metadata = {
  title: "The Journal of Guidelines · OpenInquiry demonstration",
  description:
    "Use a fictional medical journal’s page-local OpenInquiry WebMCP tools and signed publisher policy to retrieve the permitted source unit.",
};

export default function DemoPage() {
  return <PublisherDecidesLive />;
}
