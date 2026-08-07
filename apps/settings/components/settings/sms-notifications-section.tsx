"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Switch } from "@walls/ui/switch";
import {
  KENOO_PRIVACY_URL,
  KENOO_SMS_CONSENT_VERSION,
  KENOO_SMS_DISCLOSURE,
  KENOO_TERMS_URL,
  hasActiveSmsConsent,
} from "@walls/utils";

import { wallsToast } from "@/components/ui/walls-toast";
import { getSupabaseClient } from "@/lib/auth";

type SmsNotificationsSectionProps = {
  userId: string | null;
  phoneNumber: string;
  existingPhoneNumber: string;
};

export function SmsNotificationsSection({
  userId,
  phoneNumber,
  existingPhoneNumber,
}: SmsNotificationsSectionProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consentPhone, setConsentPhone] = useState<string | null>(null);

  const destinationPhone = phoneNumber.trim() || existingPhoneNumber.trim();
  const phoneReady = Boolean(destinationPhone);
  const consentActive = hasActiveSmsConsent({
    smsNotificationsEnabled: enabled,
    smsConsentPhone: consentPhone,
    phoneNumber: destinationPhone,
  });

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("users")
          .select(
            "sms_notifications_enabled, sms_consent_phone, sms_consent_granted_at",
          )
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error loading SMS consent:", error);
          return;
        }

        setEnabled(Boolean(data?.sms_notifications_enabled));
        setConsentPhone((data?.sms_consent_phone as string | null) ?? null);
      } catch (error) {
        console.error("Error loading SMS consent:", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [userId, existingPhoneNumber]);

  const clearAlertSmsChannels = async (supabase: ReturnType<typeof getSupabaseClient>) => {
    if (!userId) return;
    await supabase
      .from("alert_subscriptions")
      .update({
        notify_sms: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("notify_sms", true);
  };

  const persistConsent = async (nextEnabled: boolean) => {
    if (!userId) return;
    if (nextEnabled && !phoneReady) {
      wallsToast.error(
        "Phone required",
        "Add a mobile phone number above before enabling SMS notifications.",
      );
      return;
    }

    const previousEnabled = enabled;
    const previousConsentPhone = consentPhone;
    setEnabled(nextEnabled);
    setSaving(true);

    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();

      if (nextEnabled) {
        const { error: userError } = await supabase
          .from("users")
          .update({
            sms_notifications_enabled: true,
            sms_consent_granted_at: now,
            sms_consent_withdrawn_at: null,
            sms_consent_phone: destinationPhone,
            sms_consent_version: KENOO_SMS_CONSENT_VERSION,
            sms_consent_source: "web_settings",
            // Keep profile phone in sync when enabling from a draft phone value.
            phone_number: destinationPhone,
          })
          .eq("id", userId);

        if (userError) throw userError;

        const { error: eventError } = await supabase
          .from("sms_consent_events")
          .insert({
            user_id: userId,
            phone_number: destinationPhone,
            action: "opt_in",
            consent_version: KENOO_SMS_CONSENT_VERSION,
            source: "web_settings",
            metadata: { disclosure: KENOO_SMS_DISCLOSURE },
          });

        if (eventError) throw eventError;

        setConsentPhone(destinationPhone);
        wallsToast.success(
          "SMS enabled",
          "You will receive Kenoo transactional text notifications.",
        );
      } else {
        const { error: userError } = await supabase
          .from("users")
          .update({
            sms_notifications_enabled: false,
            sms_consent_withdrawn_at: now,
            sms_consent_source: "web_settings",
          })
          .eq("id", userId);

        if (userError) throw userError;

        const { error: eventError } = await supabase
          .from("sms_consent_events")
          .insert({
            user_id: userId,
            phone_number: destinationPhone || consentPhone,
            action: "opt_out",
            consent_version: KENOO_SMS_CONSENT_VERSION,
            source: "web_settings",
            metadata: {},
          });

        if (eventError) throw eventError;

        await clearAlertSmsChannels(supabase);
        wallsToast.success(
          "SMS disabled",
          "You will no longer receive Kenoo text notifications.",
        );
      }
    } catch (error) {
      console.error("Error updating SMS consent:", error);
      setEnabled(previousEnabled);
      setConsentPhone(previousConsentPhone);
      wallsToast.error("Error", "Failed to update SMS notification settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center mb-8 mt-8">
        <span className="text-black font-black text-4xl mr-4">
          SMS notifications
        </span>
        <div className="flex-1 border-t border-black h-[1px]" />
      </div>

      <div className="w-full space-y-5">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Enable SMS notifications
            </p>
            <p className="mt-1 text-sm font-light leading-6 text-neutral-500">
              Opt in to receive transactional and operational text alerts from
              Kenoo apps such as AdPilot. SMS is off by default and is never
              enabled just because a phone number is on file.
            </p>
          </div>
          {loading ? (
            <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-neutral-400" />
          ) : (
            <Switch
              checked={consentActive}
              disabled={saving || (!phoneReady && !consentActive)}
              onCheckedChange={(checked) => {
                void persistConsent(checked);
              }}
              aria-label="Enable SMS notifications"
              size="md"
            />
          )}
        </div>

        {!phoneReady ? (
          <p className="text-xs font-light text-amber-700">
            Add a mobile phone number in Contact information before enabling
            SMS.
          </p>
        ) : null}

        {enabled &&
        phoneReady &&
        consentPhone &&
        !hasActiveSmsConsent({
          smsNotificationsEnabled: enabled,
          smsConsentPhone: consentPhone,
          phoneNumber: destinationPhone,
        }) ? (
          <p className="text-xs font-light text-amber-700">
            Your phone number changed since you opted in. Re-enable SMS to
            consent for the new number.
          </p>
        ) : null}

        <p className="text-xs font-light leading-5 text-neutral-500">
          {KENOO_SMS_DISCLOSURE}{" "}
          <Link
            href={KENOO_TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-neutral-800"
          >
            Terms of Service
          </Link>
          {" · "}
          <Link
            href={KENOO_PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-neutral-800"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
