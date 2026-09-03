import Link from "next/link";

import { ArrowRightIcon } from "@/src/components/foundation/icons";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404 · Page not found</p>
      <h1>This OpenInquiry page does not exist.</h1>
      <p>
        Return to the landing page to open the presentation or begin the demonstration.
      </p>
      <Link className="button button--ink" href="/">
        Return to OpenInquiry
        <ArrowRightIcon />
      </Link>
    </main>
  );
}
