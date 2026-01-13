
import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { StudentData, AttendanceRecord } from '../types';
import { saveAttendance, checkIfAlreadyScanned } from '../services/firebase';
import { Check, Camera, Sparkles, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const playBeep = (freq: number, type: OscillatorType, dur: number) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
};

interface ScannerTabProps {
  currentUser: string;
  officerClass: string;
}

const ScannerTab: React.FC<ScannerTabProps> = ({ currentUser, officerClass }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<StudentData | null>(null);
  const [duplicateFound, setDuplicateFound] = useState<AttendanceRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [checking, setChecking] = useState(false);
  
  // Track if we are in "Update" mode
  const [updateId, setUpdateId] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader", {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false
        });
    }

    const startScanner = async () => {
        if (!scannerRef.current || scannerRef.current.isScanning) return;
        try {
            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                (decodedText) => { if (isMounted.current) handleScanSuccess(decodedText); },
                () => {}
            );
            if (isMounted.current) setIsScanning(true);
        } catch (err) {
            if (isMounted.current) setErrorMsg("Izin kamera ditolak.");
        }
    };

    const timeoutId = setTimeout(startScanner, 300);

    return () => {
        isMounted.current = false;
        clearTimeout(timeoutId);
        if (scannerRef.current?.isScanning) {
            scannerRef.current.stop().catch(() => {});
        }
    };
  }, []);

  const handleScanSuccess = async (decodedText: string) => {
    if (scannerRef.current?.isScanning) {
        scannerRef.current.pause(); 
        setIsScanning(false);
    }
    try {
      const data: StudentData = JSON.parse(decodedText);
      if (data.nama && data.kelas) {
        setChecking(true);
        const existing = await checkIfAlreadyScanned(data.nama, data.kelas);
        setChecking(false);
        
        if (existing) {
            playBeep(440, 'triangle', 0.3);
            setDuplicateFound(existing);
        } else {
            setScannedStudent(data);
            setUpdateId(null);
            playBeep(880, 'sine', 0.1);
        }
        
        if (navigator.vibrate) navigator.vibrate(50);
      } else throw new Error();
    } catch (e) {
      setChecking(false);
      setErrorMsg("QR Code Tidak Valid.");
      playBeep(220, 'square', 0.2);
      setTimeout(() => {
          if (isMounted.current && scannerRef.current) {
             scannerRef.current.resume();
             setIsScanning(true);
             setErrorMsg("");
          }
      }, 2000);
    }
  };

  const handleConfirm = async (status: 'HADIR' | 'HALANGAN' | 'TIDAK_SHOLAT') => {
    const targetStudent = scannedStudent || duplicateFound;
    if (!targetStudent) return;
    
    try {
      const now = new Date();
      const student = { ...targetStudent };
      
      const recordToSave = {
        nama: student.nama,
        kelas: student.kelas,
        gender: student.gender,
        timestamp: now.getTime(),
        jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status,
        scannedBy: currentUser,
        officerKelas: officerClass
      };

      setScannedStudent(null);
      setDuplicateFound(null);
      setSuccessMsg(updateId ? `DATA DIUPDATE: ${student.nama}` : `BERHASIL: ${student.nama}`);
      setShowConfetti(true);
      
      // Pass the updateId to saveAttendance so it updates instead of pushes
      await saveAttendance(recordToSave, updateId || undefined);
      setUpdateId(null);

      playBeep(1200, 'sine', 0.2);

      setTimeout(() => {
        if(isMounted.current) {
            setSuccessMsg('');
            setShowConfetti(false);
            scannerRef.current?.resume();
            setIsScanning(true);
        }
      }, 1500);
    } catch (err) {
      setErrorMsg("Gagal menyimpan data.");
    }
  };

  const cancelScan = () => {
    setScannedStudent(null);
    setDuplicateFound(null);
    setUpdateId(null);
    if (isMounted.current && scannerRef.current) {
      scannerRef.current.resume();
      setIsScanning(true);
    }
  };

  return (
    <div className="flex flex-col items-center py-4 relative">
      {checking && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Memeriksa Duplikat...</span>
            </div>
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 bg-white dark:bg-slate-900 px-5 py-2 rounded-xl flex items-center gap-2 border border-slate-100 dark:border-white/5 shadow-md transition-colors"
      >
         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
         <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
           PETUGAS: {officerClass}
         </span>
      </motion.div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full aspect-square max-w-[300px] bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 group"
      >
         <div id="reader" className="w-full h-full scale-110"></div>
         {isScanning && !scannedStudent && !duplicateFound && <div className="scan-line"></div>}
         <div className="absolute top-5 left-5 p-2 bg-emerald-600 rounded-xl text-white shadow-lg">
            <Camera size={16} />
         </div>
      </motion.div>

      <div className="mt-8 text-center space-y-1">
        <div className="text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-widest">Scanning Active</div>
        <div className="text-slate-300 dark:text-slate-700 text-[8px] font-bold">Arahkan ke QR Code Siswa</div>
      </div>

      {/* Warning Duplikat Modal */}
      <AnimatePresence>
        {duplicateFound && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative border dark:border-white/5 text-center"
            >
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                 <AlertTriangle size={40} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sudah Absen!</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Siswa <span className="text-slate-900 dark:text-white font-black">{duplicateFound.nama}</span> sudah absen hari ini jam <span className="font-mono font-black">{duplicateFound.jam}</span> oleh <span className="font-black">{duplicateFound.scannedBy}</span>.
              </p>
              
              <div className="mt-8 space-y-3">
                 <button 
                   onClick={() => {
                     const student = { ...duplicateFound };
                     setUpdateId(duplicateFound.id); // Save the ID for updating
                     setDuplicateFound(null);
                     setScannedStudent(student);
                   }}
                   className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                 >
                   Ganti Status (Update)
                 </button>
                 <button 
                   onClick={cancelScan}
                   className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] tracking-widest uppercase active:scale-95 transition-all"
                 >
                   Batalkan
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scannedStudent && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-900/80 dark:bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
              <motion.div 
                initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative border dark:border-white/5"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white mb-4 shadow-lg ${scannedStudent.gender === 'L' ? 'bg-blue-600' : 'bg-pink-600'}`}>
                     {scannedStudent.nama.charAt(0)}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{scannedStudent.nama}</h2>
                  <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-2 mb-8 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border dark:border-emerald-800/50">{scannedStudent.kelas}</div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleConfirm('HADIR')} 
                      className="flex flex-col items-center justify-center py-4 bg-emerald-600 dark:bg-emerald-500 text-white rounded-2xl font-black shadow-lg"
                    >
                      <Check size={24} strokeWidth={3} />
                      <span className="text-[9px] uppercase mt-1">SHOLAT</span>
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleConfirm('TIDAK_SHOLAT')} 
                      className="flex flex-col items-center justify-center py-4 bg-red-600 dark:bg-red-500 text-white rounded-2xl font-black shadow-lg"
                    >
                      <X size={24} strokeWidth={3} />
                      <span className="text-[9px] uppercase mt-1">BOLOS</span>
                    </motion.button>
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleConfirm('HALANGAN')} 
                    className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200 dark:border-slate-700"
                  >
                    HALANGAN (UDZUR)
                  </motion.button>
                </div>
                <button onClick={cancelScan} className="w-full mt-6 text-slate-300 dark:text-slate-600 text-[8px] font-black uppercase tracking-widest">Batal</button>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-emerald-600 text-white rounded-full font-black text-[10px] tracking-widest flex items-center gap-2 shadow-xl"
          >
            <Sparkles size={14} /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScannerTab;
