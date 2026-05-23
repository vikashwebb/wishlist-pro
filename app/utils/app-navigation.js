/**
 * Split internal app paths so React Router navigates by pathname only.
 * Hash is applied separately to avoid lazy route-discovery fetch issues.
 */
export function splitAppLinkPath(path) {
  if (!path || typeof path !== "string") {
    return { pathname: "/app", hash: "" };
  }

  const hashIndex = path.indexOf("#");
  if (hashIndex === -1) {
    return { pathname: path, hash: "" };
  }

  return {
    pathname: path.slice(0, hashIndex) || "/app",
    hash: path.slice(hashIndex + 1),
  };
}

export function scrollToAppHash(hash) {
  if (!hash || typeof document === "undefined") {
    return;
  }

  const id = String(hash).replace(/^#/, "");
  if (!id) {
    return;
  }

  window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}
