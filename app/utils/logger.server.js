export function logWishlist(scope, ...args) {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.WISHLIST_DEBUG === "1"
  ) {
    console.log(scope, ...args);
  }
}

export function logWishlistError(scope, ...args) {
  console.error(scope, ...args);
}
