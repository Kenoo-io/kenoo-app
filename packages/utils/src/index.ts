import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const extractDomain = (website: string): string => {
  try {
    return (
      website
        ?.replace(/^https?:\/\//, "")
        ?.replace(/^www\./, "")
        ?.replace(/\/$/, "") || ""
    );
  } catch {
    return "";
  }
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/** Disclosure/consent copy version recorded with SMS opt-in audits. */
export const KENOO_SMS_CONSENT_VERSION = "kenoo-sms-v1";

export const KENOO_SMS_DISCLOSURE =
  "By enabling SMS notifications, you agree to receive automated transactional and operational text messages from Kenoo, including account, workflow, application, and user-configured alerts. Message frequency varies based on your notification settings and account activity. Message and data rates may apply. Reply HELP for help or STOP to opt out. Consent is not a condition of purchase.";

export const KENOO_TERMS_URL = "https://kenoo.io/terms-and-conditions";
export const KENOO_PRIVACY_URL = "https://kenoo.io/privacy-policy";

export const KENOO_SMS_HELP_REPLY =
  "Kenoo SMS: For help with transactional notifications, email hello@kenoo.io or manage SMS in Settings. Msg&data rates may apply. Reply STOP to opt out.";

/** Digits-only compare so +1 (555) 123-4567 matches stored variants. */
export function normalizePhoneDigits(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function phonesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizePhoneDigits(left);
  const b = normalizePhoneDigits(right);
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}

/**
 * True when the user has an active SMS opt-in for the given destination phone.
 * Having a phone number alone is never enough.
 */
export function hasActiveSmsConsent(input: {
  smsNotificationsEnabled?: boolean | null;
  smsConsentPhone?: string | null;
  phoneNumber?: string | null;
}): boolean {
  if (!input.smsNotificationsEnabled) return false;
  const phone = input.phoneNumber?.trim();
  if (!phone) return false;
  if (!input.smsConsentPhone?.trim()) return false;
  return phonesMatch(input.smsConsentPhone, phone);
}
