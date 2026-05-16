/* eslint-disable react/prop-types */
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
                  Confirm that the wishlist metafield definition exists, Shopify
                  scopes are active, and the selected customer can actually read
                  and write wishlist data.
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
                  </span>
                </label>

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
                      Publish the wishlist destination page
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
                        ? "Ready to create"
                        : "Scope required"}
                  </StatusPill>
                </div>
                <p className={styles.stepText}>
                  Give shoppers one reliable place to review everything they have
                  saved. This turns wishlist from a button feature into a complete
                  storefront flow.
                </p>

                {!d.hasWriteOnlineStorePagesScope ? (
                  <div className={`${styles.callout} ${styles.calloutWarning}`}>
                    Add the <code>write_online_store_pages</code> scope and
                    reinstall the app before publishing the wishlist page.
                  </div>
                ) : null}

                {d.pageStepComplete ? (
                  <div className={`${styles.callout} ${styles.calloutSuccess}`}>
                    Wishlist page detected at <code>/pages/{d.wishlistPage.handle}</code>.
                  </div>
                ) : null}

                <div className={`${styles.callout} ${styles.calloutInfo}`}>
                  Enable <strong>Wishlist page loader</strong> for the wishlist page
                  UI. Guest saves merge when shoppers visit pages that load wishlist
                  scripts (product page, collection cards, wishlist page). Do
                  not add the <strong>Wishlist page</strong> app block on the same
                  page — the app already injects the wishlist UI into the page
                  content.
                </div>
                <div className={styles.buttonRow}>
                  <ActionButton
                    action={
                      d.wishlistPageEmbedEditorUrl
                        ? {
                            label: "Enable wishlist page loader",
                            href: d.wishlistPageEmbedEditorUrl,
                            target: "_top",
                            rel: "noreferrer",
                          }
                        : {
                            label: "Enable wishlist page loader",
                            disabled: true,
                          }
                    }
                  />
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
                        ? "Update wishlist page"
                        : "Create wishlist page",
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
  return (
<article id="theme-placement" className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div>
                    <span className={styles.stepIndex}>Step 4</span>
                    <h3 className={styles.stepTitle}>
                      Place the wishlist button in your theme
                    </h3>
                  </div>
                  <StatusPill
                    tone={
                      d.themeStepComplete
                        ? "success"
                        : d.hasThemeEditorLinks
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {d.themeStepComplete
                      ? "Placement confirmed"
                      : d.hasThemeEditorLinks
                        ? "Merchant confirmation needed"
                        : "Theme editor unavailable"}
                  </StatusPill>
                </div>
                <p className={styles.stepText}>
                  Merchants should only see one clear deployment choice at a time:
                  use the product app block for JSON themes, or enable the app
                  embed for liquid themes that need a fallback.
                </p>

                <div className={styles.pathGrid}>
                  <article className={styles.pathCard}>
                    <span className={styles.metricLabel}>Recommended</span>
                    <h4 className={styles.pathTitle}>Product page app block</h4>
                    <p className={styles.pathText}>
                      Best for Online Store 2.0 product templates that support
                      sections and blocks.
                    </p>
                    <ActionButton
                      action={
                        d.productPageButtonEditorUrl
                          ? {
                              label: "Open product block settings",
                              href: d.productPageButtonEditorUrl,
                              target: "_top",
                              rel: "noreferrer",
                            }
                          : {
                              label: "Open product block settings",
                              disabled: true,
                            }
                      }
                    />
                  </article>

                  <article className={styles.pathCard}>
                    <span className={styles.metricLabel}>Fallback</span>
                    <h4 className={styles.pathTitle}>Product page app embed</h4>
                    <p className={styles.pathText}>
                      Use this when liquid product templates do not support app
                      blocks.
                    </p>
                    <ActionButton
                      action={
                        d.productPageEmbedEditorUrl
                          ? {
                              label: "Open app embed settings",
                              href: d.productPageEmbedEditorUrl,
                              target: "_top",
                              rel: "noreferrer",
                            }
                          : {
                              label: "Open app embed settings",
                              disabled: true,
                            }
                      }
                      secondary
                    />
                  </article>
                </div>

                <div className={`${styles.callout} ${styles.calloutInfo}`}>
                  Once the button is visible in the theme preview, confirm the
                  step here so your activation score reflects the true merchant
                  rollout state.
                </div>

                <div className={styles.buttonRow}>
                  <ActionButton
                    action={{
                      label: d.themePlacementConfirmed
                        ? "Mark placement as not confirmed"
                        : "Confirm theme placement",
                      onClick: () =>
                        d.handleThemePlacementConfirmation(!d.themePlacementConfirmed),
                    }}
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
