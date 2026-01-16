
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Camera, Mic, X, RefreshCcw, Loader2, 
  Image as ImageIcon, Edit2, Trash2, Plus, LogIn, 
  LogOut, Shield, Save, AlertCircle, Database, CheckCircle2, UploadCloud, CloudOff, Info, Code2, Copy, ExternalLink
} from 'lucide-react';
import { CDP_DATA } from './data';
import { CDPModel } from './types';
import { identifyModelFromImage } from './geminiService';
import { supabase } from './supabaseClient';

// Extended type for Supabase with ID
interface CDPDbModel extends CDPModel {
  id?: string | number;
  isLocal?: boolean;
}

const App: React.FC = () => {
  // Data States
  const [allData, setAllData] = useState<CDPDbModel[]>([]);
  const [results, setResults] = useState<CDPDbModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI States
  const [isListening, setIsListening] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [showSqlHelp, setShowSqlHelp] = useState(false);
  
  // Auth States (Manual Admin Auth)
  const [user, setUser] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // CRUD Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CDPDbModel | null>(null);
  const [formData, setFormData] = useState<CDPModel>({ model: '', dac: '', laser: '' });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show Toast Helper
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initialize Auth & Data
  useEffect(() => {
    const savedUser = localStorage.getItem('admin_session');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setFetchProgress(0);
    
    if (!supabase) {
      setAllData(CDP_DATA.map(d => ({ ...d, isLocal: true })));
      setIsLoading(false);
      return;
    }
    
    try {
      let allRecords: CDPDbModel[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from('cdp_models')
          .select('*', { count: 'exact' })
          .order('model', { ascending: true })
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allRecords = [...allRecords, ...data];
          from += pageSize;
          if (count) {
            setFetchProgress(Math.round((allRecords.length / count) * 100));
          }
          if (data.length < pageSize) hasMore = false;
        } else {
          hasMore = false;
        }
      }
      
      if (allRecords.length > 0) {
        setAllData(allRecords.map(r => ({ ...r, isLocal: false })));
      } else {
        setAllData(CDP_DATA.map(d => ({ ...d, isLocal: true })));
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setAllData(CDP_DATA.map(d => ({ ...d, isLocal: true })));
      showToast('ซิงค์ข้อมูลล้มเหลว: ใช้ข้อมูลสำรองในแอป', 'error');
    } finally {
      setIsLoading(false);
      setFetchProgress(0);
    }
  };

  const seedToSupabase = async () => {
    if (!supabase || !user) return;
    if (!confirm('ต้องการอัปโหลดชุดข้อมูลพื้นฐานเข้าสู่ Cloud ใช่หรือไม่?')) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.from('cdp_models').insert(CDP_DATA);
      if (error) throw error;
      showToast('อัปโหลดข้อมูลสำเร็จ!');
      fetchData();
    } catch (err: any) {
      showToast('อัปโหลดไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults(allData);
      return;
    }
    const normalizedSearch = normalize(searchTerm);
    const filtered = allData.filter(item => {
      const normalizedModel = normalize(item.model);
      const normalizedDac = normalize(item.dac || '');
      const normalizedLaser = normalize(item.laser || '');
      return (
        normalizedModel.includes(normalizedSearch) ||
        normalizedDac.includes(normalizedSearch) ||
        normalizedLaser.includes(normalizedSearch)
      );
    });
    setResults(filtered);
  }, [searchTerm, allData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (username === 'admin' && password === '1234') {
      const adminUser = { role: 'admin' };
      setUser(adminUser);
      localStorage.setItem('admin_session', JSON.stringify(adminUser));
      setIsLoginModalOpen(false);
      showToast('แอดมินล็อกอินสำเร็จ');
    } else {
      setAuthError('รหัสผ่านแอดมินไม่ถูกต้อง');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('admin_session');
    showToast('ออกจากระบบแอดมิน');
  };

  const openEditModal = (item?: CDPDbModel) => {
    if (item) {
      setEditingItem(item);
      setFormData({ model: item.model, dac: item.dac, laser: item.laser });
    } else {
      setEditingItem(null);
      setFormData({ model: '', dac: '', laser: '' });
    }
    setIsEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return showToast("ไม่ได้เชื่อมต่อ Cloud", "error");
    
    setIsLoading(true);
    try {
      if (editingItem && editingItem.id) {
        const { error } = await supabase
          .from('cdp_models')
          .update(formData)
          .eq('id', editingItem.id);
        if (error) throw error;
        showToast('อัปเดตสำเร็จ');
      } else {
        const { error } = await supabase.from('cdp_models').insert([formData]);
        if (error) throw error;
        showToast('เพิ่มสำเร็จ');
      }
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (item: CDPDbModel) => {
    if (!item.id) {
      showToast('ลบข้อมูล Local ไม่ได้ กรุณาอัปโหลดไปที่ Cloud ก่อน', 'error');
      return;
    }
    if (!supabase || !confirm(`ยืนยันการลบ ${item.model}?`)) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cdp_models')
        .delete()
        .eq('id', item.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        showToast('ลบไม่สำเร็จ: สิทธิ์เข้าถึงถูกจำกัด (RLS)', 'error');
        setShowSqlHelp(true);
      } else {
        showToast('ลบข้อมูลเรียบร้อย');
        fetchData();
      }
    } catch (err: any) {
      showToast('ลบไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("มือถือไม่รองรับระบบเสียง");
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.start();
    setIsListening(true);
    recognition.onresult = (e: any) => setSearchTerm(e.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
  };

  const processImage = async (data: string) => {
    setIsProcessingImage(true);
    try {
      const detected = await identifyModelFromImage(data);
      if (detected) {
        setSearchTerm(detected);
        showToast(`พบรุ่น: ${detected}`, 'success');
      } else {
        // แจ้งเตือนเรื่อง API_KEY หากรันบน production แล้วใช้ไม่ได้
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
          showToast("กรุณาตั้งค่า API_KEY ใน Netlify Environment Variables", "error");
        } else {
          showToast("ไม่พบเลขรุ่น CD Player ในภาพ กรุณาลองใหม่", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการประมวลผล", "error");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    closeCamera();
    await processImage(canvas.toDataURL('image/jpeg'));
  };

  const openCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { 
      setIsCameraActive(false); 
      console.error("Camera error:", err);
      showToast("ไม่สามารถเปิดกล้องได้ (ตรวจสอบ HTTPS หรือสิทธิ์การเข้าถึง)", "error");
    }
  };

  const closeCamera = () => {
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setIsCameraActive(false);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white shadow-xl relative font-sans pb-20">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 w-[90%] border-l-8 ${toast.type === 'success' ? 'bg-white text-emerald-800 border-emerald-500' : 'bg-white text-rose-800 border-rose-500'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" /> : <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />}
          <span className="text-sm font-bold leading-tight">{toast.msg}</span>
        </div>
      )}

      <header className="bg-slate-900 text-white p-5 sticky top-0 z-40 shadow-lg border-b border-white/5">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-xl font-black flex items-center gap-2 tracking-tighter italic uppercase">
            <Database className="w-6 h-6 text-blue-500" />
            CD-Player FINDER
          </h1>
          <div className="flex items-center gap-3">
            {user ? (
              <button onClick={handleLogout} className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-full font-black uppercase tracking-widest transition-all">
                <LogOut className="w-3 h-3 inline mr-1" /> Logout
              </button>
            ) : (
              <button onClick={() => setIsLoginModalOpen(true)} className="text-[10px] bg-white/5 text-slate-400 px-3 py-1.5 rounded-full font-black uppercase tracking-widest transition-all border border-white/5">
                <LogIn className="w-3 h-3 inline mr-1" /> Admin
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black flex items-center gap-1">
            {user && <Shield className="w-3 h-3 text-blue-500" />}
            CD-Player DATABASE {user && "• Admin Locked"}
          </p>
          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
            <div className={`w-1.5 h-1.5 rounded-full ${supabase ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'}`}></div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
              {supabase ? `Synced ${allData.length} records` : 'Offline Mode'}
            </span>
          </div>
        </div>
        {isLoading && fetchProgress > 0 && fetchProgress < 100 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${fetchProgress}%` }}></div>
          </div>
        )}
      </header>

      <div className="p-4 bg-white sticky top-[102px] z-30 shadow-md border-b space-y-3">
        <div className="relative">
          <input 
            type="text"
            placeholder="ค้นหายี่ห้อ, รุ่น, DAC หรือ หัวอ่าน..."
            className="w-full pl-12 pr-12 py-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-slate-800 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
          {searchTerm && <X className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 cursor-pointer bg-slate-200 p-1 rounded-full" onClick={() => setSearchTerm('')} />}
        </div>

        <div className="flex gap-2">
          <button onClick={startVoiceSearch} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${isListening ? 'bg-rose-500 text-white border-rose-500 animate-pulse' : 'bg-slate-50 text-slate-600 border-slate-100 active:scale-95'}`}>
            <Mic className="w-4 h-4" /> {isListening ? 'Listening...' : 'Voice'}
          </button>
          <button onClick={openCamera} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
            <Camera className="w-4 h-4" /> Vision
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
            <ImageIcon className="w-4 h-4" /> Gallery
          </button>
        </div>

        {(isProcessingImage || isLoading) && (
          <div className="flex items-center justify-center gap-3 py-3 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] bg-blue-50 rounded-xl animate-pulse border border-blue-100">
            <Loader2 className="w-4 h-4 animate-spin" /> {isLoading ? `Syncing Data ${fetchProgress}%...` : 'Gemini AI Scanning...'}
          </div>
        )}
      </div>

      <main className="flex-1 p-5 space-y-6 bg-slate-50/30">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Found {results.length} Models</span>
        </div>

        {results.length > 0 ? (
          results.map((item, idx) => (
            <div key={item.id || `local-${idx}`} className={`bg-white border-2 rounded-[2.5rem] p-6 shadow-sm relative transition-all ${!item.isLocal ? 'border-blue-50 shadow-blue-900/5' : 'border-slate-100 border-dashed opacity-80'}`}>
              <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Model Info</span>
                    {item.isLocal && <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-widest">App Memory</span>}
                  </div>
                  <h3 className="font-black text-slate-900 text-2xl tracking-tighter italic">{item.model}</h3>
                </div>
                {user && (
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(item)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-90"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item)} className={`p-3 rounded-2xl transition-all shadow-md active:scale-90 ${!item.isLocal ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-slate-50 text-slate-200 cursor-not-allowed'}`} disabled={item.isLocal}><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/70 p-4 rounded-3xl border border-slate-100 shadow-inner">
                  <p className="text-[9px] uppercase font-black text-slate-400 mb-2 tracking-widest">DAC Chipset</p>
                  <p className="text-[13px] font-black text-slate-800 leading-tight">{item.dac || '-'}</p>
                </div>
                <div className="bg-slate-50/70 p-4 rounded-3xl border border-slate-100 shadow-inner">
                  <p className="text-[9px] uppercase font-black text-slate-400 mb-2 tracking-widest">Optical Laser</p>
                  <p className="text-[13px] font-black text-slate-800 leading-tight">{item.laser || '-'}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-32 text-center text-slate-300 flex flex-col items-center">
            <Search className="w-12 h-12 opacity-10 mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">No match found</p>
          </div>
        )}
      </main>

      {user && supabase && (
        <button onClick={() => openEditModal()} className="fixed bottom-8 right-6 w-16 h-16 bg-blue-600 text-white rounded-[1.8rem] shadow-2xl flex items-center justify-center active:scale-95 transition-all z-40 border-4 border-white ring-8 ring-blue-500/5"><Plus className="w-10 h-10" /></button>
      )}

      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden p-10 animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-8 italic uppercase flex items-center gap-3"><Shield className="w-8 h-8 text-blue-600" /> Admin Access</h2>
            <form onSubmit={handleLogin} className="space-y-5">
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="User ID (admin)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 focus:border-blue-500 outline-none transition-all font-bold text-slate-800" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Passcode (1234)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 focus:border-blue-500 outline-none transition-all font-bold text-slate-800" />
              {authError && <div className="text-xs text-rose-600 font-black uppercase text-center tracking-widest">{authError}</div>}
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg active:scale-95 shadow-xl">Authenticate</button>
              <button type="button" onClick={() => setIsLoginModalOpen(false)} className="w-full py-2 text-slate-400 font-black text-xs uppercase tracking-widest mt-2">Dismiss</button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden p-10 animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-8 italic uppercase">{editingItem ? 'Edit Profile' : 'New Entry'}</h2>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Model Name</label>
                <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-blue-500 outline-none transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DAC Chip</label>
                <input type="text" value={formData.dac} onChange={e => setFormData({...formData, dac: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-blue-500 outline-none transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Optical Laser</label>
                <input type="text" value={formData.laser} onChange={e => setFormData({...formData, laser: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold focus:border-blue-500 outline-none transition-all" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg active:scale-95 shadow-xl mt-4">Save Profile</button>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full py-2 text-slate-400 font-black text-xs uppercase tracking-widest mt-2">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="p-6 flex justify-between items-center text-white bg-black/80 backdrop-blur-md absolute top-0 w-full z-10">
            <span className="font-black text-[10px] tracking-[0.4em] uppercase">AI Vision Scanner</span>
            <button onClick={closeCamera} className="bg-white/10 p-2 rounded-full active:scale-90"><X className="w-8 h-8" /></button>
          </div>
          <div className="flex-1 relative overflow-hidden bg-slate-950">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[80%] h-52 border-2 border-blue-500/50 rounded-[3rem] animate-pulse shadow-[0_0_80px_rgba(59,130,246,0.3)]"></div>
              <div className="absolute w-full h-1 bg-blue-500/40 shadow-[0_0_20px_#3b82f6] animate-[scan_3s_infinite_ease-in-out]"></div>
            </div>
            <div className="absolute bottom-32 left-0 w-full text-center px-10 pointer-events-none">
              <p className="text-white/80 text-[10px] font-black uppercase tracking-widest bg-black/40 py-2 rounded-full backdrop-blur-sm">เล็งให้เห็นยี่ห้อและตัวเลขรุ่นให้ชัดเจน</p>
            </div>
          </div>
          <div className="p-16 flex justify-center bg-slate-950">
            <button onClick={captureImage} className="w-24 h-24 rounded-full border-[10px] border-white/5 bg-white shadow-2xl active:scale-90 transition-all flex items-center justify-center">
              <div className="w-full h-full bg-slate-50 rounded-full border-4 border-slate-200"></div>
            </button>
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const r = new FileReader();
          r.onload = (ev) => processImage(ev.target?.result as string);
          r.readAsDataURL(file);
        }
      }} />

      <canvas ref={canvasRef} className="hidden" />

      <footer className="p-10 text-center bg-slate-50 border-t border-slate-100">
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em] mb-2 italic">CD-Player Spec Finder Pro</p>
        <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">© 2025 ALL RIGHTS RESERVED • SUPABASE & GEMINI AI</p>
      </footer>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 30%; opacity: 0; }
          50% { top: 70%; opacity: 1; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
