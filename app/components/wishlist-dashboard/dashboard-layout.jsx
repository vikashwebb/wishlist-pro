/* eslint-disable react/prop-types */
import { LaunchRail } from "./launch-rail";
import { LaunchStatusStrip } from "./launch-status-strip";
import { dashboardStyles as styles } from "./shared";

/**
 * @param {"full" | "compact"} rail
 * - full: home only — side panel with checklist, config, and health
 * - compact: workspace pages — slim status strip + full-width content
 */
export function DashboardLayout({ d, intro, children, rail = "compact" }) {
  const showFullRail = rail === "full";

  return (
    <div className={styles.page}>
      {intro}
      {!showFullRail ? <LaunchStatusStrip d={d} /> : null}
      <div className={showFullRail ? styles.mainGrid : styles.mainSingle}>
        {children}
        {showFullRail ? <LaunchRail d={d} /> : null}
      </div>
    </div>
  );
}
