/* eslint-disable react/prop-types */
import { LaunchRail } from "./launch-rail";
import { dashboardStyles as styles } from "./shared";

export function DashboardLayout({ d, intro, children }) {
  return (
    <div className={styles.page}>
      {intro}
      <div className={styles.mainGrid}>
        {children}
        <LaunchRail d={d} />
      </div>
    </div>
  );
}
