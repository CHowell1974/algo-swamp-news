export const OPEN_TAPE = 6;

export const PLANS = {
  monthly: {
    id: "monthly",
    label: "Monthly",
    price: 29,
    cadence: "per month",
    days: 30,
    detail: "Billed monthly through Stripe. Cancel and the desk stays up until that period ends.",
  },
  annual: {
    id: "annual",
    label: "Annual",
    price: 249,
    cadence: "per year",
    days: 365,
    detail: "Billed once a year through Stripe. Two months inside the monthly rate.",
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function isPlanId(value: unknown): value is PlanId {
  return value === "monthly" || value === "annual";
}

export function annualSavings(): number {
  return PLANS.monthly.price * 12 - PLANS.annual.price;
}

export function periodEnd(plan: PlanId, from = new Date()): string {
  const end = new Date(from.getTime());
  end.setUTCDate(end.getUTCDate() + PLANS[plan].days);
  return end.toISOString();
}

export function formatMoney(amount: number): string {
  return `$${amount}`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
