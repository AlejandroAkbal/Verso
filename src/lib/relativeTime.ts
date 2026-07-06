/**
 * Localized "2m ago" style relative time. Uses Intl.RelativeTimeFormat (shipped
 * with Hermes Intl on Expo SDK 57) and falls back to a compact English form if
 * the runtime lacks it.
 */
export function formatRelativeTime(
  language: string | string[],
  timestampMs: number,
  nowMs: number = Date.now(),
): string {
  const deltaSec = Math.round((timestampMs - nowMs) / 1000);
  const abs = Math.abs(deltaSec);

  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;
  if (abs < 60) {
    value = deltaSec;
    unit = 'second';
  } else if (abs < 3600) {
    value = Math.round(deltaSec / 60);
    unit = 'minute';
  } else if (abs < 86400) {
    value = Math.round(deltaSec / 3600);
    unit = 'hour';
  } else if (abs < 604800) {
    value = Math.round(deltaSec / 86400);
    unit = 'day';
  } else {
    value = Math.round(deltaSec / 604800);
    unit = 'week';
  }

  try {
    return new Intl.RelativeTimeFormat(language, {
      numeric: 'auto',
      style: 'short',
    }).format(value, unit);
  } catch {
    const n = Math.abs(value);
    return deltaSec >= 0 ? `in ${n}${unit[0]}` : `${n}${unit[0]} ago`;
  }
}
