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
  StorefrontRulesSection,
  ThemePlacementSection,
  WishlistPageSection,
} from "../components/wishlist-dashboard/sections";
import { AppLink } from "../components/app-link";
import { dashboardStyles as styles } from "../components/wishlist-dashboard/shared";
import gateStyles from "../styles/pro-feature-gate.module.css";
import { useWishlistDashboard } from "../hooks/use-wishlist-dashboard";
import { shouldRevalidateBootstrapPage } from "../utils/app-route-revalidation";

export const loader = loadWishlistDashboardBootstrap;

export function shouldRevalidate(args) {
  return shouldRevalidateBootstrapPage(args);
}

const TABS = [
  { id: "storefront", label: "Storefront" },
  { id: "theme", label: "Theme" },
  { id: "health-qa", label: "Health & QA" },
];

function ConfigureTabs({ activeId }) {
  return (
    <nav className={styles.configureTabs} aria-label="Smart Setup sections">
      {TABS.map((tab) => (
        <AppLink
          key={tab.id}
          className={`${styles.configureTab} ${
            activeId === tab.id ? styles.configureTabActive : ""
          }`}
          href={`/app/configure#${tab.id}`}
        >
          {tab.label}
        </AppLink>
      ))}
    </nav>
  );
}

export default function ConfigurePage() {
  const d = useWishlistDashboard();
  const location = useLocation();
  const hash = location.hash.replace("#", "") || "storefront";
  const activeTab = TABS.some((tab) => tab.id === hash) ? hash : "storefront";

  useEffect(() => {
    scrollToAppHash(location.hash || "#storefront");
  }, [location.hash]);

  const intro = (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Smart Setup</p>
        <h1 className={styles.heroTitle}>Launch WishMe on your storefront</h1>
        <p className={styles.heroText}>
          Storefront rules, theme embed, and health checks live in one workspace.
          Complete each tab to go live faster.
        </p>
      </div>
    </section>
  );

  return (
    <s-page heading="Smart Setup">
      <DashboardLayout
        d={d}
        intro={intro}
        children={
          <section className={styles.stageSection}>
            <ConfigureTabs activeId={activeTab} />
            <MerchantQaPanel d={d} variant="compact" />

            {activeTab === "storefront" ? (
              <>
                <div className={styles.sectionIntro}>
                  <p className={styles.sectionEyebrow}>Storefront</p>
                  <h2 className={styles.sectionTitle}>Rules and wishlist page</h2>
                  <p className={styles.sectionText}>
                    Choose guest vs login-only saving, then confirm your wishlist
                    destination page.
                  </p>
                </div>
                <StorefrontRulesSection d={d} />
                <WishlistPageSection d={d} />
              </>
            ) : null}

            {activeTab === "theme" ? (
              <>
                <div className={styles.sectionIntro}>
                  <p className={styles.sectionEyebrow}>Theme</p>
                  <h2 className={styles.sectionTitle}>Storefront wishlist embed</h2>
                  <p className={styles.sectionText}>
                    Enable Wishlist product cards for homepage, collections, and
                    product pages.
                  </p>
                </div>
                <ThemePlacementSection d={d} />
              </>
            ) : null}

            {activeTab === "health-qa" ? (
              <>
                <div className={styles.sectionIntro}>
                  <p className={styles.sectionEyebrow}>Health & QA</p>
                  <h2 className={styles.sectionTitle}>Data health and merchant QA</h2>
                  <p className={styles.sectionText}>
                    Validate metafields, scopes, and test add/remove flows on a real
                    customer.
                  </p>
                </div>
                {d.isPro ? (
                  <>
                    <MerchantQaPanel d={d} variant="full" />
                    <DataFoundationSection d={d} />
                    <QaLabSection d={d} />
                  </>
                ) : (
                  <ProFeatureGate
                    isPro={false}
                    title="Health checks & merchant QA"
                    description="Upgrade to Pro for live health checks, metafield diagnostics, and the QA lab."
                    className={gateStyles.qaGate}
                  />
                )}
              </>
            ) : null}
          </section>
        }
      />
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
