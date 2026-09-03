"use client";

import { useEffect, useRef } from "react";

type ContactDisclosureProps = {
  className: string;
  cardClassName: string;
};

export function ContactDisclosure({ className, cardClassName }: ContactDisclosureProps) {
  const disclosureRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeWhenClickingElsewhere = (event: PointerEvent) => {
      const disclosure = disclosureRef.current;

      if (disclosure?.open && event.target instanceof Node && !disclosure.contains(event.target)) {
        disclosure.open = false;
      }
    };

    document.addEventListener("pointerdown", closeWhenClickingElsewhere);
    return () => document.removeEventListener("pointerdown", closeWhenClickingElsewhere);
  }, []);

  return (
    <details className={className} ref={disclosureRef}>
      <summary>
        <span>Contact Brian Pridgen, MD</span>
      </summary>
      <div className={cardClassName}>
        <p>Brian Pridgen, MD</p>
        <a href="mailto:brian@surgiscribe.co">brian@surgiscribe.co</a>
        <a href="https://x.com/handemanai" rel="noreferrer" target="_blank">
          X · @handemanai <span aria-hidden="true">↗</span>
        </a>
      </div>
    </details>
  );
}
