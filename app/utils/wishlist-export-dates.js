/** Maximum inclusive span for a single export (≈2 calendar months). */
export const EXPORT_MAX_RANGE_DAYS = 62;

export function getTodayDateInputValue(reference = new Date()) {
  return reference.toISOString().slice(0, 10);
}

export function parseDateInputValue(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const parsed = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return trimmed;
}

export function addDaysToDateInput(value, days) {
  const parsed = parseDateInputValue(value);
  if (!parsed) {
    return null;
  }

  const date = new Date(`${parsed}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return getTodayDateInputValue(date);
}

export function daysBetweenDateInputs(from, to) {
  const start = parseDateInputValue(from);
  const end = parseDateInputValue(to);
  if (!start || !end) {
    return 0;
  }

  const startMs = new Date(`${start}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${end}T00:00:00.000Z`).getTime();

  return Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
}

/**
 * Keep picker values consistent: from <= to <= today, span <= max range.
 * @param {"from" | "to" | null} lastChanged - which field the user edited last
 */
export function syncExportDateRange(dateFrom, dateTo, lastChanged = null) {
  const today = getTodayDateInputValue();
  let from = parseDateInputValue(dateFrom);
  let to = parseDateInputValue(dateTo);

  if (!to) {
    to = today;
  }

  if (!from) {
    from = addDaysToDateInput(to, -30);
  }

  if (to > today) {
    to = today;
  }

  if (from > today) {
    from = today;
  }

  if (from > to) {
    if (lastChanged === "from") {
      to = from;
      if (to > today) {
        to = today;
        from = to;
      }
    } else if (lastChanged === "to") {
      from = to;
    } else {
      from = to;
    }
  }

  if (daysBetweenDateInputs(from, to) > EXPORT_MAX_RANGE_DAYS) {
    if (lastChanged === "from") {
      to = addDaysToDateInput(from, EXPORT_MAX_RANGE_DAYS);
      if (to > today) {
        to = today;
        from = addDaysToDateInput(to, -EXPORT_MAX_RANGE_DAYS);
      }
    } else {
      from = addDaysToDateInput(to, -EXPORT_MAX_RANGE_DAYS);
    }
  }

  if (from > to) {
    from = to;
  }

  return { dateFrom: from, dateTo: to };
}

export function getExportDatePickerBounds(dateFrom, dateTo) {
  const today = getTodayDateInputValue();
  const synced = syncExportDateRange(dateFrom || today, dateTo || today);
  const fromMin = addDaysToDateInput(synced.dateTo, -EXPORT_MAX_RANGE_DAYS);
  const fromMax = synced.dateTo < today ? synced.dateTo : today;

  return {
    today,
    fromMin,
    fromMax,
    toMin: synced.dateFrom,
    toMax: today,
    synced,
  };
}

export function validateExportDateRange(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) {
    return {
      valid: false,
      message: "Select both a start date and an end date.",
    };
  }

  const from = parseDateInputValue(dateFrom);
  const to = parseDateInputValue(dateTo);

  if (!from) {
    return { valid: false, message: "Start date is invalid." };
  }

  if (!to) {
    return { valid: false, message: "End date is invalid." };
  }

  if (from > to) {
    return {
      valid: false,
      message: "Start date must be on or before the end date.",
    };
  }

  const today = getTodayDateInputValue();

  if (from > today) {
    return {
      valid: false,
      message: "Start date cannot be in the future.",
    };
  }

  if (to > today) {
    return {
      valid: false,
      message: "End date cannot be in the future.",
    };
  }

  if (daysBetweenDateInputs(from, to) > EXPORT_MAX_RANGE_DAYS) {
    return {
      valid: false,
      message: `Date range cannot exceed ${EXPORT_MAX_RANGE_DAYS} days (about 2 months).`,
    };
  }

  return { valid: true };
}

/** Server-side: clamp and require a valid range. */
export function resolveExportDateRange(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) {
    return getDefaultExportDateRange(30);
  }

  const synced = syncExportDateRange(
    dateFrom,
    dateTo,
    dateTo ? "to" : "from",
  );
  const validation = validateExportDateRange(synced.dateFrom, synced.dateTo);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  return synced;
}

export function getDefaultExportDateRange(daySpan = 30) {
  const today = getTodayDateInputValue();
  const span = Math.min(daySpan, EXPORT_MAX_RANGE_DAYS);

  return syncExportDateRange(
    addDaysToDateInput(today, -span),
    today,
    "to",
  );
}
