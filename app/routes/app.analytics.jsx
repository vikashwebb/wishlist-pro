/* eslint-disable react/prop-types */
import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppLink } from "../components/app-link";
import { AnalyticsExportPanel } from "../components/analytics-export-panel";
import { ProFeatureGate } from "../components/pro-feature-gate";
import gateStyles from "../styles/pro-feature-gate.module.css";
import {
  AreaTrendChart,
  DonutChart,
  HorizontalBarChart,
  VerticalBarChart,
} from "../components/analytics-charts";
import styles from "../styles/app-analytics.module.css";

function formatPercent(value) {
  return `${value}%`;
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function MetricCard({ label, value, hint }) {
  return (
    <article className={styles.metricCard}>
      <p className={styles.metricLabel}>{label}</p>
      <strong className={styles.metricValue}>{value}</strong>
      {hint ? <p className={styles.metricHint}>{hint}</p> : null}
    </article>
  );
}

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { getShopSettings } = await import("../models/shop-settings.server");
  const { loadWishlistAnalyticsReport } = await import(
    "../models/wishlist-analytics.server"
  );
  const { hasProSubscription } = await import("../billing.server");
  const { admin, session, billing } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);
  const isPro = await hasProSubscription(billing, session.shop);

  if (!isPro) {
    return {
      isPro: false,
      shopDomain: session.shop,
      settings,
      available: true,
      protectedCustomerAccessBlocked: false,
      analytics: null,
      error: null,
    };
  }

  const report = await loadWishlistAnalyticsReport(admin);

  return {
    isPro: true,
    shopDomain: session.shop,
    settings,
    ...report,
  };
};

export default function AnalyticsPage() {
  const {
    available,
    protectedCustomerAccessBlocked,
    analytics,
    error,
    shopDomain,
    settings,
    isPro,
  } = useLoaderData();

  if (!available) {
    return (
      <s-page heading="Wishlist analytics">
        <div className={styles.page}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>Store intelligence</p>
            <h1 className={styles.heroTitle}>Wishlist analytics unavailable</h1>
            <p className={styles.heroText}>
              {protectedCustomerAccessBlocked
                ? "Approve protected customer data access in Partner Dashboard, reinstall the app, then return here."
                : error || "We could not load wishlist analytics for this store."}
            </p>
          </section>
          <article className={`${styles.insightCard} ${styles.insightCardWarning}`}>
            <p className={styles.insightTitle}>What you can do next</p>
            {protectedCustomerAccessBlocked ? (
              <ol className={styles.stepsList}>
                <li>
                  Open{" "}
                  <a
                    href="https://partners.shopify.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Partner Dashboard
                  </a>{" "}
                  → your app → <strong>API access requests</strong> → approve
                  customer data.
                </li>
                <li>Uninstall Wishlist Pro on the store, then install again.</li>
                <li>
                  Save a wishlist on the storefront (guest login sync or Setup QA lab),
                  then refresh this page.
                </li>
              </ol>
            ) : (
              <p className={styles.insightText}>
                Run the setup health check, confirm customer metafields are writable,
                and test a wishlist save on the storefront.
              </p>
            )}
            <AppLink className={styles.linkButton} href="/app/setup">
              Open Setup &amp; QA
            </AppLink>
          </article>
        </div>
      </s-page>
    );
  }

  if (!isPro || !analytics) {
    return (
      <s-page heading="Wishlist analytics">
        <div className={styles.page}>
          <section className={styles.hero}>
            <div className={styles.heroTopRow}>
              <div>
                <p className={styles.eyebrow}>Store intelligence</p>
                <span className={styles.heroBadge}>Wishlist Pro</span>
                <h1 className={styles.heroTitle}>Understand what shoppers are saving</h1>
                <p className={styles.heroText}>
                  Live wishlist insights from customer metafields. Upgrade to Pro to
                  view charts, top products, engaged customers, and CSV exports.
                </p>
              </div>
            </div>
          </section>

          <ProFeatureGate
            isPro={false}
            className={gateStyles.analyticsGate}
            title="Wishlist analytics & export"
            description="Upgrade to Pro for live charts, customer insights, top products, and CSV exports with date filters."
          />
        </div>
      </s-page>
    );
  }

  const summary = analytics.summary;
  const charts = analytics.charts ?? {
    adoption: { withWishlist: 0, withoutWishlist: 0 },
    wishlistSizes: [],
    activityTimeline: [],
  };
  const storefrontUrl = shopDomain ? `https://${shopDomain}` : null;
  const wishlistPagePath = `/pages/${settings.wishlistPageHandle || "wishlist"}`;

  return (
    <s-page heading="Wishlist analytics">
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroTopRow}>
            <div>
              <p className={styles.eyebrow}>Store intelligence</p>
              <h1 className={styles.heroTitle}>Understand what shoppers are saving</h1>
              <p className={styles.heroText}>
                Live wishlist insights from customer metafields. Use this page to find
                popular products, active customers, and overall adoption.
              </p>
            </div>
          </div>
        </section>

        <AnalyticsExportPanel buttonClassName={styles.exportButton} />

        {summary.truncated ? (
          <article className={`${styles.insightCard} ${styles.insightCardWarning}`}>
            <p className={styles.insightTitle}>Showing the first 1,000 customers</p>
            <p className={styles.insightText}>
              This store has more customers than we loaded in one pass. Metrics below
              are directionally correct but may be understated.
            </p>
          </article>
        ) : null}

        <section className={styles.metricGrid}>
          <MetricCard
            label="Customers with wishlists"
            value={summary.customersWithWishlist}
            hint={`${formatPercent(summary.adoptionRate)} of ${summary.customersScanned} customers scanned`}
          />
          <MetricCard
            label="Total saved items"
            value={summary.totalWishlistItems}
            hint="Product saves across all customer wishlists"
          />
          <MetricCard
            label="Unique products saved"
            value={summary.uniqueProductsWishlisted}
            hint="Distinct products in wishlists"
          />
          <MetricCard
            label="Avg items per active customer"
            value={summary.averageItemsPerCustomer}
            hint="Among customers with at least one saved product"
          />
        </section>

        <section className={styles.chartGrid}>
          <DonutChart
            title="Wishlist adoption"
            description="Share of scanned customers with at least one saved product."
            segments={[
              {
                label: "With wishlist",
                value: charts.adoption.withWishlist,
                color: "#1d6b59",
              },
              {
                label: "No wishlist yet",
                value: charts.adoption.withoutWishlist,
                color: "#cbd5e1",
              },
            ]}
            footnote={`${formatPercent(summary.adoptionRate)} adoption among customers scanned.`}
          />
          <AreaTrendChart
            title="Wishlist activity"
            description="Customers whose wishlist metafield was updated each day (last 14 days)."
            points={charts.activityTimeline}
          />
          <VerticalBarChart
            title="Wishlist size distribution"
            description="How many products active customers are saving."
            items={charts.wishlistSizes}
          />
        </section>

        <div className={styles.layout}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Top wishlisted products</h2>
            <p className={styles.panelText}>
              Ranked by how many customers saved each product.
            </p>

            {analytics.topProducts.length > 0 ? (
              <div className={styles.productList}>
                {analytics.topProducts.map((product) => (
                  <article key={product.productId} className={styles.productRow}>
                    {product.imageUrl ? (
                      <img
                        className={styles.productImage}
                        src={product.imageUrl}
                        alt={product.imageAlt}
                      />
                    ) : (
                      <div className={styles.productPlaceholder}>No image</div>
                    )}
                    <div>
                      <p className={styles.rowTitle}>{product.title}</p>
                      <p className={styles.rowMeta}>
                        {product.customerCount}{" "}
                        {product.customerCount === 1 ? "customer" : "customers"} ·{" "}
                        {product.saveCount} saves
                      </p>
                    </div>
                    
                    <div className={styles.rowStat}>
                      <strong>{product.customerCount}</strong>
                      <span>customers</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                No wishlist products yet. Once shoppers save items on the storefront,
                they will appear here.
              </div>
            )}
          </section>

          <div className={styles.sideColumn}>
            <HorizontalBarChart
              title="Top products chart"
              description="Leading products by how many customers saved them."
              items={analytics.topProducts.slice(0, 6)}
            />

            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Most engaged customers</h2>
              <p className={styles.panelText}>
                Customers with the largest wishlists right now.
              </p>

              {analytics.topCustomers.length > 0 ? (
                <div className={styles.customerList}>
                  {analytics.topCustomers.map((customer) => (
                    <article key={customer.id} className={styles.customerRow}>
                      <div>
                        <p className={styles.rowTitle}>{customer.displayName}</p>
                        <p className={styles.rowMeta}>
                          {customer.email || "No email on file"}
                        </p>
                      </div>
                      <div className={styles.rowStat}>
                        <strong>{customer.itemCount}</strong>
                        <span>items</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>No engaged customers yet.</div>
              )}
            </section>

            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Recent wishlist updates</h2>
              <p className={styles.panelText}>
                Latest metafield updates from customer wishlists.
              </p>

              {analytics.recentActivity.length > 0 ? (
                <div className={styles.activityList}>
                  {analytics.recentActivity.map((customer) => (
                    <article key={customer.id} className={styles.activityRow}>
                      <div>
                        <p className={styles.rowTitle}>{customer.displayName}</p>
                        <p className={styles.rowMeta}>
                          {customer.itemCount}{" "}
                          {customer.itemCount === 1 ? "item" : "items"} ·{" "}
                          {formatDate(customer.updatedAt)}
                        </p>
                      </div>
                      <div className={styles.rowStat}>
                        <strong>{customer.itemCount}</strong>
                        <span>saved</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>No recent updates yet.</div>
              )}
            </section>

            <article className={`${styles.insightCard} ${styles.insightCardInfo}`}>
              <p className={styles.insightTitle}>How to read this report</p>
              <p className={styles.insightText}>
                Metrics reflect saved wishlist state, not button clicks. Guest saves
                appear after login sync. Storefront mode:{" "}
                {settings.wishlistRequiresLogin
                  ? "login required"
                  : "guest wishlist enabled"}
                .
              </p>
              {storefrontUrl ? (
                <a
                  className={styles.linkButton}
                  href={`${storefrontUrl}${wishlistPagePath}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open wishlist page
                </a>
              ) : null}
            </article>
          </div>
        </div>
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
