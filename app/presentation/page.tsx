// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";

import { OpenInquiryPresentation } from "@/src/components/presentation/openinquiry-presentation";

export const metadata: Metadata = {
  title: "Presentation",
  description:
    "A scrolling presentation of information sources, physician workflow, and the OpenInquiry vision.",
};

export default function PresentationPage() {
  return <OpenInquiryPresentation />;
}
