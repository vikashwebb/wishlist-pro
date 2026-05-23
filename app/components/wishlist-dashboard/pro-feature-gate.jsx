/* eslint-disable react/prop-types */
import { AppLink } from "../app-link";
import { dashboardStyles as styles } from "./shared";

const DEFAULT_TITLE = "Wishlist Pro feature";
const DEFAULT_DESCRIPTION =
  "Upgrade to run merchant QA testing, live health checks, and validate wishlist saves before launch.";

export function ProFeatureGate({
  isPro,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  className = "",
  children,
}) {
  if (isPro) {
    return children;
  }

  const gateClassName = [styles.proGate, className].filter(Boolean).join(" ");

  return (
    <div className={gateClassName}>
      <div className={styles.proGateContent}>{children}</div>
      <div className={styles.proGateOverlay}>
        <div className={styles.proGateCard}>
          <span className={styles.proGateBadge}>Wishlist Pro</span>
          <h3 className={styles.proGateTitle}>{title}</h3>
          <p className={styles.proGateText}>{description}</p>
          <AppLink className={styles.linkButton} href="/app/pricing">
            View pricing &amp; upgrade
          </AppLink>
        </div>
      </div>
    </div>
  );
}
