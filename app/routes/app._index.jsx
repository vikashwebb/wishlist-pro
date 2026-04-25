import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { DEFINITION_NAME, KEY, NAMESPACE } from "../models/wishlist";
import styles from "../styles/app-index.module.css";

export const loader = async ({ request }) => {
  const [{ getShopSettings }, { authenticate }, { readWishlist }] =
    await Promise.all([
      import("../models/shop-settings.server"),
      import("../shopify.server"),
      import("../models/wishlist.server"),
    ]);
  const { admin, session } = await authenticate.admin(request);
  // eslint-disable-next-line no-undef
  const appApiKey = process.env.SHOPIFY_API_KEY || "";

  async function getMainThemeId(accessScopes) {
    if (!accessScopes.includes("read_themes")) {
      return null;
    }

    try {
      const themeResponse = await admin.graphql(
        `#graphql
          query WishlistMainTheme {
            themes(first: 1, roles: [MAIN]) {
              nodes {
                id
              }
            }
          }`,
      );
      const themeJson = await themeResponse.json();

      return themeJson.data?.themes?.nodes?.[0]?.id ?? null;
    } catch (error) {
      console.error("wishlist.mainTheme.loader.error", error);
      return null;
    }
  }

  try {
    const response = await admin.graphql(
      `#graphql
        query WishlistPageBootstrap {
          currentAppInstallation {
            accessScopes {
              handle
            }
          }
          customers(first: 10) {
            nodes {
              id
              displayName
              email
            }
          }
          products(first: 10, sortKey: UPDATED_AT, reverse: true) {
            nodes {
              id
              title
              handle
              status
            }
          }
        }`,
    );
    const responseJson = await response.json();
    const accessScopes =
      responseJson.data?.currentAppInstallation?.accessScopes?.map(
        (scope) => scope.handle,
      ) ?? [];
    const customers = responseJson.data?.customers?.nodes ?? [];
    const products = responseJson.data?.products?.nodes ?? [];
    const initialSelectedCustomerId = customers[0]?.id ?? "";
    let initialWishlistItems = [];

    if (initialSelectedCustomerId) {
      try {
        const initialWishlist = await readWishlist(
          admin,
          initialSelectedCustomerId,
        );
        initialWishlistItems = initialWishlist.items ?? [];
      } catch (error) {
        console.error("wishlist.initial.loader.error", error);
      }
    }

    return {
      accessScopes,
      customers,
      products,
      settings: await getShopSettings(session.shop),
      shopDomain: session.shop,
      mainThemeId: await getMainThemeId(accessScopes),
      appApiKey,
      customerAccessBlocked: false,
      initialSelectedCustomerId,
      initialWishlistItems,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const customerAccessBlocked = message.includes(
      "not approved to access the Customer object",
    );

    if (!customerAccessBlocked) {
      throw error;
    }

    const fallbackResponse = await admin.graphql(
      `#graphql
        query WishlistProductsOnly {
          currentAppInstallation {
            accessScopes {
              handle
            }
          }
          products(first: 10, sortKey: UPDATED_AT, reverse: true) {
            nodes {
              id
              title
              handle
              status
            }
          }
        }`,
    );
    const fallbackJson = await fallbackResponse.json();
    const accessScopes =
      fallbackJson.data?.currentAppInstallation?.accessScopes?.map(
        (scope) => scope.handle,
      ) ?? [];

    return {
      accessScopes,
      customers: [],
      products: fallbackJson.data?.products?.nodes ?? [],
      settings: await getShopSettings(session.shop),
      shopDomain: session.shop,
      mainThemeId: await getMainThemeId(accessScopes),
      appApiKey,
      customerAccessBlocked: true,
      initialSelectedCustomerId: "",
      initialWishlistItems: [],
    };
  }
};

export default function Index() {
  const {
    accessScopes,
    customers,
    products,
    customerAccessBlocked,
    settings,
    shopDomain,
    mainThemeId,
    appApiKey,
    initialSelectedCustomerId,
    initialWishlistItems,
  } = useLoaderData();
  const wishlistFetcher = useFetcher();
  const mutationFetcher = useFetcher();
  const diagnosticsFetcher = useFetcher();
  const settingsFetcher = useFetcher();
  const pageFetcher = useFetcher();
  const shopify = useAppBridge();
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialSelectedCustomerId,
  );
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? "",
  );
  const [wishlistItems, setWishlistItems] = useState(initialWishlistItems);
  const skippedInitialWishlistLoadRef = useRef(false);
  const [pendingChange, setPendingChange] = useState(null);
  const [wishlistRequiresLogin, setWishlistRequiresLogin] = useState(
    !!settings?.wishlistRequiresLogin,
  );
  const [wishlistPage, setWishlistPage] = useState(null);
  const [wishlistPageTitle, setWishlistPageTitle] = useState(
    settings?.wishlistPageTitle ?? "Wishlist",
  );
  const [wishlistPageHandle, setWishlistPageHandle] = useState(
    settings?.wishlistPageHandle ?? "wishlist",
  );

  useEffect(() => {
    if (!selectedCustomerId) {
      setWishlistItems([]);
      return;
    }

    if (
      !skippedInitialWishlistLoadRef.current &&
      selectedCustomerId === initialSelectedCustomerId
    ) {
      skippedInitialWishlistLoadRef.current = true;
      return;
    }

    wishlistFetcher.load(
      `/app/api/wishlist?customerId=${encodeURIComponent(selectedCustomerId)}`,
    );
  }, [initialSelectedCustomerId, selectedCustomerId, wishlistFetcher]);

  useEffect(() => {
    if (!wishlistFetcher.data) return;

    if (wishlistFetcher.data.error) {
      shopify.toast.show(wishlistFetcher.data.error, { isError: true });
      return;
    }

    const nextItems = Array.isArray(wishlistFetcher.data.items)
      ? [...new Set(wishlistFetcher.data.items)]
      : [];

    setWishlistItems(nextItems);
  }, [wishlistFetcher.data, shopify]);

  useEffect(() => {
    if (!pendingChange) return;

    const timeoutId = window.setTimeout(() => {
      mutationFetcher.submit(pendingChange, {
        action: "/app/api/wishlist",
        method: "post",
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [mutationFetcher, pendingChange]);

  useEffect(() => {
    if (!mutationFetcher.data) return;

    if (mutationFetcher.data.error) {
      shopify.toast.show(mutationFetcher.data.error, { isError: true });
      return;
    }

    const nextItems = Array.isArray(mutationFetcher.data.items)
      ? [...new Set(mutationFetcher.data.items)]
      : [];

    setWishlistItems(nextItems);

    const actionLabel =
      mutationFetcher.data.intent === "remove" ? "Removed" : "Added";
    shopify.toast.show(`${actionLabel} wishlist item`);
  }, [mutationFetcher.data, shopify]);

  useEffect(() => {
    if (!settingsFetcher.data) return;

    if (settingsFetcher.data.error) {
      shopify.toast.show(settingsFetcher.data.error, { isError: true });
      return;
    }

    const nextValue = !!settingsFetcher.data.settings?.wishlistRequiresLogin;
    setWishlistRequiresLogin(nextValue);
    shopify.toast.show("Storefront wishlist settings saved");
  }, [settingsFetcher.data, shopify]);

  useEffect(() => {
    if (!pageFetcher.data) return;

    if (pageFetcher.data.error) {
      shopify.toast.show(pageFetcher.data.error, { isError: true });
      return;
    }

    setWishlistPage(pageFetcher.data.page ?? null);
    setWishlistPageTitle(
      pageFetcher.data.settings?.wishlistPageTitle ??
        pageFetcher.data.page?.title ??
        wishlistPageTitle,
    );
    setWishlistPageHandle(
      pageFetcher.data.settings?.wishlistPageHandle ??
        pageFetcher.data.page?.handle ??
        wishlistPageHandle,
    );
    shopify.toast.show("Wishlist page created");
  }, [pageFetcher.data, shopify, wishlistPageHandle, wishlistPageTitle]);

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId,
  );
  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  );
  const diagnostics = diagnosticsFetcher.data;
  const productIsSaved = wishlistItems.includes(selectedProductId);
  const isMutating =
    mutationFetcher.state === "loading" ||
    mutationFetcher.state === "submitting";
  const isCheckingMetafield =
    diagnosticsFetcher.state === "loading" ||
    diagnosticsFetcher.state === "submitting";
  const isReloadingWishlist =
    wishlistFetcher.state === "loading" ||
    wishlistFetcher.state === "submitting";
  const isSavingSettings =
    settingsFetcher.state === "loading" ||
    settingsFetcher.state === "submitting";
  const isCreatingWishlistPage =
    pageFetcher.state === "loading" || pageFetcher.state === "submitting";
  const metafieldExists = diagnostics?.checks?.definitionExists;
  const customerValueExists = diagnostics?.checks?.customerMetafieldExists;
  const protectedAccessApproved =
    diagnostics?.checks?.protectedCustomerAccessApproved;
  const hasWriteOnlineStorePagesScope =
    accessScopes.includes("write_online_store_pages") ||
    accessScopes.includes("write_content");
  const wishlistCount = Array.isArray(wishlistItems) ? wishlistItems.length : 0;
  const savedProductTitles = products
    .filter((product) => wishlistItems.includes(product.id))
    .map((product) => product.title);
  const wishlistPageUrl =
    shopDomain && wishlistPage?.handle
      ? `https://${shopDomain}/pages/${wishlistPage.handle}`
      : null;
  const wishlistPagePreviewPath = `/pages/${wishlistPageHandle || "wishlist"}`;
  const themeEditorBaseUrl = shopDomain
    ? `https://${shopDomain}/admin/themes/${
        mainThemeId
          ? encodeURIComponent(mainThemeId.split("/").pop())
          : "current"
      }/editor`
    : null;
  const productPageButtonEditorUrl =
    themeEditorBaseUrl && appApiKey
      ? `${themeEditorBaseUrl}?template=product&addAppBlockId=${encodeURIComponent(
          `${appApiKey}/pdp-wishlist-button`,
        )}&target=newAppsSection`
      : null;
  const productPageEmbedEditorUrl =
    themeEditorBaseUrl && appApiKey
      ? `${themeEditorBaseUrl}?context=apps&template=product&activateAppId=${encodeURIComponent(
          `${appApiKey}/pdp-wishlist-embed`,
        )}`
      : null;

  const handleToggleWishlist = () => {
    if (!selectedCustomerId || !selectedProductId) {
      shopify.toast.show("Select a customer and product first", {
        isError: true,
      });
      return;
    }

    const alreadySaved = wishlistItems.includes(selectedProductId);
    const nextItems = alreadySaved
      ? wishlistItems.filter((item) => item !== selectedProductId)
      : [...new Set([...wishlistItems, selectedProductId])];

    setWishlistItems(nextItems);

    setPendingChange({
      customerId: selectedCustomerId,
      productId: selectedProductId,
      intent: alreadySaved ? "remove" : "add",
    });
  };

  const runDiagnostics = () => {
    const url = selectedCustomerId
      ? `/app/api/wishlist-check?customerId=${encodeURIComponent(selectedCustomerId)}`
      : "/app/api/wishlist-check";
    diagnosticsFetcher.load(url);
  };

  const statusPill = (tone, text) => {
    const toneClassNames = {
      neutral: styles.pillNeutral,
      success: styles.pillSuccess,
      warning: styles.pillWarning,
      critical: styles.pillCritical,
    };

    return (
      <span
        className={`${styles.pill} ${toneClassNames[tone] ?? styles.pillNeutral}`}
      >
        {text}
      </span>
    );
  };

  const summaryCards = [
    {
      label: "Customer data",
      value: customerAccessBlocked
        ? "Approval needed"
        : diagnostics
          ? protectedAccessApproved === true
            ? "Ready"
            : protectedAccessApproved === false
              ? "Review"
              : "Waiting"
          : "Not checked",
      hint: customerAccessBlocked
        ? "Protected customer access is still blocked for this app."
        : "Confirms whether customer wishlist data can be read and written.",
      tone: customerAccessBlocked
        ? "warning"
        : diagnostics
          ? protectedAccessApproved === true
            ? "success"
            : protectedAccessApproved === false
              ? "warning"
              : "neutral"
          : "neutral",
    },
    {
      label: "Wishlist page",
      value: wishlistPage
        ? `/pages/${wishlistPage.handle}`
        : hasWriteOnlineStorePagesScope
          ? "Ready to create"
          : "Needs scope",
      hint: wishlistPage
        ? "Your storefront page already exists."
        : hasWriteOnlineStorePagesScope
          ? "Create the page in one click when you are ready."
          : "Reinstall the app after adding page write scope.",
      tone: wishlistPage
        ? "success"
        : hasWriteOnlineStorePagesScope
          ? "neutral"
          : "warning",
    },
    {
      label: "Storefront mode",
      value: wishlistRequiresLogin ? "Login required" : "Guests allowed",
      hint: wishlistRequiresLogin
        ? "Only signed-in customers can save products."
        : "Shoppers can use wishlist before logging in.",
      tone: wishlistRequiresLogin ? "warning" : "success",
    },
    {
      label: "Button design",
      value: "Theme editor",
      hint: "Button style and colors now come from your theme app block settings.",
      tone: "neutral",
    },
  ];

  const setupCards = [
    {
      title: "Install on your dev store",
      text: "Run `npm run dev`, open the Shopify preview, and install Wishlist Pro on the store you are testing.",
    },
    {
      title: "Prepare test data",
      text: "Create at least one customer and one product so you can verify the save and remove flow end to end.",
    },
    {
      title: "Create the wishlist metafield",
      text: `In Shopify Admin, create the customer metafield definition ${NAMESPACE}.${KEY} as JSON using the name ${DEFINITION_NAME}.`,
    },
  ];

  return (
    <s-page heading="Wishlist Pro">
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Merchant workspace</p>
            <h1 className={styles.heroTitle}>
              A calmer setup flow for your storefront wishlist
            </h1>
            <p className={styles.heroText}>
              Configure the storefront behavior, confirm the customer data
              connection, and test the experience from one clear dashboard.
            </p>
            <div className={styles.heroActions}>
              <s-button
                onClick={runDiagnostics}
                {...(isCheckingMetafield ? { loading: true } : {})}
              >
                Check setup health
              </s-button>
              {wishlistPageUrl ? (
                <s-button
                  variant="secondary"
                  href={wishlistPageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open wishlist page
                </s-button>
              ) : null}
            </div>
          </div>

          <div className={styles.summaryGrid}>
            {summaryCards.map((card) => (
              <article key={card.label} className={styles.summaryCard}>
                <div className={styles.summaryCardTop}>
                  <span className={styles.summaryLabel}>{card.label}</span>
                  {statusPill(card.tone, card.value)}
                </div>
                <p className={styles.summaryHint}>{card.hint}</p>
              </article>
            ))}
          </div>
        </section>

        <s-section heading="Storefront preferences">
          <div className={styles.surface}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  Choose how shoppers use wishlist
                </h2>
                <p className={styles.sectionText}>
                  Decide whether wishlist is open to all visitors or reserved
                  for signed-in customers. Button style and colors are managed
                  directly in the theme editor, so they do not rely on the app
                  server.
                </p>
              </div>
              {wishlistRequiresLogin
                ? statusPill("warning", "Login required")
                : statusPill("success", "Guests can save items")}
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={wishlistRequiresLogin}
                onChange={(event) =>
                  setWishlistRequiresLogin(event.currentTarget.checked)
                }
              />
              <span>
                Require customer login before shoppers can use wishlist
              </span>
            </label>

            <div className={styles.bannerWrap}>
              <s-banner tone="info">
                Configure button style, accent color, text color, and icon
                color in the Theme Editor on the wishlist app block or embed.
                Those appearance settings now come straight from the theme, not
                from Prisma.
              </s-banner>
            </div>

            <div className={styles.actionRow}>
              {productPageButtonEditorUrl ? (
                <a
                  className={styles.linkButton}
                  href={productPageButtonEditorUrl}
                  target="_top"
                  rel="noreferrer"
                >
                  Open product block settings
                </a>
              ) : (
                <s-button disabled>Open product block settings</s-button>
              )}

              {productPageEmbedEditorUrl ? (
                <a
                  className={`${styles.linkButton} ${styles.linkButtonSecondary}`}
                  href={productPageEmbedEditorUrl}
                  target="_top"
                  rel="noreferrer"
                >
                  Open embed settings
                </a>
              ) : (
                <s-button variant="secondary" disabled>
                  Open embed settings
                </s-button>
              )}
            </div>

            <div className={styles.actionRow}>
              <s-button
                onClick={() =>
                  settingsFetcher.submit(
                    {
                      wishlistRequiresLogin: wishlistRequiresLogin
                        ? "true"
                        : "false",
                    },
                    {
                      action: "/app/api/settings",
                      method: "post",
                    },
                  )
                }
                {...(isSavingSettings ? { loading: true } : {})}
              >
                Save storefront settings
              </s-button>
            </div>

            <p className={styles.supportText}>
              Saving here now updates only the login requirement. Button
              appearance is saved in the theme editor for each wishlist block.
            </p>
          </div>
        </s-section>

        <s-section heading="Wishlist page">
          <div className={styles.surface}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  Create your storefront wishlist page
                </h2>
                <p className={styles.sectionText}>
                  Create or update the Shopify page at{" "}
                  <code>{wishlistPagePreviewPath}</code> and control its title
                  and handle from the app.
                </p>
              </div>
              {wishlistPage
                ? statusPill("success", "Page created")
                : hasWriteOnlineStorePagesScope
                  ? statusPill("neutral", "Ready to create")
                  : statusPill("warning", "Scope required")}
            </div>

            {!hasWriteOnlineStorePagesScope ? (
              <s-banner tone="warning">
                Add the <code>write_online_store_pages</code> scope, then
                reinstall the app before creating <code>/pages/wishlist</code>.
              </s-banner>
            ) : null}

            {wishlistPage ? (
              <s-banner tone="success">
                Wishlist page available at{" "}
                <code>/pages/{wishlistPage.handle}</code>.
              </s-banner>
            ) : null}

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Page title</span>
                <input
                  className={styles.fieldInput}
                  type="text"
                  value={wishlistPageTitle}
                  onChange={(event) =>
                    setWishlistPageTitle(event.currentTarget.value)
                  }
                  placeholder="Wishlist"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Page handle</span>
                <input
                  className={styles.fieldInput}
                  type="text"
                  value={wishlistPageHandle}
                  onChange={(event) =>
                    setWishlistPageHandle(event.currentTarget.value)
                  }
                  placeholder="wishlist"
                />
                <span className={styles.fieldHint}>
                  Final URL: <code>{wishlistPagePreviewPath}</code>
                </span>
              </label>
            </div>

            <div className={styles.actionRow}>
              <s-button
                onClick={() =>
                  pageFetcher.submit(
                    {
                      wishlistPageTitle,
                      wishlistPageHandle,
                    },
                    {
                      action: "/app/api/wishlist-page",
                      method: "post",
                    },
                  )
                }
                {...(isCreatingWishlistPage ? { loading: true } : {})}
                disabled={!hasWriteOnlineStorePagesScope}
              >
                Save wishlist page
              </s-button>

              {wishlistPageUrl ? (
                <a
                  className={`${styles.linkButton} ${styles.linkButtonSecondary}`}
                  href={wishlistPageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View storefront page
                </a>
              ) : null}
            </div>

            <p className={styles.supportText}>
              Next step: add the wishlist block or final storefront layout to
              this page so shoppers can review saved items in one place.
            </p>
          </div>
        </s-section>

        <s-section heading="Product page button">
          <div className={styles.surface}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  Add the wishlist button to product pages
                </h2>
                <p className={styles.sectionText}>
                  Use the JSON-template app block flow when the theme supports
                  sections and blocks, or activate the product-page embed for
                  liquid themes that do not.
                </p>
              </div>
              {statusPill("warning", "Theme-dependent setup")}
            </div>

            <div className={styles.actionRow}>
              {productPageButtonEditorUrl ? (
                <a
                  className={styles.linkButton}
                  href={productPageButtonEditorUrl}
                  target="_top"
                  rel="noreferrer"
                >
                  Add app block for JSON themes
                </a>
              ) : (
                <s-button disabled>Add app block for JSON themes</s-button>
              )}

              {productPageEmbedEditorUrl ? (
                <a
                  className={`${styles.linkButton} ${styles.linkButtonSecondary}`}
                  href={productPageEmbedEditorUrl}
                  target="_top"
                  rel="noreferrer"
                >
                  Activate embed for liquid themes
                </a>
              ) : (
                <s-button variant="secondary" disabled>
                  Activate embed for liquid themes
                </s-button>
              )}
            </div>

            <p className={styles.supportText}>
              If Shopify says liquid templates don&apos;t support sections and
              blocks, use the embed option. It works on product pages without
              requiring a JSON product template.
            </p>
          </div>
        </s-section>

        <s-section heading="Setup checklist">
          <div className={styles.checklistGrid}>
            {setupCards.map((card) => (
              <article key={card.title} className={styles.checklistCard}>
                <span className={styles.checklistIndex}>Step</span>
                <h2>{card.title}</h2>
                <p>{card.text}</p>
              </article>
            ))}
          </div>

          {customerAccessBlocked ? (
            <div className={styles.bannerWrap}>
              <s-banner tone="warning">
                Protected customer data access is still blocked. After approval
                in Partner Dashboard, reinstall the app and run the setup check
                again.
              </s-banner>
            </div>
          ) : null}
        </s-section>

        <s-section heading="Connection health">
          {customers.length === 0 ? (
            <s-banner tone="warning">
              No customers found yet. Create one in Shopify Admin before testing
              wishlist data.
            </s-banner>
          ) : null}

          {products.length === 0 ? (
            <s-banner tone="warning">
              No products found yet. Add a product before testing wishlist
              actions.
            </s-banner>
          ) : null}

          <div className={styles.surface}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  Check the customer wishlist connection
                </h2>
                <p className={styles.sectionText}>
                  Confirm the metafield definition, access approval, and whether
                  the selected customer already has wishlist data.
                </p>
              </div>
              {isCheckingMetafield
                ? statusPill("warning", "Checking now")
                : diagnostics
                  ? metafieldExists
                    ? statusPill("success", "Definition found")
                    : statusPill("critical", "Definition missing")
                  : statusPill("neutral", "Not checked")}
            </div>

            <div className={styles.formRow}>
              <s-select
                label="Customer to inspect"
                value={selectedCustomerId}
                onChange={(event) =>
                  setSelectedCustomerId(event.currentTarget.value)
                }
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName || customer.email || customer.id}
                  </option>
                ))}
              </s-select>
            </div>

            <div className={styles.actionRow}>
              <s-button
                variant="secondary"
                onClick={runDiagnostics}
                {...(isCheckingMetafield ? { loading: true } : {})}
              >
                Run setup check
              </s-button>
              <s-button
                variant="secondary"
                {...(isReloadingWishlist ? { loading: true } : {})}
                onClick={() => {
                  if (!selectedCustomerId) return;
                  wishlistFetcher.load(
                    `/app/api/wishlist?customerId=${encodeURIComponent(
                      selectedCustomerId,
                    )}`,
                  );
                }}
              >
                Refresh wishlist data
              </s-button>
            </div>

            {isCheckingMetafield ? (
              <s-banner tone="info">
                Checking whether{" "}
                <code>
                  {NAMESPACE}.{KEY}
                </code>{" "}
                is ready for this customer.
              </s-banner>
            ) : null}

            {!isCheckingMetafield && !diagnostics ? (
              <s-banner tone="info">
                Run the setup check to verify the customer metafield and access
                status before testing.
              </s-banner>
            ) : null}

            {!isCheckingMetafield && diagnostics ? (
              <div className={styles.statusGrid}>
                <article className={styles.statusCard}>
                  <span className={styles.statusLabel}>
                    Wishlist definition
                  </span>
                  <strong className={styles.statusValue}>
                    {metafieldExists ? DEFINITION_NAME : "Not found"}
                  </strong>
                  <p className={styles.statusText}>
                    Expected definition:{" "}
                    <code>
                      {NAMESPACE}.{KEY}
                    </code>
                  </p>
                  {metafieldExists
                    ? statusPill("success", "Definition is ready")
                    : statusPill("critical", `Create ${DEFINITION_NAME}`)}
                </article>

                <article className={styles.statusCard}>
                  <span className={styles.statusLabel}>Customer access</span>
                  <strong className={styles.statusValue}>
                    {protectedAccessApproved === true
                      ? "Approved"
                      : protectedAccessApproved === false
                        ? "Approval needed"
                        : "Waiting for check"}
                  </strong>
                  <p className={styles.statusText}>
                    Protected customer data must be approved before Admin API
                    customer reads and writes can work.
                  </p>
                  {protectedAccessApproved === true
                    ? statusPill("success", "Customer access ready")
                    : protectedAccessApproved === false
                      ? statusPill("warning", "Request approval")
                      : statusPill("neutral", "Run the check")}
                </article>

                <article className={styles.statusCard}>
                  <span className={styles.statusLabel}>
                    Customer wishlist value
                  </span>
                  <strong className={styles.statusValue}>
                    {customerValueExists ? "Present" : "Not created yet"}
                  </strong>
                  <p className={styles.statusText}>
                    This shows whether the selected customer already has saved
                    wishlist data.
                  </p>
                  {customerValueExists
                    ? statusPill("success", "Customer has wishlist data")
                    : statusPill("neutral", "No saved value yet")}
                </article>
              </div>
            ) : null}

            {!isCheckingMetafield && diagnostics?.errors?.length ? (
              <div className={styles.bannerWrap}>
                <s-banner tone="warning">{diagnostics.errors[0]}</s-banner>
              </div>
            ) : null}
          </div>
        </s-section>

        <s-section heading="Wishlist test">
          <div className={styles.surface}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  Try the add and remove flow
                </h2>
                <p className={styles.sectionText}>
                  Select a product and simulate the same save action a shopper
                  would take on the storefront.
                </p>
              </div>
              {productIsSaved
                ? statusPill("success", "Selected product saved")
                : statusPill("neutral", "Selected product not saved")}
            </div>

            <div className={styles.formRow}>
              <s-select
                label="Product to test"
                value={selectedProductId}
                onChange={(event) =>
                  setSelectedProductId(event.currentTarget.value)
                }
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
              </s-select>
            </div>

            <div className={styles.actionRow}>
              <s-button
                onClick={handleToggleWishlist}
                {...(isMutating ? { loading: true } : {})}
              >
                {productIsSaved ? "Remove from wishlist" : "Add to wishlist"}
              </s-button>
            </div>
          </div>
        </s-section>

        <s-section heading="Current snapshot">
          <div className={styles.surface}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  See the current wishlist state
                </h2>
                <p className={styles.sectionText}>
                  Review the selected customer, the product under test, and the
                  items currently stored in the wishlist.
                </p>
              </div>
            </div>

            <div className={styles.snapshotGrid}>
              <article className={styles.statusCard}>
                <span className={styles.statusLabel}>Selected customer</span>
                <strong className={styles.statusValue}>
                  {selectedCustomer?.displayName ||
                    selectedCustomer?.email ||
                    "Not selected"}
                </strong>
              </article>

              <article className={styles.statusCard}>
                <span className={styles.statusLabel}>Selected product</span>
                <strong className={styles.statusValue}>
                  {selectedProduct?.title || "Not selected"}
                </strong>
              </article>

              <article className={styles.statusCard}>
                <span className={styles.statusLabel}>Saved wishlist items</span>
                <strong className={styles.statusValue}>{wishlistCount}</strong>
                <p className={styles.statusText}>
                  {productIsSaved
                    ? "The selected product is already in this wishlist."
                    : "The selected product has not been saved yet."}
                </p>
              </article>
            </div>

            <article className={styles.statusCard}>
              <span className={styles.statusLabel}>Saved products</span>
              <strong className={styles.statusValue}>Wishlist contents</strong>

              {savedProductTitles.length > 0 ? (
                <div className={styles.savedList}>
                  {savedProductTitles.map((title) => (
                    <span key={title}>{statusPill("success", title)}</span>
                  ))}
                </div>
              ) : (
                <p className={styles.statusText}>
                  No products are saved for this customer yet.
                </p>
              )}
            </article>
          </div>
        </s-section>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
