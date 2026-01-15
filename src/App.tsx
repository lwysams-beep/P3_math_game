// @ts-nocheck
// P.3 理財數學王 v7.1 (PDF Curriculum Integration)
// Date: 2026-01-15
// Fixes: 
// 1. Integrated PDF concepts: Continuous Mul/Div (A x B x C), Packing, Saving, Multiples.
// 2. 80% Probability for PDF-based Mul/Div questions, 20% for old Add/Sub.
// 3. Low Difficulty: Simplified wording and smaller numbers.
// 4. Enhanced hints specific to new question types.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, serverTimestamp, increment, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { 
  Trophy, User, Coins, ArrowLeft, CheckCircle2, XCircle, 
  Calculator, Store, Wallet, Lock, Settings, LogOut, 
  Languages, BarChart3, Search, Play, Timer, Save, Edit, RefreshCw, AlertTriangle, Loader2, Wifi, WifiOff, CloudOff, RotateCcw, Check, Undo2, FileDown, History
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
const RESET_PWD = "61513110"; 
const GAME_DURATION = 300; 

const SHOPS = [
  { id: 'A', name_zh: 'A店 (快樂找換)', name_en: 'Shop A (Happy Exchange)', rate: 2, color: 'bg-emerald-600', lightColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700' },
  { id: 'B', name_zh: 'B店 (幸運找換)', name_en: 'Shop B (Lucky Exchange)', rate: 3, color: 'bg-blue-600', lightColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700' },
  { id: 'C', name_zh: 'C店 (VIP找換)',   name_en: 'Shop C (VIP Exchange)',   rate: 5, color: 'bg-purple-600', lightColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700' }
];

// --- 3. Smart Question Generator (v7.1 Logic) ---

const ITEMS_DB = [
  { name: '蘋果', unit: '個' }, { name: '橙', unit: '個' }, { name: '西瓜', unit: '個' },
  { name: '擦膠', unit: '塊' }, { name: '鉛筆', unit: '枝' }, { name: '原子筆', unit: '枝' },
  { name: '間尺', unit: '把' }, { name: '筆記簿', unit: '本' }, { name: '練習簿', unit: '本' },
  { name: '故事書', unit: '本' }, { name: '漫畫', unit: '本' }, { name: '圖畫紙', unit: '包' },
  { name: '三文治', unit: '件' }, { name: '漢堡包', unit: '個' }, { name: '熱狗', unit: '隻' },
  { name: '薯片', unit: '包' }, { name: '朱古力', unit: '排' }, { name: '糖果', unit: '包' },
  { name: '珍珠奶茶', unit: '杯' }, { name: '果汁', unit: '瓶' },
  { name: '玩具車', unit: '輛' }, { name: '公仔', unit: '個' }, { name: '機械人', unit: '個' },
  { name: '顏色筆', unit: '盒' }, { name: '貼紙', unit: '張' }, { name: '遊戲卡', unit: '包' }
];

const getRandomItem = () => ITEMS_DB[Math.floor(Math.random() * ITEMS_DB.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper: Get diverse numbers for A x B x C
const getFactors = (targetProduct) => {
    // Simplified factor finder for small numbers
    for(let i=2; i<9; i++) {
        if (targetProduct % i === 0) {
            const rem = targetProduct / i;
            for(let j=2; j<9; j++) {
                if (rem % j === 0) return [i, j, rem/j];
            }
        }
    }
    return [2, 2, Math.floor(targetProduct/4)];
};

const generateQuestion = (difficulty, questionIndex, lastQSignature, lastType) => {
  let q = "", a = 0, score = 0, penalty = 0, hint = "", category = "";
  let signature = "";
  let subType = "";
  let attempts = 0;

  // Rule: High difficulty is 100% Word Problems
  // Low/Mid: 2 Calc, 1 App (or random based on PDF logic)
  // New Rule v7.1: 80% PDF types (Mul/Div), 20% Add/Sub
  
  do {
    attempts++;
    const isPdfType = Math.random() < 0.8; 
    const isApp = (difficulty === 'high') || (questionIndex % 3 === 0);

    // ==========================================
    // 80% CHANCE: PDF TOPICS (Mul / Div)
    // ==========================================
    if (isPdfType) {
        category = Math.random() < 0.5 ? 'mul' : 'div';
        
        // --- MULTIPLICATION (PDF Based) ---
        if (category === 'mul') {
            const pattern = Math.random();
            
            // Pattern 1: Continuous Multiplication (A x B x C) (From 乘1.pdf)
            if (pattern < 0.3 && !isApp) {
                let n1, n2, n3;
                if (difficulty === 'low') {
                    n1 = randomInt(2, 5); n2 = randomInt(2, 4); n3 = randomInt(2, 3);
                    hint = `連乘法：先算 ${n1} × ${n2}，答案再乘 ${n3}。`;
                } else {
                    n1 = randomInt(4, 9); n2 = randomInt(2, 8); n3 = randomInt(2, 5);
                    hint = `連乘法：由左至右計算。`;
                }
                q = `${n1} × ${n2} × ${n3} = ?`;
                a = n1 * n2 * n3;
                subType = 'pdf_mul_cont';
                signature = `pmc-${n1}-${n2}-${n3}`;
            } 
            
            // Pattern 2: 2/3 Digit x 1 Digit (From 乘3.pdf)
            else if (pattern < 0.6 && !isApp) {
                let n1, n2;
                if (difficulty === 'low') {
                    n1 = randomInt(12, 35); n2 = randomInt(2, 5); // Simpler
                    hint = `直式乘法：先乘個位。`;
                } else if (difficulty === 'mid') {
                    n1 = randomInt(36, 99); n2 = randomInt(3, 9);
                    hint = `直式乘法：注意進位。`;
                } else {
                     n1 = randomInt(120, 450); n2 = randomInt(3, 8);
                     hint = `三位數乘法：個、十、百位逐一計算。`;
                }
                q = `${n1} × ${n2} = ?`;
                a = n1 * n2;
                subType = 'pdf_mul_std';
                signature = `pms-${n1}-${n2}`;
            }

            // Pattern 3: Word Problems (Multiples / Total) (From 乘2.pdf)
            else {
                const item = getRandomItem();
                if (difficulty === 'low') {
                    // Simple wording for Low
                    const count = randomInt(2, 5);
                    const price = randomInt(10, 20);
                    q = `每${item.unit} $${price}，買 ${count} ${item.unit}共多少元？`;
                    a = price * count;
                    hint = `單價 × 數量 = 總價。`;
                } else if (Math.random() < 0.5) {
                    // Capacity / Multiples Logic (From 乘2.pdf)
                    const smallCap = randomInt(20, 80);
                    const factor = randomInt(3, 6);
                    q = `A 廳可容納 ${smallCap} 人，B 廳可容納的人數是 A 廳的 ${factor} 倍。B 廳可容納多少人？`;
                    a = smallCap * factor;
                    hint = `關鍵字「${factor} 倍」，用乘法。`;
                } else {
                    // Regular Shopping
                    const count = randomInt(4, 9);
                    const price = randomInt(25, 150);
                    q = `學校訂購 ${count} ${item.unit}${item.name}，每${item.unit} $${price}，共需付多少元？`;
                    a = price * count;
                    hint = `單價($${price}) × 數量(${count})。`;
                }
                subType = 'pdf_mul_app';
                signature = `pma-${a}`;
            }
        } 
        
        // --- DIVISION (PDF Based) ---
        else {
            const pattern = Math.random();

            // Pattern 1: Continuous Division (A / B / C) (From 除1.pdf, 除2.pdf)
            if (pattern < 0.3 && !isApp) {
                let n1, n2, dividend;
                if (difficulty === 'low') {
                    n1 = 2; n2 = 2; dividend = randomInt(3, 8) * 4; // e.g. 20 / 2 / 2
                } else {
                    n1 = randomInt(2, 6); n2 = randomInt(2, 6);
                    const final = randomInt(5, 20);
                    dividend = final * n1 * n2;
                }
                q = `${dividend} ÷ ${n1} ÷ ${n2} = ?`;
                a = dividend / n1 / n2;
                hint = `連除法：先算 ${dividend} ÷ ${n1}，答案再除以 ${n2}。`;
                subType = 'pdf_div_cont';
                signature = `pdc-${dividend}-${n1}-${n2}`;
            }

            // Pattern 2: Standard Division (2d/3d by 1d) (From 除3.pdf)
            else if (pattern < 0.6 && !isApp) {
                let divisor, quotient, dividend;
                if (difficulty === 'low') {
                    divisor = randomInt(2, 5);
                    quotient = randomInt(11, 19); // Ensure 2 digit answer, but small
                } else {
                    divisor = randomInt(3, 9);
                    quotient = randomInt(12, 120); // Can be 3-digit dividend
                }
                dividend = divisor * quotient;
                
                // Filter out simple ones like 55/5 if Mid/High
                if (difficulty !== 'low' && quotient % 11 === 0) continue;

                q = `${dividend} ÷ ${divisor} = ?`;
                a = quotient;
                hint = `試用直式除法。先看最高位夠不夠除。`;
                subType = 'pdf_div_std';
                signature = `pds-${dividend}-${divisor}`;
            }

            // Pattern 3: Word Problems (Packing / Leftovers) (From 除4.pdf, 除5.pdf)
            else {
                const item = getRandomItem();
                if (difficulty === 'low') {
                    // Simple wording
                    const total = randomInt(20, 50);
                    const perGroup = randomInt(2, 5);
                    const realTotal = total - (total % perGroup); // Make exact
                    q = `有 ${realTotal} ${item.unit}${item.name}，每 ${perGroup} ${item.unit}放一袋，可放多少袋？`;
                    a = realTotal / perGroup;
                    hint = `總數 ÷ 每袋數量 = 袋數。`;
                } else if (Math.random() < 0.5) {
                    // Leftover Logic (Remainder asked but input assumes handling)
                    // Note: Game only accepts single number input, so asking for Quotient typically
                    const total = randomInt(100, 500);
                    const pack = randomInt(4, 9);
                    const leftover = total % pack;
                    const realTotal = total - leftover; // We ask for full packs
                    q = `有 ${realTotal} ${item.unit}${item.name}，每 ${pack} ${item.unit}包裝成一盒，共可包裝成多少盒？`;
                    a = realTotal / pack;
                    hint = `用除法計算。`;
                } else {
                    // Sharing
                    const totalMoney = randomInt(20, 80) * 10;
                    const people = randomInt(3, 8);
                    const realMoney = totalMoney - (totalMoney % people);
                    q = `將 $${realMoney} 平均分給 ${people} 人，每人得多少元？`;
                    a = realMoney / people;
                    hint = `「平均分」就是除法。`;
                }
                subType = 'pdf_div_app';
                signature = `pda-${a}`;
            }
        }
    } 
    
    // ==========================================
    // 20% CHANCE: OLD ADD/SUB (Context Variety)
    // ==========================================
    else {
        const op = Math.random() < 0.5 ? 'add' : 'sub';
        category = op;
        
        if (!isAppTurn) {
             if (op === 'add') {
                const n1 = randomInt(1000, 4000); const n2 = randomInt(1000, 3000);
                q = `${n1} + ${n2} = ?`; a = n1 + n2; hint = "四位數加法：留意進位。";
             } else {
                const n1 = randomInt(2000, 8000); const n2 = randomInt(1000, n1-500);
                q = `${n1} - ${n2} = ?`; a = n1 - n2; hint = "四位數減法：留意借位。";
             }
             subType = 'calc_old';
             signature = `old-${a}`;
        } else {
             // 4-Digit Apps
             const n1 = randomInt(1200, 4500); const n2 = randomInt(1000, 3000);
             if (op === 'add') {
                 q = `上午有 ${n1} 人，下午有 ${n2} 人，全日共有多少人？`;
                 a = n1 + n2;
                 hint = "求總數用加法。";
             } else {
                 const total = n1 + n2;
                 q = `倉庫有 ${total} 公斤米，運走了 ${n2} 公斤，還剩下多少？`;
                 a = n1;
                 hint = "求剩下用減法。";
             }
             subType = 'app_old';
             signature = `old-app-${a}`;
        }
    }

    if (difficulty === 'low') { score = 5; penalty = 2; }
    else if (difficulty === 'mid') { score = 10; penalty = 5; }
    else { score = 20; penalty = 10; }

  } while (signature === lastQSignature && attempts < 10); 

  return { q, a, score, penalty, difficulty, hint, category, signature, subType };
};

// CSV Data (Placeholder - User will paste their own)
const RAW_CSV_DATA = `學生註冊編號,學年,級別,班別代碼,班號,學生編號,英文姓名,中文姓名
W23083,2025,P3,3A,1,S9014979,CHAN SHEUNG KI,陳尚頎
W23126,2025,P3,3A,2,S9198301,CHU HOI TUNG,朱凱彤
W23084,2025,P3,3A,3,S9089944,CHUNG CHEUK LAM,鍾焯琳
W23005,2025,P3,3A,4,S9024095,HAN JIAYING,韓佳穎
W23024,2025,P3,3A,5,S9018699,HO CHEUK HIM,何卓謙
W23007,2025,P3,3A,6,S9055810,KWOK SUM YU,郭芯妤
W23010,2025,P3,3A,7,S9034260,LAM HEI MAN,林希蔓
W23030,2025,P3,3A,8,S8979113,LAU PAK YIN,劉柏言
W23011,2025,P3,3A,9,S9037464,LAU HIU YAU,劉曉悠
W23013,2025,P3,3A,10,S9034503,LEE CHEUK NAM,李卓楠
W23014,2025,P3,3A,11,S9030001,LEUNG TSZ CHING,梁梓晴
W23012,2025,P3,3A,12,S9035119,LI KA LAM,李佳琳
W23061,2025,P3,3A,13,S9150198,LUNG KA HAI,龍嘉熙
W23063,2025,P3,3A,14,S8986527,MAN PAK HEI,文柏曦
W23017,2025,P3,3A,15,S9034872,NG YUE FEI,吳雨霏
W23145,2025,P3,3A,16,S9356349,POON HO HIN,潘浩軒
W23046,2025,P3,3A,17,S8991444,SHAM CHEUK FUNG,岑卓峰
W23018,2025,P3,3A,18,S9027981,TAI KA HEI,戴嘉希
W23047,2025,P3,3A,19,S9047214,TAM KA YING,譚嘉瑩
W23019,2025,P3,3A,20,S9014529,TO CHEUK WING,杜卓穎
W23020,2025,P3,3A,21,S9034376,WONG TSZ YAU,王梓悠
W23050,2025,P3,3A,22,S8977536,WONG CHUN HEI,黃俊熙
W23149,2025,P3,3A,23,S9369068,WONG NGA LAM,黃雅琳
W23021,2025,P3,3A,24,S9024044,YEUNG TSZ YUET,楊子悅
W23022,2025,P3,3A,25,S9024036,ZHOU HAOYU,周浩宇
W23086,2025,P3,3B,1,S9043324,CHAU YUK KIU,周鈺翹
W23025,2025,P3,3B,2,S9042263,CHENG KA SHING,鄭嘉誠
W23088,2025,P3,3B,3,S9050071,CHEUNG YIN TING,張賢廷
W23004,2025,P3,3B,4,S9044959,FONG MAN HEI,方雯晞
W23091,2025,P3,3B,5,S9034228,HO YU KI,何宇淇
W23093,2025,P3,3B,6,S9065360,KO KWAN NGAI,高鈞毅
W23008,2025,P3,3B,7,S9029968,KWOK TSZ YING,郭梓盈
W23094,2025,P3,3B,8,S9061004,LAM YUET NAM,林悅楠
W23032,2025,P3,3B,9,S9014499,LAU YAN TUNG,劉恩彤
W23034,2025,P3,3B,10,S9011708,LEE CHUN YIN,李俊賢
W23036,2025,P3,3B,11,S9024079,LEUNG CHUN SING,梁振聲
W23038,2025,P3,3B,12,S9029933,LEUNG KA KI,梁嘉麒
W23015,2025,P3,3B,13,S9044932,LEUNG WING CHIN,梁詠展
W23041,2025,P3,3B,14,S8977528,LI SUM YAU,李芯悠
W23099,2025,P3,3B,15,S9035089,LIU CHAK TO,廖澤滔
W23062,2025,P3,3B,16,S9148452,LUI HOI YAU,雷凱悠
W23102,2025,P3,3B,17,S9034295,MAN CHAK SING,文澤承
W23016,2025,P3,3B,18,S9044398,NG KA YEE,吳嘉怡
W23067,2025,P3,3B,19,S9044436,PANG CHIT LONG,彭哲朗
W23103,2025,P3,3B,20,S9044355,SIU TSZ KI,蕭芷淇
W23048,2025,P3,3B,21,S9011686,TSANG CHUN HEI,曾進希
W23049,2025,P3,3B,22,S9042212,WAN PAK KIU,溫柏翹
W23105,2025,P3,3B,23,S9042271,WONG HO TIN,黃浩天
W23106,2025,P3,3B,24,S9037499,WONG YAN TING,黃欣婷
W23107,2025,P3,3B,25,S9037480,XIE TSZ LAM,謝芷琳
W23026,2025,P3,3C,1,S9018656,CHAN CHUN YIN,陳俊賢
W23121,2025,P3,3C,2,S9205103,CHENG SUM YUET,鄭心悅
W23028,2025,P3,3C,3,S9014561,CHIU CHUN KIT,趙俊傑
W23090,2025,P3,3C,4,S9044991,FAN CHEUK KAN,范卓勤
W23006,2025,P3,3C,5,S9044924,IP TIN LONG,葉天朗
W23131,2025,P3,3C,6,S9221168,KEUNG YAN TUNG,姜欣彤
W23132,2025,P3,3C,7,S9231457,KWOK KWAN LAM,郭君臨
W23009,2025,P3,3C,8,S9029951,KWONG TSZ KIU,鄺芷蕎
W23031,2025,P3,3C,9,S9014545,LAU TIN LONG,劉天朗
W23033,2025,P3,3C,10,S9011708,LAW CHUN CHING,羅俊政
W23035,2025,P3,3C,11,S9024087,LEE HOI CHING,李海晴
W23037,2025,P3,3C,12,S9029941,LEE TSZ LAM,李芷琳
W23039,2025,P3,3C,13,S9035097,LI CHEUK HEI,李卓熹
W23040,2025,P3,3C,14,S8977501,LIU TSZ CHUNG,廖梓聰
W23137,2025,P3,3C,15,S9255011,LUK CHI YEUNG,陸志揚
W23043,2025,P3,3C,16,S8986519,MA SHU SUM,馬樹森
W23044,2025,P3,3C,17,S8987760,MAK KA PO,麥嘉寶
W23045,2025,P3,3C,18,S8987779,MIAO HO FUNG,繆浩峰
W23138,2025,P3,3C,19,S9255021,MUI TSZ TO,梅子滔
W23066,2025,P3,3C,20,S9037430,NGAN WING KEI,顏詠琪
W23143,2025,P3,3C,21,S9318854,SIN CHEUK LAM,冼卓琳
W23051,2025,P3,3C,22,S8979148,WONG HEI NAM,黃希楠
W23052,2025,P3,3C,23,S8979130,WONG HIU YAN,黃曉欣
W23108,2025,P3,3C,24,S9043286,YU CHUN HEI,余俊希
W23109,2025,P3,3C,25,S9043294,ZHAO YAN LONG,趙言朗
W23110,2025,P3,3D,1,S9042220,AU-YEUNG SUM YUET,歐陽心悅
W23001,2025,P3,3D,2,S9018672,CHAN CHUN HO,陳俊豪
W23002,2025,P3,3D,3,S9024052,CHAN CHUN HEI,陳俊熙
W23085,2025,P3,3D,4,S9029984,CHAN HEI NGAI,陳希毅
W23111,2025,P3,3D,5,S9037449,CHAN HEI WING,陳晞穎
W23027,2025,P3,3D,6,S9014537,CHEN JIAYING,陳嘉盈
W23122,2025,P3,3D,7,S9205111,CHENG TAI MING,鄭泰明
W23124,2025,P3,3D,8,S9198328,CHEUNG KWAN TO,張鈞陶
W23003,2025,P3,3D,9,S9014510,CHOW KA KEI,周嘉琪
W23089,2025,P3,3D,10,S9043308,CHOW SZE CHAI,周斯齊
W23127,2025,P3,3D,11,S9205146,CHU CHI HIN,朱智軒
W23092,2025,P3,3D,12,S9034899,HU YUANQI,胡圓棋
W23095,2025,P3,3D,13,S9018664,LAM CHAK HANG,林澤衡
W23096,2025,P3,3D,14,S9043316,LAM HOI LAM,林鎧琳
W23029,2025,P3,3D,15,S8979105,LAU CHUN YIN,劉俊言
W23097,2025,P3,3D,16,S9065352,LEE CHING HEI,李政熙
W23098,2025,P3,3D,17,S9044940,LEUNG WAI HIN,梁偉軒
W23101,2025,P3,3D,18,S9034252,LI KA LOK,李嘉樂
W23071,2025,P3,3D,19,S8987728,MAN HEI YUI,文希睿
W23023,2025,P3,3D,20,41903298,MARK HO LAM,麥可琳
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
  const [questionCount, setQuestionCount] = useState(0); 
  const [lastQSignature, setLastQSignature] = useState(''); 
  const [lastQuestionType, setLastQuestionType] = useState('');
   
  // Game State
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [shake, setShake] = useState(false); 
  const [gameActive, setGameActive] = useState(false);
  const [strikes, setStrikes] = useState(0); 
  const [sessionScore, setSessionScore] = useState(0); 
  const [totalAccumulatedScore, setTotalAccumulatedScore] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0); 

  // Teacher State
  const [teacherPwd, setTeacherPwd] = useState('');
  const [liveData, setLiveData] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editScoreVal, setEditScoreVal] = useState('');

  // NET State
  const [netPwd, setNetPwd] = useState('');
  const [selectedShop, setSelectedShop] = useState(null); 

  // Data Parsing
  const allStudents = useMemo(() => {
    const lines = RAW_CSV_DATA.trim().split('\n').slice(1);
    return lines.map(line => {
      const p = line.split(',');
      if (p.length < 8) return null; 

      const cls = p[3]?.trim();     
      const num = parseInt(p[4]?.trim()); 
      const name_zh = p[7]?.trim(); 
      const name_en = p[6]?.trim(); 

      if (!cls || !name_zh) return null;

      return { 
        class: cls, 
        number: num, 
        name_zh: name_zh, 
        name_en: name_en, 
        id: `${cls}_${num}` 
      };
    }).filter(Boolean); 
  }, []);

  const studentsByClass = useMemo(() => {
    const map = { '3A': [], '3B': [], '3C': [], '3D': [] };
    allStudents.forEach(s => { 
      if(map[s.class]) map[s.class].push(s); 
    });
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => a.number - b.number);
    });
    return map;
  }, [allStudents]);

  // Styles for Shake Animation
  const shakeStyle = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
      20%, 40%, 60%, 80% { transform: translateX(10px); }
    }
    .animate-shake {
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
      border-color: #ef4444 !important; /* Red border */
      background-color: #fef2f2 !important; /* Red bg */
    }
  `;

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

  // Unified Live Monitor
  useEffect(() => {
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
  
  const handleBackToHome = () => {
    setStudentView('class_select');
    setCurrentStudent(null);
    setSessionScore(0);
    setTotalAccumulatedScore(0);
    setSessionCorrect(0);
    setSessionWrong(0);
    setStrikes(0);
    setCurrentQuestion(null);
    setIsStarting(false);
    setLastQuestionType('');
    setView('home');
  };

  const handlePlayAgain = () => {
    setSessionScore(0);
    setSessionCorrect(0);
    setSessionWrong(0);
    setStrikes(0);
    setCurrentQuestion(null);
    setIsStarting(false);
    setLastQuestionType('');
    setStudentView('difficulty'); 
  };

  const startGame = async () => {
    if (!currentStudent) {
      alert("請先選擇學生 (Please select a student)");
      return;
    }

    setIsStarting(true);
    
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
    setSessionCorrect(0); 
    setSessionWrong(0);
    setStrikes(0);
    setTimeLeft(GAME_DURATION);
    setQuestionCount(0);
    
    const q = generateQuestion(difficulty, 1, '', '');
    setCurrentQuestion(q);
    setLastQSignature(q.signature);
    setLastQuestionType(q.subType);
    
    if (!isOffline && user) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'scores', currentStudent.id);
      try {
        const snap = await getDoc(docRef);
        let prevScore = 0;
        let prevCorrect = 0;
        let prevWrong = 0;
        if (snap.exists()) {
          prevScore = snap.data().score || 0;
          prevCorrect = snap.data().correctCount || 0;
          prevWrong = snap.data().wrongCount || 0;
        }
        setTotalAccumulatedScore(prevScore); 
        setSessionCorrect(prevCorrect);
        setSessionWrong(prevWrong);

        await setDoc(docRef, {
          name: currentStudent.name_zh,
          name_en: currentStudent.name_en,
          class: currentStudent.class,
          number: currentStudent.number,
          status: 'playing',
          score: prevScore,
          correctCount: prevCorrect,
          wrongCount: prevWrong,
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
      setSessionCorrect(s => s + 1);
      setFeedback({ ok: true, msg: `答對了！+${gained} 分` });
      
      if(!offlineMode && user && currentStudent) {
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', currentStudent.id), { 
          score: increment(gained),
          correctCount: increment(1)
        }).catch(() => setOfflineMode(true));
      }
      
      setTimeout(() => {
        setFeedback(null);
        setAnswer('');
        setStrikes(0);
        
        const nextCount = questionCount + 1;
        setQuestionCount(nextCount);
        const q = generateQuestion(difficulty, nextCount + 1, lastQSignature, lastQuestionType);
        setCurrentQuestion(q);
        setLastQSignature(q.signature);
        setLastQuestionType(q.subType);

      }, 800);

    } else {
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);
      setShake(true);
      setTimeout(() => setShake(false), 500);

      if (newStrikes < 3) {
        setFeedback({ 
          ok: false, 
          msg: `答錯了！${currentQuestion.hint} (還有 ${3 - newStrikes} 次機會)` 
        });
        setAnswer(''); 
      } else {
        const penalty = currentQuestion.penalty;
        setSessionScore(s => s - penalty); 
        setTotalAccumulatedScore(s => Math.max(0, s - penalty));
        setSessionWrong(s => s + 1);
        setFeedback({ ok: false, msg: `3次錯誤！扣 ${penalty} 分。答案是 ${currentQuestion.a}` });
        
        if(!offlineMode && user && currentStudent) {
          const errField = `errors.${currentQuestion.category}`;
          updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', currentStudent.id), { 
            score: increment(-penalty),
            wrongCount: increment(1),
            [errField]: increment(1)
          }).catch(() => setOfflineMode(true));
        }

        setTimeout(() => {
          setFeedback(null);
          setAnswer('');
          setStrikes(0);
          
          const nextCount = questionCount + 1;
          setQuestionCount(nextCount);
          const q = generateQuestion(difficulty, nextCount + 1, lastQSignature, lastQuestionType);
          setCurrentQuestion(q);
          setLastQSignature(q.signature);
          setLastQuestionType(q.subType);

        }, 2000); 
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

  const toggleRedeem = async (student, currentStatus) => {
    if(!user) return;
    if (currentStatus) {
      if (!confirm("⚠️ 確定要撤銷此兌換嗎？(Undo this redemption?)")) return;
    }

    try {
      const updateData = { redeemed: !currentStatus };
      if (!currentStatus && selectedShop) {
         const hkd = student.score * selectedShop.rate;
         const logMsg = `${student.name_en} exchanged $${hkd} HKD at ${selectedShop.name_en}`;
         updateData.lastLog = logMsg;
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', student.id), updateData);
    } catch(e) {
      alert("Action failed (Check connection)");
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

  const handleResetRedemptionsOnly = async () => {
    const pwd = prompt("請輸入重設密碼 (Enter Password to Reset All Redemptions):");
    if (pwd !== RESET_PWD) {
      alert("密碼錯誤 (Wrong Password)");
      return;
    }
    if(!confirm("⚠️ 注意 Warning ⚠️\n這將重置所有學生的「兌換狀態」為未兌換，分數保留不變！\n確定要執行嗎？")) return;

    try {
      const q = collection(db, 'artifacts', appId, 'public', 'data', 'scores');
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { 
          redeemed: false, 
          lastLog: '' 
        });
      });
      await batch.commit();
      alert("所有兌換狀態已重置 (All redemptions reset).");
    } catch (e) {
      alert("重置失敗 (Reset Failed): " + e.message);
    }
  };

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
          status: 'ready',
          correctCount: 0,
          wrongCount: 0,
          lastLog: '', 
          'errors.mul': 0,
          'errors.div': 0,
          'errors.app': 0,
          'errors.logic': 0
        });
      });
      await batch.commit();
      alert("所有分數及數據已重置 (All data reset).");
    } catch (e) {
      alert("重置失敗 (Reset Failed): " + e.message);
    }
  };

  const downloadCSV = () => {
    const headers = ["Class", "Number", "Name", "Score", "Correct", "Wrong", "Accuracy (%)", "Analysis"];
    const csvRows = [headers.join(",")];

    liveData.forEach(s => {
      const correct = s.correctCount || 0;
      const wrong = s.wrongCount || 0;
      const total = correct + wrong;
      const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : "0.0";
      
      let analysis = "表現均衡 (Balanced)";
      const errs = s.errors || {};
      const maxErr = Math.max(errs.mul || 0, errs.div || 0, errs.app || 0, errs.logic || 0);
      
      if (maxErr > 0) {
        if (maxErr === errs.app) analysis = "應用題需加強 (Weak in Word Problems)";
        else if (maxErr === errs.div) analysis = "除法運算需加強 (Weak in Division)";
        else if (maxErr === errs.mul) analysis = "乘法運算需加強 (Weak in Multiplication)";
        else if (maxErr === errs.logic) analysis = "邏輯思維需加強 (Weak in Logic)";
      }
      if (total === 0) analysis = "尚未開始 (Not Started)";

      const row = [
        s.class,
        s.number,
        s.name,
        s.score,
        correct,
        wrong,
        accuracy,
        analysis
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Math_Competition_Report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <style>{shakeStyle}</style>
      <ConnectionStatus/>
      <div className="text-center">
        <Coins size={80} className="text-orange-500 mx-auto animate-bounce mb-4"/>
        <h1 className="text-5xl font-black text-slate-800">P.3 理財數學王 v7.1</h1>
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

  if (view === 'student') return (
    <div className="h-screen w-screen bg-orange-50 p-4 overflow-hidden relative">
      <style>{shakeStyle}</style>
      <ConnectionStatus/>
      <div className="w-full h-full max-w-[98vw] mx-auto bg-white rounded-[2rem] shadow-xl overflow-hidden border-4 border-orange-100 flex flex-col">
        <div className="bg-orange-500 p-4 text-white flex justify-between items-center shrink-0">
          <button onClick={handleBackToHome}><ArrowLeft/></button>
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
                {studentsByClass[selectedClass]?.map(s => <button key={s.id} onClick={() => {setCurrentStudent(s); setStudentView('difficulty');}} className="p-4 bg-slate-50 hover:bg-orange-100 rounded-xl text-left border font-bold text-lg">{s.number}. {s.name_zh}</button>)}
              </div>
            </div>
          )}

          {studentView === 'difficulty' && (
            <div className="flex-grow flex flex-col justify-center items-center space-y-6">
              <h3 className="text-3xl font-black">選擇挑戰難度</h3>
              {/* Added Student Info */}
              {currentStudent && <p className="text-xl text-slate-500 font-bold">Student: {currentStudent.class} ({currentStudent.number}) {currentStudent.name_zh}</p>}
              
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
                    {currentStudent.class} ({currentStudent.number}) {currentStudent.name_zh}
                  </div>
                  {strikes > 0 && <span className="absolute top-4 right-4 text-red-500 font-bold bg-red-100 px-4 py-2 rounded-xl text-lg">錯誤: {strikes}/3</span>}
                  
                  {/* Question */}
                  <p className="text-4xl lg:text-6xl font-bold text-slate-800 text-center leading-tight px-4">{currentQuestion.q}</p>
                </div>

                <div className="w-1/3 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-rose-100 p-4 rounded-2xl flex flex-col items-center justify-center text-rose-700">
                      <Timer size={32} className="mb-1"/>
                      <span className="text-3xl font-black">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
                      <span className="text-xs font-bold">Time (時間)</span>
                    </div>
                    <div className="bg-orange-100 p-4 rounded-2xl flex flex-col items-center justify-center text-orange-700">
                      <Coins size={32} className="mb-1"/>
                      <span className="text-3xl font-black">{totalAccumulatedScore}</span>
                      <span className="text-xs font-bold">Total (累積)</span>
                    </div>
                  </div>

                  {/* NEW: Student Stats Display */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 p-2 rounded-xl flex items-center justify-center gap-2 text-green-700 border border-green-200">
                      <CheckCircle2 size={20}/>
                      <span className="font-black text-xl">{sessionCorrect}</span>
                    </div>
                    <div className="bg-red-50 p-2 rounded-xl flex items-center justify-center gap-2 text-red-700 border border-red-200">
                      <XCircle size={20}/>
                      <span className="font-black text-xl">{sessionWrong}</span>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center min-h-[80px]">
                     {feedback && <div className={`w-full p-4 rounded-2xl text-center font-black text-xl animate-bounce ${feedback.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{feedback.msg}</div>}
                  </div>

                  <form onSubmit={submitAnswer} className="flex flex-col gap-4">
                    <input 
                      type="number" 
                      autoFocus 
                      value={answer} 
                      onChange={e => setAnswer(e.target.value)} 
                      className={`w-full p-6 rounded-2xl border-4 text-5xl text-center font-black outline-none transition-all shadow-sm ${shake ? 'animate-shake border-red-400 bg-red-50' : 'border-slate-300 focus:border-orange-500'}`} 
                      placeholder="?"
                    />
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
              <button onClick={handlePlayAgain} className="px-16 py-6 bg-slate-800 text-white rounded-2xl font-black text-2xl hover:bg-black transition-colors shadow-lg flex items-center gap-3">
                <RotateCcw size={28}/> 再次挑戰 (Play Again)
              </button>
              <button onClick={handleBackToHome} className="text-slate-400 font-bold underline text-lg">完全登出 (Logout)</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
          <div className="flex gap-4">
             <button onClick={handleResetRedemptionsOnly} className="flex items-center gap-2 bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold hover:bg-red-200 transition-colors">
              <RotateCcw size={20}/> 重設所有兌換
            </button>
            <button onClick={() => setView('home')} className="bg-slate-100 p-3 rounded-xl text-slate-500 hover:bg-slate-200"><LogOut/></button>
          </div>
        </div>
        <div className="flex-grow grid grid-cols-4 gap-6 overflow-hidden">
          {['3A','3B','3C','3D'].map(cls => (
            <div key={cls} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
              <h3 className="font-black text-2xl text-slate-700 mb-4 border-b pb-4 text-center">{cls}</h3>
              <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {liveData.filter(d => d.class === cls).map(s => {
                  const hkd = s.score * selectedShop.rate;
                  return (
                    <div key={s.id} className={`p-3 rounded-xl border-2 flex flex-col gap-2 ${s.redeemed ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-slate-100'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-md block text-slate-800">{s.number}. {s.name}</span>
                          <div className="flex gap-3 text-xs mt-1">
                            <span className="font-bold text-orange-500"><Coins size={10} className="inline mr-1"/>{s.score}</span>
                            <span className={`font-black ${selectedShop.textColor}`}>${hkd}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleRedeem(s, s.redeemed)} 
                          className={`p-2 rounded-lg transition-colors ${
                            s.redeemed 
                              ? 'bg-green-100 text-green-600 hover:bg-red-100 hover:text-red-600' 
                              : `${selectedShop.lightColor} hover:bg-slate-200`
                          }`}
                          title={s.redeemed ? "Click to Undo (撤銷)" : "Click to Redeem (兌換)"}
                        >
                          {s.redeemed ? <CheckCircle2 size={20}/> : <Check size={20} className={selectedShop.textColor}/>}
                        </button>
                      </div>
                      
                      {/* REDEMPTION LOG DISPLAY */}
                      {s.lastLog && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 border-t pt-1 mt-1">
                          <History size={10} />
                          <span className="truncate">{s.lastLog}</span>
                        </div>
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

  if (view === 'teacher_login') return (
    <div className="w-screen h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
        <h2 className="text-3xl font-black">老師後台</h2>
        <input type="password" value={teacherPwd} onChange={e => setTeacherPwd(e.target.value)} className="w-full p-5 border-2 rounded-2xl text-center text-xl" placeholder="Password"/>
        <button onClick={() => { if(teacherPwd === TEACHER_PWD) setView('teacher'); else alert('密碼錯誤 (Wrong Password)'); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700">Login</button>
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
            {/* CSV DOWNLOAD BUTTON */}
            <button onClick={downloadCSV} className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-3 rounded-xl font-bold hover:bg-green-200 transition-colors">
              <FileDown size={20}/> 下載報表 (CSV)
            </button>
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
                      <span className="font-bold text-md block">{s.number}. {s.name}</span>
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