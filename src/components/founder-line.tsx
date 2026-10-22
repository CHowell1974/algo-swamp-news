import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { founderLine, type FounderOffer } from "@/lib/billing";
import { getFounderOffer } from "@/lib/membership.functions";

/** Small line for the founding-member price. Hidden when the deal is not open. */
export function FounderLine({ className }: { className?: string }) {
  const load = useServerFn(getFounderOffer);
  const [offer, setOffer] = useState<FounderOffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((next) => {
        if (!cancelled) setOffer(next);
      })
      .catch(() => {
        if (!cancelled) setOffer(null);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!offer) return null;
  return <p className={className}>{founderLine(offer)}</p>;
}
