import Link from "next/link";
import type { ReactNode } from "react";

import { SearchFrameIcon } from "@/src/components/foundation/icons";

type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  eyebrow = "Ready for a first inquiry",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <section className="state-panel state-panel--empty" aria-labelledby="empty-state-title">
      <SearchFrameIcon className="state-panel__icon" />
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3 id="empty-state-title">{title}</h3>
        <p>{description}</p>
      </div>
      {action && <div className="state-panel__action">{action}</div>}
    </section>
  );
}

type LoadingStateProps = {
  label?: string;
  inverse?: boolean;
};

export function LoadingState({
  label = "Preparing this knowledge surface",
  inverse = false,
}: LoadingStateProps) {
  return (
    <div
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
      className={`loading-state${inverse ? " loading-state--inverse" : ""}`}
      role="status"
    >
      <span aria-hidden="true" className="loading-state__mark">
        <i />
        <i />
        <i />
      </span>
      <span>{label}</span>
    </div>
  );
}

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  inverse?: boolean;
};

export function ErrorState({
  title = "This surface did not load",
  description = "This view is temporarily unavailable. Try it again when you are ready.",
  onRetry,
  inverse = false,
}: ErrorStateProps) {
  return (
    <section
      className={`state-panel state-panel--error${inverse ? " state-panel--inverse" : ""}`}
      role="alert"
    >
      <p className="eyebrow">A recoverable interruption</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="state-panel__actions">
        {onRetry && (
          <button className="button button--solid" onClick={onRetry} type="button">
            Try again
          </button>
        )}
        <Link className="button" href="/">
          Return to OpenInquiry
        </Link>
      </div>
    </section>
  );
}
