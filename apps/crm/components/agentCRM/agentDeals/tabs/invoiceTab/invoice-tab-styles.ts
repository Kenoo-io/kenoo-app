import { cn } from "@/lib/utils";
import { FALLBACK_ICON_URL } from "@/lib/asset-urls";

/** Same pattern as deal sheet header controls in `view-agent-deals`: no border/outline at rest, inset pill on hover. */
export const invoiceGhostActionButtonClass =
  "h-auto min-h-0 px-0 py-0 text-slate-600 hover:bg-transparent active:bg-transparent focus-visible:bg-transparent flex items-center justify-center shadow-none relative group flex-shrink-0 disabled:opacity-50";

export const invoiceGhostActionButtonInnerClass = cn(
  "relative z-10 box-border flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-xs font-light transition-[background-color,border-color,box-shadow] duration-300 ease-in-out",
  "group-hover:bg-gray-100 group-hover:border-neutral-200 group-hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)]"
);

export const fieldWrapperClass =
  "rounded-2xl bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 pl-1.5 pr-3 py-1";
export const inputInnerClass =
  "border-0 focus-visible:ring-0 focus:ring-0 bg-transparent flex-1 w-full min-w-0 placeholder:text-neutral-300 h-8";
export const labelClass = "text-xs font-normal text-neutral-400 tracking-wide block mb-1";
/** Matches `fieldWrapperClass` + `inputInnerClass` row (overrides default `SelectTrigger` h-10 / py-2). */
export const selectTriggerClass = cn(
  "rounded-2xl bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 w-full",
  "flex h-auto min-h-10 items-center justify-between gap-2 py-1 pl-1.5 pr-3 text-sm font-light",
  "focus:ring-0 focus-visible:ring-0 [&>span]:line-clamp-1 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0"
);

export const FALLBACK_IMAGE_URL = FALLBACK_ICON_URL;

/** Wise badge art (same asset as verified payment info in agent settings). */
export const WISE_VERIFIED_LOGO_URL =
  "https://d21buns5ku92am.cloudfront.net/69645/images/470451-Frame%2039321-0745ed-original-1677657684.png";

export const invoiceStatusOptions = ["draft", "issued", "sent", "paid", "overdue", "void"] as const;
export const invoiceCurrencyOptions = ["USD", "AUD", "CAD", "EUR", "GBP"] as const;
