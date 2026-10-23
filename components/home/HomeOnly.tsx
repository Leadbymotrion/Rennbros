"use client";

import { usePathname } from "next/navigation";

/** Shows its children on the home page only (English or French). */
export function HomeOnly({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  return /^\/(fr|en)?\/?$/.test(path) ? <>{children}</> : null;
}
