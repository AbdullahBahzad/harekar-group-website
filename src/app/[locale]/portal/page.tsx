import { redirect } from "next/navigation";

/** `/portal` itself is not a station — Reports (the Daily Brief) is the
 * portal's front page, the same way `/admin` redirects nowhere but every
 * station link starts from the dashboard being station zero conceptually. */
export default async function PortalIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/portal/reports`);
}
