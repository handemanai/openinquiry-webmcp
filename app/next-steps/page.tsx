// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Next steps",
  description:
    "The work required to take OpenInquiry from a reference demonstration to an independently tested open standard.",
};

const priorities = [
  {
    number: "01",
    title: "Make OpenInquiry easy for publishers to add.",
    body:
      "Start with an installable package that connects OpenInquiry to the search, sign-in, access, and content systems already on a publisher’s site. Adding WebMCP Site Tools should not require rebuilding those systems or creating a separate AI product.",
  },
  {
    number: "02",
    title: "Give publishers clear choices.",
    body:
      "Let each publisher choose what to return: full text, a complete section, an excerpt, a summary, basic details, a link, or no additional content. OpenInquiry should not impose one character limit. Publishers should set limits by resource and permitted use.",
  },
  {
    number: "03",
    title: "Define what agents and browsers must prove.",
    body:
      "WebMCP gives publishers a controlled tool path, but an agent-capable browser may still read the visible page directly. Test a browser-enforced mode in which protected text reaches the agent only through declared Site Tools while the reader keeps normal access. Any credential used for that decision must be signed, scoped, and revocable, with explicit claims about retention, training, onward sharing, and deletion. WebMCP does not provide this guarantee today, and self-reporting is not enough.",
  },
  {
    number: "04",
    title: "Create an open standards process.",
    body:
      "Publish proposed changes and the reasoning behind them. Governance should include publishers, readers, agent developers, and independent standards participants.",
  },
] as const;

export default function NextStepsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.homeLink} href="/">
          <span aria-hidden="true">←</span> OpenInquiry home
        </Link>
        <p className={styles.productLabel}>OpenInquiry</p>
      </header>

      <section className={styles.hero}>
        <h1>What needs to happen next.</h1>
        <p>
          OpenInquiry now demonstrates the core idea. Next, it needs testing on independent
          publisher sites, a simple implementation path, and an open process shaped by
          publishers, readers, and agent developers.
        </p>
      </section>

      <section aria-label="Four priorities for OpenInquiry" className={styles.priorities}>
        {priorities.map((priority) => (
          <article className={styles.priority} key={priority.number}>
            <p className={styles.number}>{priority.number}</p>
            <h2>{priority.title}</h2>
            <p>{priority.body}</p>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <p>
          OpenInquiry is a tested proposal and reference implementation. Independent
          implementations are the next step toward interoperability.
        </p>
        <nav aria-label="Continue exploring OpenInquiry">
          <Link href="/presentation">
            View the presentation <span aria-hidden="true">→</span>
          </Link>
          <Link href="/demo/publisher-decides">
            Run the demonstration <span aria-hidden="true">→</span>
          </Link>
        </nav>
      </footer>
    </main>
  );
}
