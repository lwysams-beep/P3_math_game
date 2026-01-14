// @ts-nocheck
// P.3 理財數學王 v4.9 (NET Shop-First & Admin Reset)
// Date: 2026-01-14
// Fixes: 
// 1. NET Workflow changed: Login -> Select Shop -> Live Dashboard (w/ Auto Calc HKD & Quick Redeem).
// 2. Added Student Name display in Game View.
// 3. Reduced Question font size.
// 4. Added "Reset All Scores" for Teacher (PWD: 61513110).

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, serverTimestamp, increment, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { 
  Trophy, User, Coins, ArrowLeft, CheckCircle2, XCircle, 
  Calculator, Store, Wallet, Lock, Settings, LogOut, 
  Languages, BarChart3, Search, Play, Timer, Save, Edit, RefreshCw, AlertTriangle, Loader2, Wifi, WifiOff, CloudOff, RotateCcw, Check
} from 'lucide-react';

// --- 1. Firebase Configuration ---
const userFirebaseConfig = {
  apiKey: "AIzaSyA2jtWJjlJ7Bnyfkw2oQQar210zHxsX6k0",
  authDomain: "p3-math-game.firebaseapp.com",
  projectId: "p3-math-game",
  storageBucket: "p3-math-game.firebasestorage.app",
  messagingSenderId: "330710509952",
  appId: "1:330710509952:web:99966ad83282621c497965"
};

const firebaseConfig = (window).__firebase_config 
  ? JSON.parse((window).__firebase_config) 
  : userFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = (window).__app_id || 'p3-math-finance-v4-accum'; 

// --- 2. Constants ---
const TEACHER_PWD = "26754411!";
const NET_PWD = "english_please";
const RESET_PWD = "61513110"; // Teacher Reset Password
const GAME_DURATION = 300; // 5 Minutes

const SHOPS = [
  { id: 'A', name_zh: 'A店 (快樂找換)', name_en: 'Shop A (Happy Exchange)', rate: 2, color: 'bg-emerald-600', lightColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700' },
  { id: 'B', name_zh: 'B店 (幸運找換)', name_en: 'Shop B (Lucky Exchange)', rate: 3, color: 'bg-blue-600', lightColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700' },
  { id: 'C', name_zh: 'C店 (VIP找換)',   name_en: 'Shop C (VIP Exchange)',   rate: 5, color: 'bg-purple-600', lightColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700' }
];

// --- 3. Smart Question Generator ---
const generateQuestion = (difficulty) => {
  const types = ['mul', 'div', 'app', 'logic'];
  const type = types[Math.floor(Math.random() * (difficulty === 'high' ? 4 : 3))]; 
   
  let q = "", a = 0, score = 0, penalty = 0;

  if (difficulty === 'low') {
    score = 5; penalty = 2;
    if (type === 'mul') {
      const n1 = Math.floor(Math.random() * 80) + 10; 
      const n2 = Math.floor(Math.random() * 8) + 2;   
      q = `${n1} × ${n2} = ?`;
      a = n1 * n2;
    } else if (type === 'div') {
      const ans = Math.floor(Math.random() * 9) + 2;
      const n2 = Math.floor(Math.random() * 8) + 2;
      q = `${ans * n2} ÷ ${n2} = ?`;
      a = ans;
    } else {
      const items = ['蘋果', '擦膠', '糖果', '鉛筆'];
      const item = items[Math.floor(Math.random() * items.length)];
      const p = Math.floor(Math.random() * 10) + 2;
      const c = Math.floor(Math.random() * 5) + 2;
      q = `每個${item}售 $${p}，買 ${c} 個需付多少元？`;
      a = p * c;
    }
  } else if (difficulty === 'mid') {
    score = 10; penalty = 5;
    if (type === 'mul') {
      const n1 = Math.floor(Math.random() * 300) + 100;
      const n2 = Math.floor(Math.random() * 8) + 2;
      q = `${n1} × ${n2} = ?`;
      a = n1 * n2;
    } else if (type === 'div') {
      const ans = Math.floor(Math.random() * 20) + 10;
      const n2 = Math.floor(Math.random() * 6) + 3;
      q = `將 ${ans * n2} 粒糖果平均分給 ${n2} 人，每人得多少粒？`;
      a = ans;
    } else {
      const n1 = Math.floor(Math.random() * 10) + 80; 
      const n2 = Math.floor(Math.random() * 3) + 7;   
      q = `估算：${n1} × ${n2} 的結果約是多少？(取百位整數)`;
      a = Math.round((n1 * n2) / 100) * 100;
    }
  } else {
    score = 20; penalty = 10;
    if (type === 'mul') {
      const n1 = Math.floor(Math.random() * 5) + 2;
      const n2 = Math.floor(Math.random() * 20) + 10;
      const n3 = Math.floor(Math.random() * 5) + 2;
      q = `${n1} × ${n2} × ${n3} = ?`;
      a = n1 * n2 * n3;
    } else if (type === 'logic') {
      q = "用 5, 4, 0 組成最大的三位單數，再乘以 3，結果是？";
      a = 405 * 3; 
    } else {
      const fee = 106;
      q = `電腦班每堂 $${fee}，全期 8 堂。子言和妹妹一同報名，共需付多少元？`;
      a = fee * 8 * 2;
    }
  }
  return { q, a, score, penalty, difficulty };
};

// CSV Data 
const RAW_CSV_DATA = `學生註冊編號,學年,級別,班別代碼,25_P3_Class,25_P3_Class 英數,25_託管,班號,學生編號,英文姓名,中文姓名
#W23083,2025,P3,3A,3A,3A,,1,S9014979,CHAN SHEUNG KI,陳尚頎
#W23126,2025,P3,3A,3A,3A,,2,S9198301,CHU HOI TUNG,朱凱彤
#W23084,2025,P3,3A,3A,3A,,3,S9089944,CHUNG CHEUK LAM,鍾焯琳
#W23005,2025,P3,3A,3A,3A,,4,S9024095,HAN JIAYING,韓佳穎
#W23024,2025,P3,3A,3A,3A,,5,S9018699,HO CHEUK HIM,何卓謙
#W23007,2025,P3,3A,3A,3A,,6,S9055810,KWOK SUM YU,郭芯妤
#W23010,2025,P3,3A,3A,3A,,7,S9034260,LAM HEI MAN,林希蔓
#W23030,2025,P3,3A,3A,3A,,8,S8979113,LAU PAK YIN,劉柏言
#W23011,2025,P3,3A,3A,3A,,9,S9037464,LAU HIU YAU,劉曉悠
#W23013,2025,P3,3A,3A,3A,,10,S9034503,LEE CHEUK NAM,李卓楠
#W23014,2025,P3,3A,3A,3A,,11,S9030001,LEUNG TSZ CHING,梁梓晴
#W23012,2025,P3,3A,3A,3A,,12,S9035119,LI KA LAM,李佳琳
#W23061,2025,P3,3A,3A,3A,,13,S9150198,LUNG KA HAI,龍嘉熙
#W23063,2025,P3,3A,3A,3A,,14,S8986527,MAN PAK HEI,文柏曦
#W23017,2025,P3,3A,3A,3A,,15,S9034872,NG YUE FEI,吳雨霏
#W23145,2025,P3,3A,3A,3A,,16,S9356349,POON HO HIN,潘浩軒
#W23046,2025,P3,3A,3A,3A,,17,S8991444,SHAM CHEUK FUNG,岑卓峰
#W23018,2025,P3,3A,3A,3A,,18,S9027981,TAI KA HEI,戴嘉希
#W23047,2025,P3,3A,3A,3A,,19,S9047214,TAM KA YING,譚嘉瑩
#W23019,2025,P3,3A,3A,3A,,20,S9014529,TO CHEUK WING,杜卓穎
#W23020,2025,P3,3A,3A,3A,,21,S9034376,WONG TSZ YAU,王梓悠
#W23050,2025,P3,3A,3A,3A,,22,S8977536,WONG CHUN HEI,黃俊熙
#W23149,2025,P3,3A,3A,3A,,23,S9369068,WONG NGA LAM,黃雅琳
#W23021,2025,P3,3A,3A,3A,,24,S9024044,YEUNG TSZ YUET,楊子悅
#W23022,2025,P3,3A,3A,3A,,25,S9024036,ZHOU HAOYU,周浩宇
#W23086,2025,P3,3B,3B,3B,,1,S9043324,CHAU YUK KIU,周鈺翹
#W23025,2025,P3,3B,3B,3B,,2,S9042263,CHENG KA SHING,鄭嘉誠
#W23088,2025,P3,3B,3B,3B,,3,S9050071,CHEUNG YIN TING,張賢廷
#W23004,2025,P3,3B,3B,3B,,4,S9044959,FONG MAN HEI,方雯晞
#W23091,2025,P3,3B,3B,3B,,5,S9034228,HO YU KI,何宇淇
#W23093,2025,P3,3B,3B,3B,,6,S9065360,KO KWAN NGAI,高鈞毅
#W23008,2025,P3,3B,3B,3B,,7,S9029968,KWOK TSZ YING,郭梓盈
#W23094,2025,P3,3B,3B,3B,,8,S9061004,LAM YUET NAM,林悅楠
#W23032,2025,P3,3B,3B,3B,,9,S9014499,LAU YAN TUNG,劉恩彤
#W23034,2025,P3,3B,3B,3B,,10,S9011708,LEE CHUN YIN,李俊賢
#W23036,2025,P3,3B,3B,3B,,11,S9024079,LEUNG CHUN SING,梁振聲
#W23038,2025,P3,3B,3B,3B,,12,S9029933,LEUNG KA KI,梁嘉麒
#W23015,2025,P3,3B,3B,3B,,13,S9044932,LEUNG WING CHIN,梁詠展
#W23041,2025,P3,3B,3B,3B,,14,S8977528,LI SUM YAU,李芯悠
#W23099,2025,P3,3B,3B,3B,,15,S9035089,LIU CHAK TO,廖澤滔
#W23062,2025,P3,3B,3B,3B,,16,S9148452,LUI HOI YAU,雷凱悠
#W23102,2025,P3,3B,3B,3B,,17,S9034295,MAN CHAK SING,文澤承
#W23016,2025,P3,3B,3B,3B,,18,S9044398,NG KA YEE,吳嘉怡
#W23067,2025,P3,3B,3B,3B,,19,S9044436,PANG CHIT LONG,彭哲朗
#W23103,2025,P3,3B,3B,3B,,20,S9044355,SIU TSZ KI,蕭芷淇
#W23048,2025,P3,3B,3B,3B,,21,S9011686,TSANG CHUN HEI,曾進希
#W23049,2025,P3,3B,3B,3B,,22,S9042212,WAN PAK KIU,溫柏翹
#W23105,2025,P3,3B,3B,3B,,23,S9042271,WONG HO TIN,黃浩天
#W23106,2025,P3,3B,3B,3B,,24,S9037499,WONG YAN TING,黃欣婷
#W23107,2025,P3,3B,3B,3B,,25,S9037480,XIE TSZ LAM,謝芷琳
#W23026,2025,P3,3C,3C,3C,,1,S9018656,CHAN CHUN YIN,陳俊賢
#W23121,2025,P3,3C,3C,3C,,2,S9205103,CHENG SUM YUET,鄭心悅
#W23028,2025,P3,3C,3C,3C,,3,S9014561,CHIU CHUN KIT,趙俊傑
#W23090,2025,P3,3C,3C,3C,,4,S9044991,FAN CHEUK KAN,范卓勤
#W23006,2025,P3,3C,3C,3C,,5,S9044924,IP TIN LONG,葉天朗
#W23131,2025,P3,3C,3C,3C,,6,S9221168,KEUNG YAN TUNG,姜欣彤
#W23132,2025,P3,3C,3C,3C,,7,S9231457,KWOK KWAN LAM,郭君臨
#W23009,2025,P3,3C,3C,3C,,8,S9029951,KWONG TSZ KIU,鄺芷蕎
#W23031,2025,P3,3C,3C,3C,,9,S9014545,LAU TIN LONG,劉天朗
#W23033,2025,P3,3C,3C,3C,,10,S9011708,LAW CHUN CHING,羅俊政
#W23035,2025,P3,3C,3C,3C,,11,S9024087,LEE HOI CHING,李海晴
#W23037,2025,P3,3C,3C,3C,,12,S9029941,LEE TSZ LAM,李芷琳
#W23039,2025,P3,3C,3C,3C,,13,S9035097,LI CHEUK HEI,李卓熹
#W23040,2025,P3,3C,3C,3C,,14,S8977501,LIU TSZ CHUNG,廖梓聰
#W23137,2025,P3,3C,3C,3C,,15,S9255011,LUK CHI YEUNG,陸志揚
#W23043,2025,P3,3C,3C,3C,,16,S8986519,MA SHU SUM,馬樹森
#W23044,2025,P3,3C,3C,3C,,17,S8987760,MAK KA PO,麥嘉寶
#W23045,2025,P3,3C,3C,3C,,18,S8987779,MIAO HO FUNG,繆浩峰
#W23138,2025,P3,3C,3C,3C,,19,S9255021,MUI TSZ TO,梅子滔
#W23066,2025,P3,3C,3C,3C,,20,S9037430,NGAN WING KEI,顏詠琪
#W23143,2025,P3,3C,3C,3C,,21,S9318854,SIN CHEUK LAM,冼卓琳
#W23051,2025,P3,3C,3C,3C,,22,S8979148,WONG HEI NAM,黃希楠
#W23052,2025,P3,3C,3C,3C,,23,S8979130,WONG HIU YAN,黃曉欣
#W23108,2025,P3,3C,3C,3C,,24,S9043286,YU CHUN HEI,余俊希
#W23109,2025,P3,3C,3C,3C,,25,S9043294,ZHAO YAN LONG,趙言朗
#W23110,2025,P3,3D,3D,3D,,1,S9042220,AU-YEUNG SUM YUET,歐陽心悅
#W23001,2025,P3,3D,3D,3D,,2,S9018672,CHAN CHUN HO,陳俊豪
#W23002,2025,P3,3D,3D,3D,,3,S9024052,CHAN CHUN HEI,陳俊熙
#W23085,2025,P3,3D,3D,3D,,4,S9029984,CHAN HEI NGAI,陳希毅
#W23111,2025,P3,3D,3D,3D,,5,S9037449,CHAN HEI WING,陳晞穎
#W23027,2025,P3,3D,3D,3D,,6,S9014537,CHEN JIAYING,陳嘉盈
#W23122,2025,P3,3D,3D,3D,,7,S9205111,CHENG TAI MING,鄭泰明
#W23124,2025,P3,3D,3D,3D,,8,S9198328,CHEUNG KWAN TO,張鈞陶
#W23003,2025,P3,3D,3D,3D,,9,S9014510,CHOW KA KEI,周嘉琪
#W23089,2025,P3,3D,3D,3D,,10,S9043308,CHOW SZE CHAI,周斯齊
#W23127,2025,P3,3D,3D,3D,,11,S9205146,CHU CHI HIN,朱智軒
#W23092,2025,P3,3D,3D,3D,,12,S9034899,HU YUANQI,胡圓棋
#W23095,2025,P3,3D,3D,3D,,13,S9018664,LAM CHAK HANG,林澤衡
#W23096,2025,P3,3D,3D,3D,,14,S9043316,LAM HOI LAM,林鎧琳
#W23029,2025,P3,3D,3D,3D,,15,S8979105,LAU CHUN YIN,劉俊言
#W23097,2025,P3,3D,3D,3D,,16,S9065352,LEE CHING HEI,李政熙
#W23098,2025,P3,3D,3D,3D,,17,S9044940,LEUNG WAI HIN,梁偉軒
#W23101,2025,P3,3D,3D,3D,,18,S9034252,LI KA LOK,李嘉樂
#W23071,2025,P3,3D,3D,3D,,19,S8987728,MAN HEI YUI,文希睿
#W23023,2025,P3,3D,3D,3D,,20,41903298,MARK HO LAM,麥可琳
`;

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false); 
  const [offlineMode, setOfflineMode] = useState(false);

  // Student State
  const [studentView, setStudentView] = useState('class_select');
  const [selectedClass, setSelectedClass] = useState('');
  const [currentStudent, setCurrentStudent] = useState(null);
  const [difficulty, setDifficulty] = useState('low');
  const [currentQuestion, setCurrentQuestion] = useState(null);
   
  // Game State
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [gameActive, setGameActive] = useState(false);
  const [strikes, setStrikes] = useState(0); 
  const [sessionScore, setSessionScore] = useState(0); 
  const [totalAccumulatedScore, setTotalAccumulatedScore] = useState(0); 

  // Teacher State
  const [teacherPwd, setTeacherPwd] = useState('');
  const [liveData, setLiveData] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editScoreVal, setEditScoreVal] = useState('');

  // NET State
  const [netPwd, setNetPwd] = useState('');
  const [selectedShop, setSelectedShop] = useState(null); // Step 1: Shop Selection
  // netStudent search is now part of the dashboard filter if needed, but we show live feed

  // Data Parsing
  const allStudents = useMemo(() => {
    const lines = RAW_CSV_DATA.trim().split('\n').slice(1);
    return lines.map(line => {
      const p = line.split(',');
      return { class: p[3], name_zh: p[10], name_en: p[9], id: `${p[3]}_${p[10]}` };
    });
  }, []);

  const studentsByClass = useMemo(() => {
    const map = { '3A': [], '3B': [], '3C': [], '3D': [] };
    allStudents.forEach(s => { if(map[s.class]) map[s.class].push(s); });
    return map;
  }, [allStudents]);

  // Auth Init
  useEffect(() => {
    const init = async () => {
      try {
        const token = (window).__initial_auth_token;
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Failed:", err);
      }
      setLoading(false);
    };
    init();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setOfflineMode(false);
    });
  }, []);

  // Timer
  useEffect(() => {
    let timer;
    if (gameActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (gameActive && timeLeft === 0) {
      endGame();
    }
    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);

  // Unified Live Monitor (Used by Teacher & NET)
  useEffect(() => {
    // Enable monitor for Teacher OR NET (once shop selected)
    if (!user || (view !== 'teacher' && view !== 'net_dashboard')) return;
    
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'scores');
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiveData(data.sort((a, b) => b.score - a.score));
    }, (error) => {
      console.log("Monitor offline:", error);
    });
    return () => unsub();
  }, [user, view]);

  // --- Logic ---
  const startGame = async () => {
    if (!currentStudent) {
      alert("請先選擇學生 (Please select a student)");
      return;
    }

    setIsStarting(true);
    
    // OFFLINE FALLBACK CHECK
    let isOffline = offlineMode;
    if (!user) {
      try {
        await signInAnonymously(auth);
        await new Promise(r => setTimeout(r, 500));
        if (!auth.currentUser) throw new Error("Auth failed");
      } catch (e) {
        isOffline = true;
        setOfflineMode(true);
      }
    }

    setGameActive(true);
    setSessionScore(0);
    setStrikes(0);
    setTimeLeft(GAME_DURATION);
    
    const q = generateQuestion(difficulty);
    setCurrentQuestion(q);
    
    if (!isOffline && user) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'scores', currentStudent.id);
      try {
        const snap = await getDoc(docRef);
        let prevScore = 0;
        if (snap.exists()) {
          prevScore = snap.data().score || 0;
        }
        setTotalAccumulatedScore(prevScore); 

        await setDoc(docRef, {
          name: currentStudent.name_zh,
          name_en: currentStudent.name_en,
          class: currentStudent.class,
          status: 'playing',
          score: prevScore, 
          redeemed: snap.exists() ? snap.data().redeemed : false,
          timestamp: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        setOfflineMode(true);
        setTotalAccumulatedScore(0);
      }
    } else {
      setTotalAccumulatedScore(0);
    }

    setStudentView('play');
    setIsStarting(false);
  };

  const submitAnswer = (e) => {
    e.preventDefault();
    if (!gameActive) return;
    const correct = parseFloat(answer) === currentQuestion.a;
    
    if (correct) {
      const gained = currentQuestion.score;
      setSessionScore(s => s + gained);
      setTotalAccumulatedScore(s => s + gained); 
      setFeedback({ ok: true, msg: `答對了！+${gained} 分` });
      
      if(!offlineMode && user && currentStudent) {
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', currentStudent.id), { 
          score: increment(gained) 
        }).catch(() => setOfflineMode(true));
      }
      
      setTimeout(() => {
        setFeedback(null);
        setAnswer('');
        setStrikes(0);
        setCurrentQuestion(generateQuestion(difficulty));
      }, 800);

    } else {
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);

      if (newStrikes < 3) {
        setFeedback({ ok: false, msg: `答錯了！還有 ${3 - newStrikes} 次機會` });
        setAnswer(''); 
        setTimeout(() => setFeedback(null), 1000);
      } else {
        const penalty = currentQuestion.penalty;
        setSessionScore(s => s - penalty); 
        setTotalAccumulatedScore(s => Math.max(0, s - penalty));
        setFeedback({ ok: false, msg: `3次錯誤！扣 ${penalty} 分。答案是 ${currentQuestion.a}` });
        
        if(!offlineMode && user && currentStudent) {
          updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', currentStudent.id), { 
            score: increment(-penalty) 
          }).catch(() => setOfflineMode(true));
        }

        setTimeout(() => {
          setFeedback(null);
          setAnswer('');
          setStrikes(0);
          setCurrentQuestion(generateQuestion(difficulty));
        }, 1500);
      }
    }
  };

  const endGame = () => {
    setGameActive(false);
    setStudentView('result');
    if(!offlineMode && user && currentStudent) {
      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', currentStudent.id), { status: 'finished' });
    }
  };

  // NET Quick Redeem from Dashboard
  const quickRedeem = async (studentId) => {
    if(!user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', studentId), { redeemed: true });
    } catch(e) {
      alert("Redeem failed");
    }
  };

  const saveEdit = async (id) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', id), { score: parseInt(editScoreVal) });
      setEditingId(null);
    } catch(e) {
      alert("Save failed (Offline)");
    }
  };

  // Teacher: Reset All
  const handleResetAll = async () => {
    const pwd = prompt("請輸入重設密碼 (Enter Password to Reset All Scores):");
    if (pwd !== RESET_PWD) {
      alert("密碼錯誤 (Wrong Password)");
      return;
    }
    
    if(!confirm("⚠️ 危險操作 Warning ⚠️\n這將重置所有學生的分數歸零，且無法復原！\n確定要執行嗎？")) return;

    try {
      const q = collection(db, 'artifacts', appId, 'public', 'data', 'scores');
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { 
          score: 0, 
          redeemed: false, 
          status: 'ready' 
        });
      });

      await batch.commit();
      alert("所有分數已重置 (All scores reset successfully).");
    } catch (e) {
      console.error("Batch Reset Error:", e);
      alert("重置失敗 (Reset Failed): " + e.message);
    }
  };

  // --- Render ---

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const ConnectionStatus = () => (
    <div className={`fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${!offlineMode && user ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
      {!offlineMode && user ? <Wifi size={14}/> : <CloudOff size={14}/>}
      {!offlineMode && user ? 'Online' : 'Offline Mode (Local Play)'}
    </div>
  );

  if (view === 'home') return (
    <div className="h-screen w-screen bg-orange-50 flex flex-col items-center justify-center space-y-8 p-4 overflow-hidden relative">
      <ConnectionStatus/>
      <div className="text-center">
        <Coins size={80} className="text-orange-500 mx-auto animate-bounce mb-4"/>
        <h1 className="text-5xl font-black text-slate-800">P.3 理財數學王 v4.9</h1>
        <p className="text-xl text-slate-500 font-bold">5分鐘限時挑戰 • 累積財富</p>
      </div>
      <div className="grid grid-cols-3 gap-8 w-[95vw] max-w-7xl">
        <button onClick={() => setView('student')} className="p-10 bg-white rounded-3xl shadow-xl border-b-8 border-orange-200 hover:scale-105 transition-all text-center group">
          <User size={48} className="mx-auto text-orange-500 mb-2 group-hover:scale-110 transition-transform"/><h2 className="text-2xl font-black text-slate-700">我是學生</h2>
        </button>
        <button onClick={() => setView('teacher_login')} className="p-10 bg-white rounded-3xl shadow-xl border-b-8 border-indigo-200 hover:scale-105 transition-all text-center group">
          <BarChart3 size={48} className="mx-auto text-indigo-500 mb-2 group-hover:scale-110 transition-transform"/><h2 className="text-2xl font-black text-slate-700">我是老師</h2>
        </button>
        <button onClick={() => setView('net_login')} className="p-10 bg-white rounded-3xl shadow-xl border-b-8 border-purple-200 hover:scale-105 transition-all text-center group">
          <Languages size={48} className="mx-auto text-purple-500 mb-2 group-hover:scale-110 transition-transform"/>
          <h2 className="text-2xl font-black text-slate-700">NET</h2>
        </button>
      </div>
    </div>
  );

  // Student
  if (view === 'student') return (
    <div className="h-screen w-screen bg-orange-50 p-4 overflow-hidden relative">
      <ConnectionStatus/>
      <div className="w-full h-full max-w-[98vw] mx-auto bg-white rounded-[2rem] shadow-xl overflow-hidden border-4 border-orange-100 flex flex-col">
        <div className="bg-orange-500 p-4 text-white flex justify-between items-center shrink-0">
          <button onClick={() => setView('home')}><ArrowLeft/></button>
          <h2 className="font-bold">比賽專區 (Student Zone)</h2>
          <div className="w-6"></div>
        </div>
        <div className="p-6 flex-grow overflow-y-auto flex flex-col">
           {studentView === 'class_select' && (
            <div className="grid grid-cols-4 gap-6 h-full items-center">
              {['3A','3B','3C','3D'].map(c => <button key={c} onClick={() => {setSelectedClass(c); setStudentView('name_select');}} className="h-64 bg-orange-50 hover:bg-orange-500 hover:text-white rounded-3xl text-6xl font-black border-4 border-orange-100 transition-colors shadow-sm">{c}</button>)}
            </div>
          )}

          {studentView === 'name_select' && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex justify-between items-center shrink-0">
                <button onClick={() => setStudentView('class_select')} className="px-4 py-2 bg-slate-100 rounded-lg font-bold">Back</button>
                <h3 className="text-2xl font-black">Select Name</h3>
                <div className="w-16"></div>
              </div>
              <div className="grid grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto p-2">
                {studentsByClass[selectedClass]?.map(s => <button key={s.id} onClick={() => {setCurrentStudent(s); setStudentView('difficulty');}} className="p-4 bg-slate-50 hover:bg-orange-100 rounded-xl text-left border font-bold text-lg">{s.name_zh}</button>)}
              </div>
            </div>
          )}

          {studentView === 'difficulty' && (
            <div className="flex-grow flex flex-col justify-center items-center space-y-6">
              <h3 className="text-3xl font-black">選擇挑戰難度</h3>
              <div className="grid grid-cols-3 gap-8 w-full max-w-6xl">
                <button onClick={() => {setDifficulty('low'); setStudentView('intro');}} className="p-12 bg-green-100 border-4 border-green-300 rounded-3xl text-3xl font-black text-green-800 hover:scale-105 transition-transform shadow-lg">
                  初級 (Low)<br/><span className="text-lg font-bold mt-2 block">每題 5 分<br/>(扣 2 分)</span>
                </button>
                <button onClick={() => {setDifficulty('mid'); setStudentView('intro');}} className="p-12 bg-blue-100 border-4 border-blue-300 rounded-3xl text-3xl font-black text-blue-800 hover:scale-105 transition-transform shadow-lg">
                  中級 (Mid)<br/><span className="text-lg font-bold mt-2 block">每題 10 分<br/>(扣 5 分)</span>
                </button>
                <button onClick={() => {setDifficulty('high'); setStudentView('intro');}} className="p-12 bg-purple-100 border-4 border-purple-300 rounded-3xl text-3xl font-black text-purple-800 hover:scale-105 transition-transform shadow-lg">
                  高級 (High)<br/><span className="text-lg font-bold mt-2 block">每題 20 分<br/>(扣 10 分)</span>
                </button>
              </div>
            </div>
          )}

          {studentView === 'intro' && (
            <div className="flex-grow flex flex-col justify-center items-center space-y-8">
              <h2 className="text-7xl font-black text-slate-800">Ready?</h2>
              <p className="text-3xl font-bold text-slate-500">5 分鐘限時挑戰！<br/>答錯 3 次會扣分喔！</p>
              <button 
                onClick={startGame} 
                disabled={isStarting}
                className={`px-20 py-8 bg-orange-500 text-white rounded-full text-5xl font-black shadow-xl hover:scale-105 transition-transform flex items-center ${isStarting ? 'opacity-75 cursor-wait' : 'animate-pulse'}`}
              >
                {isStarting ? <Loader2 className="animate-spin mr-3" size={48} /> : <Play size={48} fill="currentColor" className="inline mr-3"/>} 
                {isStarting ? "STARTING..." : "START"}
              </button>
            </div>
          )}

          {studentView === 'play' && (
            !currentQuestion ? (
              <div className="flex-grow flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={64} />
              </div>
            ) : (
              <div className="flex flex-row gap-6 h-full items-stretch">
                <div className="w-2/3 bg-slate-50 rounded-3xl border-4 border-slate-100 flex flex-col items-center justify-center relative p-8 shadow-inner">
                  {/* Name Display */}
                  <div className="absolute top-4 left-6 text-slate-400 font-bold text-xl">
                    {currentStudent.class} {currentStudent.name_zh}
                  </div>
                  {strikes > 0 && <span className="absolute top-4 right-4 text-red-500 font-bold bg-red-100 px-4 py-2 rounded-xl text-lg">錯誤: {strikes}/3</span>}
                  
                  {/* Question (Smaller font as requested) */}
                  <p className="text-5xl lg:text-7xl font-bold text-slate-800 text-center leading-tight">{currentQuestion.q}</p>
                </div>

                <div className="w-1/3 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-rose-100 p-4 rounded-2xl flex flex-col items-center justify-center text-rose-700">
                      <Timer size={32} className="mb-1"/>
                      <span className="text-2xl font-black">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
                    </div>
                    <div className="bg-orange-100 p-4 rounded-2xl flex flex-col items-center justify-center text-orange-700">
                      <Coins size={32} className="mb-1"/>
                      <span className="text-2xl font-black">{totalAccumulatedScore}</span>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center min-h-[80px]">
                     {feedback && <div className={`w-full p-4 rounded-2xl text-center font-black text-xl animate-bounce ${feedback.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{feedback.msg}</div>}
                  </div>

                  <form onSubmit={submitAnswer} className="flex flex-col gap-4">
                    <input type="number" autoFocus value={answer} onChange={e => setAnswer(e.target.value)} className="w-full p-6 rounded-2xl border-4 border-slate-300 text-5xl text-center font-black outline-none focus:border-orange-500 transition-colors shadow-sm" placeholder="?"/>
                    <button type="submit" className="w-full py-8 bg-slate-800 text-white rounded-2xl font-black text-4xl hover:bg-black transition-colors shadow-lg active:scale-95">提交 (GO)</button>
                  </form>
                </div>
              </div>
            )
          )}

          {studentView === 'result' && (
            <div className="h-full flex flex-col justify-center items-center space-y-8 animate-in zoom-in">
              <Trophy size={100} className="text-yellow-400 mx-auto drop-shadow-lg"/>
              <h2 className="text-5xl font-black">時間到！</h2>
              <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                <div className="p-8 bg-slate-50 rounded-3xl border shadow-sm text-center">
                  <p className="text-sm text-slate-400 font-bold mb-2">本局得分</p>
                  <p className="text-5xl font-black text-slate-700">{sessionScore}</p>
                </div>
                <div className="p-8 bg-orange-50 rounded-3xl border-2 border-orange-200 shadow-sm text-center">
                  <p className="text-sm text-orange-400 font-bold mb-2">累積總分</p>
                  <p className="text-5xl font-black text-orange-600">{totalAccumulatedScore}</p>
                </div>
              </div>
              <p className="font-bold text-slate-400 text-xl">Go to Exchange Shop!</p>
              <button onClick={() => setView('home')} className="text-slate-400 font-bold underline text-lg">Back Home</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // NET
  if (view === 'net_login') return (
    <div className="w-screen h-screen bg-purple-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
        <h2 className="text-3xl font-black">NET Login</h2>
        <input type="password" value={netPwd} onChange={e => setNetPwd(e.target.value)} className="w-full p-5 border-2 rounded-2xl text-center text-xl" placeholder="Password"/>
        <button onClick={() => { if(netPwd === NET_PWD) setView('net_select_shop'); else alert('Wrong Password'); }} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold text-xl hover:bg-purple-700">Enter</button>
        <button onClick={() => setView('home')} className="text-slate-400 font-bold">Back</button>
      </div>
    </div>
  );

  // Step 1: Shop Selection
  if (view === 'net_select_shop') return (
    <div className="w-screen h-screen bg-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h2 className="text-4xl font-black text-purple-900">Select Your Shop</h2>
        <div className="grid grid-cols-3 gap-6">
          {SHOPS.map(shop => (
            <button key={shop.id} onClick={() => { setSelectedShop(shop); setView('net_dashboard'); }} className={`p-10 rounded-3xl border-4 ${shop.borderColor} ${shop.lightColor} hover:scale-105 transition-transform shadow-lg group`}>
              <h3 className={`text-3xl font-black ${shop.textColor} mb-2`}>{shop.name_en}</h3>
              <p className="font-bold text-slate-500">{shop.name_zh}</p>
              <div className={`mt-4 inline-block px-4 py-2 rounded-xl text-white font-bold text-xl ${shop.color}`}>Rate: x{shop.rate}</div>
            </button>
          ))}
        </div>
        <button onClick={() => setView('home')} className="text-slate-400 font-bold">Back</button>
      </div>
    </div>
  );

  // Step 2: NET Dashboard
  if (view === 'net_dashboard' && selectedShop) return (
    <div className="h-screen w-screen bg-slate-100 p-4 font-sans overflow-hidden">
      <div className="w-full h-full max-w-[98vw] mx-auto flex flex-col">
        <div className={`flex justify-between items-center mb-4 bg-white p-6 rounded-3xl shadow-sm shrink-0 border-l-8 ${selectedShop.borderColor}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl text-white ${selectedShop.color}`}><Store size={32}/></div>
            <div>
              <h2 className={`text-3xl font-black ${selectedShop.textColor}`}>{selectedShop.name_en} - Dashboard</h2>
              <p className="text-slate-400 font-bold">Exchange Rate: ${selectedShop.rate} HKD / Coin</p>
            </div>
          </div>
          <button onClick={() => setView('home')} className="bg-slate-100 p-3 rounded-xl text-slate-500 hover:bg-slate-200"><LogOut/></button>
        </div>
        
        {/* Live Student Feed */}
        <div className="flex-grow grid grid-cols-4 gap-6 overflow-hidden">
          {['3A','3B','3C','3D'].map(cls => (
            <div key={cls} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
              <h3 className="font-black text-2xl text-slate-700 mb-4 border-b pb-4 text-center">{cls}</h3>
              <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {liveData.filter(d => d.class === cls).map(s => {
                  const hkd = s.score * selectedShop.rate;
                  return (
                    <div key={s.id} className={`p-3 rounded-xl border-2 flex justify-between items-center ${s.redeemed ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-slate-100'}`}>
                      <div>
                        <span className="font-bold text-md block text-slate-800">{s.name}</span>
                        <div className="flex gap-3 text-xs mt-1">
                          <span className="font-bold text-orange-500"><Coins size={10} className="inline mr-1"/>{s.score}</span>
                          <span className={`font-black ${selectedShop.textColor}`}>${hkd}</span>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      {!s.redeemed ? (
                        <button onClick={() => quickRedeem(s.id)} className={`p-2 rounded-lg ${selectedShop.lightColor} hover:bg-slate-200 transition-colors`}>
                          <Check size={20} className={selectedShop.textColor}/>
                        </button>
                      ) : (
                        <CheckCircle2 size={20} className="text-green-500"/>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Teacher
  if (view === 'teacher_login') return (
    <div className="w-screen h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
        <h2 className="text-3xl font-black">老師後台</h2>
        <input type="password" value={teacherPwd} onChange={e => setTeacherPwd(e.target.value)} className="w-full p-5 border-2 rounded-2xl text-center text-xl" placeholder="Password"/>
        <button onClick={() => { 
          if(teacherPwd === TEACHER_PWD) {
            setView('teacher');
          } else {
            alert('密碼錯誤 (Wrong Password)');
          }
        }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700">Login</button>
        <button onClick={() => setView('home')} className="text-slate-400 font-bold">Back</button>
      </div>
    </div>
  );

  if (view === 'teacher') return (
    <div className="h-screen w-screen bg-slate-100 p-4 font-sans overflow-hidden">
      <div className="w-full h-full max-w-[98vw] mx-auto flex flex-col">
        <div className="flex justify-between items-center mb-4 bg-white p-6 rounded-3xl shadow-sm shrink-0">
          <h2 className="text-3xl font-black text-indigo-700 flex items-center gap-3"><BarChart3 size={32}/> 實時監察 (Live Monitor)</h2>
          <div className="flex gap-4">
            {/* RESET BUTTON */}
            <button onClick={handleResetAll} className="flex items-center gap-2 bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold hover:bg-red-200 transition-colors">
              <RotateCcw size={20}/> 重設所有分數
            </button>
            <button onClick={() => setView('home')} className="bg-slate-100 p-3 rounded-xl text-slate-500 hover:bg-slate-200"><LogOut/></button>
          </div>
        </div>
        <div className="flex-grow grid grid-cols-4 gap-6 overflow-hidden">
          {['3A','3B','3C','3D'].map(cls => (
            <div key={cls} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
              <h3 className="font-black text-2xl text-slate-700 mb-4 border-b pb-4 text-center">{cls}</h3>
              <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {liveData.filter(d => d.class === cls).map(s => (
                  <div key={s.id} className={`p-3 rounded-xl border-2 flex justify-between items-center ${s.redeemed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}`}>
                    <div>
                      <span className="font-bold text-md block">{s.name}</span>
                      <span className="text-xs text-slate-400 font-bold">{s.status === 'playing' ? '🔥 Playing' : (s.redeemed ? '✅ Done' : '⭕ Waiting')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId === s.id ? (
                        <div className="flex gap-2">
                          <input type="number" className="w-16 border rounded p-1 text-center font-bold" value={editScoreVal} onChange={e => setEditScoreVal(e.target.value)} />
                          <button onClick={() => saveEdit(s.id)}><Save size={20} className="text-blue-600"/></button>
                        </div>
                      ) : (
                        <>
                          <span className="font-black text-xl text-indigo-600">{s.score}</span>
                          <button onClick={() => { setEditingId(s.id); setEditScoreVal(s.score); }}><Edit size={16} className="text-slate-300 hover:text-indigo-500"/></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return <div>Loading...</div>;
};

export default App;