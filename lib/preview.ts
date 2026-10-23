/** True on the test copy (rennbros-test) only: features awaiting the owner's
 *  approval are shown there and hidden on rennbros.com. See next.config.ts. */
export const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "1";

/** Features first tried on the test copy, now switched on for rennbros.com
 *  (Tashii, 2026-10-23). Set one to false to show it on the test copy only. */
export const LIVE = {
  fleetBanner: true,
  frenchAuto: true,
  addressSuggest: true,
  multiCar: true,
};
export const on = (f: keyof typeof LIVE) => PREVIEW || LIVE[f];
