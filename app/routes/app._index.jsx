/* eslint-disable react/prop-types */
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { loadWishlistDashboardBootstrap } from "../models/app-bootstrap.server";
import { DashboardLayout } from "../components/wishlist-dashboard/dashboard-layout";
import { AppLink } from "../components/app-link";
import { HeroLaunchStatus } from "../components/wishlist-dashboard/hero-launch-status";
import { MerchantQaPanel } from "../components/wishlist-dashboard/merchant-qa-panel";
import {
  StatusPill,
  dashboardStyles as styles,
} from "../components/wishlist-dashboard/shared";
import { useWishlistDashboard } from "../hooks/use-wishlist-dashboard";

import { shouldRevalidateBootstrapPage } from "../utils/app-route-revalidation";

export const loader = async (args) => {
  try {
    return await loadWishlistDashboardBootstrap(args);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    console.error("wishlist.home.loader.error", error);
    throw error;
  }
};

export function shouldRevalidate(args) {
  return shouldRevalidateBootstrapPage(args);
}

export default function HomePage() {
  const d = useWishlistDashboard();

  const intro = (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>WishMe</p>
        <h1 className={styles.heroTitle}>
          Your WishMe command center
        </h1>
        <p className={styles.heroText}>
          Smart Setup, Smart Alerts, Insights, and launch progress — everything
          to turn saved products into sales.
        </p>

        <HeroLaunchStatus
          progressPercent={d.progressPercent}
          readinessLabel={d.readinessLabel}
          qaStepComplete={d.qaStepComplete}
          wishlistRequiresLogin={d.wishlistRequiresLogin}
          primaryAction={d.primaryHeroAction}
          secondaryAction={d.secondaryHeroAction}
        />
      </div>
    </section>
  );

  return (
    <s-page heading="WishMe">
      <DashboardLayout
        d={d}
        rail="full"
        intro={intro}
        children={
          <section className={styles.stageSection}>
            <div className={styles.sectionIntro}>
              <p className={styles.sectionEyebrow}>Navigation</p>
              <h2 className={styles.sectionTitle}>Choose a workspace</h2>
              <p className={styles.sectionText}>
                Work through setup in order, or jump to the area you need.
              </p>
            </div>

            <MerchantQaPanel d={d} variant="compact" />

            <div className={styles.pageNavGrid}>
              {d.setupPages.map((page) => (
                <AppLink key={page.href} href={page.href} className={styles.pageNavCard}>
                  <div className={styles.pageNavHeader}>
                    <h3 className={styles.pageNavTitle}>{page.title}</h3>
                    <StatusPill tone={page.complete ? "success" : "warning"}>
                      {page.complete ? "Complete" : "In progress"}
                    </StatusPill>
                  </div>
                  <p className={styles.pageNavText}>{page.description}</p>
                  <span className={styles.pageNavLink}>Open →</span>
                </AppLink>
              ))}
            </div>

            <div className={styles.metricGrid}>
              <article className={styles.inlineMetric}>
                <span className={styles.metricLabel}>Saved items (QA customer)</span>
                <strong className={styles.metricValue}>{d.wishlistCount}</strong>
                <p className={styles.metricText}>{d.selectedCustomerLabel}</p>
              </article>
              <article className={styles.inlineMetric}>
                <span className={styles.metricLabel}>Wishlist page</span>
                <strong className={styles.metricValue}>
                  {d.pageStepComplete ? d.wishlistPagePreviewPath : "Not published"}
                </strong>
                <p className={styles.metricText}>
                  {d.pageStepComplete
                    ? "Shoppers have a dedicated destination."
                    : "Publish from the Storefront workspace."}
                </p>
              </article>
              <article className={styles.inlineMetric}>
                <span className={styles.metricLabel}>Storefront wishlist</span>
                <strong className={styles.metricValue}>
                  {d.productCardsEmbedEnabled
                    ? "Embed on"
                    : d.themeStepComplete
                      ? "Confirmed"
                      : "Pending"}
                </strong>
                <p className={styles.metricText}>
                  Enable Wishlist product cards in Theme → App embeds.
                </p>
              </article>
            </div>
          </section>
        }
      />
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
