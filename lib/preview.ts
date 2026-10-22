/** True on the test copy (rennbros-test) only: features awaiting the owner's
 *  approval are shown there and hidden on rennbros.com. See next.config.ts. */
export const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === "1";
