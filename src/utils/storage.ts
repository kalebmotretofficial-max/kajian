import { AttendanceRecord } from '../types';
import { WEEK_MS, weekIndexOf } from './attendance';

const STORAGE_KEY = 'attendance-data';

// Helper to generate a placeholder SVG data URL for sample avatars
function createSamplePhoto(name: string, dateStr: string, locStr: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 360, 360);
  grad.addColorStop(0, '#1F4038');
  grad.addColorStop(1, '#163029');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 360, 360);

  // Decorative motif / avatar silhouette
  ctx.fillStyle = 'rgba(239, 231, 212, 0.15)';
  ctx.beginPath();
  ctx.arc(180, 140, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(180, 260, 90, Math.PI, 0, false);
  ctx.fill();

  // Initial letter
  ctx.fillStyle = '#EFE7D4';
  ctx.font = "bold 44px 'Spectral', serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.charAt(0).toUpperCase(), 180, 140);

  // Stamp footer
  ctx.fillStyle = 'rgba(10, 14, 12, 0.75)';
  ctx.fillRect(0, 360 - 75, 360, 75);

  ctx.fillStyle = '#B98B3E';
  ctx.fillRect(0, 360 - 75, 4, 75);

  ctx.fillStyle = '#FFFDF8';
  ctx.font = "600 12px 'Karla', sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText(dateStr, 14, 360 - 54);
  ctx.fillText('-6.20880, 106.84560', 14, 360 - 36);
  ctx.fillText(locStr, 14, 360 - 18);

  return canvas.toDataURL('image/jpeg', 0.85);
}

function getInitialSampleRecords(): AttendanceRecord[] {
  const now = Date.now();
  const currentWeek = weekIndexOf(now);
  const sampleRecords: AttendanceRecord[] = [];

  // Ahmad Fauzi: 12 weeks consecutive streak (Eligible for KTA)
  for (let i = 11; i >= 0; i--) {
    const ts = now - i * WEEK_MS;
    const wIdx = currentWeek - i;
    const d = new Date(ts);
    const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + '08:30:00';
    sampleRecords.push({
      id: `seed-ahmad-${i}`,
      name: 'Ahmad Fauzi',
      photo: createSamplePhoto('Ahmad Fauzi', dateStr, 'Masjid Agung Al-Azhar, Jakarta'),
      lat: -6.23554,
      lng: 106.79883,
      accuracy: 12,
      placeName: 'Masjid Agung Al-Azhar, Kebayoran Baru, Jakarta Selatan',
      timestamp: ts,
      weekIndex: wIdx,
    });
  }

  // Fatimah Azzahra: 5 weeks consecutive streak
  for (let i = 4; i >= 0; i--) {
    const ts = now - i * WEEK_MS;
    const wIdx = currentWeek - i;
    const d = new Date(ts);
    const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + '08:45:00';
    sampleRecords.push({
      id: `seed-fatimah-${i}`,
      name: 'Fatimah Azzahra',
      photo: createSamplePhoto('Fatimah Azzahra', dateStr, 'Masjid Raya Pondok Indah, Jakarta'),
      lat: -6.27015,
      lng: 106.78422,
      accuracy: 15,
      placeName: 'Masjid Raya Pondok Indah, Jakarta Selatan',
      timestamp: ts,
      weekIndex: wIdx,
    });
  }

  // Muhammad Ridwan: 2 weeks
  for (let i = 1; i >= 0; i--) {
    const ts = now - i * WEEK_MS;
    const wIdx = currentWeek - i;
    const d = new Date(ts);
    const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + '09:05:00';
    sampleRecords.push({
      id: `seed-ridwan-${i}`,
      name: 'Muhammad Ridwan',
      photo: createSamplePhoto('Muhammad Ridwan', dateStr, 'Masjid Istiqlal, Jakarta Pusat'),
      lat: -6.17017,
      lng: 106.83139,
      accuracy: 10,
      placeName: 'Masjid Istiqlal, Sawah Besar, Jakarta Pusat',
      timestamp: ts,
      weekIndex: wIdx,
    });
  }

  return sampleRecords;
}

export function loadRecords(): AttendanceRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const seeded = getInitialSampleRecords();
      saveRecords(seeded);
      return seeded;
    }
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load records from storage', err);
    return [];
  }
}

export function saveRecords(records: AttendanceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save records to storage', err);
  }
}
