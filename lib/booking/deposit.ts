/**
 * The deposit, one rule for the page and the server (the server never takes
 * an amount from the browser; it recomputes it from the services).
 *
 * Current rule (business.booking.depositMode = "flat"): a flat amount for any
 * service or combination, no tax on it (see depositFor).
 *
 * Archived rule ("percent"), kept switchable:
 *   deposit = percent x (the estimate shown at booking + GST + QST)
 *
 * The estimate is the "from" price the customer sees: the low end of a range,
 * one hour for hourly work, the chosen rim size for a tire change. So the
 * deposit can't exceed the percent of the final bill. Several services: one
 * deposit on the combined estimate. Rounded to the cent.
 */
import { bySlug, mountPrice, type Rim } from "@/lib/services";
import { business } from "@/lib/business";

/** Pre-tax estimate, in dollars. */
export function estimateOf(slugs: string[], rim?: Rim, runFlat = false): number {
  return slugs.reduce((sum, slug) => sum + (slug === "tire-install" ? mountPrice(rim, runFlat) : bySlug(slug)?.priceFrom ?? 0), 0);
}

/** GST and QST on a pre-tax amount, each rounded to the cent like an invoice. */
export function taxesOn(dollars: number): { gst: number; qst: number; total: number } {
  const cents = Math.round(dollars * 100);
  const gst = Math.round(cents * business.tax.gst);
  const qst = Math.round(cents * business.tax.qst);
  return { gst: gst / 100, qst: qst / 100, total: (cents + gst + qst) / 100 };
}

/** The estimate with taxes, in dollars. */
export function estimateWithTax(slugs: string[], rim?: Rim, runFlat = false): number {
  return taxesOn(estimateOf(slugs, rim, runFlat)).total;
}

/** percent is a whole number (20 = 20%); dollars x percent = cents. */
export function depositCents(slugs: string[], percent: number | null, rim?: Rim, runFlat = false): number {
  if (!percent || percent <= 0) return 0;
  return Math.round(estimateWithTax(slugs, rim, runFlat) * percent);
}

/** Whether the site takes a deposit at all. */
export const depositOn = (): boolean => {
  const b = business.booking;
  return b.depositMode === "flat" ? b.depositFlatCents > 0 : b.depositMode === "percent" ? !!b.depositPercent && b.depositPercent > 0 : false;
};

/** The deposit for this booking, in cents, by the current rule. */
export function depositFor(slugs: string[], rim?: Rim, runFlat = false): number {
  const b = business.booking;
  if (!slugs.length) return 0;
  if (b.depositMode === "flat") return Math.max(0, b.depositFlatCents);
  if (b.depositMode === "percent") return depositCents(slugs, b.depositPercent, rim, runFlat);
  return 0;
}
