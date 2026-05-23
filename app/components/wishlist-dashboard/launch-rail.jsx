/* eslint-disable react/prop-types */
import { AppLink } from "../app-link";
import { ProFeatureGate } from "../pro-feature-gate";
import gateStyles from "../../styles/pro-feature-gate.module.css";
import {
  ActionButton,
  StatusPill,
  dashboardStyles as styles,
} from "./shared";

function RailSummaryStat({ label, value, tone = "neutral" }) {
  return (
    <div className={`${styles.railSummaryStat} ${styles[`railSummaryStat_${tone}`]}`}>
      <span className={styles.railSummaryLabel}>{label}</span>
      <strong className={styles.railSummaryValue}>{value}</strong>
    </div>
  );
}

function TimelineStep({ complete, title, detail, href }) {
  return (
    <li className={styles.railTimelineItem}>
      <span
        className={`${styles.railTimelineMarker} ${
          complete ? styles.railTimelineMarkerComplete : ""
        }`}
        aria-hidden="true"
      />
      <div className={styles.railTimelineCopy}>
        <AppLink className={styles.railTimelineTitle} href={href}>
          {title}
        </AppLink>
        <p className={styles.railTimelineDetail}>{detail}</p>
      </div>
    </li>
  );
}

function ConfigTile({ label, value }) {
  return (
    <div className={styles.railMetricTile}>
      <span className={styles.railMetricLabel}>{label}</span>
      <strong className={styles.railMetricValue}>{value}</strong>
    </div>
  );
}

function HealthCheckRow({ label, status, tone }) {
  return (
    <div className={styles.railHealthItem}>
      <span className={styles.railHealthLabel}>{label}</span>
      <StatusPill tone={tone}>{status}</StatusPill>
    </div>
  );
}

export function LaunchRail({ d }) {
  const healthPassCount = d.healthItems.filter((item) => item.tone === "success").length;
  const healthTone =
    healthPassCount === d.healthItems.length
      ? "success"
      : healthPassCount > 0
        ? "warning"
        : "neutral";

  const runCheckAction = {
    label: d.diagnosticsFresh ? "Re-run system check" : "Run system check",
    onClick: d.runDiagnostics,
    loading: d.isCheckingMetafield,
  };

  return (
    <aside className={styles.railColumn}>
      <div className={styles.railSticky}>
        <div id="launch-monitor" className={styles.railShell}>
          <header className={styles.railShellHeader}>
            <p className={styles.sectionEyebrow}>Live monitor</p>
            <h3 className={styles.railTitle}>Store status at a glance</h3>
            <p className={styles.railText}>
              Checklist, configuration, and system health — updated as you work
              through setup.
            </p>
            <div className={styles.railSummary}>
              <RailSummaryStat
                label="Setup"
                value={`${d.progressPercent}%`}
                tone={d.progressPercent === 100 ? "success" : "warning"}
              />
              <RailSummaryStat
                label="Health checks"
                value={`${healthPassCount}/${d.healthItems.length}`}
                tone={healthTone}
              />
            </div>
          </header>

          <div className={styles.railDivider} />

          <section className={styles.railSection}>
            <h4 className={styles.railSectionTitle}>Launch checklist</h4>
            <ol className={styles.railTimeline}>
              {d.progressItems.map((item) => (
                <TimelineStep
                  key={item.title}
                  complete={item.complete}
                  title={item.title}
                  detail={item.detail}
                  href={item.href}
                />
              ))}
            </ol>
          </section>

          <div className={styles.railDivider} />

          <section className={styles.railSection}>
            <h4 className={styles.railSectionTitle}>Configuration</h4>
            <div className={styles.railMetricGrid}>
              <ConfigTile
                label="Storefront"
                value={d.wishlistRequiresLogin ? "Login required" : "Guest mode"}
              />
              <ConfigTile
                label="Wishlist page"
                value={d.pageStepComplete ? "Published" : "Not live"}
              />
              <ConfigTile label="QA customer" value={d.selectedCustomerLabel} />
              <ConfigTile label="Saved items" value={String(d.wishlistCount)} />
            </div>
            {d.pageStepComplete ? (
              <p className={styles.railFootnote}>
                Page URL: <code>{d.wishlistPagePreviewPath}</code>
              </p>
            ) : null}
          </section>

          <div className={styles.railDivider} />

          {d.isPro ? (
            <>
              <section className={styles.railSection}>
                <div className={styles.railSectionHeader}>
                  <h4 className={styles.railSectionTitle}>System checks</h4>
                  <ActionButton action={runCheckAction} secondary />
                </div>
                <div className={styles.railHealthList}>
                  {d.healthItems.map((item) => (
                    <HealthCheckRow
                      key={item.label}
                      label={item.label}
                      status={item.value}
                      tone={item.tone}
                    />
                  ))}
                </div>
              </section>

              <div className={styles.railDivider} />

              <section className={styles.railSection}>
                <h4 className={styles.railSectionTitle}>QA wishlist preview</h4>
                {d.wishlistLabels.length > 0 ? (
                  <div className={styles.railSavedScroll}>
                    <div className={styles.savedList}>
                      {d.wishlistLabels.map((entry) => (
                        <span key={entry.id} className={styles.savedItem}>
                          {entry.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className={styles.railEmptyNote}>
                    No saved products yet for the active QA customer. Add one in
                    Setup &amp; QA.
                  </p>
                )}
              </section>
            </>
          ) : (
            <ProFeatureGate
              isPro={false}
              className={gateStyles.proGateRail}
              title="Health checks & QA preview"
              description="Upgrade to Pro to run system checks and preview the active QA customer's wishlist."
            />
          )}
        </div>
      </div>
    </aside>
  );
}
