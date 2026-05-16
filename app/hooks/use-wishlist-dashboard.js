import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  formatCustomerLabel,
  formatProductLabel,
  formatWishlistLabel,
} from "../components/wishlist-dashboard/shared";

export function useWishlistDashboard() {
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
  const optimisticRollbackRef = useRef(null);
  const savedStorefrontRulesRef = useRef(!!settings?.wishlistRequiresLogin);
  const diagnosticsToastRef = useRef("initial");
  const lastDiagnosticsCustomerRef = useRef(initialSelectedCustomerId);
  const wishlistLoadCustomerRef = useRef(initialSelectedCustomerId);
  const diagnosticsRequestIdRef = useRef(0);
  const wishlistFetcherRef = useRef(wishlistFetcher);
  const mutationFetcherRef = useRef(mutationFetcher);
  const diagnosticsFetcherRef = useRef(diagnosticsFetcher);

  wishlistFetcherRef.current = wishlistFetcher;
  mutationFetcherRef.current = mutationFetcher;
  diagnosticsFetcherRef.current = diagnosticsFetcher;

  const [selectedCustomerId, setSelectedCustomerId] = useState(initialSelectedCustomerId);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
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
      wishlistLoadCustomerRef.current = selectedCustomerId;
      return;
    }

    if (wishlistLoadCustomerRef.current === selectedCustomerId) {
      return;
    }

    wishlistLoadCustomerRef.current = selectedCustomerId;
    wishlistFetcherRef.current.load(
      `/app/api/wishlist?customerId=${encodeURIComponent(selectedCustomerId)}`,
    );
  }, [initialSelectedCustomerId, selectedCustomerId]);

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
      mutationFetcherRef.current.submit(pendingChange, {
        action: "/app/api/wishlist",
        method: "post",
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [pendingChange]);

  useEffect(() => {
    if (mutationFetcher.state !== "idle" || !mutationFetcher.data) return;

    if (mutationFetcher.data.error) {
      if (optimisticRollbackRef.current) {
        setWishlistItems(optimisticRollbackRef.current);
        optimisticRollbackRef.current = null;
      }
      setPendingChange(null);
      shopify.toast.show(mutationFetcher.data.error, { isError: true });
      return;
    }

    const nextItems = Array.isArray(mutationFetcher.data.items)
      ? [...new Set(mutationFetcher.data.items)]
      : [];

    setWishlistItems(nextItems);
    optimisticRollbackRef.current = null;
    setPendingChange(null);

    const actionLabel =
      mutationFetcher.data.intent === "remove" ? "Removed" : "Added";
    shopify.toast.show(`${actionLabel} wishlist item`);
  }, [mutationFetcher.data, mutationFetcher.state, shopify]);

  useEffect(() => {
    if (diagnosticsFetcher.state !== "idle" || !diagnosticsFetcher.data) return;

    if (diagnosticsFetcher.data.error) {
      if (diagnosticsToastRef.current === "manual") {
        shopify.toast.show(diagnosticsFetcher.data.error, { isError: true });
      }
      return;
    }

    setDiagnostics(diagnosticsFetcher.data);
    lastDiagnosticsCustomerRef.current =
      diagnosticsFetcher.data.customerId ?? selectedCustomerId;

    if (diagnosticsToastRef.current === "manual") {
      shopify.toast.show("System health updated");
    }
  }, [diagnosticsFetcher.data, diagnosticsFetcher.state, selectedCustomerId, shopify]);

  useEffect(() => {
    if (customerAccessBlocked) return;
    if (selectedCustomerId === lastDiagnosticsCustomerRef.current) return;

    const requestId = diagnosticsRequestIdRef.current + 1;
    diagnosticsRequestIdRef.current = requestId;
    diagnosticsToastRef.current = "auto";

    const timeoutId = window.setTimeout(() => {
      if (requestId !== diagnosticsRequestIdRef.current) return;
      if (selectedCustomerId === lastDiagnosticsCustomerRef.current) return;

      const url = selectedCustomerId
        ? `/app/api/wishlist-check?customerId=${encodeURIComponent(selectedCustomerId)}`
        : "/app/api/wishlist-check";
      diagnosticsFetcherRef.current.load(url);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [customerAccessBlocked, selectedCustomerId]);

  useEffect(() => {
    if (!settingsFetcher.data) return;

    if (settingsFetcher.data.error) {
      shopify.toast.show(settingsFetcher.data.error, { isError: true });
      return;
    }

    const nextValue = !!settingsFetcher.data.settings?.wishlistRequiresLogin;
    setWishlistRequiresLogin(nextValue);
    savedStorefrontRulesRef.current = nextValue;
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
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedCustomerLabel = formatCustomerLabel(selectedCustomer);
  const selectedProductLabel = formatProductLabel(selectedProduct);
  const wishlistCount = Array.isArray(wishlistItems) ? wishlistItems.length : 0;
  const wishlistLabels = wishlistItems.map((productId) => ({
    id: productId,
    label: formatWishlistLabel(productId, products),
  }));
  const productIsSaved = wishlistItems.includes(selectedProductId);
  const isMutating =
    mutationFetcher.state === "loading" || mutationFetcher.state === "submitting";
  const isCheckingMetafield =
    diagnosticsFetcher.state === "loading" ||
    diagnosticsFetcher.state === "submitting";
  const isReloadingWishlist =
    wishlistFetcher.state === "loading" || wishlistFetcher.state === "submitting";
  const isSavingSettings =
    settingsFetcher.state === "loading" || settingsFetcher.state === "submitting";
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
        mainThemeId ? encodeURIComponent(mainThemeId.split("/").pop()) : "current"
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
  const wishlistPageEmbedEditorUrl =
    themeEditorBaseUrl && appApiKey
      ? `${themeEditorBaseUrl}?context=apps&template=page&activateAppId=${encodeURIComponent(
          `${appApiKey}/wishlist-page-embed`,
        )}`
      : null;
  const hasThemeEditorLinks = Boolean(themeEditorBaseUrl && appApiKey);

  const diagnosticsCustomerId = diagnostics?.customerId ?? "";
  const diagnosticsMatchesSelection =
    (!selectedCustomerId && !diagnosticsCustomerId) ||
    diagnosticsCustomerId === selectedCustomerId;
  const diagnosticsFresh = !!diagnostics && diagnosticsMatchesSelection;
  const diagnosticsErrors = diagnosticsFresh ? diagnostics?.errors ?? [] : [];
  const diagnosticsWarnings = diagnosticsFresh ? diagnostics?.warnings ?? [] : [];
  const storefrontLocalOnlyMode =
    diagnosticsFresh && diagnostics?.checks?.storefrontLocalOnlyMode === true;
  const definitionReady =
    diagnosticsFresh && diagnostics?.checks?.definitionExists === true;
  const customerAccessReady =
    !customerAccessBlocked &&
    !storefrontLocalOnlyMode &&
    (selectedCustomerId
      ? diagnosticsFresh &&
        diagnostics?.checks?.protectedCustomerAccessApproved === true
      : diagnosticsFresh &&
        diagnostics?.checks?.hasReadCustomersScope === true &&
        diagnostics?.checks?.hasWriteCustomersScope === true &&
        diagnostics?.checks?.protectedCustomerAccessApproved !== false);
  const customerMetafieldReady =
    diagnosticsFresh && diagnostics?.checks?.customerMetafieldExists === true;
  const customerDataStepComplete = definitionReady && customerAccessReady;
  const storefrontStepComplete =
    wishlistRequiresLogin === savedStorefrontRulesRef.current && !isSavingSettings;
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

  const runDiagnostics = () => {
    diagnosticsToastRef.current = "manual";
    diagnosticsRequestIdRef.current += 1;
    const url = selectedCustomerId
      ? `/app/api/wishlist-check?customerId=${encodeURIComponent(selectedCustomerId)}`
      : "/app/api/wishlist-check";
    diagnosticsFetcherRef.current.load(url);
  };

  const refreshWishlistSnapshot = () => {
    if (!selectedCustomerId) return;
    wishlistLoadCustomerRef.current = "";
    wishlistFetcherRef.current.load(
      `/app/api/wishlist?customerId=${encodeURIComponent(selectedCustomerId)}`,
    );
  };

  const saveStorefrontSettings = () => {
    settingsFetcher.submit(
      { wishlistRequiresLogin: wishlistRequiresLogin ? "true" : "false" },
      { action: "/app/api/settings", method: "post" },
    );
  };

  const saveWishlistPage = () => {
    pageFetcher.submit(
      { wishlistPageTitle, wishlistPageHandle },
      { action: "/app/api/wishlist-page", method: "post" },
    );
  };

  const handleToggleWishlist = () => {
    if (!selectedCustomerId || !selectedProductId) {
      shopify.toast.show("Select a customer and product first", { isError: true });
      return;
    }

    const alreadySaved = wishlistItems.includes(selectedProductId);
    const nextItems = alreadySaved
      ? wishlistItems.filter((item) => item !== selectedProductId)
      : [...new Set([...wishlistItems, selectedProductId])];

    optimisticRollbackRef.current = wishlistItems;
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

  const nextSetupHref = !customerDataStepComplete
    ? "/app/setup"
    : !storefrontStepComplete || !pageStepComplete
      ? "/app/storefront"
      : !themeStepComplete
        ? "/app/theme"
        : !qaStepComplete
          ? "/app/setup#qa-lab"
          : "/app/analytics";

  const primaryHeroAction = !diagnosticsFresh || customerAccessBlocked
    ? {
        label: "Run live system check",
        onClick: runDiagnostics,
        loading: isCheckingMetafield,
      }
    : !pageStepComplete && hasWriteOnlineStorePagesScope
      ? {
          label: "Create wishlist page",
          href: "/app/storefront",
        }
      : !themeStepComplete && productPageButtonEditorUrl
        ? {
            label: "Open product theme editor",
            href: productPageButtonEditorUrl,
            target: "_top",
            rel: "noreferrer",
          }
        : !qaStepComplete
          ? { label: "Open merchant QA lab", href: "/app/setup#qa-lab" }
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
        label: "View analytics",
        href: "/app/analytics",
      }
    : {
        label: "Continue setup",
        href: nextSetupHref,
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
      value: pageStepComplete
        ? "Live"
        : hasWriteOnlineStorePagesScope
          ? "Ready to create"
          : "Scope required",
      tone: pageStepComplete
        ? "success"
        : hasWriteOnlineStorePagesScope
          ? "warning"
          : "critical",
    },
    {
      label: "Theme placement",
      value: themeStepComplete
        ? "Confirmed"
        : hasThemeEditorLinks
          ? "Awaiting confirmation"
          : "Theme access unavailable",
      tone: themeStepComplete ? "success" : hasThemeEditorLinks ? "warning" : "neutral",
    },
    {
      label: "Merchant QA",
      value: qaStepComplete
        ? "Passed with saved item"
        : testDataReady
          ? "Ready to test"
          : "Needs store data",
      tone: qaStepComplete ? "success" : testDataReady ? "warning" : "critical",
    },
    {
      label: "Storefront persistence",
      value: storefrontLocalOnlyMode
        ? "Browser-only mode"
        : diagnosticsFresh
          ? "Metafield writes enabled"
          : "Pending check",
      tone: storefrontLocalOnlyMode
        ? "critical"
        : diagnosticsFresh
          ? "success"
          : "neutral",
    },
  ];

  const progressItems = [
    {
      title: "Data foundation",
      href: "/app/setup",
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
      href: "/app/storefront",
      complete: storefrontStepComplete,
      detail: storefrontStepComplete
        ? wishlistRequiresLogin
          ? "Wishlist requires customer login."
          : "Guests can save wishlist items."
        : "Save storefront rules to confirm guest or login-only mode.",
    },
    {
      title: "Wishlist page",
      href: "/app/storefront",
      complete: pageStepComplete,
      detail: pageStepComplete
        ? `Live at /pages/${wishlistPage?.handle}`
        : hasWriteOnlineStorePagesScope
          ? `Ready to publish at ${wishlistPagePreviewPath}`
          : "Page write scope is missing.",
    },
    {
      title: "Theme placement",
      href: "/app/theme",
      complete: themeStepComplete,
      detail: themeStepComplete
        ? "Theme button placement confirmed."
        : "Open Theme Editor and confirm once placed.",
    },
    {
      title: "Merchant QA",
      href: "/app/setup#qa-lab",
      complete: qaStepComplete,
      detail: qaStepComplete
        ? "A wishlist item is saved for the active test customer."
        : "Use the QA lab to validate add and remove flows.",
    },
  ];

  const setupPages = [
    {
      href: "/app/setup",
      title: "Setup & QA",
      description: "Verify metafields, scopes, and run the merchant QA lab.",
      complete: customerDataStepComplete && qaStepComplete,
    },
    {
      href: "/app/storefront",
      title: "Storefront",
      description: "Choose guest vs login rules and publish the wishlist page.",
      complete: storefrontStepComplete && pageStepComplete,
    },
    {
      href: "/app/theme",
      title: "Theme",
      description: "Place the wishlist button block or embed in your theme.",
      complete: themeStepComplete,
    },
    {
      href: "/app/analytics",
      title: "Analytics",
      description: "See top products, engaged customers, and adoption metrics.",
      complete: progressPercent === 100,
    },
  ];

  return {
    customers,
    products,
    customerAccessBlocked,
    shopDomain,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedProductId,
    setSelectedProductId,
    wishlistRequiresLogin,
    setWishlistRequiresLogin,
    wishlistPageTitle,
    setWishlistPageTitle,
    wishlistPageHandle,
    setWishlistPageHandle,
    themePlacementConfirmed,
    diagnostics,
    selectedCustomerLabel,
    selectedProductLabel,
    wishlistCount,
    wishlistLabels,
    productIsSaved,
    isMutating,
    isCheckingMetafield,
    isReloadingWishlist,
    isSavingSettings,
    isCreatingWishlistPage,
    hasWriteOnlineStorePagesScope,
    wishlistPageUrl,
    wishlistPagePreviewPath,
    productPageButtonEditorUrl,
    productPageEmbedEditorUrl,
    wishlistPageEmbedEditorUrl,
    hasThemeEditorLinks,
    diagnosticsFresh,
    diagnosticsErrors,
    diagnosticsWarnings,
    storefrontLocalOnlyMode,
    definitionReady,
    customerAccessReady,
    customerMetafieldReady,
    customerDataStepComplete,
    storefrontStepComplete,
    pageStepComplete,
    themeStepComplete,
    qaStepComplete,
    testDataReady,
    progressPercent,
    readinessLabel,
    runDiagnostics,
    refreshWishlistSnapshot,
    saveStorefrontSettings,
    saveWishlistPage,
    handleToggleWishlist,
    handleThemePlacementConfirmation,
    primaryHeroAction,
    secondaryHeroAction,
    healthItems,
    progressItems,
    setupPages,
    wishlistPage,
    wishlistRequiresLogin,
  };
}
