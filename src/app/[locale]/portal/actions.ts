"use server";

import { hasLocale } from "next-intl";
import { signOut } from "@/auth";
import { locales } from "@/i18n/routing";

/** Signs out of the portal, landing back on the public home page rather than
 * a login form the visitor did not ask to see again — unlike the admin
 * console, a signed-out client has no reason to sign straight back in. */
export async function signOutOfPortal(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  const locale = hasLocale(locales, raw) ? raw : "en";

  await signOut({ redirectTo: `/${locale}` });
}
