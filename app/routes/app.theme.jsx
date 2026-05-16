/* eslint-disable react/prop-types */
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { loadWishlistDashboardBootstrap } from "../models/app-bootstrap.server";
import { DashboardLayout } from "../components/wishlist-dashboard/dashboard-layout";
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
        <h1 className={styles.heroTitle}>Place the wishlist button</h1>
        <p className={styles.heroText}>
          Add the product app block or enable the app embed, then confirm placement
          when the button is visible in your theme preview.
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
            <div className={styles.sectionIntro}>
              <p className={styles.sectionEyebrow}>Theme editor</p>
              <h2 className={styles.sectionTitle}>Button placement</h2>
              <p className={styles.sectionText}>
                Use the app block on Online Store 2.0 product templates, or the
                embed fallback for legacy liquid templates.
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
