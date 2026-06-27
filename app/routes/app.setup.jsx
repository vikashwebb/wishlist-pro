import { redirect } from "react-router";

export const loader = ({ request }) => {
  const url = new URL(request.url);
  const hash = url.hash || "#health-qa";
  throw redirect(`/app/configure${hash}`);
};

export default function SetupRedirect() {
  return null;
}
