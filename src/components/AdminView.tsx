import React, { useState, useMemo } from 'react';
import {
  Lock,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Trash2,
  MapPin,
  ExternalLink,
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Users,
  CalendarCheck,
  Eye,
  X,
} from 'lucide-react';
import { AttendanceRecord, ParticipantStats } from '../types';
import { ADMIN_PIN, computeStats, fmtDate, STREAK_TARGET } from '../utils/attendance';
import { saveRecords } from '../utils/storage';
import { KtaCardModal } from './KtaCardModal';
import { jsPDF } from 'jspdf';

interface AdminViewProps {
  records: AttendanceRecord[];
  onRecordsChange: (newRecords: AttendanceRecord[]) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ records, onRecordsChange }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState(0);
  const [selectedKtaParticipant, setSelectedKtaParticipant] = useState<ParticipantStats | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ photo: string; title: string; meta: string } | null>(null);

  // Handle PIN Unlock
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('PIN salah. Silakan coba kembali.');
    }
  };

  // Group records by unique participant names
  const uniqueNames = useMemo((): string[] => {
    const set = new Set<string>();
    records.forEach((r) => {
      const trimmed = r.name.trim();
      if (trimmed) set.add(trimmed);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [records]);

  // Compute stats for all participants
  const participantsStats = useMemo(() => {
    return uniqueNames.map((name) => computeStats(records, name));
  }, [uniqueNames, records]);

  // Filtered participants based on search query
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participantsStats;
    const q = searchQuery.toLowerCase();
    return participantsStats.filter((p) => p.name.toLowerCase().includes(q));
  }, [participantsStats, searchQuery]);

  // Overall metric summaries
  const eligibleCount = useMemo(() => {
    return participantsStats.filter((p) => p.eligible).length;
  }, [participantsStats]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['Nama', 'Tanggal', 'Waktu', 'Pekan Ke-', 'Latitude', 'Longitude', 'Akurasi (meter)', 'Nama Tempat'];
    const rows: string[][] = [headers];

    const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
    sorted.forEach((r) => {
      const d = new Date(r.timestamp);
      rows.push([
        r.name,
        d.toLocaleDateString('id-ID'),
        d.toLocaleTimeString('id-ID'),
        r.weekIndex.toString(),
        r.lat.toString(),
        r.lng.toString(),
        Math.round(r.accuracy).toString(),
        r.placeName || 'Lokasi kajian',
      ]);
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap-absensi-kajian-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF
  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const margin = 14;
    let y = margin;

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(31, 64, 56);
    doc.text('Laporan Rekap Absensi Kajian', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110, 143, 107);
    doc.text(`Dicetak pada: ${fmtDate(Date.now())} | Total Kehadiran: ${records.length} data`, margin, y);
    y += 8;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 7;

    const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);

    if (sortedRecords.length === 0) {
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text('Belum ada data absensi yang tercatat.', margin, y + 4);
    } else {
      const imgSize = 28;
      const rowHeight = 32;

      sortedRecords.forEach((r, idx) => {
        if (y + rowHeight > pageH - margin) {
          doc.addPage();
          y = margin;
        }

        // Draw thumbnail if valid
        if (r.photo && r.photo.startsWith('data:image')) {
          try {
            doc.addImage(r.photo, 'JPEG', margin, y, imgSize, imgSize);
          } catch {
            // Draw placeholder box if image parse fails
            doc.setDrawColor(180, 180, 180);
            doc.rect(margin, y, imgSize, imgSize);
          }
        }

        const textX = margin + imgSize + 6;
        const textW = pageW - textX - margin;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(22, 48, 41);
        doc.text(`${idx + 1}. ${r.name}`, textX, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(110, 143, 107);
        doc.text(`Waktu: ${fmtDate(r.timestamp)}`, textX, y + 11);

        doc.setTextColor(70, 70, 70);
        doc.text(`Koordinat: ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)} (Akurasi ~${Math.round(r.accuracy)}m)`, textX, y + 17);

        const placeText = r.placeName || 'Lokasi kajian';
        const placeLines = doc.splitTextToSize(`Lokasi: ${placeText}`, textW);
        doc.text(placeLines, textX, y + 23);

        y += rowHeight;
        doc.setDrawColor(230, 230, 230);
        doc.line(margin, y - 2, pageW - margin, y - 2);
      });
    }

    doc.save(`laporan-absensi-kajian-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Reset all records
  const handleResetData = () => {
    if (resetStep === 0) {
      setResetStep(1);
    } else {
      saveRecords([]);
      onRecordsChange([]);
      setResetStep(0);
      setExpandedName(null);
    }
  };

  // PIN Gate View
  if (!isUnlocked) {
    return (
      <div className="w-full max-w-sm mx-auto my-12">
        <div className="bg-[#FFFDF8] border border-[rgba(28,38,32,0.16)] rounded-xl shadow-xs p-6 md:p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#EFE7D4] flex items-center justify-center text-[#1F4038]">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-spectral text-[#163029] mb-1">Masuk sebagai Admin</h3>
          <p className="text-xs text-[#6E8F6B] font-karla mb-5">
            Kelola rekap presensi, verifikasi kehadiran 12 pekan, dan cetak KTA
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="Masukkan PIN"
                className="w-full text-center text-xl font-mono tracking-widest px-4 py-3 rounded-lg border border-[rgba(28,38,32,0.22)] bg-[#FFFDF8] text-[#1C2620] focus:outline-none focus:ring-2 focus:ring-[#1F4038]/30"
              />
              {pinError && <p className="text-xs text-[#9C3B3B] mt-1.5 font-karla">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-[#1F4038] hover:bg-[#163029] text-white text-sm font-semibold font-karla transition cursor-pointer"
            >
              Buka Dashboard
            </button>
          </form>

          {/* Quick Demo Helper */}
          <div className="mt-5 pt-4 border-t border-[rgba(28,38,32,0.1)]">
            <button
              type="button"
              onClick={() => {
                setPinInput('1234');
                setIsUnlocked(true);
              }}
              className="text-xs text-[#B98B3E] hover:text-[#93701F] font-semibold underline cursor-pointer"
            >
              Gunakan PIN default (1234)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#FFFDF8] border border-[rgba(28,38,32,0.14)] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EFE7D4] flex items-center justify-center text-[#1F4038]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#6E8F6B] font-bold">Total Peserta</p>
            <p className="text-xl font-bold font-spectral text-[#163029]">{participantsStats.length}</p>
          </div>
        </div>

        <div className="bg-[#FFFDF8] border border-[rgba(28,38,32,0.14)] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E4EEE1] flex items-center justify-center text-[#2C5A38]">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#6E8F6B] font-bold">Total Rekor Absen</p>
            <p className="text-xl font-bold font-spectral text-[#163029]">{records.length}</p>
          </div>
        </div>

        <div className="bg-[#FFFDF8] border border-[rgba(28,38,32,0.14)] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F3EBD9] flex items-center justify-center text-[#B98B3E]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#B98B3E] font-bold">Berhak KTA (12 Pekan)</p>
            <p className="text-xl font-bold font-spectral text-[#163029]">{eligibleCount} Peserta</p>
          </div>
        </div>
      </div>

      {/* Main Admin Panel Card */}
      <div className="bg-[#FFFDF8] border border-[rgba(28,38,32,0.16)] rounded-xl shadow-xs p-5 md:p-6">
        {/* Toolbar Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#6E8F6B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama peserta..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[rgba(28,38,32,0.18)] bg-[#FFFDF8] text-[#1C2620] focus:outline-none focus:ring-1 focus:ring-[#1F4038]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg border border-[rgba(28,38,32,0.18)] bg-[#FFFDF8] hover:bg-[#EFE7D4]/40 text-xs font-semibold text-[#1F4038] flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#2C5A38]" />
              <span>Unduh CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3 py-1.5 rounded-lg border border-[rgba(28,38,32,0.18)] bg-[#FFFDF8] hover:bg-[#EFE7D4]/40 text-xs font-semibold text-[#1F4038] flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#9C3B3B]" />
              <span>Unduh PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setExpandedName(null);
              }}
              className="p-2 rounded-lg border border-[rgba(28,38,32,0.18)] bg-[#FFFDF8] hover:bg-[#EFE7D4]/40 text-xs text-[#1F4038] transition cursor-pointer"
              title="Segarkan data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Participant Attendance Table */}
        <div className="overflow-x-auto">
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-12 text-[#6E8F6B] font-karla">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-60" />
              <p className="text-sm">Belum ada peserta atau pencarian tidak ditemukan.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs font-karla">
              <thead>
                <tr className="border-b border-[rgba(28,38,32,0.15)] text-[#6E8F6B] uppercase font-bold text-[11px]">
                  <th className="pb-3 pl-3">Nama Peserta</th>
                  <th className="pb-3 px-3">Total Pekan Hadir</th>
                  <th className="pb-3 px-3">Streak Berjalan</th>
                  <th className="pb-3 pr-3 text-right">Status &amp; Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(28,38,32,0.08)]">
                {filteredParticipants.map((stats) => {
                  const isExpanded = expandedName === stats.name;
                  return (
                    <React.Fragment key={stats.name}>
                      <tr
                        onClick={() => setExpandedName(isExpanded ? null : stats.name)}
                        className="hover:bg-[#EFE7D4]/35 transition cursor-pointer group"
                      >
                        <td className="py-3 pl-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#1F4038] text-[#EFE7D4] font-spectral font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {stats.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-sm text-[#1C2620] group-hover:text-[#1F4038]">
                              {stats.name}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#6E8F6B]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#6E8F6B]/60" />
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-[#1C2620]">
                          <span className="font-semibold">{stats.totalWeeks}</span> pekan hadir
                        </td>

                        <td className="py-3 px-3 text-[#1C2620]">
                          <span className="font-semibold text-[#1F4038]">{stats.streak}</span> pekan berturut-turut
                        </td>

                        <td className="py-3 pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2 justify-end">
                            {stats.eligible ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E4EEE1] text-[#2C5A38] border border-[#2C5A38]/20">
                                  <CheckCircle className="w-3 h-3" /> Berhak KTA
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedKtaParticipant(stats)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#B98B3E] hover:bg-[#93701F] text-white transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Award className="w-3 h-3" />
                                  <span>Lihat KTA</span>
                                </button>
                              </>
                            ) : stats.streak > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3EBD9] text-[#93701F] border border-[#B98B3E]/20">
                                {stats.streak}/{STREAK_TARGET} pekan
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EFE7D4] text-[#6E8F6B]">
                                Belum ada streak
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Attendance Detail Rows */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="bg-[#EFE7D4]/40 p-4 border-b border-[rgba(28,38,32,0.12)]">
                            <div className="max-w-3xl space-y-3">
                              <div className="flex items-center justify-between pb-1 border-b border-[rgba(28,38,32,0.1)]">
                                <h4 className="text-xs font-bold text-[#163029] uppercase tracking-wider">
                                  Riwayat Kehadiran: {stats.name} ({stats.records.length} presensi)
                                </h4>
                                {stats.eligible && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedKtaParticipant(stats)}
                                    className="text-xs text-[#B98B3E] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Award className="w-3.5 h-3.5" /> Buka Kartu Anggota (KTA)
                                  </button>
                                )}
                              </div>

                              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                {stats.records.map((rec) => (
                                  <div
                                    key={rec.id}
                                    className="flex items-center gap-3 p-2.5 rounded-lg bg-[#FFFDF8] border border-[rgba(28,38,32,0.1)] shadow-2xs"
                                  >
                                    {/* Selfie Stamped Thumbnail */}
                                    <div
                                      onClick={() =>
                                        setZoomedPhoto({
                                          photo: rec.photo,
                                          title: `${rec.name} - ${fmtDate(rec.timestamp)}`,
                                          meta: `${rec.placeName || 'Lokasi Kajian'} (${rec.lat.toFixed(5)}, ${rec.lng.toFixed(5)})`,
                                        })
                                      }
                                      className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border border-[rgba(28,38,32,0.2)] bg-[#163029] cursor-pointer group/photo"
                                    >
                                      <img
                                        src={rec.photo}
                                        alt={`Selfie ${rec.name}`}
                                        className="w-full h-full object-cover group-hover/photo:scale-105 transition"
                                      />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition flex items-center justify-center text-white">
                                        <Eye className="w-3.5 h-3.5" />
                                      </div>
                                    </div>

                                    {/* Meta Details */}
                                    <div className="flex-1 min-w-0 text-xs space-y-0.5 font-karla">
                                      <p className="font-semibold text-[#1C2620]">{fmtDate(rec.timestamp)}</p>
                                      <p className="text-[11px] text-[#6E8F6B] truncate">
                                        {rec.placeName || 'Lokasi kajian'}
                                      </p>
                                      <div className="flex items-center gap-2 text-[10px] text-[#163029]/70">
                                        <span>
                                          {rec.lat.toFixed(5)}, {rec.lng.toFixed(5)} &middot; Akurasi ~
                                          {Math.round(rec.accuracy)}m
                                        </span>
                                        <span>&middot;</span>
                                        <a
                                          href={`https://www.google.com/maps?q=${rec.lat},${rec.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[#1F4038] hover:text-[#B98B3E] font-semibold underline inline-flex items-center gap-0.5"
                                        >
                                          <span>Peta</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Danger Zone: Reset Data */}
        <div className="mt-8 pt-5 border-t border-dashed border-[rgba(28,38,32,0.18)] flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold text-[#9C3B3B]">Zona Berbahaya</p>
            <p className="text-[11px] text-[#6E8F6B]">Hapus seluruh data presensi untuk memulai pembukuan baru.</p>
          </div>

          <div className="flex items-center gap-2">
            {resetStep === 1 && (
              <button
                type="button"
                onClick={() => setResetStep(0)}
                className="px-3 py-1.5 text-xs rounded border border-[rgba(28,38,32,0.2)] hover:bg-[#EFE7D4] transition cursor-pointer"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={handleResetData}
              className={`px-3 py-1.5 rounded text-xs font-semibold font-karla transition flex items-center gap-1.5 cursor-pointer ${
                resetStep === 1
                  ? 'bg-[#9C3B3B] text-white hover:bg-[#822E2E]'
                  : 'border border-[#9C3B3B] text-[#9C3B3B] hover:bg-[#9C3B3B]/10'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{resetStep === 1 ? 'Konfirmasi: Hapus Permanen' : 'Hapus Semua Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KTA Modal */}
      {selectedKtaParticipant && (
        <KtaCardModal stats={selectedKtaParticipant} onClose={() => setSelectedKtaParticipant(null)} />
      )}

      {/* Full Photo Zoom Modal */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-[#FFFDF8] rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative">
            <button
              type="button"
              onClick={() => setZoomedPhoto(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-full aspect-square bg-black">
              <img src={zoomedPhoto.photo} alt={zoomedPhoto.title} className="w-full h-full object-contain" />
            </div>
            <div className="p-4 bg-[#FFFDF8]">
              <p className="text-sm font-bold font-spectral text-[#163029]">{zoomedPhoto.title}</p>
              <p className="text-xs text-[#6E8F6B] mt-0.5">{zoomedPhoto.meta}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
