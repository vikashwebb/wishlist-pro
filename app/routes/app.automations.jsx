/* eslint-disable react/prop-types */
import { useFetcher, useLoaderData, useRouteError } from "react-router";
import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { ALL_FEATURES_FREE } from "../billing.constants";
import { ProFeatureGate } from "../components/pro-feature-gate";
import { StatusPill, dashboardStyles as styles } from "../components/wishlist-dashboard/shared";
import automationsStyles from "../styles/app-automations.module.css";
import gateStyles from "../styles/pro-feature-gate.module.css";
import { shouldRevalidateSameAppPage } from "../utils/app-route-revalidation";

const ALERT_CARDS = [
  {
    id: "smartRecoveryEnabled",
    title: "Smart Recovery",
    description:
      "AI-timed reminders when shoppers save items but do not buy. Tags customers for Shopify Email campaigns.",
    delayField: "smartRecoveryDelayDays",
  },
  {
    id: "smartPriceAlertsEnabled",
    title: "Smart Price Alerts",
    description:
      "Notify wishlisters when a saved product price drops versus the price at save time.",
    thresholdField: "smartPriceDropMinPercent",
  },
  {
    id: "smartRestockAlertsEnabled",
    title: "Smart Restock Alerts",
    description:
      "Alert shoppers when saved or subscribed out-of-stock variants are available again.",
  },
];

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { hasProSubscription } = await import("../billing.server");
  const { getSmartAlertSettings, getSmartAlertStats } = await import(
    "../models/smart-alerts.server"
  );
  const { session, billing } = await authenticate.admin(request);
  const isPro = await hasProSubscription(billing, session.shop);
  const settings = await getSmartAlertSettings(session.shop);
  const stats = isPro ? await getSmartAlertStats(session.shop) : null;

  return {
    isPro,
    allFeaturesFree: ALL_FEATURES_FREE,
    settings,
    stats,
    shopDomain: session.shop,
  };
};

export function shouldRevalidate(args) {
  return shouldRevalidateSameAppPage(args);
}

export default function AutomationsPage() {
  const { isPro, allFeaturesFree, settings, stats, shopDomain } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Smart Alerts settings saved");
    }
  }, [fetcher.data, shopify]);

  const shopifyEmailUrl = shopDomain
    ? `https://${shopDomain}/admin/marketing`
    : null;

  return (
    <s-page heading="Smart Alerts">
      <div className={automationsStyles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Smart Alerts</p>
            <h1 className={styles.heroTitle}>Turn saved products into sales</h1>
            <p className={styles.heroText}>
              Smart Alerts watch wishlists, prices, and inventory — then prepare
              Shopify Email segments when shoppers should come back.
            </p>
          </div>
        </section>

        {!isPro && !allFeaturesFree ? (
          <ProFeatureGate
            isPro={false}
            title="Smart Alerts require Growth or Pro"
            description="Upgrade your plan to enable Smart Recovery, Smart Price Alerts, and Smart Restock Alerts."
            className={gateStyles.qaGate}
          />
        ) : (
          <>
            {stats ? (
              <section className={automationsStyles.statsGrid}>
                <article className={automationsStyles.statCard}>
                  <span className={automationsStyles.statLabel}>Pending alerts</span>
                  <strong className={automationsStyles.statValue}>
                    {stats.pendingCount}
                  </strong>
                </article>
                <article className={automationsStyles.statCard}>
                  <span className={automationsStyles.statLabel}>Tagged customers</span>
                  <strong className={automationsStyles.statValue}>
                    {stats.taggedCount}
                  </strong>
                </article>
                <article className={automationsStyles.statCard}>
                  <span className={automationsStyles.statLabel}>Ready for email</span>
                  <strong className={automationsStyles.statValue}>
                    {stats.readyForEmailCount}
                  </strong>
                </article>
              </section>
            ) : null}

            <fetcher.Form method="post" action="/app/api/automations" className={automationsStyles.form}>
              <div className={automationsStyles.cardGrid}>
                {ALERT_CARDS.map((card) => (
                  <article key={card.id} className={automationsStyles.alertCard}>
                    <div className={automationsStyles.alertHeader}>
                      <h2 className={automationsStyles.alertTitle}>{card.title}</h2>
                      <StatusPill tone={settings[card.id] ? "success" : "neutral"}>
                        {settings[card.id] ? "Enabled" : "Off"}
                      </StatusPill>
                    </div>
                    <p className={automationsStyles.alertText}>{card.description}</p>

                    <label className={automationsStyles.toggleRow}>
                      <input
                        type="checkbox"
                        name={card.id}
                        value="true"
                        defaultChecked={settings[card.id]}
                      />
                      <span>Enable {card.title}</span>
                    </label>

                    {card.delayField ? (
                      <label className={automationsStyles.field}>
                        <span>Reminder delay (days)</span>
                        <select
                          name={card.delayField}
                          defaultValue={String(settings[card.delayField] ?? 7)}
                          className={automationsStyles.select}
                        >
                          <option value="3">3 days</option>
                          <option value="7">7 days</option>
                          <option value="14">14 days</option>
                        </select>
                      </label>
                    ) : null}

                    {card.thresholdField ? (
                      <label className={automationsStyles.field}>
                        <span>Minimum price drop (%)</span>
                        <select
                          name={card.thresholdField}
                          defaultValue={String(settings[card.thresholdField] ?? 5)}
                          className={automationsStyles.select}
                        >
                          <option value="0">Any drop</option>
                          <option value="5">5%</option>
                          <option value="10">10%</option>
                          <option value="15">15%</option>
                        </select>
                      </label>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className={automationsStyles.actions}>
                <button type="submit" className={automationsStyles.saveButton} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save Smart Alerts"}
                </button>
                {shopifyEmailUrl ? (
                  <a
                    className={automationsStyles.secondaryLink}
                    href={shopifyEmailUrl}
                    target="_top"
                    rel="noreferrer"
                  >
                    Open Shopify Email
                  </a>
                ) : null}
              </div>
            </fetcher.Form>

            <p className={automationsStyles.compliance}>
              Smart Alerts respect Shopify marketing consent. Merchants send campaigns
              from Shopify Email using tagged customer segments.
            </p>
          </>
        )}
      </div>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
