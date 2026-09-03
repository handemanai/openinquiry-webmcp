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
      "Give publishers a menu of ways to share their content: full text, a complete section, an excerpt, a summary, basic details, a link, or no access. OpenInquiry should not impose a universal character ceiling; each publisher decides which representations it offers and any resource- or use-specific limits.",
  },
  {
    number: "03",
    title: "Define what agents and browsers must prove.",
    body:
      "WebMCP gives publishers a controlled tool path, but today an agent-capable browser may still read the visible page directly. Explore a publisher-recognized, browser-enforced mode that exposes protected text to the agent only through declared Site Tools while preserving the reader’s normal access. That assurance must be signed, scoped, revocable, and cover retention, training, onward sharing, and deletion. WebMCP does not provide this guarantee today, and a self-reported flag is not enough.",
  },
  {
    number: "04",
    title: "Create an open standards process.",
    body:
      "Publish changes and the reasons behind them. No single publisher, agent company, or OpenInquiry should control the process.",
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
          OpenInquiry now demonstrates the basic idea. The next work is to test it outside our own
          reference site, make it easy for others to implement, and let the people it affects
          shape the rules.
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
        <p>A tested proposal and reference implementation—not yet an interoperable standard.</p>
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
