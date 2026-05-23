/* eslint-disable react/prop-types */

import { ActionButton, dashboardStyles as styles } from "./shared";

function ProgressRing({ percent }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className={styles.heroRing}
      style={{ "--progress": `${percent}%` }}
      aria-hidden="true"
    >
      <svg className={styles.heroRingSvg} viewBox="0 0 100 100">
        <circle className={styles.heroRingTrack} cx="50" cy="50" r={radius} />
        <circle
          className={styles.heroRingFill}
          cx="50"
          cy="50"
          r={radius}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className={styles.heroRingLabel}>
        <strong>{percent}%</strong>
        <span>complete</span>
      </div>
    </div>
  );
}

function StatusCard({ tone, title, description }) {
  return (
    <article className={`${styles.heroStatusCard} ${styles[`heroStatusCard_${tone}`]}`}>
      <span className={styles.heroStatusIcon} aria-hidden="true" />
      <div className={styles.heroStatusCopy}>
        <strong className={styles.heroStatusTitle}>{title}</strong>
        <p className={styles.heroStatusDescription}>{description}</p>
      </div>
    </article>
  );
}

export function HeroLaunchStatus({
  progressPercent,
  readinessLabel,
  qaStepComplete,
  wishlistRequiresLogin,
  primaryAction,
  secondaryAction,
}) {
  const launchTone = progressPercent === 100 ? "success" : "pending";
  const qaTone = qaStepComplete ? "success" : "pending";
  const storefrontTone = wishlistRequiresLogin ? "attention" : "success";

  return (
    <div className={styles.heroStatusPanel}>
      <div className={styles.heroStatusHeader}>
        <div>
          <p className={styles.heroStatusEyebrow}>Launch readiness</p>
          <h2 className={styles.heroStatusHeadline}>{readinessLabel}</h2>
          <p className={styles.heroStatusSubline}>
            {progressPercent === 100
              ? "Your wishlist setup is complete. Keep monitoring analytics as shoppers save products."
              : "Complete the remaining workspaces below to go live with confidence."}
          </p>
        </div>
        <ProgressRing percent={progressPercent} />
      </div>

      <div className={styles.heroStatusGrid}>
        <StatusCard
          tone={launchTone}
          title={readinessLabel}
          description={
            progressPercent === 100
              ? "All five setup milestones are done."
              : `${progressPercent}% of launch checklist complete.`
          }
        />
        <StatusCard
          tone={qaTone}
          title={qaStepComplete ? "First value reached" : "QA not validated"}
          description={
            qaStepComplete
              ? "Test customer has at least one saved wishlist item."
              : "Add and remove an item in Setup & QA lab."
          }
        />
        <StatusCard
          tone={storefrontTone}
          title={
            wishlistRequiresLogin ? "Login required mode" : "Guest wishlist enabled"
          }
          description={
            wishlistRequiresLogin
              ? "Shoppers must sign in before saving products."
              : "Guests can save locally, then sync after login."
          }
        />
      </div>

      <div className={styles.heroStatusProgress}>
        <div className={styles.heroStatusProgressLabels}>
          <span>Setup progress</span>
          <strong>{progressPercent}%</strong>
        </div>
        <div className={styles.progressTrack}>
          <span
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className={styles.heroActions}>
        <ActionButton action={primaryAction} />
        <ActionButton action={secondaryAction} secondary />
      </div>
    </div>
  );
}
