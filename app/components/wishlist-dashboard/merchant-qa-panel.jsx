/* eslint-disable react/prop-types */
import { AppLink } from "../app-link";
import { ActionButton, StatusPill, dashboardStyles as styles } from "./shared";

const QA_STEPS = [
  {
    title: "Pick a test customer",
    detail: "Choose a real customer in the QA lab below.",
  },
  {
    title: "Save & remove items",
    detail: "Simulate add and remove on their wishlist.",
  },
  {
    title: "Run system check",
    detail: "Confirm metafields and scopes are ready.",
  },
];

export function MerchantQaPanel({ d, variant = "full" }) {
  const complete = d?.qaStepComplete;

  if (variant === "compact" && complete) {
    return (
      <article className={`${styles.qaPanel} ${styles.qaPanelSuccess}`}>
        <div className={styles.qaPanelCompactRow}>
          <StatusPill tone="success">QA validated</StatusPill>
          <p className={styles.qaPanelCompactText}>
            Test customer has saved wishlist items. You can re-test anytime in
            Setup &amp; QA.
          </p>
          <AppLink className={styles.qaPanelLink} href="/app/setup#qa-lab">
            Open QA lab
          </AppLink>
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className={styles.qaPanel}>
        <div className={styles.qaPanelCompactRow}>
          <div className={styles.qaPanelCompactCopy}>
            <span className={styles.qaPanelBadge}>Before you launch</span>
            <p className={styles.qaPanelCompactTitle}>Run merchant QA testing</p>
            <p className={styles.qaPanelCompactText}>
              Validate add and remove flows with a real customer — included on
              every plan.
            </p>
          </div>
          <AppLink className={styles.linkButton} href="/app/setup#qa-lab">
            Open QA lab
          </AppLink>
        </div>
      </article>
    );
  }

  return (
    <section className={styles.qaPanel} aria-label="Merchant QA testing">
      <div className={styles.qaPanelHeader}>
        <span className={styles.qaPanelBadge}>
          {complete ? "QA complete" : "Included on all plans"}
        </span>
        <h2 className={styles.qaPanelTitle}>Merchant QA testing</h2>
        <p className={styles.qaPanelText}>
          Validate wishlist saves before launch. Use a real customer and product,
          then confirm your data foundation with a live system check.
        </p>
        {complete ? (
          <StatusPill tone="success">First value reached — saved item on file</StatusPill>
        ) : (
          <StatusPill tone="warning">QA not validated yet</StatusPill>
        )}
      </div>

      <ol className={styles.qaPanelSteps}>
        {QA_STEPS.map((step, index) => (
          <li key={step.title} className={styles.qaPanelStep}>
            <span className={styles.qaPanelStepIndex}>{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.qaPanelActions}>
        <AppLink className={styles.linkButton} href="/app/setup#qa-lab">
          {complete ? "Review QA lab" : "Go to QA lab"}
        </AppLink>
        <ActionButton
          secondary
          action={{
            label: d?.diagnosticsFresh ? "Re-run system check" : "Run system check",
            onClick: d?.runDiagnostics,
            loading: d?.isCheckingMetafield,
          }}
        />
      </div>
    </section>
  );
}
