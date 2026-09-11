import React, { useRef } from 'react';
import { X, Download, Award, CheckCircle, ShieldCheck } from 'lucide-react';
import { ParticipantStats } from '../types';
import { fmtShortDate } from '../utils/attendance';

interface KtaCardModalProps {
  stats: ParticipantStats;
  onClose: () => void;
}

export const KtaCardModal: React.FC<KtaCardModalProps> = ({ stats, onClose }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const latestRecord = stats.records[0];
  const photoSrc = latestRecord?.photo || '';
  const memberId = `KTA-${Math.abs(stats.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 89).toString().padStart(6, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FFFDF8] border border-[rgba(28,38,32,0.18)] rounded-xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#1C2620]/60 hover:text-[#1C2620] hover:bg-[#EFE7D4] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Award className="w-6 h-6 text-[#B98B3E]" />
          <div>
            <h3 className="text-xl font-bold font-spectral text-[#163029]">Kartu Tanda Anggota (KTA)</h3>
            <p className="text-xs text-[#6E8F6B] font-karla">Apresiasi Kehadiran 3 Bulan Berturut-turut</p>
          </div>
        </div>

        {/* The Digital KTA Card */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#163029] via-[#1F4038] to-[#12241F] text-[#FFFDF8] p-6 shadow-lg border border-[#B98B3E]/40"
        >
          {/* Card Accent Borders & Patterns */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[#B98B3E]/20 to-transparent pointer-events-none rounded-full blur-xl" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-radial from-[#6E8F6B]/20 to-transparent pointer-events-none rounded-full blur-xl" />

          {/* Card Header */}
          <div className="flex items-start justify-between border-b border-[#FFFDF8]/15 pb-3.5 mb-4">
            <div>
              <span className="text-[10px] tracking-widest uppercase font-bold text-[#E4D9BE]/80 block font-karla">
                MAJELIS KAJIAN PEKANAN
              </span>
              <h4 className="text-base font-spectral font-bold tracking-wide text-[#FFFDF8]">
                KARTU TANDA ANGGOTA
              </h4>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-[#B98B3E]/30 text-[#E4D9BE] border border-[#B98B3E]/50">
                <ShieldCheck className="w-3 h-3 text-[#B98B3E]" /> TERVERIFIKASI
              </span>
            </div>
          </div>

          {/* Card Body */}
          <div className="flex gap-4 items-center mb-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#B98B3E] shadow-sm flex-shrink-0 bg-[#163029]">
              {photoSrc ? (
                <img src={photoSrc} alt={stats.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold font-spectral text-[#EFE7D4]">
                  {stats.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <p className="text-[11px] text-[#E4D9BE]/70 uppercase tracking-wider font-karla">Nama Lengkap</p>
              <p className="text-base font-bold font-spectral tracking-wide text-[#FFFDF8] truncate">
                {stats.name}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <div>
                  <p className="text-[9px] text-[#E4D9BE]/70 uppercase tracking-wider">No. Anggota</p>
                  <p className="text-xs font-mono font-medium text-[#E4D9BE]">{memberId}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#E4D9BE]/70 uppercase tracking-wider">Kehadiran</p>
                  <p className="text-xs font-semibold text-[#E4EEE1]">{stats.streak} Pekan Aktif</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#FFFDF8]/15 text-[10px] text-[#E4D9BE]/80">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-[#6E8F6B]" />
              <span>Memenuhi syarat 12 pekan berturut-turut</span>
            </div>
            <span className="font-mono">Terbit: {fmtShortDate(Date.now())}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[rgba(28,38,32,0.2)] text-[#1C2620] hover:bg-[#EFE7D4]/40 transition cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1F4038] text-white hover:bg-[#163029] transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cetak / Simpan KTA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
