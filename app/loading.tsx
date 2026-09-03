import Link from "next/link";

import { LoadingState } from "@/src/components/foundation/state-primitives";

export default function Loading() {
  return (
    <div className="route-state route-state--dark">
      <Link className="route-state__home" href="/">
        <span aria-hidden="true">←</span> OpenInquiry home
      </Link>
      <LoadingState inverse />
    </div>
  );
}
