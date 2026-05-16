/* eslint-disable react/prop-types */
import { AppLink } from "../app-link";
import { StatusPill, dashboardStyles as styles } from "./shared";

export function LaunchRail({ d }) {
  return (
    <aside className={styles.railColumn}>
      <div className={styles.railSticky}>
        <section className={styles.railPanel}>
          <p className={styles.sectionEyebrow}>Live side panel</p>
          <h3 className={styles.railTitle}>System health and launch status</h3>
          <p className={styles.railText}>
            Track what is live, what is blocked, and what to do next.
          </p>

                    <div className={styles.scoreCard}>
            <div className={styles.scoreHeader}>
              <span className={styles.metricLabel}>Setup completion</span>
              <strong className={styles.scoreValue}>{d.progressPercent}%</strong>
            </div>
            <div className={styles.progressTrack}>
              <span
                className={styles.progressFill}
                style={{ width: `${d.progressPercent}%` }}
              />
            </div>
            <div className={styles.progressList}>
              {d.progressItems.map((item) => (
                <div key={item.title} className={styles.progressRow}>
                  <span
                    className={`${styles.progressDot} ${
                      item.complete ? styles.progressDotComplete : ""
                    }`}
                  />
                  <div>
                    <AppLink className={styles.progressTitle} href={item.href}>
                      {item.title}
                    </AppLink>
                    <p className={styles.progressText}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.railPanel}>
          <p className={styles.sectionEyebrow}>Storefront snapshot</p>
          <h3 className={styles.railTitle}>Current configuration</h3>
                    <div className={styles.snapshotList}>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Storefront mode</span>
              <strong className={styles.snapshotValue}>
                {d.wishlistRequiresLogin ? "Login required" : "Guest wishlist"}
              </strong>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Wishlist page</span>
              <strong className={styles.snapshotValue}>
                {d.pageStepComplete ? d.wishlistPagePreviewPath : "Not live yet"}
              </strong>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Selected customer</span>
              <strong className={styles.snapshotValue}>{d.selectedCustomerLabel}</strong>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Saved items</span>
              <strong className={styles.snapshotValue}>{d.wishlistCount}</strong>
            </div>
          </div>
        </section>

        <section className={styles.railPanel}>
          <p className={styles.sectionEyebrow}>Health checks</p>
          <h3 className={styles.railTitle}>Live health checks</h3>
          <div className={styles.healthList}>
            {d.healthItems.map((item) => (
              <div key={item.label} className={styles.healthRow}>
                <div>
                  <strong className={styles.healthLabel}>{item.label}</strong>
                  <p className={styles.healthText}>{item.value}</p>
                </div>
                <StatusPill tone={item.tone}>{item.value}</StatusPill>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.railPanel}>
          <p className={styles.sectionEyebrow}>Wishlist snapshot</p>
          <h3 className={styles.railTitle}>Saved products</h3>
                    {d.wishlistLabels.length > 0 ? (
            <div className={styles.savedList}>
              {d.wishlistLabels.map((entry) => (
                <span key={entry.id} className={styles.savedItem}>
                  {entry.label}
                </span>
              ))}
            </div>
          ) : (
            <div className={styles.emptyStateCompact}>
              Wishlist is empty for the active customer. Use the QA lab to save the
              first product.
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
