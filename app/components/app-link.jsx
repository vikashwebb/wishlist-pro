/* eslint-disable react/prop-types */
import { Link } from "react-router";

export function isInternalAppPath(path) {
  return typeof path === "string" && path.startsWith("/app");
}

/**
 * In-app navigation for the embedded admin. Uses React Router client routing
 * so pages stay inside the Shopify app shell (no full document reload).
 */
export function AppLink({ to, href, className, children, target, rel, ...rest }) {
  const path = to ?? href;

  if (!path || !isInternalAppPath(path)) {
    return (
      <a className={className} href={path} target={target} rel={rel} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link className={className} to={path} {...rest}>
      {children}
    </Link>
  );
}
