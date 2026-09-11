import React, { useState, useEffect } from 'react';
import { PesertaView } from './components/PesertaView';
import { AdminView } from './components/AdminView';
import { AttendanceRecord } from './types';
import { loadRecords } from './utils/storage';
import { UserCheck, Shield, BookOpen } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'absen' | 'admin'>('absen');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Load records on start
  useEffect(() => {
    const data = loadRecords();
    setRecords(data);
  }, []);

  const handleRefreshRecords = () => {
    const updated = loadRecords();
    setRecords(updated);
  };

  return (
    <div className="min-h-screen bg-[#EFE7D4] text-[#1C2620] selection:bg-[#B98B3E]/30">
      <div className="max-w-[1040px] mx-auto px-4.5 pt-7 pb-16">
        {/* Top Branding & Navigation */}
        <header className="flex flex-wrap items-baseline justify-between gap-4 mb-6 pb-2 border-b border-[rgba(28,38,32,0.12)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F4038] text-[#EFE7D4] flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 text-[#B98B3E]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-[26px] font-bold font-spectral tracking-tight text-[#163029]">
                Absensi Kajian
              </h1>
              <p className="text-xs text-[#6E8F6B] font-karla">
                Hadir tiap pekan selama 3 bulan &mdash; dapat KTA
              </p>
            </div>
          </div>

          {/* View Selector Tabs */}
          <div className="flex gap-1.5 bg-[#FFFDF8] border border-[rgba(28,38,32,0.16)] p-1 rounded-lg shadow-2xs">
            <button
              type="button"
              id="tabPesertaBtn"
              onClick={() => setActiveTab('absen')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold font-karla rounded-md transition cursor-pointer ${
                activeTab === 'absen'
                  ? 'bg-[#1F4038] text-[#FFFDF8] shadow-xs'
                  : 'text-[#1F4038] hover:bg-[#EFE7D4]/40'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Absen</span>
            </button>

            <button
              type="button"
              id="tabAdminBtn"
              onClick={() => {
                setActiveTab('admin');
                handleRefreshRecords();
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold font-karla rounded-md transition cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#1F4038] text-[#FFFDF8] shadow-xs'
                  : 'text-[#1F4038] hover:bg-[#EFE7D4]/40'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
              {records.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'admin'
                      ? 'bg-[#B98B3E] text-white'
                      : 'bg-[#EFE7D4] text-[#1F4038]'
                  }`}
                >
                  {records.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main>
          {activeTab === 'absen' ? (
            <PesertaView onAttendanceSubmitted={handleRefreshRecords} />
          ) : (
            <AdminView records={records} onRecordsChange={setRecords} />
          )}
        </main>
      </div>
    </div>
  );
}

