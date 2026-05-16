/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData, useRouteError } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { DEFINITION_NAME, KEY, NAMESPACE } from "../models/wishlist";
import styles from "../styles/app-index.module.css";

function formatCustomerLabel(customer) {
  if (!customer) return "No customer selected";
  return customer.displayName || customer.email || customer.id;
}

function formatProductLabel(product) {
  if (!product) return "No product selected";
  return product.title || product.handle || product.id;
}

function formatWishlistLabel(productId, products) {
  const product = products.find((entry) => entry.id === productId);
  return product?.title || productId.split("/").pop() || productId;
}

function getToneClassName(tone) {
  if (tone === "success") return styles.pillSuccess;
  if (tone === "warning") return styles.pillWarning;
  if (tone === "critical") return styles.pillCritical;
  return styles.pillNeutral;
}

function StatusPill({ tone = "neutral", children }) {
  return (
    <span className={`${styles.pill} ${getToneClassName(tone)}`}>{children}</span>
  );
}

function ActionButton({ action, secondary = false }) {
  if (!action) return null;

  if (action.href) {
    if (action.disabled) {
      return (
        <s-button {...(secondary ? { variant: "secondary" } : {})} disabled>
          {action.label}
        </s-button>
      );
    }

    return (
      <a
        className={`${styles.linkButton} ${
          secondary ? styles.linkButtonSecondary : ""
        }`}
        href={action.href}
        target={action.target}
        rel={action.rel}
      >
        {action.label}
      </a>
    );
  }

  return (
    <s-button
      {...(secondary ? { variant: "secondary" } : {})}
      onClick={action.onClick}
      disabled={action.disabled}
      {...(action.loading ? { loading: true } : {})}
    >
      {action.label}
    </s-button>
  );
}

export const loader = async ({ request }) => {
  const [
    { getShopSettings },
    { authenticate },
    { getWishlistDiagnostics, readWishlist },
    { getWishlistPageByHandle },
  ] = await Promise.all([
    import("../models/shop-settings.server"),
    import("../shopify.server"),
    import("../models/wishlist.server"),
    import("../models/wishlist-page.server"),
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

  async function getInitialWishlistPage(accessScopes, settings) {
    const canInspectPages =
      accessScopes.includes("write_online_store_pages") ||
      accessScopes.includes("write_content") ||
      accessScopes.includes("read_content");

    if (!canInspectPages) {
      return null;
    }

    try {
      return await getWishlistPageByHandle(admin, settings.wishlistPageHandle);
    } catch (error) {
      console.error("wishlist.page.loader.error", error);
      return null;
    }
  }

  async function getInitialDiagnostics(customerId) {
    try {
      return await getWishlistDiagnostics(admin, customerId);
    } catch (error) {
      console.error("wishlist.diagnostics.loader.error", error);
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

    const settings = await getShopSettings(session.shop);
    const [initialWishlistPage, initialDiagnostics] = await Promise.all([
      getInitialWishlistPage(accessScopes, settings),
      getInitialDiagnostics(initialSelectedCustomerId || undefined),
    ]);

    return {
      accessScopes,
      customers,
      products,
      settings,
      shopDomain: session.shop,
      mainThemeId: await getMainThemeId(accessScopes),
      appApiKey,
      customerAccessBlocked: false,
      initialSelectedCustomerId,
      initialWishlistItems,
      initialDiagnostics,
      initialWishlistPage,
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
    const settings = await getShopSettings(session.shop);
    const [initialWishlistPage, initialDiagnostics] = await Promise.all([
      getInitialWishlistPage(accessScopes, settings),
      getInitialDiagnostics(),
    ]);

    return {
      accessScopes,
      customers: [],
      products: fallbackJson.data?.products?.nodes ?? [],
      settings,
      shopDomain: session.shop,
      mainThemeId: await getMainThemeId(accessScopes),
      appApiKey,
      customerAccessBlocked: true,
      initialSelectedCustomerId: "",
      initialWishlistItems: [],
      initialDiagnostics,
      initialWishlistPage,
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
    initialDiagnostics,
    initialWishlistPage,
  } = useLoaderData();
  const wishlistFetcher = useFetcher();
  const mutationFetcher = useFetcher();
  const diagnosticsFetcher = useFetcher();
  const settingsFetcher = useFetcher();
  const pageFetcher = useFetcher();
  const shopify = useAppBridge();
  const skippedInitialWishlistLoadRef = useRef(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialSelectedCustomerId,
  );
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? "",
  );
  const [wishlistItems, setWishlistItems] = useState(initialWishlistItems);
  const [pendingChange, setPendingChange] = useState(null);
  const [wishlistRequiresLogin, setWishlistRequiresLogin] = useState(
    !!settings?.wishlistRequiresLogin,
  );
  const [wishlistPage, setWishlistPage] = useState(initialWishlistPage);
  const [wishlistPageTitle, setWishlistPageTitle] = useState(
    settings?.wishlistPageTitle ?? "Wishlist",
  );
  const [wishlistPageHandle, setWishlistPageHandle] = useState(
    settings?.wishlistPageHandle ?? "wishlist",
  );
  const [diagnostics, setDiagnostics] = useState(initialDiagnostics);
  const [themePlacementConfirmed, setThemePlacementConfirmed] = useState(false);

  const themePlacementStorageKey = shopDomain
    ? `wishlist-pro:theme-placement:${shopDomain}`
    : "wishlist-pro:theme-placement";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedValue = window.localStorage.getItem(themePlacementStorageKey);
    setThemePlacementConfirmed(savedValue === "true");
  }, [themePlacementStorageKey]);

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
    if (!diagnosticsFetcher.data) return;

    if (diagnosticsFetcher.data.error) {
      shopify.toast.show(diagnosticsFetcher.data.error, { isError: true });
      return;
    }

    setDiagnostics(diagnosticsFetcher.data);
    shopify.toast.show("System health updated");
  }, [diagnosticsFetcher.data, shopify]);

  useEffect(() => {
    if (!settingsFetcher.data) return;

    if (settingsFetcher.data.error) {
      shopify.toast.show(settingsFetcher.data.error, { isError: true });
      return;
    }

    const nextValue = !!settingsFetcher.data.settings?.wishlistRequiresLogin;
    setWishlistRequiresLogin(nextValue);
    shopify.toast.show("Storefront rules saved");
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
    shopify.toast.show("Wishlist page is live");
  }, [pageFetcher.data, shopify, wishlistPageHandle, wishlistPageTitle]);

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId,
  );
  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  );
  const selectedCustomerLabel = formatCustomerLabel(selectedCustomer);
  const selectedProductLabel = formatProductLabel(selectedProduct);
  const wishlistCount = Array.isArray(wishlistItems) ? wishlistItems.length : 0;
  const wishlistLabels = wishlistItems.map((productId) =>
    formatWishlistLabel(productId, products),
  );
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
  const hasWriteOnlineStorePagesScope =
    accessScopes.includes("write_online_store_pages") ||
    accessScopes.includes("write_content");
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
  const hasThemeEditorLinks = Boolean(themeEditorBaseUrl && appApiKey);

  const diagnosticsCustomerId = diagnostics?.customerId ?? "";
  const diagnosticsMatchesSelection =
    (!selectedCustomerId && !diagnosticsCustomerId) ||
    diagnosticsCustomerId === selectedCustomerId;
  const diagnosticsFresh = !!diagnostics && diagnosticsMatchesSelection;
  const diagnosticsErrors = diagnosticsFresh ? diagnostics?.errors ?? [] : [];
  const definitionReady =
    diagnosticsFresh && diagnostics?.checks?.definitionExists === true;
  const customerAccessReady = customerAccessBlocked
    ? false
    : selectedCustomerId
      ? diagnosticsFresh &&
        diagnostics?.checks?.protectedCustomerAccessApproved === true
      : diagnosticsFresh &&
        diagnostics?.checks?.hasReadCustomersScope === true &&
        diagnostics?.checks?.hasWriteCustomersScope === true;
  const customerMetafieldReady =
    diagnosticsFresh && diagnostics?.checks?.customerMetafieldExists === true;
  const customerDataStepComplete = definitionReady && customerAccessReady;
  const storefrontStepComplete = true;
  const pageStepComplete = !!wishlistPage;
  const themeStepComplete = themePlacementConfirmed;
  const qaStepComplete =
    !!selectedCustomerId && !!selectedProductId && wishlistCount > 0;
  const testDataReady = customers.length > 0 && products.length > 0;
  const completedSteps = [
    customerDataStepComplete,
    storefrontStepComplete,
    pageStepComplete,
    themeStepComplete,
    qaStepComplete,
  ].filter(Boolean).length;
  const progressPercent = Math.round((completedSteps / 5) * 100);
  const readinessLabel =
    progressPercent === 100
      ? "Launch ready"
      : progressPercent >= 80
        ? "Almost live"
        : progressPercent >= 40
          ? "In progress"
          : "Getting started";

  const scrollToSection = (sectionId) => {
    if (typeof document === "undefined") return;
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const runDiagnostics = () => {
    const url = selectedCustomerId
      ? `/app/api/wishlist-check?customerId=${encodeURIComponent(selectedCustomerId)}`
      : "/app/api/wishlist-check";
    diagnosticsFetcher.load(url);
  };

  const saveStorefrontSettings = () => {
    settingsFetcher.submit(
      {
        wishlistRequiresLogin: wishlistRequiresLogin ? "true" : "false",
      },
      {
        action: "/app/api/settings",
        method: "post",
      },
    );
  };

  const saveWishlistPage = () => {
    pageFetcher.submit(
      {
        wishlistPageTitle,
        wishlistPageHandle,
      },
      {
        action: "/app/api/wishlist-page",
        method: "post",
      },
    );
  };

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

  const handleThemePlacementConfirmation = (nextValue) => {
    setThemePlacementConfirmed(nextValue);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        themePlacementStorageKey,
        nextValue ? "true" : "false",
      );
    }

    shopify.toast.show(
      nextValue
        ? "Theme placement marked complete"
        : "Theme placement marked as incomplete",
    );
  };

  const primaryHeroAction =
    !diagnosticsFresh || customerAccessBlocked
      ? {
          label: "Run live system check",
          onClick: runDiagnostics,
          loading: isCheckingMetafield,
        }
      : !pageStepComplete && hasWriteOnlineStorePagesScope
        ? {
            label: "Create wishlist page",
            onClick: saveWishlistPage,
            loading: isCreatingWishlistPage,
          }
        : !themeStepComplete && productPageButtonEditorUrl
          ? {
              label: "Open product theme editor",
              href: productPageButtonEditorUrl,
              target: "_top",
              rel: "noreferrer",
            }
          : !themeStepComplete && productPageEmbedEditorUrl
            ? {
                label: "Open app embed settings",
                href: productPageEmbedEditorUrl,
                target: "_top",
                rel: "noreferrer",
              }
            : !qaStepComplete
              ? {
                  label: "Open merchant QA lab",
                  onClick: () => scrollToSection("qa-lab"),
                }
              : wishlistPageUrl
                ? {
                    label: "Open live wishlist page",
                    href: wishlistPageUrl,
                    target: "_blank",
                    rel: "noreferrer",
                  }
                : {
                    label: "Re-run system check",
                    onClick: runDiagnostics,
                    loading: isCheckingMetafield,
                  };

  const secondaryHeroAction = wishlistPageUrl
    ? {
        label: "View storefront page",
        href: wishlistPageUrl,
        target: "_blank",
        rel: "noreferrer",
      }
    : {
        label: "Jump to setup journey",
        onClick: () => scrollToSection("activation-journey"),
      };

  const healthItems = [
    {
      label: "Metafield definition",
      value: definitionReady ? "Ready" : diagnosticsFresh ? "Needs action" : "Not checked",
      tone: definitionReady ? "success" : diagnosticsFresh ? "critical" : "neutral",
    },
    {
      label: "Protected customer access",
      value: customerAccessReady
        ? "Approved"
        : customerAccessBlocked
          ? "Blocked"
          : diagnosticsFresh
            ? "Needs approval"
            : "Pending",
      tone: customerAccessReady
        ? "success"
        : customerAccessBlocked
          ? "critical"
          : diagnosticsFresh
            ? "warning"
            : "neutral",
    },
    {
      label: "Wishlist page",
      value: pageStepComplete ? "Live" : hasWriteOnlineStorePagesScope ? "Ready to create" : "Scope required",
      tone: pageStepComplete
        ? "success"
        : hasWriteOnlineStorePagesScope
          ? "warning"
          : "critical",
    },
    {
      label: "Theme placement",
      value: themeStepComplete ? "Confirmed" : hasThemeEditorLinks ? "Awaiting confirmation" : "Theme access unavailable",
      tone: themeStepComplete
        ? "success"
        : hasThemeEditorLinks
          ? "warning"
          : "neutral",
    },
    {
      label: "Merchant QA",
      value: qaStepComplete ? "Passed with saved item" : testDataReady ? "Ready to test" : "Needs store data",
      tone: qaStepComplete
        ? "success"
        : testDataReady
          ? "warning"
          : "critical",
    },
  ];

  const progressItems = [
    {
      title: "Data foundation",
      complete: customerDataStepComplete,
      detail: customerDataStepComplete
        ? "Customer data pipeline verified."
        : customerAccessBlocked
          ? "Protected customer access still needs approval."
          : diagnosticsFresh
            ? "Definition or access still needs attention."
            : "Run the live system check.",
    },
    {
      title: "Storefront rules",
      complete: storefrontStepComplete,
      detail: wishlistRequiresLogin
        ? "Wishlist requires customer login."
        : "Guests can save wishlist items.",
    },
    {
      title: "Wishlist page",
      complete: pageStepComplete,
      detail: pageStepComplete
        ? `Live at /pages/${wishlistPage?.handle}`
        : hasWriteOnlineStorePagesScope
          ? `Ready to publish at ${wishlistPagePreviewPath}`
          : "Page write scope is missing.",
    },
    {
      title: "Theme placement",
      complete: themeStepComplete,
      detail: themeStepComplete
        ? "Theme button placement confirmed."
        : "Open Theme Editor and confirm once placed.",
    },
    {
      title: "Merchant QA",
      complete: qaStepComplete,
      detail: qaStepComplete
        ? "A wishlist item is saved for the active test customer."
        : "Use the QA lab to validate add and remove flows.",
    },
  ];

  return (
    <s-page heading="Wishlist Pro">
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Activation workspace</p>
            <h1 className={styles.heroTitle}>
              Launch Wishlist Pro like a premium storefront system, not a setup checklist
            </h1>
            <p className={styles.heroText}>
              Everything you need to configure, validate, test, and launch is
              now organized as one guided merchant command center.
            </p>

            <div className={styles.heroSignalRow}>
              <div className={styles.progressBadge}>
                <strong>{progressPercent}%</strong>
                <span>{readinessLabel}</span>
              </div>
              <StatusPill tone={qaStepComplete ? "success" : "warning"}>
                {qaStepComplete ? "First value reached" : "Activation in progress"}
              </StatusPill>
              <StatusPill tone={wishlistRequiresLogin ? "warning" : "success"}>
                {wishlistRequiresLogin ? "Login required mode" : "Guest wishlist enabled"}
              </StatusPill>
            </div>

            <div className={styles.progressTrack}>
              <span
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className={styles.heroActions}>
              <ActionButton action={primaryHeroAction} />
              <ActionButton action={secondaryHeroAction} secondary />
            </div>
          </div>

          <div className={styles.heroStatsGrid}>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Current snapshot</span>
              <strong className={styles.metricValue}>
                {wishlistCount} {wishlistCount === 1 ? "saved item" : "saved items"}
              </strong>
              <p className={styles.metricText}>
                Active customer: {selectedCustomerLabel}
              </p>
            </article>

            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Wishlist page</span>
              <strong className={styles.metricValue}>
                {pageStepComplete ? wishlistPagePreviewPath : "Not published yet"}
              </strong>
              <p className={styles.metricText}>
                {pageStepComplete
                  ? "Shoppers have a dedicated wishlist destination."
                  : "Create the page when you are ready to launch."}
              </p>
            </article>

            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Theme placement</span>
              <strong className={styles.metricValue}>
                {themeStepComplete ? "Confirmed" : "Waiting on merchant"}
              </strong>
              <p className={styles.metricText}>
                {themeStepComplete
                  ? "Wishlist button placement has been confirmed."
                  : "Open the Theme Editor and confirm once the button is visible."}
              </p>
            </article>
          </div>
        </section>

        <div className={styles.mainGrid}>
          <div className={styles.journeyColumn}>
            <section
              id="activation-journey"
              className={styles.stageSection}
            >
              <div className={styles.sectionIntro}>
                <p className={styles.sectionEyebrow}>Phase A · Information architecture</p>
                <h2 className={styles.sectionTitle}>
                  Guided activation journey
                </h2>
                <p className={styles.sectionText}>
                  The dashboard is structured as five merchant decisions in the
                  order they actually think: verify data, choose rules, publish
                  the page, place the button, and run a live QA pass.
                </p>
              </div>

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
                      customerDataStepComplete
                        ? "success"
                        : customerAccessBlocked
                          ? "critical"
                          : diagnosticsFresh
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {customerDataStepComplete
                      ? "Ready for launch"
                      : customerAccessBlocked
                        ? "Approval blocked"
                        : diagnosticsFresh
                          ? "Needs attention"
                          : "Check required"}
                  </StatusPill>
                </div>
                <p className={styles.stepText}>
                  Confirm that the wishlist metafield definition exists, Shopify
                  scopes are active, and the selected customer can actually read
                  and write wishlist data.
                </p>

                {customerAccessBlocked ? (
                  <div className={`${styles.callout} ${styles.calloutWarning}`}>
                    Protected customer data is still blocked for this app. Approve
                    customer access in Partner Dashboard, reinstall the app, and
                    then re-run the live system check.
                  </div>
                ) : null}

                {!diagnosticsFresh && selectedCustomerId && diagnostics ? (
                  <div className={`${styles.callout} ${styles.calloutInfo}`}>
                    The selected customer changed. Re-run the live system check so
                    the health panel matches the active QA customer.
                  </div>
                ) : null}

                <div className={styles.controlGrid}>
                  <div className={styles.formCard}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>QA customer</span>
                      <s-select
                        label="QA customer"
                        value={selectedCustomerId}
                        onChange={(event) =>
                          setSelectedCustomerId(event.currentTarget.value)
                        }
                        {...(customers.length === 0 ? { disabled: true } : {})}
                      >
                        {customers.length === 0 ? (
                          <option value="">No customers available</option>
                        ) : (
                          customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {formatCustomerLabel(customer)}
                            </option>
                          ))
                        )}
                      </s-select>
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
                        {definitionReady ? DEFINITION_NAME : "Not verified"}
                      </strong>
                      <p className={styles.metricText}>
                        Expected key: <code>{NAMESPACE}.{KEY}</code>
                      </p>
                    </article>
                    <article className={styles.inlineMetric}>
                      <span className={styles.metricLabel}>Customer access</span>
                      <strong className={styles.metricValue}>
                        {customerAccessReady
                          ? "Approved"
                          : customerAccessBlocked
                            ? "Blocked"
                            : "Pending review"}
                      </strong>
                      <p className={styles.metricText}>
                        {selectedCustomerId
                          ? "Uses the active customer for a real access test."
                          : "Choose a customer to verify protected data access."}
                      </p>
                    </article>
                    <article className={styles.inlineMetric}>
                      <span className={styles.metricLabel}>Customer metafield</span>
                      <strong className={styles.metricValue}>
                        {customerMetafieldReady ? "Found" : "Not yet created"}
                      </strong>
                      <p className={styles.metricText}>
                        {diagnosticsFresh
                          ? `Wishlist contains ${
                              diagnostics?.checks?.customerWishlistItemsCount ?? 0
                            } saved items.`
                          : "Run the live system check to inspect the customer record."}
                      </p>
                    </article>
                  </div>
                </div>

                {diagnosticsErrors.length > 0 ? (
                  <div className={`${styles.callout} ${styles.calloutCritical}`}>
                    {diagnosticsErrors.join(" ")}
                  </div>
                ) : null}

                <div className={styles.buttonRow}>
                  <ActionButton
                    action={{
                      label: diagnosticsFresh
                        ? "Re-run live system check"
                        : "Run live system check",
                      onClick: runDiagnostics,
                      loading: isCheckingMetafield,
                    }}
                  />
                  <ActionButton
                    action={{
                      label: "Refresh customer snapshot",
                      onClick: () => {
                        if (!selectedCustomerId) return;
                        wishlistFetcher.load(
                          `/app/api/wishlist?customerId=${encodeURIComponent(
                            selectedCustomerId,
                          )}`,
                        );
                      },
                      loading: isReloadingWishlist,
                      disabled: !selectedCustomerId,
                    }}
                    secondary
                  />
                </div>
              </article>

              <article id="storefront-rules" className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div>
                    <span className={styles.stepIndex}>Step 2</span>
                    <h3 className={styles.stepTitle}>
                      Choose the storefront access rules
                    </h3>
                  </div>
                  <StatusPill tone={wishlistRequiresLogin ? "warning" : "success"}>
                    {wishlistRequiresLogin
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
                    checked={wishlistRequiresLogin}
                    onChange={(event) =>
                      setWishlistRequiresLogin(event.currentTarget.checked)
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
                      onClick: saveStorefrontSettings,
                      loading: isSavingSettings,
                    }}
                  />
                </div>
              </article>

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
                      pageStepComplete
                        ? "success"
                        : hasWriteOnlineStorePagesScope
                          ? "warning"
                          : "critical"
                    }
                  >
                    {pageStepComplete
                      ? "Page is live"
                      : hasWriteOnlineStorePagesScope
                        ? "Ready to create"
                        : "Scope required"}
                  </StatusPill>
                </div>
                <p className={styles.stepText}>
                  Give shoppers one reliable place to review everything they have
                  saved. This turns wishlist from a button feature into a complete
                  storefront flow.
                </p>

                {!hasWriteOnlineStorePagesScope ? (
                  <div className={`${styles.callout} ${styles.calloutWarning}`}>
                    Add the <code>write_online_store_pages</code> scope and
                    reinstall the app before publishing the wishlist page.
                  </div>
                ) : null}

                {pageStepComplete ? (
                  <div className={`${styles.callout} ${styles.calloutSuccess}`}>
                    Wishlist page detected at <code>/pages/{wishlistPage.handle}</code>.
                  </div>
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

                <div className={styles.buttonRow}>
                  <ActionButton
                    action={{
                      label: pageStepComplete
                        ? "Update wishlist page"
                        : "Create wishlist page",
                      onClick: saveWishlistPage,
                      loading: isCreatingWishlistPage,
                      disabled: !hasWriteOnlineStorePagesScope,
                    }}
                  />
                  <ActionButton
                    action={
                      wishlistPageUrl
                        ? {
                            label: "Open live page",
                            href: wishlistPageUrl,
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
                      themeStepComplete
                        ? "success"
                        : hasThemeEditorLinks
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {themeStepComplete
                      ? "Placement confirmed"
                      : hasThemeEditorLinks
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
                        productPageButtonEditorUrl
                          ? {
                              label: "Open product block settings",
                              href: productPageButtonEditorUrl,
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
                        productPageEmbedEditorUrl
                          ? {
                              label: "Open app embed settings",
                              href: productPageEmbedEditorUrl,
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
                      label: themePlacementConfirmed
                        ? "Mark placement as not confirmed"
                        : "Confirm theme placement",
                      onClick: () =>
                        handleThemePlacementConfirmation(!themePlacementConfirmed),
                    }}
                  />
                </div>
              </article>

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
                      qaStepComplete
                        ? "success"
                        : testDataReady
                          ? "warning"
                          : "critical"
                    }
                  >
                    {qaStepComplete
                      ? "Validated with saved item"
                      : testDataReady
                        ? "Ready to test"
                        : "Missing store data"}
                  </StatusPill>
                </div>
                <p className={styles.stepText}>
                  Simulate the real shopper flow with a test customer and product.
                  This is the moment merchants gain confidence that install
                  actually became value.
                </p>

                {!testDataReady ? (
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
                    <s-select
                      label="Customer"
                      value={selectedCustomerId}
                      onChange={(event) =>
                        setSelectedCustomerId(event.currentTarget.value)
                      }
                      {...(customers.length === 0 ? { disabled: true } : {})}
                    >
                      {customers.length === 0 ? (
                        <option value="">No customers available</option>
                      ) : (
                        customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {formatCustomerLabel(customer)}
                          </option>
                        ))
                      )}
                    </s-select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Product</span>
                    <s-select
                      label="Product"
                      value={selectedProductId}
                      onChange={(event) =>
                        setSelectedProductId(event.currentTarget.value)
                      }
                      {...(products.length === 0 ? { disabled: true } : {})}
                    >
                      {products.length === 0 ? (
                        <option value="">No products available</option>
                      ) : (
                        products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {formatProductLabel(product)}
                          </option>
                        ))
                      )}
                    </s-select>
                  </label>
                </div>

                <div className={styles.metricGrid}>
                  <article className={styles.inlineMetric}>
                    <span className={styles.metricLabel}>Active customer</span>
                    <strong className={styles.metricValue}>
                      {selectedCustomerLabel}
                    </strong>
                    <p className={styles.metricText}>
                      This customer currently has {wishlistCount} saved{" "}
                      {wishlistCount === 1 ? "item" : "items"}.
                    </p>
                  </article>
                  <article className={styles.inlineMetric}>
                    <span className={styles.metricLabel}>Active product</span>
                    <strong className={styles.metricValue}>
                      {selectedProductLabel}
                    </strong>
                    <p className={styles.metricText}>
                      {productIsSaved
                        ? "This product is already saved in wishlist."
                        : "This product is not saved yet."}
                    </p>
                  </article>
                </div>

                <div className={styles.buttonRow}>
                  <ActionButton
                    action={{
                      label: productIsSaved
                        ? "Remove from wishlist"
                        : "Add to wishlist",
                      onClick: handleToggleWishlist,
                      loading: isMutating,
                      disabled: !selectedCustomerId || !selectedProductId,
                    }}
                  />
                  <ActionButton
                    action={{
                      label: "Refresh wishlist snapshot",
                      onClick: () => {
                        if (!selectedCustomerId) return;
                        wishlistFetcher.load(
                          `/app/api/wishlist?customerId=${encodeURIComponent(
                            selectedCustomerId,
                          )}`,
                        );
                      },
                      loading: isReloadingWishlist,
                      disabled: !selectedCustomerId,
                    }}
                    secondary
                  />
                </div>
              </article>
            </section>
          </div>

          <aside className={styles.railColumn}>
            <div className={styles.railSticky}>
              <section className={styles.railPanel}>
                <p className={styles.sectionEyebrow}>Phase B · Live side panel</p>
                <h3 className={styles.railTitle}>System health and launch status</h3>
                <p className={styles.railText}>
                  This panel stays visible so merchants always know what is live,
                  what is blocked, and what the next best action is.
                </p>

                <div className={styles.scoreCard}>
                  <div className={styles.scoreHeader}>
                    <span className={styles.metricLabel}>Setup completion</span>
                    <strong className={styles.scoreValue}>{progressPercent}%</strong>
                  </div>
                  <div className={styles.progressTrack}>
                    <span
                      className={styles.progressFill}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className={styles.progressList}>
                    {progressItems.map((item) => (
                      <div key={item.title} className={styles.progressRow}>
                        <span
                          className={`${styles.progressDot} ${
                            item.complete ? styles.progressDotComplete : ""
                          }`}
                        />
                        <div>
                          <strong className={styles.progressTitle}>
                            {item.title}
                          </strong>
                          <p className={styles.progressText}>{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className={styles.railPanel}>
                <p className={styles.sectionEyebrow}>Phase C · Snapshot copy</p>
                <h3 className={styles.railTitle}>Current storefront snapshot</h3>
                <div className={styles.snapshotList}>
                  <div className={styles.snapshotRow}>
                    <span className={styles.snapshotLabel}>Storefront mode</span>
                    <strong className={styles.snapshotValue}>
                      {wishlistRequiresLogin ? "Login required" : "Guest wishlist"}
                    </strong>
                  </div>
                  <div className={styles.snapshotRow}>
                    <span className={styles.snapshotLabel}>Wishlist page</span>
                    <strong className={styles.snapshotValue}>
                      {pageStepComplete ? wishlistPagePreviewPath : "Not live yet"}
                    </strong>
                  </div>
                  <div className={styles.snapshotRow}>
                    <span className={styles.snapshotLabel}>Selected customer</span>
                    <strong className={styles.snapshotValue}>
                      {selectedCustomerLabel}
                    </strong>
                  </div>
                  <div className={styles.snapshotRow}>
                    <span className={styles.snapshotLabel}>Selected product</span>
                    <strong className={styles.snapshotValue}>
                      {selectedProductLabel}
                    </strong>
                  </div>
                  <div className={styles.snapshotRow}>
                    <span className={styles.snapshotLabel}>Saved items</span>
                    <strong className={styles.snapshotValue}>
                      {wishlistCount}
                    </strong>
                  </div>
                </div>
              </section>

              <section className={styles.railPanel}>
                <p className={styles.sectionEyebrow}>Phase D · Hierarchy</p>
                <h3 className={styles.railTitle}>Live health checks</h3>
                <div className={styles.healthList}>
                  {healthItems.map((item) => (
                    <div key={item.label} className={styles.healthRow}>
                      <div>
                        <strong className={styles.healthLabel}>{item.label}</strong>
                        <p className={styles.healthText}>{item.value}</p>
                      </div>
                      <StatusPill tone={item.tone}>{item.value}</StatusPill>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.railPanel}>
                <p className={styles.sectionEyebrow}>Phase E · First value</p>
                <h3 className={styles.railTitle}>Wishlist snapshot</h3>
                {wishlistLabels.length > 0 ? (
                  <div className={styles.savedList}>
                    {wishlistLabels.map((label) => (
                      <span key={label} className={styles.savedItem}>
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyStateCompact}>
                    Wishlist is empty for the active customer. Use the QA lab to
                    save the first product and prove the flow end to end.
                  </div>
                )}
              </section>
            </div>
          </aside>
        </div>
      </div>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
