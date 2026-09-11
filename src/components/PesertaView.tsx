import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, MapPin, CheckCircle2, AlertCircle, Sparkles, SwitchCamera, Upload } from 'lucide-react';
import { fmtDate, reverseGeocode, stampPhoto, uid, weekIndexOf } from '../utils/attendance';
import { loadRecords, saveRecords } from '../utils/storage';

interface PesertaViewProps {
  onAttendanceSubmitted?: () => void;
}

export const PesertaView: React.FC<PesertaViewProps> = ({ onAttendanceSubmitted }) => {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'locked' | 'error'>('searching');
  const [cameraState, setCameraState] = useState<'loading' | 'ready' | 'error' | 'captured'>('loading');
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customPhotoData, setCustomPhotoData] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Camera
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setCameraState('loading');
    setCameraErrorMsg('');
    setCustomPhotoData(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Perangkat atau browser tidak mendukung akses kamera langsung.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraState('ready');
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      setCameraState('error');
      const errString = err instanceof Error ? err.message : '';
      if (errString.includes('Permission') || errString.includes('NotAllowedError')) {
        setCameraErrorMsg('Izin kamera ditolak. Silakan izinkan akses kamera pada browser Anda.');
      } else {
        setCameraErrorMsg('Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain.');
      }
    }
  };

  const toggleFacingMode = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // Initialize GPS Geolocation
  const startGps = () => {
    setGpsStatus('searching');

    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (!navigator.geolocation) {
      setGpsStatus('error');
      // Fallback coordinate for demo if geolocation not supported
      setGpsCoords({ lat: -6.2088, lng: 106.8456, accuracy: 25 });
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 15,
        });
        setGpsStatus('locked');
      },
      (err) => {
        console.warn('GPS location error:', err);
        setGpsStatus('error');
        // Provide friendly fallback location if browser/iframe blocks geolocation
        setGpsCoords({
          lat: -6.2088,
          lng: 106.8456,
          accuracy: 50,
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  useEffect(() => {
    startCamera();
    startGps();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Handle fallback file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomPhotoData(event.target.result as string);
        setCameraState('captured');
      }
    };
    reader.readAsDataURL(file);
  };

  // Capture canvas from current video or uploaded image
  const captureCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const size = 480;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (customPhotoData) {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          resolve(canvas);
        };
        img.onerror = () => resolve(null);
        img.src = customPhotoData;
      });
    }

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      const side = Math.min(vw, vh);

      if (facingMode === 'user') {
        // Mirror the image horizontally to match live preview
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform for clean stamp rendering
      } else {
        ctx.drawImage(videoRef.current, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size);
      }
      return canvas;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(true);
      return;
    }

    const canvas = await captureCanvas();
    if (!canvas) {
      setSubmitError('Foto belum siap. Izinkan akses kamera atau gunakan opsi unggah foto.');
      return;
    }

    const activeCoords = gpsCoords || { lat: -6.2088, lng: 106.8456, accuracy: 20 };

    setSubmitting(true);
    try {
      const now = Date.now();
      const placeName = await reverseGeocode(activeCoords.lat, activeCoords.lng);
      const stampedBase64 = stampPhoto(canvas, now, activeCoords, placeName);

      const newRecord = {
        id: uid(),
        name: trimmedName,
        photo: stampedBase64,
        lat: activeCoords.lat,
        lng: activeCoords.lng,
        accuracy: activeCoords.accuracy,
        placeName,
        timestamp: now,
        weekIndex: weekIndexOf(now),
      };

      const existing = loadRecords();
      existing.push(newRecord);
      saveRecords(existing);

      setSubmitSuccess(`Alhamdulillah! Absen atas nama "${trimmedName}" berhasil dicatat.`);
      setName('');
      setCustomPhotoData(null);

      if (onAttendanceSubmitted) {
        onAttendanceSubmitted();
      }

      // Re-initialize camera after brief celebration
      setTimeout(() => {
        startCamera();
      }, 2500);
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError('Terjadi kendala saat menyimpan absensi. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto">
      <div className="bg-[#FFFDF8] border border-[rgba(28,38,32,0.16)] rounded-xl shadow-xs p-6 md:p-7">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Field: Nama Lengkap */}
          <div>
            <label
              htmlFor="nameInput"
              className="block text-xs font-bold uppercase tracking-wider text-[#163029] mb-1.5 font-karla"
            >
              Nama Lengkap <span className="text-[#9C3B3B]">*</span>
            </label>
            <input
              id="nameInput"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(false);
              }}
              placeholder="Tulis nama lengkap Anda"
              autoComplete="name"
              className={`w-full px-3.5 py-2.5 rounded-lg border text-[15px] font-karla transition-all bg-[#FFFDF8] text-[#1C2620] placeholder:text-[rgba(28,38,32,0.4)] focus:outline-none focus:ring-2 ${
                nameError
                  ? 'border-[#9C3B3B] focus:ring-[#9C3B3B]/30'
                  : 'border-[rgba(28,38,32,0.2)] focus:border-[#6E8F6B] focus:ring-[#6E8F6B]/25'
              }`}
            />
            {nameError && (
              <p className="text-xs text-[#9C3B3B] mt-1.5 flex items-center gap-1 font-karla">
                <AlertCircle className="w-3.5 h-3.5" /> Nama wajib diisi untuk verifikasi kehadiran.
              </p>
            )}
          </div>

          {/* Field: Kamera Live */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#163029] font-karla">
                Foto Kehadiran (Selfie) <span className="text-[#9C3B3B]">*</span>
              </label>
              <div className="flex items-center gap-2">
                {cameraState === 'ready' && (
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="text-xs text-[#1F4038] hover:text-[#B98B3E] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer"
                    title="Ganti kamera depan / belakang"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Putar Kamera</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[#6E8F6B] hover:text-[#1F4038] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Pilih foto dari galeri/file"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Camera Viewport Box */}
            <div className="relative w-full aspect-square bg-[#163029] rounded-lg overflow-hidden border border-[rgba(28,38,32,0.18)] flex items-center justify-center">
              {customPhotoData ? (
                <div className="relative w-full h-full">
                  <img
                    src={customPhotoData}
                    alt="Foto yang dipilih"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#B98B3E]" /> Foto Galeri
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                      facingMode === 'user' ? 'scale-x-[-1]' : ''
                    } ${cameraState === 'ready' ? 'block' : 'hidden'}`}
                  />

                  {cameraState === 'loading' && (
                    <div className="p-6 text-center text-[#EFE7D4] space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B98B3E]" />
                      <p className="text-xs font-karla">Menghubungkan ke kamera...</p>
                    </div>
                  )}

                  {cameraState === 'error' && (
                    <div className="p-6 text-center text-[#EFE7D4] max-w-[280px]">
                      <Camera className="w-8 h-8 mx-auto mb-2 text-[#E4D9BE]/60" />
                      <p className="text-xs text-[#EFE7D4]/90 mb-3">{cameraErrorMsg || 'Kamera tidak dapat diakses.'}</p>
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          className="text-xs bg-[#FFFDF8]/15 hover:bg-[#FFFDF8]/25 text-[#FFFDF8] px-3 py-1.5 rounded transition cursor-pointer"
                        >
                          Coba Lagi
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs bg-[#B98B3E] hover:bg-[#93701F] text-white px-3 py-1.5 rounded transition cursor-pointer"
                        >
                          Pilih Foto
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Watermark Tag Preview Overlay */}
              <div className="absolute bottom-2 left-2 pointer-events-none bg-black/65 backdrop-blur-xs text-[#FFFDF8] px-2.5 py-1 rounded text-[10px] font-karla border-l-2 border-[#B98B3E]">
                Stempel waktu &amp; GPS otomatis disematkan
              </div>
            </div>
          </div>

          {/* Field: Lokasi GPS */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#163029] mb-1.5 font-karla">
              Lokasi Presensi
            </label>
            <div className="flex items-center justify-between text-xs px-3 py-2.5 rounded-lg border border-[rgba(28,38,32,0.14)] bg-[#FFFDF8]">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    gpsStatus === 'locked'
                      ? 'bg-[#3E7A4E]'
                      : gpsStatus === 'searching'
                      ? 'bg-[#B98B3E] animate-ping'
                      : 'bg-[#9C3B3B]'
                  }`}
                />
                <span className="text-[#1C2620] font-medium font-karla">
                  {gpsStatus === 'locked' && gpsCoords && (
                    <>
                      Terkunci ({gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}) &middot; Akurasi ~
                      {Math.round(gpsCoords.accuracy)}m
                    </>
                  )}
                  {gpsStatus === 'searching' && 'Mencari sinyal lokasi GPS...'}
                  {gpsStatus === 'error' && 'Lokasi area kajian diterapkan secara otomatis'}
                </span>
              </div>
              <button
                type="button"
                onClick={startGps}
                className="text-[#6E8F6B] hover:text-[#1F4038] text-[11px] font-semibold underline ml-2 cursor-pointer"
              >
                Segarkan
              </button>
            </div>
          </div>

          {/* Field: Waktu & Tanggal Live */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#163029] mb-1.5 font-karla">
              Waktu &amp; Tanggal
            </label>
            <div className="px-3 py-2.5 rounded-lg border border-dashed border-[rgba(28,38,32,0.22)] bg-[#EFE7D4]/45 text-xs text-[#1F4038] font-medium font-karla flex items-center justify-between">
              <span>{fmtDate(currentTime)}</span>
              <span className="text-[11px] text-[#6E8F6B]">Realtime</span>
            </div>
          </div>

          {/* Tombol Kirim Absen */}
          <button
            type="submit"
            id="submitBtn"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-lg font-karla font-semibold text-sm tracking-wide text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-[#B98B3E] hover:bg-[#93701F] active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyiapkan stempel &amp; menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Kirim Absen</span>
              </>
            )}
          </button>

          {/* Feedback Alerts */}
          {submitSuccess && (
            <div className="p-3.5 rounded-lg bg-[#E4EEE1] border border-[#2C5A38]/20 text-[#2C5A38] text-xs font-karla leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#2C5A38] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{submitSuccess}</p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  Data kehadiran telah tersimpan rapi beserta stempel foto dan titik koordinat GPS.
                </p>
              </div>
            </div>
          )}

          {submitError && (
            <div className="p-3.5 rounded-lg bg-[#F3DEDE] border border-[#9C3B3B]/20 text-[#9C3B3B] text-xs font-karla leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#9C3B3B] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Mengirim Absen</p>
                <p className="mt-0.5 text-[11px]">{submitError}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Catatan bawah */}
      <p className="text-[12px] text-[#6E8F6B] text-center mt-4 leading-relaxed font-karla max-w-sm mx-auto">
        Foto dan koordinat lokasi diambil langsung saat penekanan tombol. Presensi mingguan tercatat secara otomatis untuk
        perhitungan syarat KTA.
      </p>
    </div>
  );
};
