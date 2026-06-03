/* eslint-disable react/prop-types */
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { loadWishlistDashboardBootstrap } from "../models/app-bootstrap.server";
import { DashboardLayout } from "../components/wishlist-dashboard/dashboard-layout";
import { MerchantQaPanel } from "../components/wishlist-dashboard/merchant-qa-panel";
import { ThemePlacementSection } from "../components/wishlist-dashboard/sections";
import { dashboardStyles as styles } from "../components/wishlist-dashboard/shared";
import { useWishlistDashboard } from "../hooks/use-wishlist-dashboard";

export const loader = loadWishlistDashboardBootstrap;

export default function ThemePage() {
  const d = useWishlistDashboard();

  const intro = (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Theme</p>
        <h1 className={styles.heroTitle}>Enable storefront wishlist</h1>
        <p className={styles.heroText}>
          Turn on Wishlist product cards once in the theme editor. It covers your
          homepage, collection grids, and product pages without a separate extension.
        </p>
      </div>
    </section>
  );

  return (
    <s-page heading="Theme">
      <DashboardLayout
        d={d}
        intro={intro}
        children={
          <section className={styles.stageSection}>
            <MerchantQaPanel d={d} variant="compact" />

            <div className={styles.sectionIntro}>
              <p className={styles.sectionEyebrow}>Theme editor</p>
              <h2 className={styles.sectionTitle}>Button placement</h2>
              <p className={styles.sectionText}>
                Enable the product cards app embed first. Optional product block or
                auto-insert embed is only for custom product-page placement.
              </p>
            </div>
            <ThemePlacementSection d={d} />
          </section>
        }
      />
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
