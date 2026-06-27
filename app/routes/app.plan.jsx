/* eslint-disable react/prop-types */
import { Link, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { ALL_FEATURES_FREE, PRO_PLAN_PRICE } from "../billing.constants";
import { AppLink } from "../components/app-link";
import styles from "../styles/app-pricing.module.css";
import { shouldRevalidateSameAppPage } from "../utils/app-route-revalidation";

const STARTER_FEATURES = [
  "Guest wishlist with login sync",
  "Product & collection wishlist buttons",
  "Auto-created wishlist page",
  "Smart Setup launch checklist",
  "Theme blocks & icon styling",
];

const PRO_FEATURES = [
  "Everything in Starter",
  "Insights dashboard & CSV export",
  "Health & QA lab",
  "Login-only wishlist mode",
];

const GROWTH_FEATURES = [
  "Everything in Pro",
  "Smart Recovery",
  "Smart Price Alerts",
  "Smart Restock Alerts",
];

const COMPARE_ROWS = [
  { feature: "Storefront wishlist", starter: true, pro: true, growth: true },
  { feature: "Smart Setup", starter: true, pro: true, growth: true },
  { feature: "Insights + CSV", starter: false, pro: true, growth: true },
  { feature: "Health & QA", starter: false, pro: true, growth: true },
  { feature: "Smart Alerts", starter: false, pro: false, growth: true },
];

function PlanButton({ variant = "primary", href, disabled, children, reloadDocument }) {
  const className = [
    styles.planButton,
    variant === "primary" && styles.planButtonPrimary,
    variant === "secondary" && styles.planButtonSecondary,
    variant === "ghost" && styles.planButtonGhost,
    variant === "current" && styles.planButtonCurrent,
  ]
    .filter(Boolean)
    .join(" ");

  if (disabled || variant === "current") {
    return <span className={className}>{children}</span>;
  }

  if (href?.startsWith("/app/billing")) {
    return (
      <Link className={className} to={href} reloadDocument={reloadDocument}>
        {children}
      </Link>
    );
  }

  return <AppLink className={className} href={href}>{children}</AppLink>;
}

function FeatureList({ items, featured = false }) {
  return (
    <ul className={styles.featureList}>
      {items.map((item) => (
        <li key={item} className={styles.featureItem}>
          <span
            className={`${styles.featureIcon} ${featured ? "" : styles.featureIconMuted}`}
            aria-hidden="true"
          >
            ✓
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function PlanCard({ name, amount, suffix = "/ month", trialHint, features, featured, isCurrent, actions }) {
  return (
    <article className={`${styles.planCard} ${featured ? styles.planCardFeatured : ""}`}>
      <div className={styles.planCardHeader}>
        <span
          className={`${styles.planBadge} ${
            isCurrent ? styles.planBadgeCurrent : featured ? styles.planBadgeFeatured : ""
          }`}
        >
          {isCurrent ? "Current plan" : featured ? "Recommended" : "Starter"}
        </span>
        <h2 className={styles.planName}>{name}</h2>
        <p className={styles.planPrice}>
          {amount} <span className={styles.planPriceSuffix}>{suffix}</span>
        </p>
        {trialHint ? <p className={styles.planTrial}>{trialHint}</p> : null}
      </div>
      <div className={styles.planCardBody}>
        <FeatureList items={features} featured={featured} />
        <div className={styles.planActions}>{actions}</div>
      </div>
    </article>
  );
}

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  await authenticate.admin(request);
  return { allFeaturesFree: ALL_FEATURES_FREE, price: PRO_PLAN_PRICE };
};

export function shouldRevalidate(args) {
  return shouldRevalidateSameAppPage(args);
}

export default function PlanPage() {
  const { allFeaturesFree, price } = useLoaderData();
  const formattedPrice = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: price.currencyCode,
  }).format(price.amount);
  const growthPrice = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: price.currencyCode,
  }).format(9.99);

  return (
    <s-page heading="Plan">
      <div className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Plan</p>
          <h1 className={styles.heroTitle}>WishMe plans for every store</h1>
          <p className={styles.heroText}>
            {allFeaturesFree
              ? "Every feature is included at no cost while paid plans finish rollout."
              : "Start with Starter, unlock Insights on Pro, and add Smart Alerts on Growth."}
          </p>
          <span className={styles.currentPlan}>
            {allFeaturesFree ? "All features included — free for every store" : "You are on Starter"}
          </span>
        </section>

        <div className={styles.planGrid}>
          <PlanCard
            name="Starter"
            amount="$0"
            suffix={allFeaturesFree ? " · all features today" : "/ month"}
            features={STARTER_FEATURES}
            isCurrent
            actions={
              <>
                <PlanButton variant="current" disabled>
                  Included for your store
                </PlanButton>
                <PlanButton variant="primary" href="/app/configure">
                  Open Smart Setup
                </PlanButton>
              </>
            }
          />
          <PlanCard
            name="Pro"
            amount={allFeaturesFree ? formattedPrice : formattedPrice}
            trialHint={`${price.trialDays}-day free trial · cancel anytime`}
            features={PRO_FEATURES}
            featured={!allFeaturesFree}
            actions={
              <>
                <PlanButton variant="primary" href="/app/billing" reloadDocument>
                  Start Pro trial
                </PlanButton>
                <PlanButton variant="ghost" href="/app/analytics">
                  Open Insights
                </PlanButton>
              </>
            }
          />
          <PlanCard
            name="Growth"
            amount={growthPrice}
            features={GROWTH_FEATURES}
            actions={
              <>
                <PlanButton variant="ghost" href="/app/automations">
                  Preview Smart Alerts
                </PlanButton>
                <PlanButton variant="ghost" href="/app/billing" reloadDocument>
                  Upgrade to Growth
                </PlanButton>
              </>
            }
          />
        </div>

        <section className={styles.compareSection}>
          <h2 className={styles.compareTitle}>Compare plans</h2>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Starter</th>
                <th scope="col">Pro</th>
                <th scope="col">Growth</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td>{row.starter ? <span className={styles.check}>✓</span> : <span className={styles.dash}>—</span>}</td>
                  <td>{row.pro ? <span className={styles.check}>✓</span> : <span className={styles.dash}>—</span>}</td>
                  <td>{row.growth ? <span className={styles.check}>✓</span> : <span className={styles.dash}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
