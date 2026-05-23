/* eslint-disable react/prop-types */
import { Link, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { PRO_PLAN_PRICE } from "../billing.constants";
import { AppLink } from "../components/app-link";
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
  const { hasProSubscription } = await import("../billing.server");
  const { getShopSettings } = await import("../models/shop-settings.server");
  const { loadWishlistAnalyticsReport } = await import(
    "../models/wishlist-analytics.server"
  );
  const { hasDemoProAccess } = await import("../billing.server");
  const { admin, session, billing } = await authenticate.admin(request);
  const demoPro = hasDemoProAccess(session.shop);
  const [isPro, settings] = await Promise.all([
    hasProSubscription(billing, session.shop),
    getShopSettings(session.shop),
  ]);

  if (!isPro) {
    return {
      isPro: false,
      demoPro,
      shopDomain: session.shop,
      settings,
      available: false,
      analytics: null,
      error: null,
      protectedCustomerAccessBlocked: false,
    };
  }

  const report = await loadWishlistAnalyticsReport(admin);

  return {
    isPro: true,
    demoPro,
    shopDomain: session.shop,
    settings,
    ...report,
  };
};

function ProUpgradePanel() {
  return (
    <section className={styles.upgradeCard}>
      <p className={styles.eyebrow}>Wishlist Pro</p>
      <h2 className={styles.upgradeTitle}>Unlock analytics & export</h2>
      <p className={styles.upgradeText}>
        Pro includes wishlist analytics, CSV export, and login-only storefront mode.
        Free plan keeps guest wishlists, theme blocks, and the wishlist page.
      </p>
      <ul className={styles.upgradeList}>
        <li>Adoption, activity, and top product charts</li>
        <li>Export customers and products to CSV</li>
        <li>Require login before shoppers can save</li>
      </ul>
      <p className={styles.upgradePrice}>
        <strong>${PRO_PLAN_PRICE.amount}/month</strong> · {PRO_PLAN_PRICE.trialDays}-day free
        trial
      </p>
      <Link className={styles.upgradeButton} to="/app/billing" reloadDocument>
        Start Pro trial
      </Link>
      <AppLink className={styles.upgradeLink} href="/app">
        Back to dashboard
      </AppLink>
    </section>
  );
}

export default function AnalyticsPage() {
  const {
    isPro,
    demoPro,
    available,
    protectedCustomerAccessBlocked,
    analytics,
    error,
    shopDomain,
    settings,
  } = useLoaderData();

  if (!isPro) {
    return (
      <s-page heading="Wishlist analytics">
        <div className={styles.page}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>Store intelligence</p>
            <h1 className={styles.heroTitle}>Analytics is a Pro feature</h1>
            <p className={styles.heroText}>
              Upgrade to see what shoppers save, export wishlist data, and enable
              login-only mode on the storefront.
            </p>
            {shopDomain ? (
              <p className={styles.heroHint}>
                Demo store: <code>{shopDomain}</code> — add{" "}
                <code>DEMO_PRO_SHOPS={shopDomain}</code> or{" "}
                <code>DEMO_PRO_ACCESS=true</code> on Vercel, then redeploy.
              </p>
            ) : null}
          </section>
          <ProUpgradePanel />
        </div>
      </s-page>
    );
  }

  if (!available) {
    return (
      <s-page heading="Wishlist analytics">
        <div className={styles.page}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>Store intelligence</p>
            <h1 className={styles.heroTitle}>Wishlist analytics unavailable</h1>
            {demoPro ? (
              <p className={styles.heroBadge}>Demo Pro active — data access still required</p>
            ) : null}
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
            <div className={styles.heroActions}>
              <a className={styles.exportButton} href="/app/api/analytics-export">
                Export CSV
              </a>
            </div>
          </div>
        </section>

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
