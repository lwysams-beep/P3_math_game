// @ts-nocheck
// P.3 理財數學王 v4.0
// Version: 4.0 (Initial React Setup)
// Date: 2026-01-14
// Note: Core Logic ported from v3.0, UI updated to Tailwind
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import { 
  Trophy, User, Coins, ArrowLeft, CheckCircle2, XCircle, 
  Calculator, Store, Wallet, Lock, Settings, LogOut, 
  Languages, BarChart3, Search, Play, Timer, Save, Edit, RefreshCw, AlertTriangle
} from 'lucide-react';

// --- 1. Firebase Configuration (Fix applied) ---
// 優先使用環境變數 __firebase_config 以確保在預覽環境能運作 (解決 Permissions Error)
// 如果環境變數不存在（例如在您自己的伺服器），則使用您提供的配置
const userFirebaseConfig = {
  apiKey: "AIzaSyA2jtWJjlJ7Bnyfkw2oQQar210zHxsX6k0",
  authDomain: "p3-math-game.firebaseapp.com",
  projectId: "p3-math-game",
  storageBucket: "p3-math-game.firebasestorage.app",
  messagingSenderId: "330710509952",
  appId: "1:330710509952:web:99966ad83282621c497965"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : userFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'p3-math-finance-v4-accum'; 

// --- 2. Constants ---
const TEACHER_PWD = "26754411!";
const NET_PWD = "english_please";
const GAME_DURATION = 300; // 5 Minutes (300s)

const SHOPS = [
  { id: 'A', name_zh: 'A店 (快樂找換)', name_en: 'Shop A (Happy Exchange)', rate: 2, color: 'bg-emerald-600' },
  { id: 'B', name_zh: 'B店 (幸運找換)', name_en: 'Shop B (Lucky Exchange)', rate: 3, color: 'bg-blue-600' },
  { id: 'C', name_zh: 'C店 (VIP找換)',   name_en: 'Shop C (VIP Exchange)',   rate: 5, color: 'bg-purple-600' }
];

// --- 3. Smart Question Generator (Dynamic) ---
const generateQuestion = (difficulty) => {
  const types = ['mul', 'div', 'app', 'logic'];
  // Weighting: High difficulty has more logic/mul questions
  const type = types[Math.floor(Math.random() * (difficulty === 'high' ? 4 : 3))]; 
  
  let q = "", a = 0, score = 0, penalty = 0;

  // --- LOW (Score: 5, Penalty: -2) ---
  if (difficulty === 'low') {
    score = 5; penalty = 2;
    if (type === 'mul') {
      const n1 = Math.floor(Math.random() * 80) + 10; // 10-89
      const n2 = Math.floor(Math.random() * 8) + 2;   // 2-9
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
  } 
  // --- MID (Score: 10, Penalty: -5) ---
  else if (difficulty === 'mid') {
    score = 10; penalty = 5;
    if (type === 'mul') {
      const n1 = Math.floor(Math.random() * 300) + 100; // 100-399
      const n2 = Math.floor(Math.random() * 8) + 2;
      q = `${n1} × ${n2} = ?`;
      a = n1 * n2;
    } else if (type === 'div') {
      // 簡單應用: 平均分
      const ans = Math.floor(Math.random() * 20) + 10;
      const n2 = Math.floor(Math.random() * 6) + 3;
      q = `將 ${ans * n2} 粒糖果平均分給 ${n2} 人，每人得多少粒？`;
      a = ans;
    } else {
      // 估算 (Multiply-1.pdf)
      const n1 = Math.floor(Math.random() * 10) + 80; // 80-89
      const n2 = Math.floor(Math.random() * 3) + 7;   // 7-9
      q = `估算：${n1} × ${n2} 的結果約是多少？(取百位整數)`;
      a = Math.round((n1 * n2) / 100) * 100;
    }
  } 
  // --- HIGH (Score: 20, Penalty: -10) ---
  else {
    score = 20; penalty = 10;
    if (type === 'mul') {
      // 連乘 A x B x C (Multiply-3-1.pdf)
      const n1 = Math.floor(Math.random() * 5) + 2;
      const n2 = Math.floor(Math.random() * 20) + 10;
      const n3 = Math.floor(Math.random() * 5) + 2;
      q = `${n1} × ${n2} × ${n3} = ?`;
      a = n1 * n2 * n3;
    } else if (type === 'logic') {
      // 邏輯 (Multiply-2.pdf)
      q = "用 5, 4, 0 組成最大的三位單數，再乘以 3，結果是？";
      // Max Odd with 5,4,0 is 405 (ends in 5)
      a = 405 * 3; 
    } else {
      // 複雜應用
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
  const [strikes, setStrikes] = useState(0); // Track wrong attempts per question
  const [sessionScore, setSessionScore] = useState(0); // Score for this session
  const [totalAccumulatedScore, setTotalAccumulatedScore] = useState(0); // From DB

  // Teacher State
  const [teacherPwd, setTeacherPwd] = useState('');
  const [liveData, setLiveData] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editScoreVal, setEditScoreVal] = useState('');

  // NET State
  const [netPwd, setNetPwd] = useState('');
  const [netSearch, setNetSearch] = useState('');
  const [netStudent, setNetStudent] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);

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

  // Auth: Use Anonymous Sign-In ONLY (Robust)
  useEffect(() => {
    const init = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Failed:", err);
      }
      setLoading(false);
    };
    init();
    return onAuthStateChanged(auth, setUser);
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

  // Teacher Monitor
  useEffect(() => {
    if (!user || view !== 'teacher') return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'scores');
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiveData(data.sort((a, b) => b.score - a.score));
    });
    return () => unsub();
  }, [user, view]);

  // --- Logic ---

  const startGame = async () => {
    if (!user || !currentStudent) return; // Guard
    setGameActive(true);
    setSessionScore(0);
    setStrikes(0);
    setTimeLeft(GAME_DURATION);
    setCurrentQuestion(generateQuestion(difficulty));
    
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
        score: prevScore, // Keep existing score
        redeemed: snap.exists() ? snap.data().redeemed : false,
        timestamp: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Start Game Error:", e);
    }
  };

  const submitAnswer = (e) => {
    e.preventDefault();
    if (!gameActive) return;
    const correct = parseFloat(answer) === currentQuestion.a;
    
    if (correct) {
      // Correct!
      const gained = currentQuestion.score;
      setSessionScore(s => s + gained);
      setTotalAccumulatedScore(s => s + gained); 
      setFeedback({ ok: true, msg: `答對了！+${gained} 分` });
      
      if(user && currentStudent) {
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', currentStudent.id), { 
          score: increment(gained) 
        });
      }
      
      setTimeout(() => {
        setFeedback(null);
        setAnswer('');
        setStrikes(0);
        setCurrentQuestion(generateQuestion(difficulty));
      }, 800);

    } else {
      // Wrong!
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);

      if (newStrikes < 3) {
        setFeedback({ ok: false, msg: `答錯了！還有 ${3 - newStrikes} 次機會` });
        setAnswer(''); 
        setTimeout(() => setFeedback(null), 1000);
      } else {
        // 3 Strikes: Penalty
        const penalty = currentQuestion.penalty;
        setSessionScore(s => s - penalty); 
        setTotalAccumulatedScore(s => Math.max(0, s - penalty));
        setFeedback({ ok: false, msg: `3次錯誤！扣 ${penalty} 分。答案是 ${currentQuestion.a}` });
        
        if(user && currentStudent) {
          updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', currentStudent.id), { 
            score: increment(-penalty) 
          });
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
    if(user && currentStudent) {
      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', currentStudent.id), { status: 'finished' });
    }
  };

  const redeem = async () => {
    if(!netStudent) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', netStudent.id), { redeemed: true });
    setNetStudent(prev => ({...prev, redeemed: true}));
    setSelectedShop(null);
  };

  const saveEdit = async (id) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', id), { score: parseInt(editScoreVal) });
    setEditingId(null);
  };

  // --- Render ---

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (view === 'home') return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center space-y-8 p-4">
      <div className="text-center">
        <Coins size={80} className="text-orange-500 mx-auto animate-bounce mb-4"/>
        <h1 className="text-5xl font-black text-slate-800">P.3 理財數學王 v4.0</h1>
        <p className="text-xl text-slate-500 font-bold">5分鐘限時挑戰 • 累積財富</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <button onClick={() => setView('student')} className="p-8 bg-white rounded-3xl shadow-xl border-b-8 border-orange-200 hover:scale-105 transition-all text-center group">
          <User size={48} className="mx-auto text-orange-500 mb-2 group-hover:scale-110 transition-transform"/><h2 className="text-2xl font-black text-slate-700">我是學生</h2>
        </button>
        <button onClick={() => setView('teacher_login')} className="p-8 bg-white rounded-3xl shadow-xl border-b-8 border-indigo-200 hover:scale-105 transition-all text-center group">
          <BarChart3 size={48} className="mx-auto text-indigo-500 mb-2 group-hover:scale-110 transition-transform"/><h2 className="text-2xl font-black text-slate-700">我是老師</h2>
        </button>
        <button onClick={() => setView('net_login')} className="p-8 bg-white rounded-3xl shadow-xl border-b-8 border-purple-200 hover:scale-105 transition-all text-center group">
          <Languages size={48} className="mx-auto text-purple-500 mb-2 group-hover:scale-110 transition-transform"/><h2 className="text-2xl font-black text-slate-700">NET Teacher</h2>
        </button>
      </div>
    </div>
  );

  // Student
  if (view === 'student') return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-[2rem] shadow-xl overflow-hidden border-4 border-orange-100 min-h-[600px]">
        <div className="bg-orange-500 p-4 text-white flex justify-between items-center">
          <button onClick={() => setView('home')}><ArrowLeft/></button>
          <h2 className="font-bold">比賽專區</h2>
          <div className="w-6"></div>
        </div>
        <div className="p-6">
          {studentView === 'class_select' && (
            <div className="grid grid-cols-2 gap-4">
              {['3A','3B','3C','3D'].map(c => <button key={c} onClick={() => {setSelectedClass(c); setStudentView('name_select');}} className="py-8 bg-orange-50 hover:bg-orange-500 hover:text-white rounded-2xl text-3xl font-black border-2 border-orange-100">{c}</button>)}
            </div>
          )}
          {studentView === 'name_select' && (
            <div className="space-y-4">
              <button onClick={() => setStudentView('class_select')}>Back</button>
              <h3 className="text-2xl font-black">Select Name</h3>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {studentsByClass[selectedClass]?.map(s => <button key={s.id} onClick={() => {setCurrentStudent(s); setStudentView('difficulty');}} className="p-4 bg-slate-50 hover:bg-orange-100 rounded-xl text-left border font-bold">{s.name_zh}</button>)}
              </div>
            </div>
          )}
          {studentView === 'difficulty' && (
            <div className="space-y-4 text-center">
              <h3 className="text-2xl font-black">選擇挑戰難度</h3>
              <button onClick={() => {setDifficulty('low'); setStudentView('intro');}} className="w-full p-6 bg-green-100 border-2 border-green-300 rounded-2xl text-xl font-black text-green-800">
                初級 (Low)<br/><span className="text-sm font-bold">每題 5 分 (扣 2 分)</span>
              </button>
              <button onClick={() => {setDifficulty('mid'); setStudentView('intro');}} className="w-full p-6 bg-blue-100 border-2 border-blue-300 rounded-2xl text-xl font-black text-blue-800">
                中級 (Mid)<br/><span className="text-sm font-bold">每題 10 分 (扣 5 分)</span>
              </button>
              <button onClick={() => {setDifficulty('high'); setStudentView('intro');}} className="w-full p-6 bg-purple-100 border-2 border-purple-300 rounded-2xl text-xl font-black text-purple-800">
                高級 (High)<br/><span className="text-sm font-bold">每題 20 分 (扣 10 分)</span>
              </button>
            </div>
          )}
          {studentView === 'intro' && (
            <div className="text-center py-10 space-y-6">
              <h2 className="text-4xl font-black">Ready?</h2>
              <p className="text-xl font-bold">5 分鐘限時挑戰！<br/>答錯 3 次會扣分喔！</p>
              <button onClick={() => {setStudentView('play'); startGame();}} className="px-10 py-4 bg-orange-500 text-white rounded-full text-2xl font-black animate-pulse shadow-xl hover:scale-105 transition-transform"><Play fill="currentColor" className="inline mr-2"/> START</button>
            </div>
          )}
          {studentView === 'play' && currentQuestion && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-rose-600 font-black text-xl"><Timer/> {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
                <div className="flex items-center gap-2 text-orange-500 font-black text-xl"><Coins/> {totalAccumulatedScore}</div>
              </div>
              
              {/* Question Area */}
              <div className="bg-white border-4 border-slate-100 p-8 rounded-3xl min-h-[180px] flex flex-col items-center justify-center text-center relative">
                {strikes > 0 && <span className="absolute top-2 right-2 text-red-500 font-bold bg-red-100 px-2 rounded-lg text-xs">錯誤: {strikes}/3</span>}
                <p className="text-3xl font-bold text-slate-800">{currentQuestion.q}</p>
              </div>

              {feedback && <div className={`p-4 rounded-xl text-center font-black text-xl ${feedback.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{feedback.msg}</div>}
              
              <form onSubmit={submitAnswer} className="flex gap-2">
                <input type="number" autoFocus value={answer} onChange={e => setAnswer(e.target.value)} className="flex-1 p-4 rounded-2xl border-4 border-slate-200 text-3xl font-black text-center outline-none" />
                <button type="submit" className="bg-slate-800 text-white px-6 rounded-2xl font-black text-xl">GO</button>
              </form>
            </div>
          )}
          {studentView === 'result' && (
            <div className="text-center py-10 space-y-6 animate-in zoom-in">
              <Trophy size={80} className="text-yellow-400 mx-auto"/>
              <h2 className="text-4xl font-black">時間到！</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border">
                  <p className="text-xs text-slate-400 font-bold">本局得分</p>
                  <p className="text-3xl font-black text-slate-700">{sessionScore}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-200">
                  <p className="text-xs text-orange-400 font-bold">累積總分</p>
                  <p className="text-3xl font-black text-orange-600">{totalAccumulatedScore}</p>
                </div>
              </div>
              <p className="font-bold text-slate-400">Go to Exchange Shop!</p>
              <button onClick={() => setView('home')} className="text-slate-400 font-bold underline">Back Home</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // NET
  if (view === 'net_login') return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-4">
        <h2 className="text-2xl font-black">NET Login</h2>
        <input type="password" value={netPwd} onChange={e => setNetPwd(e.target.value)} className="w-full p-4 border rounded-xl text-center" placeholder="Password"/>
        <button onClick={() => { if(netPwd === NET_PWD) setView('net'); }} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold">Enter</button>
        <button onClick={() => setView('home')} className="text-slate-400">Back</button>
      </div>
    </div>
  );

  if (view === 'net') return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-xl mx-auto bg-white rounded-[2rem] shadow-xl border-b-8 border-purple-200 min-h-[800px]">
        <div className="bg-purple-600 p-6 text-white flex justify-between items-center">
          <h2 className="font-bold text-lg">NET Exchange</h2>
          <button onClick={() => setView('home')}><LogOut/></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <input type="text" value={netSearch} onChange={e => setNetSearch(e.target.value)} placeholder="Student Name" className="flex-1 p-3 border rounded-xl"/>
            <button onClick={() => {
              const found = allStudents.find(s => s.name_en.toLowerCase().includes(netSearch.toLowerCase()) || s.name_zh === netSearch);
              if (found) {
                const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'scores', found.id), (doc) => {
                  if(doc.exists()) setNetStudent({ ...found, ...doc.data() });
                  else setNetStudent({ ...found, score: 0 });
                });
              } else alert('Not Found');
            }} className="bg-purple-600 text-white p-3 rounded-xl"><Search/></button>
          </div>
          {netStudent && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-2xl font-black text-slate-800">{netStudent.name_en}</p>
                    <p className="font-bold text-slate-400">{netStudent.class} {netStudent.name_zh}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-purple-400">COINS</p>
                    <p className="text-4xl font-black text-purple-600">{netStudent.score}</p>
                  </div>
                </div>
                {/* BIG CHECK MARK FOR REDEEMED */}
                {netStudent.redeemed && (
                  <div className="mt-4 flex flex-col items-center justify-center p-6 bg-green-100 rounded-3xl border-4 border-green-400 animate-pulse">
                    <CheckCircle2 size={80} className="text-green-600"/>
                    <span className="text-2xl font-black text-green-700 mt-2">ALREADY REDEEMED</span>
                  </div>
                )}
              </div>
              {!netStudent.redeemed && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-400 text-sm uppercase">Select Shop</h3>
                  {SHOPS.map(shop => (
                    <button key={shop.id} onClick={() => setSelectedShop(shop)} className={`w-full p-4 rounded-xl text-left text-white ${shop.color} font-bold flex justify-between`}>
                      <span>{shop.name_en}</span>
                      <span className="bg-white/20 px-2 rounded">x{shop.rate}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedShop && !netStudent.redeemed && (
                <div className="bg-slate-800 text-white p-6 rounded-3xl text-center space-y-4">
                  <p className="text-sm font-bold text-slate-400">TOTAL EXCHANGE (HKD)</p>
                  <p className="text-6xl font-black">${netStudent.score * selectedShop.rate}</p>
                  <button onClick={redeem} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold mt-2">CONFIRM REDEEM</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Teacher
  if (view === 'teacher_login') return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-4">
        <h2 className="text-2xl font-black">老師後台</h2>
        <input type="password" value={teacherPwd} onChange={e => setTeacherPwd(e.target.value)} className="w-full p-4 border rounded-xl text-center" placeholder="Password"/>
        <button onClick={() => { if(teacherPwd === TEACHER_PWD) setView('teacher'); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Login</button>
        <button onClick={() => setView('home')} className="text-slate-400">Back</button>
      </div>
    </div>
  );

  if (view === 'teacher') return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm">
          <h2 className="text-2xl font-black text-indigo-700 flex items-center gap-2"><BarChart3/> 實時監察</h2>
          <button onClick={() => setView('home')} className="bg-slate-100 p-2 rounded-lg text-slate-500"><LogOut/></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['3A','3B','3C','3D'].map(cls => (
            <div key={cls} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-black text-slate-700 mb-2 border-b pb-2">{cls}</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {liveData.filter(d => d.class === cls).map(s => (
                  <div key={s.id} className={`p-2 rounded-lg border flex justify-between items-center ${s.redeemed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}`}>
                    <div>
                      <span className="font-bold text-sm block">{s.name}</span>
                      <span className="text-[10px] text-slate-400">{s.status === 'playing' ? '進行中...' : (s.redeemed ? '已兌換' : '待兌換')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId === s.id ? (
                        <div className="flex gap-1">
                          <input type="number" className="w-12 border rounded text-center text-sm" value={editScoreVal} onChange={e => setEditScoreVal(e.target.value)} />
                          <button onClick={() => saveEdit(s.id)}><Save size={14} className="text-blue-600"/></button>
                        </div>
                      ) : (
                        <>
                          <span className="font-black text-indigo-600">{s.score}</span>
                          <button onClick={() => { setEditingId(s.id); setEditScoreVal(s.score); }}><Edit size={12} className="text-slate-300 hover:text-indigo-500"/></button>
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