import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { DEFINITION_NAME, KEY, NAMESPACE } from "../models/wishlist";

export const loader = async ({ request }) => {
  const [{ getShopSettings }, { authenticate }] = await Promise.all([
    import("../models/shop-settings.server"),
    import("../shopify.server"),
  ]);
  const { admin, session } = await authenticate.admin(request);

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

    return {
      accessScopes:
        responseJson.data?.currentAppInstallation?.accessScopes?.map(
          (scope) => scope.handle,
        ) ?? [],
      customers: responseJson.data?.customers?.nodes ?? [],
      products: responseJson.data?.products?.nodes ?? [],
      settings: await getShopSettings(session.shop),
      customerAccessBlocked: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const customerAccessBlocked =
      message.includes("not approved to access the Customer object");

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

    return {
      accessScopes:
        fallbackJson.data?.currentAppInstallation?.accessScopes?.map(
          (scope) => scope.handle,
        ) ?? [],
      customers: [],
      products: fallbackJson.data?.products?.nodes ?? [],
      settings: await getShopSettings(session.shop),
      customerAccessBlocked: true,
    };
  }
};

export default function Index() {
  const { accessScopes, customers, products, customerAccessBlocked, settings } =
    useLoaderData();
  const wishlistFetcher = useFetcher();
  const mutationFetcher = useFetcher();
  const diagnosticsFetcher = useFetcher();
  const settingsFetcher = useFetcher();
  const pageFetcher = useFetcher();
  const shopify = useAppBridge();
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customers[0]?.id ?? "",
  );
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? "",
  );
  const [wishlistItems, setWishlistItems] = useState([]);
  const [pendingChange, setPendingChange] = useState(null);
  const [wishlistRequiresLogin, setWishlistRequiresLogin] = useState(
    !!settings?.wishlistRequiresLogin,
  );
  const [wishlistPage, setWishlistPage] = useState(null);

  useEffect(() => {
    if (!selectedCustomerId) {
      setWishlistItems([]);
      return;
    }

    wishlistFetcher.load(
      `/app/api/wishlist?customerId=${encodeURIComponent(selectedCustomerId)}`,
    );
  }, [selectedCustomerId, wishlistFetcher]);

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
    shopify.toast.show("Wishlist page created");
  }, [pageFetcher.data, shopify]);

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId,
  );
  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  );
  const diagnostics = diagnosticsFetcher.data;
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

  const statusCardStyle = {
    border: "1px solid var(--p-color-border, #d9d9d9)",
    borderRadius: "16px",
    padding: "16px",
    background: "#ffffff",
  };

  const statusPill = (tone, text) => {
    const palette = {
      neutral: { background: "#f2f2f2", color: "#303030" },
      success: { background: "#dff7e5", color: "#0c5132" },
      warning: { background: "#fff1d6", color: "#8a6116" },
      critical: { background: "#ffe0e0", color: "#8e1f0b" },
    };
    const selected = palette[tone] ?? palette.neutral;

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 10px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 600,
          background: selected.background,
          color: selected.color,
        }}
      >
        {text}
      </span>
    );
  };

  return (
    <s-page heading="Wishlist Pro Setup">
      <s-section heading="Storefront settings">
        <div style={statusCardStyle}>
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
            Login requirement
          </div>
          <s-paragraph>
            Control whether storefront wishlist actions work for guest shoppers
            or only for logged-in customers.
          </s-paragraph>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: "12px 0 16px",
            }}
          >
            <input
              type="checkbox"
              checked={wishlistRequiresLogin}
              onChange={(event) =>
                setWishlistRequiresLogin(event.currentTarget.checked)
              }
            />
            <span>Require customer login before using wishlist</span>
          </label>
          <s-button
            onClick={() =>
              settingsFetcher.submit(
                {
                  wishlistRequiresLogin: wishlistRequiresLogin ? "true" : "false",
                },
                {
                  action: "/app/api/settings",
                  method: "post",
                },
              )
            }
            {...(isSavingSettings ? { loading: true } : {})}
          >
            Save storefront setting
          </s-button>

          <div style={{ marginTop: "12px" }}>
            {wishlistRequiresLogin
              ? statusPill("warning", "Login required on storefront")
              : statusPill("success", "Guest wishlist enabled")}
          </div>
        </div>
      </s-section>

      <s-section heading="Wishlist page">
        <div style={statusCardStyle}>
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
            Create <code>/pages/wishlist</code>
          </div>
          <s-paragraph>
            Use the Admin API to create a Shopify page with the handle
            <code> wishlist</code>. After creation, you can connect it to the
            wishlist storefront experience.
          </s-paragraph>

          {!hasWriteOnlineStorePagesScope ? (
            <s-banner tone="warning">
              This app needs the <code>write_online_store_pages</code> scope to
              create <code>/pages/wishlist</code>. Update scopes, then reinstall
              the app before creating the page.
            </s-banner>
          ) : null}

          {wishlistPage ? (
            <div style={{ margin: "12px 0" }}>
              <s-banner tone="success">
                Wishlist page created at <code>/pages/{wishlistPage.handle}</code>.
              </s-banner>
            </div>
          ) : null}

          <s-stack direction="inline" gap="base" wrap>
            <s-button
              onClick={() =>
                pageFetcher.submit(
                  {},
                  {
                    action: "/app/api/wishlist-page",
                    method: "post",
                  },
                )
              }
              {...(isCreatingWishlistPage ? { loading: true } : {})}
              disabled={!hasWriteOnlineStorePagesScope}
            >
              Create wishlist page
            </s-button>

            {wishlistPage ? (
              <s-button
                variant="secondary"
                href={`/pages/${wishlistPage.handle}`}
                target="_blank"
              >
                Open storefront page
              </s-button>
            ) : null}
          </s-stack>

          <div style={{ marginTop: "12px", color: "#616161" }}>
            Next step: add the wishlist storefront surface you want to this page,
            or point this page at the final wishlist experience.
          </div>
        </div>
      </s-section>

      <s-section heading="Step 1 · Install and prepare">
        <s-paragraph>
          Start <code>Wishlist Pro</code> with <code>npm run dev</code>,
          install it on your development store, then use this page to verify
          whether the customer metafield <code>{NAMESPACE}.{KEY}</code> is
          available before testing the wishlist flow.
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            Install <code>Wishlist Pro</code> on the dev store from Shopify
            CLI.
          </s-list-item>
          <s-list-item>Create at least one customer in the dev store.</s-list-item>
          <s-list-item>Create at least one product for wishlist testing.</s-list-item>
          <s-list-item>
            In Shopify Admin, go to <code>Settings</code> &gt;{" "}
            <code>Custom data</code> &gt; <code>Customers</code> and create a
            metafield definition named <code>{DEFINITION_NAME}</code> with
            namespace and key <code>{NAMESPACE}.{KEY}</code> and type{" "}
            <code>JSON</code>.
          </s-list-item>
          <s-list-item>
            If customer access is blocked, request protected customer data
            approval in Partner Dashboard.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      {customerAccessBlocked ? (
        <s-section heading="Install status">
          <s-banner tone="warning">
            Wishlist Pro is not approved for the Shopify Admin Customer object
            yet. Admin API reads and writes on customer metafields are blocked
            until protected customer data access is approved in your Partner
            app.
          </s-banner>
          <s-paragraph>
            After approval, reinstall the app so the updated customer scopes are
            granted, then test the wishlist flow again.
          </s-paragraph>
        </s-section>
      ) : null}

      <s-section heading="Step 2 · Check the metafield">
        {customers.length === 0 ? (
          <s-banner tone="warning">
            No customers found in the development store. Create a customer in
            the Shopify admin before testing customer metafields.
          </s-banner>
        ) : null}

        {products.length === 0 ? (
          <s-banner tone="warning">
            No products found in the development store. Create a product before
            testing wishlist items.
          </s-banner>
        ) : null}

        <s-stack direction="block" gap="base">
          <s-select
            label="Customer to inspect"
            value={selectedCustomerId}
            onChange={(event) => setSelectedCustomerId(event.currentTarget.value)}
          >
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.displayName || customer.email || customer.id}
              </option>
            ))}
          </s-select>

          <s-stack direction="inline" gap="base" wrap>
            <s-button
              variant="secondary"
              onClick={runDiagnostics}
              {...(isCheckingMetafield ? { loading: true } : {})}
            >
              Check metafield
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
              Reload current wishlist
            </s-button>
          </s-stack>

          <div style={statusCardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", fontWeight: 600 }}>
                  Wishlist Pro metafield status
                </div>
                <div style={{ color: "#616161", marginTop: "4px" }}>
                  Checks the customer metafield definition
                  <code> {NAMESPACE}.{KEY} </code>
                  and whether it can be used by this app.
                </div>
              </div>
              {isCheckingMetafield
                ? statusPill("warning", "Checking")
                : diagnostics
                  ? metafieldExists
                    ? statusPill("success", "Metafield found")
                    : statusPill("critical", "Metafield missing")
                  : statusPill("neutral", "Not checked")}
            </div>

            {isCheckingMetafield ? (
              <s-banner tone="info">
                Checking the Wishlist Pro customer metafield now.
              </s-banner>
            ) : null}

            {!isCheckingMetafield && !diagnostics ? (
              <s-banner tone="info">
                Click <strong>Check metafield</strong> to verify whether
                <code> {NAMESPACE}.{KEY} </code> exists for customers.
              </s-banner>
            ) : null}

            {!isCheckingMetafield && diagnostics ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <div style={statusCardStyle}>
                  <div style={{ fontSize: "12px", color: "#616161" }}>
                    Metafield definition
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 600, marginTop: "6px" }}>
                    {metafieldExists ? DEFINITION_NAME : "Not found"}
                  </div>
                  <div style={{ color: "#616161", marginTop: "6px" }}>
                    Expected: <code>{NAMESPACE}.{KEY}</code>
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    {metafieldExists
                      ? statusPill("success", `${DEFINITION_NAME} exists`)
                      : statusPill("critical", `Create ${DEFINITION_NAME}`)}
                  </div>
                </div>

                <div style={statusCardStyle}>
                  <div style={{ fontSize: "12px", color: "#616161" }}>
                    Protected customer access
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 600, marginTop: "6px" }}>
                    {protectedAccessApproved === true
                      ? "Approved"
                      : protectedAccessApproved === false
                        ? "Blocked"
                        : "Pending check"}
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    {protectedAccessApproved === true
                      ? statusPill("success", "Customer access ready")
                      : protectedAccessApproved === false
                        ? statusPill("warning", "Approval required")
                        : statusPill("neutral", "Run check")}
                  </div>
                </div>

                <div style={statusCardStyle}>
                  <div style={{ fontSize: "12px", color: "#616161" }}>
                    Customer metafield value
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 600, marginTop: "6px" }}>
                    {customerValueExists ? "Present" : "Not created yet"}
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    {customerValueExists
                      ? statusPill("success", "Customer has wishlist data")
                      : statusPill("neutral", "No customer value yet")}
                  </div>
                </div>
              </div>
            ) : null}

            {!isCheckingMetafield && diagnostics?.errors?.length ? (
              <div style={{ marginTop: "12px" }}>
                <s-banner tone="warning">{diagnostics.errors[0]}</s-banner>
              </div>
            ) : null}
          </div>
        </s-stack>
      </s-section>

      <s-section heading="Step 3 · Test add and remove">
        <s-stack direction="block" gap="base">
          <s-select
            label="Product to test"
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.currentTarget.value)}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title}
              </option>
            ))}
          </s-select>

          <s-stack direction="inline" gap="base" wrap>
            <s-button
              onClick={handleToggleWishlist}
              {...(isMutating ? { loading: true } : {})}
            >
              {productIsSaved ? "Remove from Wishlist" : "Add to Wishlist"}
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section heading="Current wishlist state">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Customer:{" "}
            <strong>
              {selectedCustomer?.displayName ||
                selectedCustomer?.email ||
                "Not selected"}
            </strong>
          </s-paragraph>
          <s-paragraph>
            Product: <strong>{selectedProduct?.title || "Not selected"}</strong>
          </s-paragraph>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div style={statusCardStyle}>
              <div style={{ fontSize: "12px", color: "#616161" }}>
                Saved wishlist items
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "6px" }}>
                {wishlistCount}
              </div>
            </div>
            <div style={statusCardStyle}>
              <div style={{ fontSize: "12px", color: "#616161" }}>
                Selected product status
              </div>
              <div style={{ marginTop: "10px" }}>
                {productIsSaved
                  ? statusPill("success", "Already in wishlist")
                  : statusPill("neutral", "Not in wishlist")}
              </div>
            </div>
          </div>

          <div style={statusCardStyle}>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "10px" }}>
              Saved products
            </div>
            {savedProductTitles.length > 0 ? (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {savedProductTitles.map((title) => (
                  <span key={title}>{statusPill("success", title)}</span>
                ))}
              </div>
            ) : (
              <s-paragraph>
                No products are saved for this customer yet.
              </s-paragraph>
            )}
          </div>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
