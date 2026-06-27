/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData, useRouteError } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { dashboardStyles as styles } from "../components/wishlist-dashboard/shared";
import helpStyles from "../styles/app-help.module.css";
import { shouldRevalidateSameAppPage } from "../utils/app-route-revalidation";

const REASON_OPTIONS = [
  { value: "Smart Setup & launch", label: "Smart Setup & launch" },
  { value: "Theme embed or wishlist button", label: "Theme embed or wishlist button" },
  { value: "Storefront / guest wishlist", label: "Storefront / guest wishlist" },
  { value: "Smart Alerts", label: "Smart Alerts" },
  { value: "Insights & export", label: "Insights & export" },
  { value: "Plan & billing", label: "Plan & billing" },
  { value: "Bug or something broken", label: "Bug or something broken" },
  { value: "Feature request", label: "Feature request" },
  { value: "Something else", label: "Something else" },
];

const PRIORITY_OPTIONS = [
  { value: "Normal — general question", label: "Normal — general question" },
  { value: "Blocking — can't go live", label: "Blocking — can't go live" },
  { value: "Urgent — storefront affected", label: "Urgent — storefront affected" },
];

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { session } = await authenticate.admin(request);

  return {
    supportEmail:
      process.env.WISHLIST_SUPPORT_EMAIL || "support@devyogi.in",
    shopDomain: session.shop,
  };
};

export function shouldRevalidate(args) {
  return shouldRevalidateSameAppPage(args);
}

export default function HelpPage() {
  const { supportEmail, shopDomain } = useLoaderData();
  const shopify = useAppBridge();
  const contactFetcher = useFetcher();
  const formRef = useRef(null);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isSubmitting =
    contactFetcher.state === "submitting" || contactFetcher.state === "loading";

  useEffect(() => {
    if (!contactFetcher.data) {
      return;
    }

    if (contactFetcher.data.error) {
      setSubmitSuccess(false);
      setSubmitError(contactFetcher.data.error);
      shopify.toast.show(contactFetcher.data.error, { isError: true });
      return;
    }

    if (contactFetcher.data.ok) {
      setSubmitError("");
      setSubmitSuccess(true);
      formRef.current?.reset();
      shopify.toast.show("Support message sent — we will reply soon.");
    }
  }, [contactFetcher.data, shopify]);

  function handleContactSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    contactFetcher.submit(formData, {
      action: "/app/api/support-contact",
      method: "post",
    });
  }

  return (
    <s-page heading="Help">
      <div className={helpStyles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Help</p>
            <h1 className={helpStyles.heroTitle}>We are here to help</h1>
            <p className={styles.heroText}>
              Tell us what you need — setup, theme, Smart Alerts, billing, or a
              bug. Messages are delivered to {supportEmail}.
            </p>
          </div>
        </section>

        <div className={helpStyles.layout}>
          <aside className={helpStyles.sidePanel}>
            <div className={helpStyles.sideCard}>
              <p className={helpStyles.sideEyebrow}>Your store</p>
              <p className={helpStyles.shopDomain}>{shopDomain}</p>
              <p className={helpStyles.sideText}>
                Included automatically in every support request so we can look up
                your install quickly.
              </p>
            </div>

            <div className={helpStyles.sideCard}>
              <p className={helpStyles.sideEyebrow}>What to include</p>
              <ul className={helpStyles.tipList}>
                <li>Which page or feature (Home, Smart Setup, storefront, etc.)</li>
                <li>Steps you already tried</li>
                <li>Screenshots if something looks wrong on the theme</li>
              </ul>
            </div>

            <div className={helpStyles.sideCardMuted}>
              <p className={helpStyles.sideEyebrow}>Response time</p>
              <p className={helpStyles.sideText}>
                We typically reply within one business day. Blocking launch issues
                are prioritized.
              </p>
            </div>
          </aside>

          <section className={helpStyles.formPanel}>
            <div className={helpStyles.formHeader}>
              <h2 className={helpStyles.formTitle}>Contact support</h2>
              <p className={helpStyles.formIntro}>
                Send your message below. It is posted securely from the app server
                to our support inbox.
              </p>
            </div>

            {submitSuccess ? (
              <div className={helpStyles.successBanner} role="status">
                <strong>Message sent.</strong> Thanks — we received your request
                and will reply to the email you provided. Check spam if you do not
                hear back within one business day.
              </div>
            ) : null}

            {submitError ? (
              <div className={helpStyles.errorBanner} role="alert">
                {submitError}
              </div>
            ) : null}

            <form
              ref={formRef}
              className={helpStyles.contactForm}
              action="/app/api/support-contact"
              method="POST"
              onSubmit={handleContactSubmit}
            >
              <input
                type="text"
                name="_gotcha"
                className={helpStyles.honeypot}
                tabIndex={-1}
                autoComplete="off"
              />

              <div className={helpStyles.fieldRow}>
                <label className={helpStyles.field}>
                  <span className={helpStyles.label}>What do you need help with?</span>
                  <select className={helpStyles.select} name="reason" required defaultValue="">
                    <option value="" disabled>
                      Select a reason…
                    </option>
                    {REASON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={helpStyles.field}>
                  <span className={helpStyles.label}>How urgent is this?</span>
                  <select
                    className={helpStyles.select}
                    name="priority"
                    defaultValue={PRIORITY_OPTIONS[0].value}
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={helpStyles.fieldRow}>
                <label className={helpStyles.field}>
                  <span className={helpStyles.label}>Your name</span>
                  <input
                    className={helpStyles.input}
                    type="text"
                    name="name"
                    placeholder="e.g. Alex from marketing"
                    autoComplete="name"
                    required
                  />
                </label>

                <label className={helpStyles.field}>
                  <span className={helpStyles.label}>Reply-to email</span>
                  <input
                    className={helpStyles.input}
                    type="email"
                    name="email"
                    placeholder="you@yourstore.com"
                    autoComplete="email"
                    required
                  />
                </label>
              </div>

              <label className={helpStyles.field}>
                <span className={helpStyles.label}>Subject (optional)</span>
                <input
                  className={helpStyles.input}
                  type="text"
                  name="subject"
                  placeholder="Short summary — we auto-fill from your reason if left blank"
                />
              </label>

              <label className={helpStyles.field}>
                <span className={helpStyles.label}>Where does this happen?</span>
                <input
                  className={helpStyles.input}
                  type="text"
                  name="affectedArea"
                  placeholder="e.g. Homepage embed, /pages/wishlist, Insights export"
                />
                <span className={helpStyles.hint}>
                  Admin page, theme location, or shopper-facing URL
                </span>
              </label>

              <label className={helpStyles.field}>
                <span className={helpStyles.label}>Describe the issue or question</span>
                <textarea
                  className={helpStyles.textarea}
                  name="message"
                  rows={7}
                  placeholder="What were you trying to do? What happened instead? Any error messages?"
                  required
                />
              </label>

              <div className={helpStyles.formFooter}>
                <button
                  className={helpStyles.submitButton}
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending…" : "Send message"}
                </button>
                <p className={helpStyles.footerNote}>
                  Delivered to {supportEmail}. If delivery fails, confirm your
                  Formspree form is activated in the Formspree dashboard.
                </p>
              </div>
            </form>
          </section>
        </div>
      </div>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
