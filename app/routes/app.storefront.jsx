import { redirect } from "react-router";

export const loader = () => {
  throw redirect("/app/configure#storefront");
};

export default function StorefrontRedirect() {
  return null;
}
