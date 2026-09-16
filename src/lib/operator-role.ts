/**
 * The console's two operator roles.
 *
 * Split out of `admin/accounts/actions.ts` because that file is `"use
 * server"`, and a Server Actions file may only export async functions — a
 * plain constant like this one is a build error there, the same reason
 * `report-shape.ts` exists separately from `reports.ts`. `OperatorPanel` is a
 * client component and needs this constant to render its role `<select>`.
 */

/**
 * "admin" is full console access (`isAdmin`); "reports" is the narrow
 * Sources/Reports-only access (`canManageReports`) — see the schema comment
 * on `User.canManageReports`. The two are mutually exclusive by construction
 * everywhere they are set: nothing ever puts both flags true at once.
 */
export const OPERATOR_ROLES = ["admin", "reports"] as const;
export type OperatorRole = (typeof OPERATOR_ROLES)[number];
