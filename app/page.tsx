// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";
import Link from "next/link";

import { ContactDisclosure } from "@/src/components/foundation/contact-disclosure";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "OpenInquiry · Publisher-controlled access for users’ agents",
  description:
    "OpenInquiry shows how WebMCP can help people bring their own agents to publisher content on the publisher’s terms.",
};

export default function Home() {
  return (
    <main className={styles.page}>
      <div aria-hidden="true" className={styles.rule} />
      <section className={styles.hero}>
        <ContactDisclosure className={styles.contact} cardClassName={styles.contactCard} />
        <div className={styles.copy}>
          <p className={styles.eyebrow}>A WebMCP proposal for publisher-controlled agent access</p>
          <h1>OpenInquiry</h1>
          <h2>Bring your agent to publisher content. The publisher decides what it can use.</h2>
          <ul className={styles.principles}>
            <li>
              WebMCP lets your agent request content on the publisher&apos;s live site.
            </li>
            <li>
              The publisher decides what comes back: an abstract, summary, section, full article,
              link, or nothing.
            </li>
            <li>
              OpenInquiry builds on WebMCP so publishers can state what agents may access and how
              they may use it.
            </li>
          </ul>
        </div>
        <nav aria-label="OpenInquiry destinations" className={styles.actions}>
          <Link className={styles.action} href="/presentation">
            <span>View the presentation</span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.action} href="/demo/publisher-decides">
            <span>Run the demonstration</span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.action} href="/next-steps">
            <span>What comes next</span>
            <span aria-hidden="true">→</span>
          </Link>
        </nav>
        <p className={styles.disclosure}>
          <span>Fictional publisher and original synthetic content.</span>
          <span>Demonstration only. Not for clinical use.</span>
        </p>
      </section>
    </main>
  );
}
