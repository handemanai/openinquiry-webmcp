// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";

import { PublisherDecidesDemo } from "@/src/components/demo/publisher-decides-demo";

export const metadata: Metadata = {
  title: "OpenInquiry guided demonstration",
  description:
    "A short introduction to using an external agent with a fictional publisher’s page-local Site Tools.",
};

export default function PublisherDecidesPage() {
  return <PublisherDecidesDemo />;
}
