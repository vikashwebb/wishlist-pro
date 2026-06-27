import { redirect } from "react-router";

export const loader = () => {
  throw redirect("/app/configure#theme");
};

export default function ThemeRedirect() {
  return null;
}
