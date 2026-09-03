"use client";

import { ErrorState } from "@/src/components/foundation/state-primitives";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="route-state">
      <ErrorState onRetry={reset} />
    </div>
  );
}
