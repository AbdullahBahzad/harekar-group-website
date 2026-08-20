import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, letting later Tailwind utilities win over earlier ones.
 *
 * `clsx` alone would keep both `px-4` and `px-6` in the string and leave the
 * winner to CSS source order, which is not something a caller can reason
 * about. `twMerge` resolves the conflict by Tailwind's own rules, which is
 * what makes `className` overrides on shadcn components actually work.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
