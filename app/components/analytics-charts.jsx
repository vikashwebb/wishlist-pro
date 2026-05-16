/* eslint-disable react/prop-types */

import styles from "../styles/app-analytics.module.css";

const CHART_COLORS = ["#1d6b59", "#2fa87e", "#5bb89a", "#94d4bf"];

function chartMax(values, floor = 1) {
  return Math.max(...values, floor);
}

function ChartShell({ title, description, children, emptyMessage }) {
  if (emptyMessage) {
    return (
      <article className={styles.chartCard}>
        <header className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>{title}</h3>
          {description ? <p className={styles.chartText}>{description}</p> : null}
        </header>
        <div className={styles.chartEmpty}>{emptyMessage}</div>
      </article>
    );
  }

  return (
    <article className={styles.chartCard}>
      <header className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{title}</h3>
        {description ? <p className={styles.chartText}>{description}</p> : null}
      </header>
      {children}
    </article>
  );
}

export function DonutChart({ title, description, segments, footnote }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total === 0) {
    return (
      <ChartShell
        title={title}
        description={description}
        emptyMessage="No customer data yet."
      />
    );
  }

  const arcs = segments
    .filter((segment) => segment.value > 0)
    .map((segment, index) => {
      const fraction = segment.value / total;
      const length = fraction * circumference;
      const arc = {
        ...segment,
        color: segment.color ?? CHART_COLORS[index % CHART_COLORS.length],
        dasharray: `${length} ${circumference - length}`,
        dashoffset: -offset,
      };
      offset += length;
      return arc;
    });

  return (
    <ChartShell title={title} description={description}>
      <div className={styles.donutLayout}>
        <div className={styles.donutWrap}>
          <svg className={styles.donutSvg} viewBox="0 0 140 140" role="img" aria-label={title}>
            <circle
              className={styles.donutTrack}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth="16"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth="16"
                strokeDasharray={arc.dasharray}
                strokeDashoffset={arc.dashoffset}
                strokeLinecap="round"
                transform="rotate(-90 70 70)"
              />
            ))}
          </svg>
          <div className={styles.donutCenter}>
            <strong>{total}</strong>
            <span>scanned</span>
          </div>
        </div>

        <ul className={styles.chartLegend}>
          {segments.map((segment, index) => (
            <li key={segment.label} className={styles.legendRow}>
              <span
                className={styles.legendSwatch}
                style={{
                  background: segment.color ?? CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              <span className={styles.legendLabel}>{segment.label}</span>
              <strong className={styles.legendValue}>{segment.value}</strong>
            </li>
          ))}
        </ul>
      </div>
      {footnote ? <p className={styles.chartFootnote}>{footnote}</p> : null}
    </ChartShell>
  );
}

export function VerticalBarChart({ title, description, items, valueKey = "count" }) {
  const values = items.map((item) => item[valueKey] ?? 0);
  const maxValue = chartMax(values);

  if (values.every((value) => value === 0)) {
    return (
      <ChartShell
        title={title}
        description={description}
        emptyMessage="No distribution data yet."
      />
    );
  }

  return (
    <ChartShell title={title} description={description}>
      <div className={styles.columnChart} role="img" aria-label={title}>
        {items.map((item, index) => {
          const value = item[valueKey] ?? 0;
          const height = Math.round((value / maxValue) * 100);

          return (
            <div key={item.label} className={styles.columnGroup}>
              <span className={styles.columnValue}>{value}</span>
              <div className={styles.columnTrack}>
                <span
                  className={styles.columnFill}
                  style={{
                    height: `${height}%`,
                    background: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
              </div>
              <span className={styles.columnLabel}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}

export function AreaTrendChart({ title, description, points }) {
  const values = points.map((point) => point.count ?? 0);
  const maxValue = chartMax(values);
  const width = 320;
  const height = 120;
  const padding = 12;

  if (values.every((value) => value === 0)) {
    return (
      <ChartShell
        title={title}
        description={description}
        emptyMessage="No wishlist updates in the last 14 days."
      />
    );
  }

  const step =
    points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => {
    const x = padding + index * step;
    const y =
      height -
      padding -
      ((point.count ?? 0) / maxValue) * (height - padding * 2);

    return { ...point, x, y };
  });
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${
    height - padding
  } L ${coordinates[0].x} ${height - padding} Z`;

  return (
    <ChartShell title={title} description={description}>
      <svg
        className={styles.trendSvg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
      >
        {[0.25, 0.5, 0.75].map((fraction) => {
          const y = height - padding - fraction * (height - padding * 2);
          return (
            <line
              key={fraction}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              className={styles.trendGridLine}
            />
          );
        })}
        <path d={areaPath} className={styles.trendArea} />
        <path d={linePath} className={styles.trendLine} />
        {coordinates.map((point) => (
          <circle
            key={point.date}
            cx={point.x}
            cy={point.y}
            r="3.5"
            className={styles.trendPoint}
          />
        ))}
      </svg>

      <div className={styles.trendAxis}>
        {points.map((point, index) =>
          index % 2 === 0 || index === points.length - 1 ? (
            <span key={point.date} className={styles.trendAxisLabel}>
              {point.label}
            </span>
          ) : (
            <span key={point.date} className={styles.trendAxisLabel} aria-hidden="true" />
          ),
        )}
      </div>
    </ChartShell>
  );
}

export function HorizontalBarChart({ title, description, items, valueKey = "customerCount" }) {
  const values = items.map((item) => item[valueKey] ?? 0);
  const maxValue = chartMax(values);

  if (items.length === 0 || values.every((value) => value === 0)) {
    return (
      <ChartShell title={title} description={description} emptyMessage="No product data yet." />
    );
  }

  return (
    <ChartShell title={title} description={description}>
      <div className={styles.barChart}>
        {items.map((item, index) => {
          const value = item[valueKey] ?? 0;
          const width = Math.round((value / maxValue) * 100);

          return (
            <div key={item.productId ?? item.label} className={styles.barRow}>
              <p className={styles.barLabel}>{item.title ?? item.label}</p>
              <span className={styles.rowMeta}>{value}</span>
              <div className={styles.barTrack}>
                <span
                  className={styles.barFill}
                  style={{
                    width: `${width}%`,
                    background: `linear-gradient(90deg, ${
                      CHART_COLORS[index % CHART_COLORS.length]
                    } 0%, ${CHART_COLORS[(index + 1) % CHART_COLORS.length]} 100%)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}
