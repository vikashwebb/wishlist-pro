/* eslint-disable react/prop-types */
import { Link, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { PRO_PLAN_PRICE } from "../billing.constants";
import { AppLink } from "../components/app-link";
import styles from "../styles/app-pricing.module.css";

const FREE_FEATURES = [
  "Guest wishlist with login sync",
  "Product & collection wishlist buttons",
  "Auto-created wishlist page",
  "Theme blocks & icon styling",
  "Setup launch checklist",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Merchant QA lab (add / remove test saves)",
  "Live health checks & metafield diagnostics",
  "Login-only wishlist mode",
  "Analytics dashboard & charts",
  "CSV export (customer, product, or full)",
  "Date-filtered reports (up to 62 days)",
];

const COMPARE_ROWS = [
  { feature: "Storefront wishlist buttons", free: true, pro: true },
  { feature: "Guest wishlist", free: true, pro: true },
  { feature: "Wishlist page", free: true, pro: true },
  { feature: "Merchant QA lab & health checks", free: false, pro: true },
  { feature: "Login-only mode", free: false, pro: true },
  { feature: "Analytics dashboard", free: false, pro: true },
  { feature: "CSV export", free: false, pro: true },
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

  return (
    <AppLink className={className} href={href}>
      {children}
    </AppLink>
  );
}

function FeatureList({ items, featured = false }) {
  return (
    <ul className={styles.featureList}>
      {items.map((item) => (
        <li key={item} className={styles.featureItem}>
          <span
            className={`${styles.featureIcon} ${
              featured ? "" : styles.featureIconMuted
            }`}
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

function PlanCard({
  name,
  amount,
  suffix = "/ month",
  trialHint,
  features,
  featured,
  isCurrent,
  actions,
}) {
  return (
    <article
      className={`${styles.planCard} ${
        featured ? styles.planCardFeatured : ""
      }`}
    >
      <div className={styles.planCardHeader}>
        <span
          className={`${styles.planBadge} ${
            isCurrent
              ? styles.planBadgeCurrent
              : featured
                ? styles.planBadgeFeatured
                : ""
          }`}
        >
          {isCurrent ? "Current plan" : featured ? "Recommended" : "Free forever"}
        </span>
        <h2 className={styles.planName}>{name}</h2>
        <p className={styles.planPrice}>
          {amount}{" "}
          <span className={styles.planPriceSuffix}>{suffix}</span>
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
  const { hasProSubscription } = await import("../billing.server");
  const { billing, session } = await authenticate.admin(request);
  const isPro = await hasProSubscription(billing, session.shop);

  return {
    isPro,
    price: PRO_PLAN_PRICE,
  };
};

export default function PricingPage() {
  const { isPro, price } = useLoaderData();
  const formattedPrice = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: price.currencyCode,
  }).format(price.amount);

  return (
    <s-page heading="Pricing">
      <div className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Plans</p>
          <h1 className={styles.heroTitle}>Simple pricing for every store</h1>
          <p className={styles.heroText}>
            Every plan includes storefront wishlist tools and the launch
            checklist. Upgrade to Pro for the merchant QA lab, health checks,
            login-only mode, analytics, and exports.
          </p>
          <span className={styles.currentPlan}>
            {isPro ? "You are on Wishlist Pro" : "You are on the Free plan"}
          </span>
        </section>

        <div className={styles.planGrid}>
          <PlanCard
            name="Free"
            amount="$0"
            features={FREE_FEATURES}
            isCurrent={!isPro}
            actions={
              !isPro ? (
                <PlanButton variant="current" disabled>
                  Current plan
                </PlanButton>
              ) : (
                <PlanButton variant="secondary" href="/app">
                  View dashboard
                </PlanButton>
              )
            }
          />

          <PlanCard
            name="Pro"
            amount={formattedPrice}
            trialHint={`${price.trialDays}-day free trial · cancel anytime`}
            features={PRO_FEATURES}
            featured
            isCurrent={isPro}
            actions={
              isPro ? (
                <>
                  <PlanButton variant="primary" href="/app/analytics">
                    Open analytics
                  </PlanButton>
                  <PlanButton variant="ghost" href="/app/storefront">
                    Storefront settings
                  </PlanButton>
                </>
              ) : (
                <>
                  <PlanButton
                    variant="primary"
                    href="/app/billing"
                    reloadDocument
                  >
                    Start {price.trialDays}-day free trial
                  </PlanButton>
                  <PlanButton variant="ghost" href="/app/analytics">
                    Preview analytics
                  </PlanButton>
                </>
              )
            }
          />
        </div>

        <section className={styles.compareSection}>
          <h2 className={styles.compareTitle}>Compare plans</h2>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Free</th>
                <th scope="col">Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td>
                    {row.free ? (
                      <span className={styles.check}>✓</span>
                    ) : (
                      <span className={styles.dash}>—</span>
                    )}
                  </td>
                  <td>
                    {row.pro ? (
                      <span className={styles.check}>✓</span>
                    ) : (
                      <span className={styles.dash}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.footnote}>
            Charges appear on your Shopify bill. Development stores use test
            billing with no real charge.
          </p>
        </section>
      </div>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
