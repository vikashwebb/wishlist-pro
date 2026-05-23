/* eslint-disable react/prop-types */
import { AppLink } from "./app-link";
import gateStyles from "../styles/pro-feature-gate.module.css";

const DEFAULT_TITLE = "Wishlist Pro feature";
const DEFAULT_DESCRIPTION =
  "Upgrade to unlock this workspace and get full access with Wishlist Pro.";

/**
 * Pro gate: renders children only when isPro. Free plan sees a single upgrade
 * card (no blurred copy in the DOM — cannot be re-enabled via devtools).
 */
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

  const shellClassName = [gateStyles.proGateStandalone, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName} role="region" aria-label={title}>
      <div className={gateStyles.proGateCard}>
        <span className={gateStyles.proGateBadge}>Wishlist Pro</span>
        <h3 className={gateStyles.proGateTitle}>{title}</h3>
        <p className={gateStyles.proGateText}>{description}</p>
        <AppLink className={gateStyles.proGateLinkButton} href="/app/pricing">
          View pricing &amp; upgrade
        </AppLink>
      </div>
    </div>
  );
}
