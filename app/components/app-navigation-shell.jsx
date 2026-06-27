import { useEffect, useState } from "react";
import { Outlet, useNavigation } from "react-router";
import styles from "../styles/app-navigation-shell.module.css";

export function AppNavigationShell() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSlowHint(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowSlowHint(true);
    }, 6000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isLoading]);

  return (
    <div className={styles.shell}>
      <div
        className={`${styles.progressTrack} ${isLoading ? styles.progressTrackActive : ""}`}
        aria-hidden="true"
      >
        <div
          className={`${styles.progressBar} ${isLoading ? styles.progressBarActive : ""}`}
        />
      </div>

      <div className={styles.outletWrap}>
        <Outlet />
      </div>

      {isLoading ? (
        <div
          className={styles.loadingOverlay}
          role="status"
          aria-live="polite"
          aria-label="Loading page"
        >
          <div className={styles.loadingCard}>
            <div className={styles.spinner} aria-hidden="true" />
            <p className={styles.loadingTitle}>Loading page…</p>
            {showSlowHint ? (
              <p className={styles.loadingHint}>
                This can take a few seconds while we sync with Shopify.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
