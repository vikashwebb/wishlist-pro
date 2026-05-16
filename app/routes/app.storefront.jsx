/* eslint-disable react/prop-types */
import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { loadWishlistDashboardBootstrap } from "../models/app-bootstrap.server";
import { DashboardLayout } from "../components/wishlist-dashboard/dashboard-layout";
import {
  StorefrontRulesSection,
  WishlistPageSection,
} from "../components/wishlist-dashboard/sections";
import { dashboardStyles as styles } from "../components/wishlist-dashboard/shared";
import { useWishlistDashboard } from "../hooks/use-wishlist-dashboard";

export const loader = loadWishlistDashboardBootstrap;

export default function StorefrontPage() {
  const d = useWishlistDashboard();

  const intro = (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Storefront</p>
        <h1 className={styles.heroTitle}>Rules and wishlist page</h1>
        <p className={styles.heroText}>
          Choose guest vs login-only saving, then publish the dedicated wishlist
          page shoppers will visit.
        </p>
      </div>
    </section>
  );

  return (
    <s-page heading="Storefront">
      <DashboardLayout
        d={d}
        intro={intro}
        children={
          <section className={styles.stageSection}>
            <div className={styles.sectionIntro}>
              <p className={styles.sectionEyebrow}>Shopper experience</p>
              <h2 className={styles.sectionTitle}>Access rules & destination page</h2>
              <p className={styles.sectionText}>
                Set who can save items, then publish the page where shoppers review
                their saved products.
              </p>
            </div>
            <StorefrontRulesSection d={d} />
            <WishlistPageSection d={d} />
          </section>
        }
      />
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
