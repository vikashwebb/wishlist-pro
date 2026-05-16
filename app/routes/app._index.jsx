/* eslint-disable react/prop-types */
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { loadWishlistDashboardBootstrap } from "../models/app-bootstrap.server";
import { DashboardLayout } from "../components/wishlist-dashboard/dashboard-layout";
import { AppLink } from "../components/app-link";
import {
  ActionButton,
  StatusPill,
  dashboardStyles as styles,
} from "../components/wishlist-dashboard/shared";
import { useWishlistDashboard } from "../hooks/use-wishlist-dashboard";

export const loader = loadWishlistDashboardBootstrap;

export default function HomePage() {
  const d = useWishlistDashboard();

  const intro = (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Wishlist Pro</p>
        <h1 className={styles.heroTitle}>
          Your wishlist command center
        </h1>
        <p className={styles.heroText}>
          Configure storefront behavior, publish the wishlist page, place theme
          blocks, validate with QA, and review analytics — each in its own workspace.
        </p>

        <div className={styles.heroSignalRow}>
          <div className={styles.progressBadge}>
            <strong>{d.progressPercent}%</strong>
            <span>{d.readinessLabel}</span>
          </div>
          <StatusPill tone={d.qaStepComplete ? "success" : "warning"}>
            {d.qaStepComplete ? "First value reached" : "Activation in progress"}
          </StatusPill>
          <StatusPill tone={d.wishlistRequiresLogin ? "warning" : "success"}>
            {d.wishlistRequiresLogin ? "Login required mode" : "Guest wishlist enabled"}
          </StatusPill>
        </div>

        <div className={styles.progressTrack}>
          <span
            className={styles.progressFill}
            style={{ width: `${d.progressPercent}%` }}
          />
        </div>

        <div className={styles.heroActions}>
          <ActionButton action={d.primaryHeroAction} />
          <ActionButton action={d.secondaryHeroAction} secondary />
        </div>
      </div>
    </section>
  );

  return (
    <s-page heading="Wishlist Pro">
      <DashboardLayout
        d={d}
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
                <span className={styles.metricLabel}>Theme placement</span>
                <strong className={styles.metricValue}>
                  {d.themeStepComplete ? "Confirmed" : "Pending"}
                </strong>
                <p className={styles.metricText}>
                  Confirm in the Theme workspace after adding the block.
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
