"use client";
import { safeAnalyticsEvent } from "./analytics-events";
import type { PostHog } from "posthog-js";
let sdk: PostHog | undefined;
let allowed = false;
let generation = 0;
export async function setAnalyticsConsent(consented: boolean) {
  const next =
    consented &&
    navigator.doNotTrack !== "1" &&
    !(navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl;
  if (next === allowed && (!next || sdk)) return;
  allowed = next;
  const current = ++generation;
  if (!allowed) {
    sdk?.reset();
    return;
  }
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !/^phc_[A-Za-z0-9]+$/.test(key)) return;
  const { default: posthog } = await import("posthog-js/no-external");
  if (!allowed || generation !== current) return;
  if (!sdk) {
    sdk = posthog.init(key, {
      api_host: "https://eu.i.posthog.com",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-05-30",
      persistence: "memory",
      disable_persistence: true,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      capture_dead_clicks: false,
      rageclick: false,
      disable_session_recording: true,
      disable_surveys: true,
      capture_performance: false,
      advanced_disable_flags: true,
      disable_external_dependency_loading: true,
      person_profiles: "never",
      respect_dnt: true,
      request_batching: false,
      opt_out_capturing_persistence_type: "cookie",
      opt_out_persistence_by_default: true,
      save_campaign_params: false,
      save_referrer: false,
      ip: false,
      disable_product_tours: true,
      disable_conversations: true,
      cross_subdomain_cookie: false,
      before_send: (event) => {
        if (!allowed || !event) return null;
        const safe = safeAnalyticsEvent(event.event, event.properties);
        if (!safe) return null;
        const distinct = event.properties.distinct_id;
        if (typeof distinct !== "string" || distinct.length > 100) return null;
        return {
          uuid: event.uuid,
          event: event.event,
          timestamp: event.timestamp,
          properties: {
            ...safe.properties,
            distinct_id: distinct,
            $process_person_profile: false,
            token: key,
          },
        };
      },
    });
  }
}
export function track(name: string, properties: Record<string, unknown> = {}) {
  if (!allowed || !sdk) return false;
  const safe = safeAnalyticsEvent(name, properties);
  if (safe) {
    sdk.capture(safe.event, safe.properties);
    return true;
  }
  return false;
}
