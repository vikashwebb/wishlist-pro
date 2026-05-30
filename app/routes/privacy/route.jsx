import { Link, useLoaderData } from "react-router";
import styles from "../../styles/public-legal.module.css";

const LAST_UPDATED = "May 30, 2026";

export const loader = async () => {
  const contactEmail = process.env.SUPPORT_EMAIL?.trim() || null;

  return {
    contactEmail,
    lastUpdated: LAST_UPDATED,
  };
};

export const meta = () => [
  { title: "Privacy Policy — Wishlist Pro" },
  {
    name: "description",
    content:
      "Privacy policy for Wishlist Pro, a Shopify app that provides storefront wishlist functionality.",
  },
];

export default function PrivacyPolicy() {
  const { contactEmail, lastUpdated } = useLoaderData();

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <p className={styles.eyebrow}>Wishlist Pro</p>
          <Link className={styles.homeLink} to="/">
            Back to home
          </Link>
        </div>

        <article className={styles.card}>
          <h1 className={styles.heading}>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: {lastUpdated}</p>

          <div className={styles.content}>
            <p>
              Wishlist Pro (&quot;we&quot;, &quot;our&quot;, or &quot;the
              app&quot;) is a Shopify application that helps merchants offer
              wishlist functionality on their storefront. This policy explains
              what information the app processes and how that information is
              used.
            </p>

            <h2>Information we process</h2>
            <p>When you install Wishlist Pro, we process information needed to operate the app, including:</p>
            <ul>
              <li>Your shop domain and staff session data required to authenticate with Shopify</li>
              <li>
                App configuration you set in the admin, such as guest or
                login-only wishlist mode and wishlist page settings
              </li>
              <li>
                Subscription and billing status through Shopify&apos;s billing
                system when you choose a paid plan
              </li>
            </ul>

            <h2>Shopper and customer data</h2>
            <p>When shoppers use the wishlist on your storefront:</p>
            <ul>
              <li>
                Saved products for logged-in customers are stored on Shopify
                customer records using the customer metafield{" "}
                <code>wishlist.items</code>
              </li>
              <li>
                Guest wishlist items may be stored in the shopper&apos;s browser
                until they log in and items are synced to their customer account
              </li>
              <li>
                Product identifiers needed to add or remove wishlist items are
                processed when shoppers interact with wishlist buttons or the
                wishlist page
              </li>
            </ul>

            <h2>How we use information</h2>
            <p>We use this information only to:</p>
            <ul>
              <li>Provide wishlist functionality on your storefront</li>
              <li>Run app setup, diagnostics, and merchant testing tools</li>
              <li>Show wishlist analytics and exports you access in the admin app</li>
              <li>Maintain app security, reliability, and billing where applicable</li>
            </ul>

            <h2>Where data is stored</h2>
            <p>
              Wishlist product data for logged-in customers is stored on Shopify.
              App session data and shop settings are stored in our application
              infrastructure. We do not sell merchant or customer data.
            </p>

            <h2>Sharing with service providers</h2>
            <p>
              We use service providers needed to host and operate the app, such
              as cloud hosting and database services. These providers process
              data on our behalf to deliver the app. We may also share
              information when required by law.
            </p>

            <h2>Data retention</h2>
            <p>
              We retain app data while Wishlist Pro is installed on your store.
              When you uninstall the app, we delete app-specific data in line
              with our retention practices and Shopify&apos;s requirements.
              Customer wishlist metafields on Shopify remain under your control
              as the merchant.
            </p>

            <h2>Your choices</h2>
            <p>
              Merchants may uninstall the app at any time from Shopify admin.
              You may contact us with privacy questions or requests related to
              data we control.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The &quot;Last
              updated&quot; date at the top of this page will reflect changes.
              Continued use of the app after an update means you accept the
              revised policy.
            </p>

            <h2>Contact</h2>
            {contactEmail ? (
              <p className={styles.contact}>
                Questions about this policy:{" "}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </p>
            ) : (
              <p className={styles.contact}>
                Questions about this policy: contact us through the support
                channel listed on the Wishlist Pro Shopify App Store listing.
              </p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
