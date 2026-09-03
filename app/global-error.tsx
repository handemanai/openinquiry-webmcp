"use client";

import { ErrorState } from "@/src/components/foundation/state-primitives";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="route-state">
          <ErrorState
            title="OpenInquiry could not start"
            description="OpenInquiry hit a temporary problem before the page could load."
            onRetry={reset}
          />
        </main>
      </body>
    </html>
  );
}
