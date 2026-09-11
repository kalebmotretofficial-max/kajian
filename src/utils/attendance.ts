import { AttendanceRecord, ParticipantStats } from '../types';

export const WEEK_EPOCH = new Date('2024-01-01T00:00:00').getTime(); // Monday reference
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const STREAK_TARGET = 12; // ~3 bulan berturut-turut
export const ADMIN_PIN = '1234';

export function weekIndexOf(ts: number): number {
  return Math.floor((ts - WEEK_EPOCH) / WEEK_MS);
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) +
    ' pukul ' +
    d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

export function fmtShortDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function truncateText(str: string | null, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('geocode failed');
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return 'Area Masjid / Lokasi Kajian';
  }
}

export function stampPhoto(
  canvas: HTMLCanvasElement,
  timestamp: number,
  coords: { lat: number; lng: number },
  placeName: string | null
): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/jpeg', 0.85);

  const w = canvas.width;
  const h = canvas.height;
  const d = new Date(timestamp);
  const timeStr =
    d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    '  ' +
    d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  const coordStr = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  const locStr = placeName ? truncateText(placeName, 42) : 'Lokasi Kajian';

  const lines = [timeStr, coordStr, locStr];
  const lineHeight = Math.max(14, Math.floor(h * 0.045));
  const padding = Math.max(8, Math.floor(h * 0.025));
  const boxHeight = lines.length * lineHeight + padding * 2;

  // Background box with rounded corners or flat bottom overlay
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 12, 0.72)';
  ctx.fillRect(0, h - boxHeight, w, boxHeight);

  // Decorative gold left indicator bar
  ctx.fillStyle = '#B98B3E';
  ctx.fillRect(0, h - boxHeight, 4, boxHeight);

  // Text
  ctx.fillStyle = '#FFFDF8';
  ctx.font = `600 ${Math.max(10, Math.floor(h * 0.032))}px 'Karla', sans-serif`;
  ctx.textBaseline = 'top';

  lines.forEach((line, i) => {
    ctx.fillText(line, 12, h - boxHeight + padding + i * lineHeight);
  });
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.85);
}

export function computeStats(records: AttendanceRecord[], name: string): ParticipantStats {
  const userRecs = records.filter((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase());
  const sortedRecs = [...userRecs].sort((a, b) => b.timestamp - a.timestamp);

  const weeks = Array.from(new Set(userRecs.map((r) => r.weekIndex))).sort((a, b) => b - a);
  let streak = weeks.length ? 1 : 0;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i] === weeks[i - 1] - 1) {
      streak++;
    } else {
      break;
    }
  }

  const nowWeek = weekIndexOf(Date.now());
  const lastWeek = weeks[0];
  const isCurrent = lastWeek !== undefined && nowWeek - lastWeek <= 1;
  const eligible = streak >= STREAK_TARGET && isCurrent;

  return {
    name,
    totalWeeks: weeks.length,
    streak,
    eligible,
    isCurrent,
    lastWeek,
    records: sortedRecs,
  };
}
