/* eslint-disable react/prop-types */
import { AppLink } from "../app-link";
import { DEFINITION_NAME, KEY, NAMESPACE } from "../../models/wishlist";
import {
  ActionButton,
  DashboardSelect,
  StatusPill,
  formatCustomerLabel,
  formatProductLabel,
  dashboardStyles as styles,
} from "./shared";

function DataFoundationSection({ d }) {
  return (
<article id="data-foundation" className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div>
                    <span className={styles.stepIndex}>Step 1</span>
                    <h3 className={styles.stepTitle}>
                      Verify the customer data foundation
                    </h3>
                  </div>
                  <StatusPill
                    tone={
                      d.customerDataStepComplete
                        ? "success"
                        : d.customerAccessBlocked
                          ? "critical"
                          : d.diagnosticsFresh
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {d.customerDataStepComplete
                      ? "Ready for launch"
                      : d.customerAccessBlocked
                        ? "Approval blocked"
                        : d.diagnosticsFresh
                          ? "Needs attention"
                          : "Check required"}
                  </StatusPill>
                </div>
                <p className={styles.stepText}>
                  Wishlist Pro creates the customer metafield definition automatically
                  when you install or open the app. This step confirms scopes,
                  protected customer access, and that your QA customer can read and
                  write wishlist data.
                </p>

                {d.customerAccessBlocked ? (
                  <div className={`${styles.callout} ${styles.calloutWarning}`}>
                    Protected customer data is still blocked for this app. Approve
                    customer access in Partner Dashboard, reinstall the app, and
                    then re-run the live system check.
                  </div>
                ) : null}

                {d.storefrontLocalOnlyMode ? (
                  <div className={`${styles.callout} ${styles.calloutWarning}`}>
                    Storefront wishlist actions are running in browser-only mode until
                    protected customer access is approved. Saved items will not persist
                    to customer metafields yet.
                  </div>
                ) : null}

                {d.diagnosticsWarnings.length > 0 ? (
                  <div className={`${styles.callout} ${styles.calloutInfo}`}>
                    {d.diagnosticsWarnings.join(" ")}
                  </div>
                ) : null}

                {!d.diagnosticsFresh && d.selectedCustomerId && d.diagnostics ? (
                  <div className={`${styles.callout} ${styles.calloutInfo}`}>
                    The selected customer changed. Re-run the live system check so
                    the health panel matches the active QA customer.
                  </div>
                ) : null}

                <div className={styles.controlGrid}>
                  <div className={styles.formCard}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>QA customer</span>
                      <DashboardSelect
                        label="QA customer"
                        value={d.selectedCustomerId}
                        onChange={d.setSelectedCustomerId}
                        disabled={d.customers.length === 0}
                      >
                        {d.customers.length === 0 ? (
                          <option value="">No customers available</option>
                        ) : (
                          d.customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {formatCustomerLabel(customer)}
                            </option>
                          ))
                        )}
                      </DashboardSelect>
                    </label>
                    <p className={styles.fieldHint}>
                      Pick the customer you want to inspect and later use in the
                      QA lab.
                    </p>
                  </div>

                  <div className={styles.metricGrid}>
                    <article className={styles.inlineMetric}>
                      <span className={styles.metricLabel}>Definition</span>
                      <strong className={styles.metricValue}>
                        {d.definitionReady ? DEFINITION_NAME : "Not verified"}
                      </strong>
                      <p className={styles.metricText}>
                        Expected key: <code>{NAMESPACE}.{KEY}</code>
                      </p>
                    </article>
                    <article className={styles.inlineMetric}>
                      <span className={styles.metricLabel}>Customer access</span>
                      <strong className={styles.metricValue}>
                        {d.customerAccessReady
                          ? "Approved"
                          : d.customerAccessBlocked
                            ? "Blocked"
                            : "Pending review"}
                      </strong>
                      <p className={styles.metricText}>
                        {d.selectedCustomerId
                          ? "Uses the active customer for a real access test."
                          : "Choose a customer to verify protected data access."}
                      </p>
                    </article>
                    <article className={styles.inlineMetric}>
                      <span className={styles.metricLabel}>Customer metafield</span>
                      <strong className={styles.metricValue}>
                        {d.customerMetafieldReady ? "Found" : "Not yet created"}
                      </strong>
                      <p className={styles.metricText}>
                        {d.diagnosticsFresh
                          ? `Wishlist contains ${
                              d.diagnostics?.checks?.customerWishlistItemsCount ?? 0
                            } saved items.`
                          : "Run the live system check to inspect the customer record."}
                      </p>
                    </article>
                  </div>
                </div>

                {d.diagnosticsErrors.length > 0 ? (
                  <div className={`${styles.callout} ${styles.calloutCritical}`}>
                    {d.diagnosticsErrors.join(" ")}
                  </div>
                ) : null}

                <div className={styles.buttonRow}>
                  <ActionButton
                    action={{
                      label: d.diagnosticsFresh
                        ? "Re-run live system check"
                        : "Run live system check",
                      onClick: d.runDiagnostics,
                      loading: d.isCheckingMetafield,
                    }}
                  />
                  <ActionButton
                    action={{
                      label: "Refresh customer snapshot",
                      onClick: d.refreshWishlistSnapshot,
                      loading: d.isReloadingWishlist,
                      disabled: !d.selectedCustomerId,
                    }}
                    secondary
                  />
                </div>
              </article>
  );
}

function StorefrontRulesSection({ d }) {
  return (
<article id="storefront-rules" className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div>
                    <span className={styles.stepIndex}>Step 2</span>
                    <h3 className={styles.stepTitle}>
                      Choose the storefront access rules
                    </h3>
                  </div>
                  <StatusPill tone={d.wishlistRequiresLogin ? "warning" : "success"}>
                    {d.wishlistRequiresLogin
                      ? "Login required"
                      : "Guest wishlist enabled"}
                  </StatusPill>
                </div>
                <p className={styles.stepText}>
                  Set the shopper experience you want before launching. This is
                  the policy decision merchants care about most because it shapes
                  sign-in friction and wishlist adoption.
                </p>

                <label className={styles.checkboxTile}>
                  <input
                    type="checkbox"
                    checked={d.wishlistRequiresLogin}
                    onChange={(event) =>
                      d.setWishlistRequiresLogin(event.currentTarget.checked)
                    }
                  />
                  <span>
                    Require customer login before shoppers can save products to
                    wishlist
                    {!d.isPro ? (
                      <strong className={styles.proTag}> · Pro</strong>
                    ) : null}
                  </span>
                </label>

                {!d.isPro ? (
                  <div className={`${styles.callout} ${styles.calloutInfo}`}>
                    Login-only mode is included with Wishlist Pro ($5.99/mo).{" "}
                    <AppLink href="/app/pricing">View pricing</AppLink> to upgrade.
                  </div>
                ) : null}

                <div className={`${styles.callout} ${styles.calloutInfo}`}>
                  Button colors and styles are configured in the Theme Editor on
                  the app block or embed, so this step focuses only on storefront
                  behavior.
                </div>

                <div className={styles.buttonRow}>
                  <ActionButton
                    action={{
                      label: "Save storefront rules",
                      onClick: d.saveStorefrontSettings,
                      loading: d.isSavingSettings,
                    }}
                  />
                </div>
              </article>
  );
}

function WishlistPageSection({ d }) {
  return (
<article id="wishlist-page" className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div>
                    <span className={styles.stepIndex}>Step 3</span>
                    <h3 className={styles.stepTitle}>
                      Wishlist destination page
                    </h3>
                  </div>
                  <StatusPill
                    tone={
                      d.pageStepComplete
                        ? "success"
                        : d.hasWriteOnlineStorePagesScope
                          ? "warning"
                          : "critical"
                    }
                  >
                    {d.pageStepComplete
                      ? "Page is live"
                      : d.hasWriteOnlineStorePagesScope
                        ? "Creating…"
                        : "Scope required"}
                  </StatusPill>
                </div>
                <p className={styles.stepText}>
                  The app creates a published page at{" "}
                  <code>{d.wishlistPagePreviewPath}</code> automatically when page
                  permissions are granted. Customize the title or URL below only if
                  you need something different.
                </p>

                {!d.hasWriteOnlineStorePagesScope ? (
                  <div className={`${styles.callout} ${styles.calloutWarning}`}>
                    Add the <code>write_online_store_pages</code> scope and
                    reinstall the app before publishing the wishlist page.
                  </div>
                ) : null}

                {d.pageStepComplete ? (
                  <div className={`${styles.callout} ${styles.calloutSuccess}`}>
                    Wishlist page is live at <code>/pages/{d.wishlistPage.handle}</code>.
                    No manual publish step required.
                  </div>
                ) : d.hasWriteOnlineStorePagesScope ? (
                  <div className={`${styles.callout} ${styles.calloutInfo}`}>
                    The page is created automatically on install. Refresh this
                    screen if it does not appear within a few seconds.
                  </div>
                ) : null}

                <div className={`${styles.callout} ${styles.calloutInfo}`}>
                  Creating or updating the wishlist page includes the wishlist UI
                  and scripts in the page content. Do not add the{" "}
                  <strong>Wishlist page</strong> app block on the same page. Guest
                  saves merge when shoppers visit pages that load wishlist scripts
                  (product page, collection cards, wishlist page).
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Page title</span>
                    <input
                      className={styles.fieldInput}
                      type="text"
                      value={d.wishlistPageTitle}
                      onChange={(event) =>
                        d.setWishlistPageTitle(event.currentTarget.value)
                      }
                      placeholder="Wishlist"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Page handle</span>
                    <input
                      className={styles.fieldInput}
                      type="text"
                      value={d.wishlistPageHandle}
                      onChange={(event) =>
                        d.setWishlistPageHandle(event.currentTarget.value)
                      }
                      placeholder="wishlist"
                    />
                    <span className={styles.fieldHint}>
                      Final URL: <code>{d.wishlistPagePreviewPath}</code>
                    </span>
                  </label>
                </div>

                <div className={styles.buttonRow}>
                  <ActionButton
                    action={{
                      label: d.pageStepComplete
                        ? "Save page changes"
                        : "Create wishlist page now",
                      onClick: d.saveWishlistPage,
                      loading: d.isCreatingWishlistPage,
                      disabled: !d.hasWriteOnlineStorePagesScope,
                    }}
                  />
                  <ActionButton
                    action={
                      d.wishlistPageUrl
                        ? {
                            label: "Open live page",
                            href: d.wishlistPageUrl,
                            target: "_blank",
                            rel: "noreferrer",
                          }
                        : {
                            label: "Open live page",
                            disabled: true,
                          }
                    }
                    secondary
                  />
                </div>
              </article>
  );
}

function ThemePlacementSection({ d }) {
  const embedStatusLabel = d.productCardsEmbedEnabled
    ? "Enabled on theme"
    : d.themeEmbedDetectionAvailable
      ? "Not enabled yet"
      : d.themePlacementConfirmed
        ? "Confirmed manually"
        : d.hasThemeEditorLinks
          ? "Enable in theme editor"
          : "Theme editor unavailable";

  const embedStatusTone = d.productCardsEmbedEnabled
    ? "success"
    : d.themeStepComplete
      ? "success"
      : d.hasThemeEditorLinks
        ? "warning"
        : "neutral";

  return (
<article id="theme-placement" className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div>
                    <span className={styles.stepIndex}>Step 4</span>
                    <h3 className={styles.stepTitle}>
                      Enable storefront wishlist
                    </h3>
                  </div>
                  <StatusPill tone={embedStatusTone}>{embedStatusLabel}</StatusPill>
                </div>
                <p className={styles.stepText}>
                  One app embed covers homepage featured products, collection
                  grids, search results, and product pages. Shopify still requires
                  you to turn it on once in the theme editor, then save.
                </p>

                {d.productCardsEmbedEnabled ? (
                  <div className={`${styles.callout} ${styles.calloutSuccess}`}>
                    Wishlist product cards is enabled on your live theme. Shoppers
                    should see wishlist controls on product grids and the product
                    page when products are linked or detected.
                  </div>
                ) : (
                  <div className={`${styles.callout} ${styles.calloutInfo}`}>
                    Click below to open App embeds with{" "}
                    <strong>Wishlist product cards</strong> selected. Toggle it on
                    and save the theme. Works even when you do not use separate
                    product or collection pages in navigation.
                  </div>
                )}

                <div className={styles.pathGrid}>
                  <article className={styles.pathCard}>
                    <span className={styles.metricLabel}>Required</span>
                    <h4 className={styles.pathTitle}>Wishlist product cards</h4>
                    <p className={styles.pathText}>
                      Homepage, collection, search, and product templates. This is
                      the main setup for most stores.
                    </p>
                    <ActionButton
                      action={
                        d.productCardsEmbedEditorUrl
                          ? {
                              label: d.productCardsEmbedEnabled
                                ? "Review embed settings"
                                : "Enable homepage & grid wishlist",
                              href: d.productCardsEmbedEditorUrl,
                              target: "_top",
                              rel: "noreferrer",
                            }
                          : {
                              label: "Enable homepage & grid wishlist",
                              disabled: true,
                            }
                      }
                    />
                  </article>

                  <article className={styles.pathCard}>
                    <span className={styles.metricLabel}>Optional</span>
                    <h4 className={styles.pathTitle}>
                      Product page block or auto-insert
                    </h4>
                    <p className={styles.pathText}>
                      Only if you need a fixed position next to Add to cart instead
                      of the cards embed on the product page.
                    </p>
                    <div className={styles.buttonRow}>
                      <ActionButton
                        action={
                          d.productPageButtonEditorUrl
                            ? {
                                label: "Product block",
                                href: d.productPageButtonEditorUrl,
                                target: "_top",
                                rel: "noreferrer",
                              }
                            : {
                                label: "Product block",
                                disabled: true,
                              }
                        }
                        secondary
                      />
                      <ActionButton
                        action={
                          d.productPageEmbedEditorUrl
                            ? {
                                label: "Product auto-insert",
                                href: d.productPageEmbedEditorUrl,
                                target: "_top",
                                rel: "noreferrer",
                              }
                            : {
                                label: "Product auto-insert",
                                disabled: true,
                              }
                        }
                        secondary
                      />
                    </div>
                  </article>
                </div>

                {!d.themeEmbedDetectionAvailable ? (
                  <div className={`${styles.callout} ${styles.calloutInfo}`}>
                    Theme file access is unavailable, so we cannot verify the embed
                    automatically. After enabling it, confirm below.
                  </div>
                ) : null}

                <div className={styles.buttonRow}>
                  <ActionButton
                    action={{
                      label: d.themePlacementConfirmed
                        ? "Mark as not confirmed"
                        : "Confirm storefront wishlist is live",
                      onClick: () =>
                        d.handleThemePlacementConfirmation(!d.themePlacementConfirmed),
                    }}
                    secondary
                  />
                </div>
              </article>
  );
}

function QaLabSection({ d }) {
  return (
<article id="qa-lab" className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div>
                    <span className={styles.stepIndex}>Step 5</span>
                    <h3 className={styles.stepTitle}>
                      Run the merchant QA lab
                    </h3>
                  </div>
                  <StatusPill
                    tone={
                      d.qaStepComplete
                        ? "success"
                        : d.testDataReady
                          ? "warning"
                          : "critical"
                    }
                  >
                    {d.qaStepComplete
                      ? "Validated with saved item"
                      : d.testDataReady
                        ? "Ready to test"
                        : "Missing store data"}
                  </StatusPill>
                </div>
                <p className={styles.stepText}>
                  Simulate the real shopper flow with a test customer and product.
                  This is the moment merchants gain confidence that install
                  actually became value.
                </p>

                {d.customerAccessBlocked ? (
                  <div className={`${styles.callout} ${styles.calloutWarning}`}>
                    Customer API access is blocked, so the QA lab cannot load
                    customers or write metafields. In Partner Dashboard → your app →
                    API access, request protected customer data, reinstall the app,
                    then return here.
                  </div>
                ) : null}

                {!d.testDataReady && !d.customerAccessBlocked ? (
                  <div className={styles.emptyState}>
                    <h4 className={styles.emptyTitle}>QA needs a customer and a product</h4>
                    <p className={styles.emptyText}>
                      Add at least one customer and one product in Shopify Admin,
                      then come back here to simulate the save and remove flow.
                    </p>
                  </div>
                ) : null}

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Customer</span>
                    <DashboardSelect
                      label="Customer"
                      value={d.selectedCustomerId}
                      onChange={d.setSelectedCustomerId}
                      disabled={d.customers.length === 0}
                    >
                      {d.customers.length === 0 ? (
                        <option value="">No customers available</option>
                      ) : (
                        d.customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {formatCustomerLabel(customer)}
                          </option>
                        ))
                      )}
                    </DashboardSelect>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Product</span>
                    <DashboardSelect
                      label="Product"
                      value={d.selectedProductId}
                      onChange={d.setSelectedProductId}
                      disabled={d.products.length === 0}
                    >
                      {d.products.length === 0 ? (
                        <option value="">No products available</option>
                      ) : (
                        d.products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {formatProductLabel(product)}
                          </option>
                        ))
                      )}
                    </DashboardSelect>
                  </label>
                </div>

                <div className={styles.metricGrid}>
                  <article className={styles.inlineMetric}>
                    <span className={styles.metricLabel}>Active customer</span>
                    <strong className={styles.metricValue}>
                      {d.selectedCustomerLabel}
                    </strong>
                    <p className={styles.metricText}>
                      This customer currently has {d.wishlistCount} saved{" "}
                      {d.wishlistCount === 1 ? "item" : "items"}.
                    </p>
                  </article>
                  <article className={styles.inlineMetric}>
                    <span className={styles.metricLabel}>Active product</span>
                    <strong className={styles.metricValue}>
                      {d.selectedProductLabel}
                    </strong>
                    <p className={styles.metricText}>
                      {d.productIsSaved
                        ? "This product is already saved in wishlist."
                        : "This product is not saved yet."}
                    </p>
                  </article>
                </div>

                <div className={styles.buttonRow}>
                  <ActionButton
                    action={{
                      label: d.productIsSaved
                        ? "Remove from wishlist"
                        : "Add to wishlist",
                      onClick: d.handleToggleWishlist,
                      loading: d.isMutating,
                      disabled: !d.selectedCustomerId || !d.selectedProductId,
                    }}
                  />
                  <ActionButton
                    action={{
                      label: "Refresh wishlist snapshot",
                      onClick: d.refreshWishlistSnapshot,
                      loading: d.isReloadingWishlist,
                      disabled: !d.selectedCustomerId,
                    }}
                    secondary
                  />
                </div>
              </article>
  );
}

export {
  DataFoundationSection,
  StorefrontRulesSection,
  WishlistPageSection,
  ThemePlacementSection,
  QaLabSection,
};
