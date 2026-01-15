// @ts-nocheck
// P.3 理財數學王 v6.7 (Teacher Import CSV & Real-time List)
// Date: 2026-01-15
// Updates: 
// 1. Version incremented to v6.7.
// 2. Added "Import CSV" in Teacher View.
//    - Logic: Wipes existing 'students' collection -> Batch writes new list.
//    - Mapping: Col D (Class), Col E (Number), Col H (Name).
// 3. Changed Student View to listen to Firestore in real-time (removed dependence on hardcoded RAW_CSV_DATA).

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, 
  increment, getDoc, writeBatch, getDocs, deleteDoc 
} from 'firebase/firestore';
import { 
  Trophy, User, Coins, ArrowLeft, CheckCircle2, XCircle, 
  Settings, Save, Upload, FileUp, AlertCircle, Trash2, Users
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
const parseStudentsFromCSV = (csvContent) => {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  const data = [];
  // Skip header (i=1)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length > 7) {
      // Mapping: D(3)=Class, E(4)=Number, H(7)=Name
      const className = cols[3]?.trim(); 
      const number = cols[4]?.trim();
      const name = cols[7]?.trim();

      if (className && number && name) {
        data.push({
          className: className,
          number: number,
          name: name,
          id: `${className}_${number}`, // Unique ID
          score: 0,
          status: 'idle',
          redeemed: false
        });
      }
    }
  }
  return data;
};

// --- 3. Game Logic Helpers ---
const generateQuestion = (level) => {
  let q = {};
  if (level === 'money_basic') {
    const target = (Math.floor(Math.random() * 10) + 1) * 10;
    q = { text: `請湊出 ${target} 元`, answer: target, unit: "元", type: 'money' };
  } else if (level === 'money_advanced') {
    const price = Math.floor(Math.random() * 80) + 10;
    const paid = Math.ceil(price / 10) * 10 + (Math.random() > 0.5 ? 0 : 10);
    q = { text: `小明買文具用了 ${price} 元，付款 ${paid} 元，應找回多少元？`, answer: paid - price, unit: "元", type: 'input' };
  } else if (level === 'time_duration') {
    const startH = Math.floor(Math.random() * 10) + 1;
    const duration = Math.floor(Math.random() * 3) + 1;
    q = { text: `現在是下午 ${startH} 時，${duration} 小時後是下午幾時？`, answer: startH + duration, unit: "時", type: 'input' };
  } else if (level === 'measurement_subtraction') {
    let original = Math.floor(Math.random() * 500) + 200; 
    let count = Math.floor(Math.random() * 5) + 2;      
    let perVolume = Math.floor(Math.random() * 30) + 20; 
    while (original <= (count * perVolume)) { original += 50; }
    q = { 
      text: `水桶裡有 ${original} 毫升水，倒出了 ${count} 杯，每杯 ${perVolume} 毫升。水桶裡還剩下多少毫升？`, 
      answer: original - (count * perVolume), 
      unit: "毫升", 
      type: 'input' 
    };
  }
  return q;
};

// --- 4. Main Component ---
function App() {
  const [user, setUser] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('3A');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [view, setView] = useState('login'); // login, game, teacher
  const [question, setQuestion] = useState(null);
  const [inputAns, setInputAns] = useState('');
  const [feedback, setFeedback] = useState(null);
  
  // Teacher State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        if (u.email && u.email.includes('teacher')) setView('teacher');
      } else {
        signInAnonymously(auth);
      }
    });
    return () => unsub();
  }, []);

  // Real-time Student Sync (Replaces static CSV parsing)
  useEffect(() => {
    const q = collection(db, "students");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setAllStudents(studentsData);
    });
    return () => unsubscribe();
  }, []);

  // Filter Students
  const filteredStudents = useMemo(() => {
    return allStudents
      .filter(s => s.className === selectedClass) // changed from 'class' to 'className' to match parser
      .sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [allStudents, selectedClass]);

  // Handle Login
  const handleStudentLogin = (student) => {
    setSelectedStudent(student);
    setView('game');
  };

  // Submit Answer
  const submitAnswer = async () => {
    if (!question) return;
    const isCorrect = parseInt(inputAns) === question.answer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      const ref = doc(db, "students", selectedStudent.id);
      await updateDoc(ref, { score: increment(10) });
      setSelectedStudent(prev => ({ ...prev, score: (prev.score || 0) + 10 }));
    }
  };

  // Teacher: Handle CSV Import
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const newStudents = parseStudentsFromCSV(text);

        if (newStudents.length === 0) {
          alert("CSV 解析失敗或沒有學生資料，請檢查格式。");
          setIsUploading(false);
          return;
        }

        // 1. Delete all existing students (Batch)
        // Note: Batches are limited to 500 ops. If > 500 students, need chunks.
        // Assuming < 500 for P3 level.
        const batch = writeBatch(db);
        const existingSnapshot = await getDocs(collection(db, "students"));
        existingSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });

        // 2. Add new students
        newStudents.forEach((s) => {
          const docRef = doc(db, "students", s.id);
          batch.set(docRef, {
            name: s.name,
            className: s.className, // using className to be consistent
            number: s.number,
            score: 0,
            redeemed: false
          });
        });

        await batch.commit();
        alert(`成功匯入 ${newStudents.length} 名學生資料！舊資料已覆蓋。`);
      } catch (error) {
        console.error("Import Error:", error);
        alert("匯入發生錯誤，請查看 Console。");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Render Login
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 font-sans">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-black text-indigo-600 mb-2">P.3 理財數學王 v6.7</h1>
          <div className="flex justify-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Online Mode</span>
          </div>
        </header>

        {/* Class Selector */}
        <div className="flex justify-center gap-3 mb-6 overflow-x-auto pb-2">
          {['3A', '3B', '3C', '3D'].map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-6 py-3 rounded-xl font-bold text-lg shadow-sm whitespace-nowrap
                ${selectedClass === cls 
                  ? 'bg-indigo-600 text-white scale-105' 
                  : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
              {cls}
            </button>
          ))}
        </div>

        {/* Student Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
          {filteredStudents.length > 0 ? (
            filteredStudents.map(s => (
              <button
                key={s.id}
                onClick={() => handleStudentLogin(s)}
                className="flex flex-col items-center p-4 bg-white rounded-2xl shadow-sm border hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black mb-2">
                  {s.number}
                </div>
                <span className="font-bold text-slate-700">{s.name}</span>
                <span className="text-xs text-slate-400 mt-1">💎 {s.score || 0}</span>
              </button>
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-slate-400">
              <p>載入中 或 該班別暫無學生資料...</p>
            </div>
          )}
        </div>
        
        <div className="text-center">
          <button onClick={() => setView('teacher')} className="text-slate-300 text-sm hover:text-indigo-600">
            教師登入
          </button>
        </div>
      </div>
    );
  }

  // Render Game (Simplified for brevity, same as v6.6 logic)
  if (view === 'game' && selectedStudent) {
    return (
      <div className="min-h-screen bg-indigo-50 p-4">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-6 max-w-2xl mx-auto">
          <div>
            <h2 className="font-bold text-slate-800">{selectedStudent.number}. {selectedStudent.name}</h2>
            <p className="text-xs text-slate-400">{selectedStudent.className} 班</p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full">
            <Coins className="text-yellow-500" />
            <span className="font-black text-xl text-yellow-600">{selectedStudent.score || 0}</span>
          </div>
        </div>

        {/* Game Content */}
        <div className="max-w-2xl mx-auto">
          {!question ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => { setQuestion(generateQuestion('money_basic')); setInputAns(''); setFeedback(null); }} className="p-6 bg-white rounded-xl shadow-sm border-l-8 border-green-400 font-bold text-lg text-slate-700 text-left">💰 基礎理財</button>
              <button onClick={() => { setQuestion(generateQuestion('money_advanced')); setInputAns(''); setFeedback(null); }} className="p-6 bg-white rounded-xl shadow-sm border-l-8 border-blue-400 font-bold text-lg text-slate-700 text-left">🏪 購物找換</button>
              <button onClick={() => { setQuestion(generateQuestion('time_duration')); setInputAns(''); setFeedback(null); }} className="p-6 bg-white rounded-xl shadow-sm border-l-8 border-purple-400 font-bold text-lg text-slate-700 text-left">⏰ 時間計算</button>
              <button onClick={() => { setQuestion(generateQuestion('measurement_subtraction')); setInputAns(''); setFeedback(null); }} className="p-6 bg-white rounded-xl shadow-sm border-l-8 border-orange-400 font-bold text-lg text-slate-700 text-left">⚖️ 度量衡挑戰</button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center relative">
              <button onClick={() => setQuestion(null)} className="absolute top-4 left-4 text-slate-300 hover:text-slate-600"><ArrowLeft /></button>
              <h3 className="text-2xl font-bold text-slate-800 mb-8 mt-4">{question.text}</h3>
              <div className="flex justify-center items-center gap-3 mb-8">
                <input type="number" value={inputAns} onChange={(e) => setInputAns(e.target.value)} className="w-32 h-16 text-3xl text-center font-bold border-b-4 border-indigo-200 outline-none bg-slate-50" />
                {question.unit && <span className="text-xl font-bold text-slate-400">{question.unit}</span>}
              </div>
              {!feedback ? (
                <button onClick={submitAnswer} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-xl shadow-lg">提交答案</button>
              ) : (
                <div className={`p-6 rounded-xl ${feedback === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <span className="text-2xl font-black">{feedback === 'correct' ? '答對了！+10分' : '再試一次！'}</span>
                  <button onClick={() => setQuestion(null)} className="mt-4 px-6 py-2 bg-white rounded-full text-sm font-bold shadow-sm block mx-auto">繼續</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Teacher View
  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Settings /> 教師後台控制中心
          </h2>
          <button onClick={() => setView('login')} className="px-4 py-2 bg-white text-slate-600 rounded-lg shadow-sm font-bold">登出</button>
        </div>

        {/* Data Import Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border-l-8 border-indigo-500">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileUp className="text-indigo-500" /> 匯入學生名單
          </h3>
          <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-800 flex gap-2">
            <AlertCircle size={20} />
            <div>
              <p className="font-bold">注意：匯入操作將會「覆蓋」現有資料庫！</p>
              <p>系統會先清除舊名單，再寫入新名單。請確保 CSV 包含完整 3A-3D 班資料。</p>
              <p className="mt-1 text-xs opacity-70">格式要求: Col D(班別), Col E(班號), Col H(姓名)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <input 
              type="file" 
              accept=".csv"
              ref={fileInputRef}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <button 
              onClick={(e) => fileInputRef.current && handleFileUpload({ target: fileInputRef.current })}
              disabled={isUploading}
              className={`px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-all flex items-center gap-2
                ${isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isUploading ? '處理中...' : '確認匯入'} <Upload size={18} />
            </button>
          </div>
        </div>

        {/* Current Stats */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="text-green-500" /> 系統概況
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <span className="block text-3xl font-black text-slate-800">{allStudents.length}</span>
              <span className="text-xs text-slate-500 uppercase font-bold">總學生人數</span>
            </div>
            {['3A', '3B', '3C', '3D'].map(cls => (
              <div key={cls} className="p-4 bg-slate-50 rounded-xl text-center border-t-4 border-slate-200">
                <span className="block text-2xl font-bold text-slate-700">
                  {allStudents.filter(s => s.className === cls).length}
                </span>
                <span className="text-xs text-slate-500 uppercase font-bold">{cls} 人數</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;