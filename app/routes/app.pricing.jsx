import { redirect } from "react-router";

export const loader = ({ request }) => {
  const url = new URL(request.url);
  const target = `/app/plan${url.search}`;
  throw redirect(target);
};

export default function PricingRedirect() {
  return null;
}
