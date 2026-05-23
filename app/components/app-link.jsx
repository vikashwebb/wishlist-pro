/* eslint-disable react/prop-types */
import { Link, useNavigate } from "react-router";
import { scrollToAppHash, splitAppLinkPath } from "../utils/app-navigation";

export function isInternalAppPath(path) {
  return typeof path === "string" && path.startsWith("/app");
}

/**
 * In-app navigation for the embedded admin. Uses React Router client routing
 * so pages stay inside the Shopify app shell (no full document reload).
 */
export function AppLink({ to, href, className, children, target, rel, onClick, ...rest }) {
  const navigate = useNavigate();
  const path = to ?? href;

  if (!path || !isInternalAppPath(path)) {
    return (
      <a className={className} href={path} target={target} rel={rel} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  const { pathname, hash } = splitAppLinkPath(path);

  function handleClick(event) {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (hash) {
      event.preventDefault();
      navigate({ pathname, hash: `#${hash}` });
      scrollToAppHash(hash);
    }
  }

  return (
    <Link
      className={className}
      to={pathname}
      onClick={hash ? handleClick : onClick}
      {...rest}
    >
      {children}
    </Link>
  );
}
