import React, { useState, useEffect } from 'react';
import { subscribeToAttendance, getLocalDateString } from '../services/firebase';
import { AttendanceRecord } from '../types';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Search, Calendar } from 'lucide-react';

const RekapTab: React.FC = () => {
  const [date, setDate] = useState(getLocalDateString());
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAttendance(date, (records) => {
      setData(records);
      setFilteredData(records);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [date]);

  useEffect(() => {
    const lowerSearch = search.toLowerCase();
    const filtered = data.filter(item => 
      item.nama.toLowerCase().includes(lowerSearch) || 
      item.kelas.toLowerCase().includes(lowerSearch) ||
      (item.scannedBy && item.scannedBy.toLowerCase().includes(lowerSearch))
    );
    setFilteredData(filtered);
  }, [search, data]);

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData.map(item => ({
      Jam: item.jam,
      Nama: item.nama,
      Kelas: item.kelas,
      Gender: item.gender,
      Status: item.status === 'HADIR' ? 'SHOLAT' : item.status === 'TIDAK_SHOLAT' ? 'TIDAK SHOLAT' : 'HALANGAN',
      Petugas: item.scannedBy || '-',
      Tanggal: date
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi");
    XLSX.writeFile(workbook, `Absensi_X-Pray_${date}.xlsx`);
  };

  const getStatusLabel = (status: string) => {
    if (status === 'HADIR') return 'SHOLAT';
    if (status === 'TIDAK_SHOLAT') return 'TIDAK SHOLAT';
    return 'HALANGAN';
  };

  const getStatusStyles = (status: string) => {
    if (status === 'HADIR') {
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900';
    }
    if (status === 'TIDAK_SHOLAT') {
      return 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900';
    }
    return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900';
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Controls Header Compact */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl shadow-md border border-white dark:border-white/5 flex flex-col gap-3 transition-colors duration-300">
        <div className="flex gap-2">
             <div className="relative flex-1">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-[11px] font-bold dark:text-white transition-colors"
                />
             </div>
             <button 
                onClick={handleExport}
                disabled={filteredData.length === 0}
                className="px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition shadow-md"
             >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-[10px] hidden md:inline">Export</span>
             </button>
        </div>
        
        <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Cari nama siswa..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-[11px] font-bold dark:text-white transition-colors"
            />
        </div>
      </div>

      {/* Data Display Compact */}
      <div className="space-y-2">
          {loading ? (
             <div className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase animate-pulse">Memuat...</div>
          ) : filteredData.length === 0 ? (
             <div className="text-center py-10 text-slate-300 dark:text-slate-700 text-[10px] font-black uppercase">Kosong</div>
          ) : (
             filteredData.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-50 dark:border-white/5 flex items-center justify-between transition-colors duration-300">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs ${item.gender === 'L' ? 'bg-blue-600' : 'bg-pink-600'}`}>
                            {item.nama.charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 dark:text-white text-[11px] leading-tight">{item.nama}</h4>
                            <div className="flex items-center gap-2 text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                                <span>{item.kelas}</span>
                                <span className="text-slate-200 dark:text-slate-800">•</span>
                                <span className="font-mono">{item.jam}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-[8px] font-black px-2 py-1 rounded-lg border ${getStatusStyles(item.status)}`}>
                            {getStatusLabel(item.status)}
                        </span>
                        <span className="text-[7px] text-slate-300 dark:text-slate-600 font-black uppercase">Oleh: {item.scannedBy || '-'}</span>
                    </div>
                </div>
             ))
          )}
      </div>
    </div>
  );
};

export default RekapTab;