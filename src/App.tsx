// ... (前面的 import 和邏輯保持不變) ...

  // --- Render ---

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (view === 'home') return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center space-y-8 p-4">
      <div className="text-center">
        <Coins size={80} className="text-orange-500 mx-auto animate-bounce mb-4"/>
        <h1 className="text-5xl font-black text-slate-800">P.3 理財數學王 v4.0</h1>
        <p className="text-xl text-slate-500 font-bold">5分鐘限時挑戰 • 累積財富</p>
      </div>
      {/* FIX 1: 加寬容器 max-w-4xl -> max-w-6xl */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        <button onClick={() => setView('student')} className="p-8 bg-white rounded-3xl shadow-xl border-b-8 border-orange-200 hover:scale-105 transition-all text-center group">
          <User size={48} className="mx-auto text-orange-500 mb-2 group-hover:scale-110 transition-transform"/><h2 className="text-2xl font-black text-slate-700">我是學生</h2>
        </button>
        <button onClick={() => setView('teacher_login')} className="p-8 bg-white rounded-3xl shadow-xl border-b-8 border-indigo-200 hover:scale-105 transition-all text-center group">
          <BarChart3 size={48} className="mx-auto text-indigo-500 mb-2 group-hover:scale-110 transition-transform"/><h2 className="text-2xl font-black text-slate-700">我是老師</h2>
        </button>
        <button onClick={() => setView('net_login')} className="p-8 bg-white rounded-3xl shadow-xl border-b-8 border-purple-200 hover:scale-105 transition-all text-center group">
          <Languages size={48} className="mx-auto text-purple-500 mb-2 group-hover:scale-110 transition-transform"/>
          {/* FIX 2: 文字改為 NET */}
          <h2 className="text-2xl font-black text-slate-700">NET</h2>
        </button>
      </div>
    </div>
  );

  // Student
  if (view === 'student') return (
    <div className="min-h-screen bg-orange-50 p-4">
      {/* FIX 1: 加寬學生介面 max-w-2xl -> w-full max-w-6xl */}
      <div className="w-full max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl overflow-hidden border-4 border-orange-100 min-h-[600px]">
        <div className="bg-orange-500 p-4 text-white flex justify-between items-center">
          <button onClick={() => setView('home')}><ArrowLeft/></button>
          <h2 className="font-bold">比賽專區</h2>
          <div className="w-6"></div>
        </div>
        <div className="p-6">
           {/* ... 學生介面內部邏輯保持不變 ... */}
           {studentView === 'class_select' && (
            <div className="grid grid-cols-2 gap-4">
              {['3A','3B','3C','3D'].map(c => <button key={c} onClick={() => {setSelectedClass(c); setStudentView('name_select');}} className="py-8 bg-orange-50 hover:bg-orange-500 hover:text-white rounded-2xl text-3xl font-black border-2 border-orange-100">{c}</button>)}
            </div>
          )}

          {studentView === 'name_select' && (
            <div className="space-y-4">
              <button onClick={() => setStudentView('class_select')}>Back</button>
              <h3 className="text-2xl font-black">Select Name</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto"> {/* 優化列表顯示 */}
                {studentsByClass[selectedClass]?.map(s => <button key={s.id} onClick={() => {setCurrentStudent(s); setStudentView('difficulty');}} className="p-4 bg-slate-50 hover:bg-orange-100 rounded-xl text-left border font-bold">{s.name_zh}</button>)}
              </div>
            </div>
          )}

          {studentView === 'difficulty' && (
            <div className="space-y-4 text-center max-w-2xl mx-auto"> {/* 限制難度選擇的寬度，保持美觀 */}
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
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-rose-600 font-black text-xl"><Timer/> {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</div>
                <div className="flex items-center gap-2 text-orange-500 font-black text-xl"><Coins/> {totalAccumulatedScore}</div>
              </div>
              
              <div className="bg-white border-4 border-slate-100 p-12 rounded-3xl min-h-[250px] flex flex-col items-center justify-center text-center relative">
                {strikes > 0 && <span className="absolute top-4 right-4 text-red-500 font-bold bg-red-100 px-3 py-1 rounded-lg">錯誤: {strikes}/3</span>}
                <p className="text-4xl md:text-5xl font-bold text-slate-800 leading-relaxed">{currentQuestion.q}</p>
              </div>

              {feedback && <div className={`p-4 rounded-xl text-center font-black text-xl ${feedback.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{feedback.msg}</div>}

              <form onSubmit={submitAnswer} className="flex gap-4">
                <input type="number" autoFocus value={answer} onChange={e => setAnswer(e.target.value)} className="flex-1 p-6 rounded-2xl border-4 border-slate-200 text-4xl text-center font-black outline-none focus:border-orange-400 transition-colors" placeholder="?"/>
                <button type="submit" className="px-10 bg-orange-500 text-white rounded-2xl font-black text-xl hover:bg-orange-600 transition-colors shadow-lg">GO</button>
              </form>
            </div>
          )}

          {studentView === 'result' && (
            <div className="text-center py-10 space-y-6 animate-in zoom-in">
              <Trophy size={80} className="text-yellow-400 mx-auto"/>
              <h2 className="text-4xl font-black">時間到！</h2>
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
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
        <button onClick={() => { if(netPwd === NET_PWD) setView('net'); else alert('Wrong Password'); }} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold">Enter</button>
        <button onClick={() => setView('home')} className="text-slate-400">Back</button>
      </div>
    </div>
  );

  if (view === 'net') return (
    <div className="min-h-screen bg-slate-50 p-4">
       {/* NET 介面也稍微加寬 */}
      <div className="max-w-3xl mx-auto bg-white rounded-[2rem] shadow-xl border-b-8 border-purple-200 min-h-[800px]">
        {/* ... NET 介面內部邏輯保持不變 ... */}
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
                {netStudent.redeemed && (
                  <div className="mt-4 flex flex-col items-center bg-green-100 text-green-700 p-3 rounded-xl font-bold">
                    <CheckCircle2/>
                    <span>ALREADY REDEEMED</span>
                  </div>
                )}
              </div>

              {!netStudent.redeemed && (
                <div className="grid grid-cols-1 gap-4">
                  <p className="font-bold text-slate-400">Select Shop Rate:</p>
                  {SHOPS.map(shop => (
                    <button key={shop.id} onClick={() => setSelectedShop(shop)} className={`p-4 rounded-xl border-2 text-left transition-all ${selectedShop?.id === shop.id ? 'border-purple-600 bg-purple-50' : 'border-slate-100 hover:border-purple-200'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-black text-slate-700">{shop.name_en}</p>
                          <p className="text-xs text-slate-400">{shop.name_zh}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-white font-bold text-sm ${shop.color}`}>x{shop.rate}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedShop && !netStudent.redeemed && (
                <div className="bg-slate-800 text-white p-6 rounded-2xl text-center space-y-2">
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
        {/* FIX 3: 增加 else alert 處理密碼錯誤狀況 */}
        <button onClick={() => { 
          if(teacherPwd === TEACHER_PWD) {
            setView('teacher');
          } else {
            alert('密碼錯誤 (Wrong Password)');
          }
        }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Login</button>
        <button onClick={() => setView('home')} className="text-slate-400">Back</button>
      </div>
    </div>
  );

  // ... (Teacher view 保持不變) ...