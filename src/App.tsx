// @ts-nocheck
// P.3 理財數學王 v6.7 (Layout Restored & CSV Import)
// Date: 2026-01-15
// Note: 
// 1. UI REVERTED to match v6.3 exactly (Landing Page -> Student/Teacher/NET).
// 2. Fixed "Too Narrow" issue by using max-w-7xl.
// 3. Added Teacher Import CSV function (Wipes DB -> Batch Write).
// 4. Student list is now real-time synced with Firestore.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, 
  increment, getDocs, writeBatch, deleteDoc 
} from 'firebase/firestore';
import { 
  Trophy, User, Coins, ArrowLeft, Settings, Save, Upload, 
  FileUp, AlertCircle, Trash2, Users, LayoutGrid, GraduationCap, Globe
} from 'lucide-react';

// --- 1. Firebase Configuration ---
const userFirebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

// Initialize Firebase
const app = initializeApp(userFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. Helper: Parse CSV ---
// Logic: Extract Class(Col D/3), Number(Col E/4), Name(Col H/7)
const parseStudentsFromCSV = (csvContent) => {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  const data = [];
  // Skip header (i=1)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length > 7) {
      const className = cols[3]?.trim(); 
      const number = cols[4]?.trim();
      const name = cols[7]?.trim();

      if (className && number && name) {
        // Create a sorting ID like "3A_01" for easier ordering later if needed
        const numPadded = number.padStart(2, '0');
        data.push({
          className: className,
          number: number,
          name: name,
          id: `${className}_${number}`, // Unique ID e.g., 3A_1
          score: 0,
          redeemed: false
        });
      }
    }
  }
  return data;
};

// --- 3. Game Logic Helpers (Standard v6.3 Questions) ---
const generateQuestion = (type) => {
  let q = {};
  if (type === 'basic') {
    const target = (Math.floor(Math.random() * 10) + 1) * 10;
    q = { text: `請湊出 ${target} 元`, answer: target, unit: "元" };
  } else if (type === 'shopping') {
    const price = Math.floor(Math.random() * 80) + 10;
    const paid = Math.ceil(price / 10) * 10 + (Math.random() > 0.5 ? 0 : 10);
    q = { text: `買文具用了 ${price} 元，付款 ${paid} 元，應找回多少元？`, answer: paid - price, unit: "元" };
  } else if (type === 'time') {
    const startH = Math.floor(Math.random() * 10) + 1;
    const duration = Math.floor(Math.random() * 3) + 1;
    q = { text: `現在是下午 ${startH} 時，${duration} 小時後是下午幾時？`, answer: startH + duration, unit: "時" };
  }
  return q;
};

// --- 4. Main Component ---
function App() {
  // State
  const [view, setView] = useState('landing'); // landing, student_select, game, teacher, net
  const [allStudents, setAllStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('3A');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [question, setQuestion] = useState(null);
  const [inputAns, setInputAns] = useState('');
  const [feedback, setFeedback] = useState(null);
  
  // Teacher Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Auth & Data Sync
  useEffect(() => {
    signInAnonymously(auth);
    // Real-time listener for students
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setAllStudents(studentsData);
    });
    return () => unsub();
  }, []);

  // Filter Logic
  const filteredStudents = useMemo(() => {
    return allStudents
      .filter(s => s.className === selectedClass)
      .sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [allStudents, selectedClass]);

  // Handle Answer
  const submitAnswer = async () => {
    if (!question) return;
    const isCorrect = parseInt(inputAns) === question.answer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect && selectedStudent) {
      await updateDoc(doc(db, "students", selectedStudent.id), { score: increment(10) });
      setSelectedStudent(prev => ({ ...prev, score: (prev.score || 0) + 10 }));
    }
  };

  // --- Teacher Function: Import CSV ---
  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawText = event.target.result;
        const newStudents = parseStudentsFromCSV(rawText);

        if (newStudents.length === 0) {
          alert("CSV 解析失敗：找不到符合格式的資料 (Col D=Class, Col E=No, Col H=Name)");
          setIsUploading(false);
          return;
        }

        if(!confirm(`確認匯入？\n這將清除現有資料庫並寫入 ${newStudents.length} 名學生資料。`)) {
            setIsUploading(false);
            return;
        }

        // 1. Delete Existing Data (Batch)
        const batch = writeBatch(db);
        const existingDocs = await getDocs(collection(db, "students"));
        existingDocs.forEach(d => batch.delete(d.ref));

        // 2. Write New Data
        newStudents.forEach(s => {
          const ref = doc(db, "students", s.id);
          batch.set(ref, s);
        });

        await batch.commit();
        alert("匯入成功！資料庫已更新。");
        
      } catch (err) {
        console.error(err);
        alert("匯入錯誤：" + err.message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // --- Views ---

  // 1. Landing Page (Restored v6.3 Style)
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl md:text-5xl font-black text-indigo-700 mb-12 tracking-tight">
          P.3 理財數學王 v6.7
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {/* Student Button */}
          <button 
            onClick={() => setView('student_select')}
            className="group relative bg-white p-8 rounded-3xl shadow-lg border-2 border-transparent hover:border-indigo-500 hover:shadow-2xl transition-all flex flex-col items-center gap-4"
          >
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap size={48} className="text-indigo-600" />
            </div>
            <span className="text-2xl font-bold text-slate-700">我是學生</span>
          </button>

          {/* Teacher Button */}
          <button 
            onClick={() => setView('teacher')}
            className="group relative bg-white p-8 rounded-3xl shadow-lg border-2 border-transparent hover:border-emerald-500 hover:shadow-2xl transition-all flex flex-col items-center gap-4"
          >
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={48} className="text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-slate-700">老師專用</span>
          </button>

          {/* NET Button */}
          <button 
            onClick={() => setView('net')}
            className="group relative bg-white p-8 rounded-3xl shadow-lg border-2 border-transparent hover:border-orange-500 hover:shadow-2xl transition-all flex flex-col items-center gap-4"
          >
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Globe size={48} className="text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-slate-700">NET Teacher</span>
          </button>
        </div>
        <div className="mt-12 text-slate-400 text-sm">
            System Ready • Connected to Firebase
        </div>
      </div>
    );
  }

  // 2. Student Selection (Wide Layout Restored)
  if (view === 'student_select') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <header className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
            <button onClick={() => setView('landing')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold">
                <ArrowLeft /> 返回首頁
            </button>
            <h2 className="text-3xl font-black text-indigo-700">選擇你的名字</h2>
            <div className="w-24"></div> 
        </header>

        {/* Class Tabs */}
        <div className="max-w-7xl mx-auto mb-8 flex gap-4 overflow-x-auto pb-2">
            {['3A','3B','3C','3D'].map(cls => (
                <button 
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-8 py-4 rounded-2xl text-xl font-bold transition-all shadow-sm
                    ${selectedClass === cls 
                        ? 'bg-indigo-600 text-white scale-105 shadow-indigo-200' 
                        : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                >
                    {cls}
                </button>
            ))}
        </div>

        {/* Grid Area - Using max-w-7xl for width */}
        <div className="max-w-7xl mx-auto">
            {filteredStudents.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border-2 border-dashed border-slate-200">
                    <p className="text-xl">暫無資料，請老師先匯入名單。</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredStudents.map(s => (
                        <button
                            key={s.id}
                            onClick={() => { setSelectedStudent(s); setView('game'); }}
                            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col items-center gap-2"
                        >
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-black text-xl">
                                {s.number}
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-slate-700 text-lg">{s.name}</div>
                                <div className="text-xs text-slate-400 font-mono mt-1">💎 {s.score}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
    );
  }

  // 3. Teacher Dashboard (With Import Function)
  if (view === 'teacher') {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-10">
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                    <Settings className="text-emerald-600" size={32}/> 
                    教師後台
                </h1>
                <button onClick={() => setView('landing')} className="bg-white px-6 py-2 rounded-lg font-bold text-slate-600 shadow-sm hover:bg-slate-50">
                    登出
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Stats Card */}
                <div className="bg-white p-8 rounded-3xl shadow-sm">
                    <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <Users size={20}/> 學生概況
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-indigo-50 rounded-2xl text-center">
                            <div className="text-4xl font-black text-indigo-600 mb-1">{allStudents.length}</div>
                            <div className="text-xs font-bold text-indigo-400 uppercase">總人數</div>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-2xl text-center">
                             <div className="text-4xl font-black text-emerald-600 mb-1">
                                {allStudents.reduce((acc, s) => acc + (s.score || 0), 0)}
                             </div>
                             <div className="text-xs font-bold text-emerald-400 uppercase">總積分</div>
                        </div>
                    </div>
                </div>

                {/* Import Tool */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border-l-8 border-indigo-500">
                    <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <FileUp size={20} className="text-indigo-600"/> 名單管理 (CSV)
                    </h3>
                    
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-900 mb-6 flex items-start gap-3">
                        <AlertCircle className="shrink-0 mt-0.5" size={18}/>
                        <div>
                            <p className="font-bold mb-1">匯入操作將會覆蓋現有資料庫！</p>
                            <p>請上載包含 3A-3D 所有學生的完整 CSV 檔案。</p>
                            <p className="mt-1 opacity-70 text-xs font-mono">Column D:班別 | Column E:班號 | Column H:姓名</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <input 
                            type="file" 
                            accept=".csv"
                            ref={fileInputRef}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        <button 
                            onClick={(e) => fileInputRef.current && handleImportCSV({ target: fileInputRef.current })}
                            disabled={isUploading}
                            className={`px-6 py-2 rounded-lg font-bold text-white shadow-md whitespace-nowrap flex items-center gap-2
                                ${isUploading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isUploading ? '匯入中...' : '匯入'} <Upload size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // 4. NET View (Simple placeholder as per request)
  if (view === 'net') {
    return (
        <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-8 text-center">
             <h1 className="text-4xl font-black text-orange-600 mb-4">English Zone</h1>
             <p className="text-slate-600 text-xl mb-8">Welcome, NET Teacher! Students are speaking English today.</p>
             <button onClick={() => setView('landing')} className="px-8 py-3 bg-white text-orange-600 font-bold rounded-full shadow-lg">Back</button>
        </div>
    );
  }

  // 5. Game View (Existing Logic)
  if (view === 'game' && selectedStudent) {
    return (
      <div className="min-h-screen bg-indigo-50 p-6 flex flex-col items-center">
         <header className="w-full max-w-2xl flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={() => setView('student_select')} className="text-slate-400 hover:text-indigo-600"><ArrowLeft/></button>
                <div>
                    <h2 className="font-bold text-xl text-slate-800">{selectedStudent.number}. {selectedStudent.name}</h2>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{selectedStudent.className}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Coins className="text-yellow-500 fill-yellow-500" />
                <span className="text-2xl font-black text-slate-700">{selectedStudent.score || 0}</span>
            </div>
         </header>

         <main className="w-full max-w-2xl">
            {!question ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => { setQuestion(generateQuestion('basic')); setInputAns(''); setFeedback(null); }} className="h-32 bg-white rounded-2xl shadow-sm border-b-4 border-indigo-100 hover:border-indigo-400 flex flex-col items-center justify-center gap-2 transition-all">
                        <span className="text-3xl">💰</span>
                        <span className="font-bold text-slate-600">基礎理財</span>
                    </button>
                    <button onClick={() => { setQuestion(generateQuestion('shopping')); setInputAns(''); setFeedback(null); }} className="h-32 bg-white rounded-2xl shadow-sm border-b-4 border-emerald-100 hover:border-emerald-400 flex flex-col items-center justify-center gap-2 transition-all">
                        <span className="text-3xl">🛒</span>
                        <span className="font-bold text-slate-600">購物找換</span>
                    </button>
                    <button onClick={() => { setQuestion(generateQuestion('time')); setInputAns(''); setFeedback(null); }} className="h-32 bg-white rounded-2xl shadow-sm border-b-4 border-purple-100 hover:border-purple-400 flex flex-col items-center justify-center gap-2 transition-all">
                        <span className="text-3xl">⏰</span>
                        <span className="font-bold text-slate-600">時間管理</span>
                    </button>
                 </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-xl p-8 text-center relative overflow-hidden">
                    <button onClick={() => setQuestion(null)} className="absolute top-6 left-6 text-slate-300 hover:text-slate-600"><ArrowLeft/></button>
                    
                    <div className="mt-8 mb-8">
                        <h3 className="text-2xl md:text-3xl font-bold text-slate-800 leading-normal">{question.text}</h3>
                    </div>

                    <div className="flex justify-center items-end gap-3 mb-10">
                        <input 
                            type="number" 
                            value={inputAns}
                            onChange={(e) => setInputAns(e.target.value)}
                            className="w-40 border-b-4 border-indigo-100 text-center text-4xl font-black text-indigo-600 focus:outline-none focus:border-indigo-400 transition-all pb-2"
                            placeholder="?"
                            autoFocus
                        />
                        <span className="text-xl font-bold text-slate-400 mb-3">{question.unit}</span>
                    </div>

                    {!feedback ? (
                        <button onClick={submitAnswer} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                            提交
                        </button>
                    ) : (
                        <div className={`p-6 rounded-2xl animate-pulse ${feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            <div className="text-2xl font-black mb-2">{feedback === 'correct' ? '答對了！' : '再試一次'}</div>
                            {feedback === 'correct' && <div className="text-sm font-bold opacity-75">+10 寶石</div>}
                            <button onClick={() => setQuestion(null)} className="mt-4 px-6 py-2 bg-white rounded-full text-sm font-bold shadow-sm opacity-90 hover:opacity-100">繼續挑戰</button>
                        </div>
                    )}
                </div>
            )}
         </main>
      </div>
    );
  }

  return <div>Loading...</div>;
}

export default App;