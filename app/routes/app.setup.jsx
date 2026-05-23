/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useLocation, useRouteError } from "react-router";
import { scrollToAppHash } from "../utils/app-navigation";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { loadWishlistDashboardBootstrap } from "../models/app-bootstrap.server";
import { DashboardLayout } from "../components/wishlist-dashboard/dashboard-layout";
import { ProFeatureGate } from "../components/pro-feature-gate";
import { MerchantQaPanel } from "../components/wishlist-dashboard/merchant-qa-panel";
import {
  DataFoundationSection,
  QaLabSection,
} from "../components/wishlist-dashboard/sections";
import { dashboardStyles as styles } from "../components/wishlist-dashboard/shared";
import gateStyles from "../styles/pro-feature-gate.module.css";
import { useWishlistDashboard } from "../hooks/use-wishlist-dashboard";

export const loader = loadWishlistDashboardBootstrap;

export default function SetupPage() {
  const d = useWishlistDashboard();
  const location = useLocation();

  useEffect(() => {
    scrollToAppHash(location.hash);
  }, [location.hash]);

  const intro = (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Setup & QA</p>
        <h1 className={styles.heroTitle}>Verify data and test the flow</h1>
        <p className={styles.heroText}>
          Confirm metafields, scopes, and protected customer access — then run the
          merchant QA lab with a real customer and product.
        </p>
      </div>
    </section>
  );

  return (
    <s-page heading="Setup & QA">
      <DashboardLayout
        d={d}
        intro={intro}
        children={
          <section className={styles.stageSection}>
            {d.isPro ? (
              <>
                <MerchantQaPanel d={d} variant="full" />
                <div className={styles.sectionIntro}>
                  <p className={styles.sectionEyebrow}>Foundation</p>
                  <h2 className={styles.sectionTitle}>Data health & QA lab</h2>
                  <p className={styles.sectionText}>
                    Step 1 validates your customer data pipeline. Step 2 simulates
                    add and remove on a test wishlist.
                  </p>
                </div>
                <DataFoundationSection d={d} />
                <QaLabSection d={d} />
              </>
            ) : (
              <>
                <div className={styles.sectionIntro}>
                  <p className={styles.sectionEyebrow}>Foundation</p>
                  <h2 className={styles.sectionTitle}>Data health & QA lab</h2>
                  <p className={styles.sectionText}>
                    Step 1 validates your customer data pipeline. Step 2 simulates
                    add and remove on a test wishlist.
                  </p>
                </div>
                <ProFeatureGate
                  isPro={false}
                  title="Merchant QA lab & health checks"
                  description="Upgrade to Pro for live health checks, metafield diagnostics, and the QA lab to test add and remove flows with real customers."
                  className={gateStyles.qaGate}
                />
              </>
            )}
          </section>
        }
      />
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
