/* eslint-disable react/prop-types */
import { AppLink } from "../app-link";
import {
  ActionButton,
  StatusPill,
  dashboardStyles as styles,
} from "./shared";

export function LaunchStatusStrip({ d }) {
  const healthPassCount = d.healthItems.filter((item) => item.tone === "success").length;
  const nextItem = d.progressItems.find((item) => !item.complete);
  const runCheckAction = {
    label: d.diagnosticsFresh ? "Re-run check" : "Run check",
    onClick: d.runDiagnostics,
    loading: d.isCheckingMetafield,
  };

  return (
    <div className={styles.statusStrip} role="region" aria-label="Launch status summary">
      <div className={styles.statusStripBody}>
        <div className={styles.statusStripTop}>
          <span className={styles.statusStripEyebrow}>Launch status</span>
          <StatusPill tone={d.progressPercent === 100 ? "success" : "warning"}>
            {d.readinessLabel}
          </StatusPill>
        </div>

        <div className={styles.statusStripStats}>
          <div className={styles.statusStripStat}>
            <strong>{d.progressPercent}%</strong>
            <span>setup</span>
          </div>
          <div className={styles.statusStripStat}>
            <strong>
              {healthPassCount}/{d.healthItems.length}
            </strong>
            <span>checks</span>
          </div>
          <div className={styles.statusStripStat}>
            <strong>{d.wishlistCount}</strong>
            <span>QA items</span>
          </div>
        </div>

        <div className={styles.statusStripProgress}>
          <div className={styles.progressTrack}>
            <span
              className={styles.progressFill}
              style={{ width: `${d.progressPercent}%` }}
            />
          </div>
        </div>

        <p className={styles.statusStripNext}>
          {nextItem ? (
            <>
              Next step:{" "}
              <AppLink className={styles.statusStripNextLink} href={nextItem.href}>
                {nextItem.title}
              </AppLink>
            </>
          ) : (
            "All setup steps are complete."
          )}
        </p>
      </div>

      <div className={styles.statusStripActions}>
        <ActionButton action={runCheckAction} secondary />
        <AppLink className={styles.statusStripDashboardLink} href="/app#launch-monitor">
          View full status
        </AppLink>
      </div>
    </div>
  );
}
