"use server";

import { auth } from "@/auth";
import { askAboutIraq } from "@/lib/portal/ask";
import { withinRateLimit } from "@/lib/rate-limit";

/** Questions per window, per account — generous for a person reading and
 * re-asking, not generous enough for a script to run up the API bill. */
const ASK_LIMIT = 20;
const ASK_WINDOW_MS = 10 * 60 * 1000;

const MAX_QUESTION_LENGTH = 600;

export type AskState = {
  status: "idle" | "answered" | "error";
  question?: string;
  answer?: string;
  /** A key under `portal.ask`, not a sentence — matches how the sign-in and
   * emailing forms elsewhere in the app report failure, so the message is
   * always shown in the visitor's own language rather than baked into the
   * server action in English. */
  errorKey?:
    | "errorNotSignedIn"
    | "errorEmpty"
    | "errorTooLong"
    | "errorTooMany"
    | "errorNotConfigured"
    | "errorRefused"
    | "errorNoAnswer"
    | "errorGeneric";
};

export async function askQuestion(
  _prevState: AskState,
  formData: FormData,
): Promise<AskState> {
  const session = await auth();
  if (!session?.user?.isPro) {
    return { status: "error", errorKey: "errorNotSignedIn" };
  }

  const question = String(formData.get("question") ?? "").trim();
  if (!question) {
    return { status: "error", errorKey: "errorEmpty" };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return { status: "error", errorKey: "errorTooLong", question };
  }

  // Before the Claude call, which is the expensive step this budget protects.
  if (!withinRateLimit(`portal-ask:${session.user.id}`, ASK_LIMIT, ASK_WINDOW_MS)) {
    return { status: "error", errorKey: "errorTooMany", question };
  }

  const result = await askAboutIraq(question);

  if (result.status === "error") {
    return { status: "error", errorKey: result.errorKey, question };
  }
  return { status: "answered", question, answer: result.answer };
}
