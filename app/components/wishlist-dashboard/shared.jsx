/* eslint-disable react/prop-types */
import { AppLink, isInternalAppPath } from "../app-link";
import styles from "../../styles/app-index.module.css";

export function formatCustomerLabel(customer) {
  if (!customer) return "No customer selected";
  return customer.displayName || customer.email || customer.id;
}

export function formatProductLabel(product) {
  if (!product) return "No product selected";
  return product.title || product.handle || product.id;
}

export function formatWishlistLabel(productId, products) {
  const product = products.find((entry) => entry.id === productId);
  return product?.title || productId.split("/").pop() || productId;
}

function getToneClassName(tone) {
  if (tone === "success") return styles.pillSuccess;
  if (tone === "warning") return styles.pillWarning;
  if (tone === "critical") return styles.pillCritical;
  return styles.pillNeutral;
}

export function StatusPill({ tone = "neutral", children }) {
  return (
    <span className={`${styles.pill} ${getToneClassName(tone)}`}>{children}</span>
  );
}

/** Native select — React does not reliably bind onChange to Polaris <s-select> web components. */
export function DashboardSelect({
  label,
  value,
  onChange,
  disabled = false,
  children,
}) {
  return (
    <select
      className={styles.fieldInput}
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

export function ActionButton({ action, secondary = false }) {
  if (!action) return null;

  if (action.href) {
    if (action.disabled) {
      return (
        <s-button {...(secondary ? { variant: "secondary" } : {})} disabled>
          {action.label}
        </s-button>
      );
    }

    const className = `${styles.linkButton} ${
      secondary ? styles.linkButtonSecondary : ""
    }`;

    if (isInternalAppPath(action.href)) {
      return (
        <AppLink className={className} href={action.href}>
          {action.label}
        </AppLink>
      );
    }

    return (
      <a
        className={className}
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

export { styles as dashboardStyles };
