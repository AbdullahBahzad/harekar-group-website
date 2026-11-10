import type { ReactNode } from "react";
import PageEnter from "@/components/PageEnter";

/** Re-mounted on every navigation, so each page opens with the site's entrance. */
export default function Template({ children }: { children: ReactNode }) {
  return <PageEnter>{children}</PageEnter>;
}
