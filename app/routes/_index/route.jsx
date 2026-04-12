import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.backdrop} />
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Wishlist Pro</p>
          <h1 className={styles.heading}>
            A cleaner wishlist experience for merchants and shoppers
          </h1>
          <p className={styles.text}>
            Help customers save products they love, return with confidence, and
            convert later with a storefront wishlist that feels native to the
            brand.
          </p>

          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <h2>Storefront ready</h2>
              <p>
                Add wishlist actions to product pages, cards, and a dedicated
                page.
              </p>
            </article>
            <article className={styles.featureCard}>
              <h2>Simple controls</h2>
              <p>
                Choose whether guests can save items or require customer login.
              </p>
            </article>
            <article className={styles.featureCard}>
              <h2>Fast setup</h2>
              <p>
                Guide merchants through setup, checks, and testing without extra
                clutter.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <p className={styles.panelEyebrow}>Merchant login</p>
            <h2>Open your app dashboard</h2>
            <p>
              Sign in with your store domain to manage wishlist settings, create
              the wishlist page, and test the experience.
            </p>
          </div>

          {showForm && (
            <Form className={styles.form} method="post" action="/auth/login">
              <label className={styles.label}>
                <span>Shop domain</span>
                <input
                  className={styles.input}
                  type="text"
                  name="shop"
                  placeholder="your-store.myshopify.com"
                />
                <span className={styles.hint}>
                  Use your permanent <code>.myshopify.com</code> address.
                </span>
              </label>
              <button className={styles.button} type="submit">
                Continue to dashboard
              </button>
            </Form>
          )}

          <div className={styles.trustBlock}>
            <div>
              <strong>What merchants get</strong>
              <p>
                One place to manage wishlist setup, storefront behavior, and
                testing.
              </p>
            </div>
            <div>
              <strong>What shoppers feel</strong>
              <p>
                A smooth save-for-later flow that looks intentional and
                familiar.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
