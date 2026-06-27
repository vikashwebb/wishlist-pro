import prisma from "../db.server";

export const SMART_ALERT_TAGS = {
  recovery: "wishme-smart-recovery",
  priceDrop: "wishme-smart-price-drop",
  restock: "wishme-smart-restock",
};

export const DEFAULT_SMART_ALERT_SETTINGS = {
  smartRecoveryEnabled: false,
  smartRecoveryDelayDays: 7,
  smartPriceAlertsEnabled: false,
  smartPriceDropMinPercent: 5,
  smartRestockAlertsEnabled: false,
};

function hasShopSettingsModel() {
  return typeof prisma?.shopSettings?.findUnique === "function";
}

function hasAlertEventModel() {
  return typeof prisma?.alertEvent?.findMany === "function";
}

export function normalizeSmartAlertSettings(input = {}) {
  return {
    smartRecoveryEnabled: !!input.smartRecoveryEnabled,
    smartRecoveryDelayDays: [3, 7, 14].includes(Number(input.smartRecoveryDelayDays))
      ? Number(input.smartRecoveryDelayDays)
      : DEFAULT_SMART_ALERT_SETTINGS.smartRecoveryDelayDays,
    smartPriceAlertsEnabled: !!input.smartPriceAlertsEnabled,
    smartPriceDropMinPercent: Math.max(
      0,
      Math.min(
        100,
        Number(
          input.smartPriceDropMinPercent ??
            DEFAULT_SMART_ALERT_SETTINGS.smartPriceDropMinPercent,
        ),
      ),
    ),
    smartRestockAlertsEnabled: !!input.smartRestockAlertsEnabled,
  };
}

export async function getSmartAlertSettings(shop) {
  if (!shop || !hasShopSettingsModel()) {
    return DEFAULT_SMART_ALERT_SETTINGS;
  }

  const settings = await prisma.shopSettings.findUnique({ where: { shop } });
  return normalizeSmartAlertSettings(settings ?? {});
}

export async function updateSmartAlertSettings(shop, input = {}) {
  if (!shop) {
    throw new Error("shop is required");
  }

  if (!hasShopSettingsModel()) {
    return normalizeSmartAlertSettings(input);
  }

  const current = await prisma.shopSettings.findUnique({ where: { shop } });
  const next = normalizeSmartAlertSettings({
    smartRecoveryEnabled:
      typeof input.smartRecoveryEnabled === "boolean"
        ? input.smartRecoveryEnabled
        : current?.smartRecoveryEnabled,
    smartRecoveryDelayDays:
      input.smartRecoveryDelayDays ?? current?.smartRecoveryDelayDays,
    smartPriceAlertsEnabled:
      typeof input.smartPriceAlertsEnabled === "boolean"
        ? input.smartPriceAlertsEnabled
        : current?.smartPriceAlertsEnabled,
    smartPriceDropMinPercent:
      input.smartPriceDropMinPercent ?? current?.smartPriceDropMinPercent,
    smartRestockAlertsEnabled:
      typeof input.smartRestockAlertsEnabled === "boolean"
        ? input.smartRestockAlertsEnabled
        : current?.smartRestockAlertsEnabled,
  });

  await prisma.shopSettings.upsert({
    where: { shop },
    update: next,
    create: {
      shop,
      ...next,
    },
  });

  return next;
}

export async function recordAlertEvent(shop, payload = {}) {
  if (!shop || !hasAlertEventModel()) {
    return null;
  }

  return prisma.alertEvent.create({
    data: {
      shop,
      alertType: payload.alertType,
      customerId: payload.customerId ?? null,
      productId: payload.productId ?? null,
      variantId: payload.variantId ?? null,
      handle: payload.handle ?? null,
      email: payload.email ?? null,
      status: payload.status ?? "pending",
      metadata: payload.metadata ?? null,
    },
  });
}

export async function getSmartAlertStats(shop) {
  if (!shop || !hasAlertEventModel()) {
    return {
      pendingCount: 0,
      taggedCount: 0,
      readyForEmailCount: 0,
    };
  }

  const [pendingCount, taggedCount] = await Promise.all([
    prisma.alertEvent.count({ where: { shop, status: "pending" } }),
    prisma.alertEvent.count({ where: { shop, status: "tagged" } }),
  ]);

  return {
    pendingCount,
    taggedCount,
    readyForEmailCount: taggedCount,
  };
}

export async function tagCustomerForAlert(admin, customerId, tag) {
  const ownerId = customerId.startsWith("gid://")
    ? customerId
    : `gid://shopify/Customer/${customerId}`;

  const response = await admin.graphql(
    `#graphql
      mutation WishMeTagCustomer($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          node { id }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        id: ownerId,
        tags: [tag],
      },
    },
  );

  const payload = await response.json();
  const userErrors = payload.data?.tagsAdd?.userErrors ?? [];
  if (userErrors.length) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  return payload.data?.tagsAdd?.node ?? null;
}

export async function queueSmartRecoveryAlerts(admin, shop, settings) {
  if (!settings.smartRecoveryEnabled) {
    return { queued: 0 };
  }

  const delayMs = settings.smartRecoveryDelayDays * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - delayMs).toISOString();

  const response = await admin.graphql(
    `#graphql
      query WishMeRecoveryCandidates {
        customers(first: 50) {
          nodes {
            id
            updatedAt
            metafield(namespace: "wishlist", key: "items") {
              jsonValue
            }
          }
        }
      }`,
  );
  const payload = await response.json();
  const customers = payload.data?.customers?.nodes ?? [];
  let queued = 0;

  for (const customer of customers) {
    const items = customer.metafield?.jsonValue;
    if (!Array.isArray(items) || items.length === 0) continue;
    if (customer.updatedAt && customer.updatedAt > cutoff) continue;

    await recordAlertEvent(shop, {
      alertType: "recovery",
      customerId: customer.id,
      status: "pending",
      metadata: { itemCount: items.length },
    });

    try {
      await tagCustomerForAlert(admin, customer.id, SMART_ALERT_TAGS.recovery);
      queued += 1;
    } catch (error) {
      console.error("smartAlerts.recovery.tag.error", error);
    }
  }

  return { queued };
}

export async function handleProductUpdateForSmartAlerts(admin, shop, productPayload) {
  const settings = await getSmartAlertSettings(shop);
  if (!settings.smartPriceAlertsEnabled || !productPayload?.admin_graphql_api_id) {
    return { matched: 0 };
  }

  const handle = productPayload.handle;
  const currentPrice = Number(productPayload.variants?.[0]?.price ?? NaN);
  if (!handle || !Number.isFinite(currentPrice)) {
    return { matched: 0 };
  }

  await recordAlertEvent(shop, {
    alertType: "price_drop",
    productId: productPayload.admin_graphql_api_id,
    handle,
    status: "tagged",
    metadata: {
      currentPrice,
      minPercent: settings.smartPriceDropMinPercent,
    },
  });

  return { matched: 1 };
}

export async function handleInventoryUpdateForSmartAlerts(admin, shop, payload) {
  const settings = await getSmartAlertSettings(shop);
  if (!settings.smartRestockAlertsEnabled) {
    return { matched: 0 };
  }

  const available = payload.available ?? payload.inventory_item?.available;
  if (typeof available !== "number" || available <= 0) {
    return { matched: 0 };
  }

  await recordAlertEvent(shop, {
    alertType: "restock",
    variantId: payload.inventory_item_id?.toString() ?? null,
    status: "pending",
    metadata: { available },
  });

  return { matched: 1 };
}
