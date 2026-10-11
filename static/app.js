import {ipaMarkup, meaningsMarkup} from './lexicon-view.mjs';
const main = document.querySelector('#main');
try{document.documentElement.classList.toggle('ipa-large',localStorage.getItem('ipa-large')==='true');}catch{}
const state = { token: '', dashboard: null, audio: null, day: 1, lesson: null, route: '', sentenceIndex: 0,
  results: new Map(), listens: new Map(), revealed: new Set(), reviewItems: [], reviewIndex: 0, flipped: false,
  quizIndex: 0, quizResult: null, searchSequence: 0, navigationSequence: 0, recording: null, records: [],
  phonemes: null, selectedPhoneme: '', lexiconPage: 1, lexiconQuery: '', recordItem: null, lexiconFilter: '' };
const navItems = [['ipa','◉','44 âm IPA'],['today','◷','Hôm nay'],['roadmap','▦','Lộ trình 90 ngày'],['listen','♫','Nghe & viết'],
  ['speak','◎','Luyện phát âm'],['dictionary','Aa','Kho từ vựng'],['review','↻','Ôn tập'],['progress','↗','Tiến bộ'],['settings','⚙','Cài đặt']];
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id = () => crypto.randomUUID();
const dateText = (date) => new Date(date).toLocaleDateString('vi-VN', {day:'numeric',month:'numeric'});
const sound = () => '<div class="sound-symbol" aria-hidden="true">' + '<i></i>'.repeat(11) + '</div>';
let player = null;
let audioUrl = null;
let toastTimeout = null;
let audioSequence = 0;
let pendingRequests = new Map();

function toast(message, error = false) {
  const node = document.querySelector('#toast');
  node.textContent = message;
  node.className = 'toast' + (error ? ' error' : '');
  node.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { node.hidden = true; }, error ? 8000 : 4000);
}
async function api(path, data, raw = false) {
  const options = data === undefined ? {} : {method:'POST', headers:{'Content-Type':'application/json', 'X-Coach-Token':state.token}, body:JSON.stringify(data)};
  const response = await fetch('/api/' + path, options);
  const result = raw ? response : await response.json();
  if (!response.ok) throw new Error(result.error || 'Không kết nối được ứng dụng local. Kiểm tra cửa sổ chạy app.');
  return result;
}
function stopAudio() {
  audioSequence += 1;
  if (player) player.pause();
  player = null;
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null;
}
async function play(itemId, options = {}) {
  stopAudio();
  const sequence = audioSequence;
  const query = new URLSearchParams({voice:state.dashboard.settings.voice});
  if (options.word) query.set('word', options.word); else query.set('id', itemId);
  if (options.example) query.set('example','1');
  const response = await fetch('/api/audio?' + query);
  if (!response.ok) { const error = await response.json(); throw new Error(error.error); }
  const blob = await response.blob();
  if (sequence !== audioSequence) return false;
  audioUrl = URL.createObjectURL(blob);
  player = new Audio(audioUrl);
  player.playbackRate = options.speed || 1;
  player.preservesPitch = true;
  player.addEventListener('error', () => toast('Không phát được audio. Thử tải lại trang.', true));
  await player.play();
  return true;
}
function requestKey(key) {
  if (!pendingRequests.has(key)) pendingRequests.set(key, id());
  return pendingRequests.get(key);
}
function heading(title, description, eyebrow = 'GÓC HỌC CỦA BẠN') {
  return `<div class="page-heading"><div><p class="eyebrow">${escape(eyebrow)}</p><h1>${escape(title)}</h1><p>${escape(description)}</p></div><div class="date-label">${escape(new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'}))}</div></div>`;
}
function updateNav(route) {
  document.querySelector('#navigation').innerHTML = navItems.map(([key,icon,label], i) => `${i===6?'<div class="nav-separator"></div>':''}<a class="nav-item ${key===route?'active':''}" href="#${key}" ${key===route?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${icon}</span>${label}</a>`).join('');
  document.querySelector('#breadcrumb').textContent = navItems.find(([key]) => key===route)?.[2] || 'Góc học';
  document.querySelector('.avatar').textContent = (state.dashboard.settings.name || 'Bạn').slice(0,1).toUpperCase();
}
async function navigate() {
  if (state.recording) {
    toast('Hãy dừng và lưu bản ghi trước khi chuyển trang.');
    history.replaceState(null,'','#'+state.route+(state.selectedPhoneme?'?phoneme='+state.selectedPhoneme:''));
    return;
  }
  stopAudio();
  const sequence = ++state.navigationSequence;
  let route = location.hash.slice(1).split('?')[0] || 'ipa';
  if (!navItems.some(([key])=>key===route)) route='ipa';
  state.route = route;
  updateNav(route);
  main.innerHTML = '<div class="loading">Đang mở bài học…</div>';
  try {
    const dashboard = await api('dashboard');
    if (sequence !== state.navigationSequence) return;
    state.dashboard = dashboard;
    state.day ||= dashboard.day;
    if (['today','listen','speak','dictionary'].includes(route)) {
      const lesson = await api('lesson?day=' + state.day);
      if (sequence !== state.navigationSequence) return;
      state.lesson = lesson;
    }
    if (route==='today') renderToday();
    if (route==='listen') {state.sentenceIndex=0;renderListen();}
    if (route==='speak') {state.records=await api('recordings');if(sequence!==state.navigationSequence)return;renderSpeak();}
    if (route==='dictionary') {
      const [result,phonemes]=await Promise.all([api('lexicon'),api('phonemes')]);
      if(sequence!==state.navigationSequence)return;
      state.phonemes=phonemes;state.lexiconPage=1;state.lexiconQuery='';state.lexiconFilter='';renderFullDictionary(result);
    }
    if (route==='ipa') {
      const [phonemes,records]=await Promise.all([api('phonemes'),api('recordings')]);
      if(sequence!==state.navigationSequence)return;
      state.phonemes=phonemes;state.records=records;
      state.selectedPhoneme=new URLSearchParams(location.hash.split('?')[1]||'').get('phoneme')||'';
      if(state.selectedPhoneme&&!phonemes.phonemes.some(p=>p.id===state.selectedPhoneme))state.selectedPhoneme='';
      if(state.selectedPhoneme){
        state.lexiconQuery='';state.lexiconPage=1;
        const phoneme=phonemes.phonemes.find(p=>p.id===state.selectedPhoneme);
        const [result,example]=await Promise.all([api('lexicon?phoneme='+state.selectedPhoneme),api('lexicon?q='+encodeURIComponent(phoneme.example))]);
        if(sequence!==state.navigationSequence)return;
        const word=example.items.find(w=>w.word.toLowerCase()===phoneme.example.toLowerCase());
        state.recordItem={id:'ipa-'+phoneme.id,text:phoneme.example,ipa:word?.pronunciations[0]?.ipa||'',definitions:word?.definitions||[]};
        renderPhonemeDetail(result);
      }else{state.recordItem=null;renderPhonemeChart();}
    }
    if (route==='review') {state.reviewItems=await api('reviews');if(sequence!==state.navigationSequence)return;state.reviewIndex=0;state.flipped=false;renderReview();}
    if (route==='roadmap') {const units=await api('curriculum');if(sequence!==state.navigationSequence)return;renderRoadmap(units);}
    if (route==='progress') renderProgress();
    if (route==='settings') renderSettings();
    main.focus({preventScroll:true});
  } catch (error) { main.innerHTML=`<div class="error-box">${escape(error.message)}</div><button class="button" data-action="retry">Thử lại</button>`; }
}
function stats() {
  const s=state.dashboard.stats;
  return `<div class="stats-grid"><div class="stat"><div class="stat-label">Ngày đã hoàn thành</div><div class="stat-number">${s.completed}<span>/ 90 ngày</span></div></div><div class="stat"><div class="stat-label">Tự đánh giá đã nhớ</div><div class="stat-number">${s.learned}<span>mục từ</span></div></div><div class="stat"><div class="stat-label">Nghe lần đầu · câu mới</div><div class="stat-number">${s.first_listen_score===null?'—':s.first_listen_score+'%'}<span>nghe–chép</span></div></div><div class="stat"><div class="stat-label">Đến hẹn ôn lại</div><div class="stat-number">${s.due}<span>mục từ</span></div></div></div>`;
}
function renderToday() {
  const {settings}=state.dashboard;
  const {unit,words}=state.lesson;
  const name=settings.name ? ', '+settings.name : '';
  main.innerHTML=heading('Chào bạn'+name+'.','Một chút tập trung hôm nay. Một giọng nói rõ hơn ngày mai.','MAKE A LITTLE PROGRESS, EVERY DAY')+
    (!settings.onboarded?'<div class="info-banner flex-between"><span>Chọn thời lượng và mức học để bắt đầu theo nhịp của bạn.</span><a class="text-link" href="#settings">Thiết lập →</a></div>':'')+
    `<section class="hero"><div class="hero-content"><p class="eyebrow">NGÀY ${state.day.toString().padStart(2,'0')} / 90 · TUẦN ${unit.id}</p><h2>${escape(unit.title)}</h2><p>${escape(unit.subtitle)}. Nghe một câu, thử viết lại, rồi lắng nghe giọng của chính bạn.</p><a class="button light" href="#listen">${state.lesson.attempted.length?'Tiếp tục bài học':'Bắt đầu buổi học'} <span aria-hidden="true">↗</span></a></div><div class="hero-aside">${sound()}<div class="phoneme">${escape(unit.focus)}</div><div class="small">LISTEN. NOTICE. TRY AGAIN.</div></div></section>`+
    stats()+`<div class="two-columns"><section><div class="section-head"><h2>Buổi học của bạn</h2><span class="muted small">Mục tiêu ${settings.minutes} phút</span></div><div class="session-list"><a class="session" href="#listen"><span class="session-icon">♫</span><div><div class="session-title">Nghe & viết lại</div><div class="session-description">3 câu · ẩn lời trước khi trả lời</div></div><span class="session-meta">${state.lesson.sentences.filter(s=>state.lesson.attempted.includes(s.id)).length}/3 →</span></a><a class="session" href="#speak"><span class="session-icon">◎</span><div><div class="session-title">Lắng nghe giọng của bạn</div><div class="session-description">Luyện âm · thu âm · so sánh</div></div><span class="session-meta">Bắt đầu →</span></a><a class="session" href="#dictionary"><span class="session-icon">Aa</span><div><div class="session-title">Học từ trong ngữ cảnh</div><div class="session-description">${words.length} mục của tuần ${unit.id}</div></div><span class="session-meta">Khám phá →</span></a><a class="session" href="#review"><span class="session-icon">↻</span><div><div class="session-title">Ôn lại để nhớ lâu hơn</div><div class="session-description">${state.dashboard.stats.due} mục đến hạn · tự đánh giá mức nhớ</div></div><span class="session-meta">Ôn tập →</span></a></div><div class="week-track">${Array.from({length:7},(_,i)=>{const day=(unit.id-1)*7+i+1;return `<button class="day-dot ${state.dashboard.completed_days.includes(day)?'done':''} ${day===state.day?'current':''}" data-action="day" data-day="${day}" aria-label="Học ngày ${day}">${state.dashboard.completed_days.includes(day)?'✓':day}</button>`;}).join('')}</div><div class="week-labels"><span>Tuần ${unit.id}</span><a href="#roadmap">Xem lộ trình →</a></div></section><aside><div class="section-head"><h2>Một từ, một ngữ cảnh</h2></div><div class="note-card"><p class="eyebrow">WORD OF THE DAY</p><h3>${escape(words[(state.day-1)%words.length].word)}</h3><div class="ipa">${escape(words[(state.day-1)%words.length].ipa)}</div><p>${escape(words[(state.day-1)%words.length].meaning)}</p><p lang="en">“${escape(words[(state.day-1)%words.length].example)}”</p><button class="button secondary small" data-action="play" data-id="${words[(state.day-1)%words.length].id}">▶ Nghe từ</button></div><p class="inline-note">Gói khởi đầu: ${state.dashboard.content.words} mục từ/nghĩa, ${state.dashboard.content.sentences} câu. Nội dung được luân phiên để luyện lại; chưa phải 90 ngày nội dung độc lập.</p></aside></div>`;
}
function sentence() {return state.lesson.sentences[state.sentenceIndex];}
function tabs() {return `<div class="lesson-tabs">${state.lesson.sentences.map((s,i)=>`<button class="lesson-tab ${i===state.sentenceIndex?'active':''}" data-action="sentence" data-index="${i}">Câu ${i+1} ${state.results.has(s.id)?'✓':''}</button>`).join('')}</div>`;}
function renderListen() {
  const item=sentence(); const result=state.results.get(item.id);
  const draft=sessionStorage.getItem('draft-'+state.day+'-'+item.id)||'';
  const listens=state.listens.get(item.id)||0;
  main.innerHTML=heading('Nghe. Viết. Hiểu.','Nghe trước khi xem chữ. Sai một từ là biết thêm một điều cần luyện.',`NGÀY ${state.day} · ${state.lesson.unit.title}`)+tabs()+
    `<div class="practice-layout"><section class="panel"><div class="flex-between"><h2>Câu ${state.sentenceIndex+1} / 3</h2><span class="practice-counter">${listens} lần nghe</span></div><div class="listen-stage">${sound()}<div class="listen-controls"><button class="play-button" data-action="listen" aria-label="Nghe câu ${state.sentenceIndex+1}">▶</button><div><strong>Nghe câu tiếng Anh</strong><div class="audio-label">Giọng Mỹ tổng hợp · ${escape(state.dashboard.settings.voice)}</div></div></div><label class="sr-only" for="speed">Tốc độ audio</label><select class="speed" id="speed"><option value="1">Tốc độ 1×</option><option value="0.8">Chậm 0.8×</option></select></div><form id="dictation-form"><label for="answer">Bạn nghe được gì?</label><textarea id="answer" name="answer" lang="en" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Type what you hear…" ${result?'disabled':''}>${escape(result?result.answer:draft)}</textarea><p class="field-help">Không tính lỗi viết hoa và dấu câu. Từ thiếu, thừa hoặc khác vẫn được ghi nhận.</p><div class="actions"><button class="button" type="submit" ${result?'disabled':''}>Kiểm tra câu trả lời →</button><button class="button secondary" type="button" data-action="reveal" ${result?'disabled':''}>Xem gợi ý</button></div></form>${state.revealed.has(item.id)&&!result?`<div class="info-banner"><strong lang="en">${escape(item.text)}</strong><br>${escape(item.meaning)}<p class="small">Lượt này được ghi là có trợ giúp.</p></div>`:''}${result?resultMarkup(result,item):''}<div class="completion">${state.lesson.completed?'<span class="check-badge">✓ Bạn đã hoàn thành ngày này</span>':`<button class="button secondary small" data-action="complete">Hoàn thành ngày ${state.day} ✓</button><p class="field-help">Hoàn thành cả 3 câu trước khi đánh dấu. Bạn có thể học lại bất kỳ lúc nào.</p>`}</div></section><aside><div class="note-card"><p class="eyebrow">THỬ THEO CÁCH NÀY</p><h3>Nghe cả ý,<br>rồi bắt từng từ.</h3><p>1. Nghe một lượt ở tốc độ gốc.</p><p>2. Viết những gì bạn nhận ra.</p><p>3. Nghe lại khi cần, rồi kiểm tra.</p><p>4. Đọc câu đúng và nói lại thành tiếng.</p></div><div class="info-banner">Điểm này đo nghe–chép, không đo accent. Lần nghe đầu và lượt có gợi ý được lưu riêng.</div><a class="text-link" href="#speak">Thử đọc chính câu này →</a></aside></div>`;
}
function resultMarkup(result,item) {
  return `<div class="result ${result.correct?'':'needs-work'}" role="status"><div class="result-title"><h3>${result.correct?'Bạn đã nghe đúng câu này.':'Cùng nghe kỹ chỗ này nhé.'}</h3><span class="score">${result.score}<small>/100</small></span></div><div class="diff" lang="en">${result.alignment.map(part=>`<span class="${part.type}" title="${escape(part.actual ? 'Bạn viết: '+part.actual : 'Thiếu từ')}">${escape(part.expected||part.actual)}</span>`).join('')}</div><p class="reference" lang="en">${escape(item.text)}</p><p>${escape(item.meaning)}</p>${result.errors.length?`<p class="small">${result.errors.map(e=>e.type==='omission'?`Thiếu “${escape(e.expected)}”`:e.type==='insertion'?`Thừa “${escape(e.actual)}”`:`“${escape(e.actual)}” → “${escape(e.expected)}”`).join(' · ')}</p>`:''}<p class="inline-note">${result.assisted?'Đã xem gợi ý · không tính vào điểm nghe lần đầu.':'Đã lưu vào tiến độ trên máy.'}</p><div class="actions"><button class="button secondary small" data-action="try-again">Luyện lại</button><button class="button small" data-action="next-sentence">${state.sentenceIndex<2?'Câu tiếp theo →':'Về buổi học →'}</button></div></div>`;
}
function renderSpeak() {
  const item=sentence(); const unit=state.lesson.unit;
  const pairWords=unit.pair.map(term=>state.lesson.words.find(w=>w.word===term)).filter(Boolean);
  main.innerHTML=heading('Giọng của bạn, rõ hơn.','Nghe mẫu, thu âm, rồi so sánh. Chú ý một điểm nhỏ trong mỗi lượt.',`PHÒNG LUYỆN ÂM · TUẦN ${unit.id}`)+tabs()+
    `<div class="practice-layout"><section class="panel"><p class="eyebrow">${escape(unit.focus)}</p><p>${escape(unit.tip)}</p><div class="actions">${pairWords.map(w=>`<button class="button secondary small" data-action="play" data-id="${w.id}">▶ ${escape(w.word)} <span class="ipa">${escape(w.ipa)}</span></button>`).join('')}</div><div class="record-box"><p class="eyebrow">READ IT YOUR WAY</p><blockquote lang="en">${escape(item.text)}</blockquote><p class="muted small">${escape(item.meaning)}</p><div class="actions record-tools"><button class="button secondary" data-action="play" data-id="${item.id}">▶ Nghe mẫu</button><button class="button" id="record-button" data-action="record">● Bắt đầu thu âm</button></div><p class="audio-label">Thu tối đa 90 giây · bản ghi lưu trên máy này</p><div id="record-status" role="status"></div></div><div id="record-result"></div><h3>Bản ghi của câu này</h3><div id="recordings-list">${recordingsMarkup(item.id)}</div></section><aside><div class="note-card"><p class="eyebrow">NGHE LẠI VỚI MỤC TIÊU</p><h3>Một lần, một điểm.</h3><div class="rubric">${['Tôi giữ được âm cuối.','Tôi nhấn đúng âm tiết.','Tôi ngắt theo cụm ý.','Câu của tôi nghe rõ.'].map((label,i)=>`<label><input type="checkbox" aria-label="${label}">${label}</label>`).join('')}</div><p class="inline-note">Tự kiểm trong buổi này; chưa có điểm accent tự động.</p></div><div class="info-banner"><strong>Thử nói thêm</strong><p>${escape(unit.prompt)}</p></div><p class="inline-note">Micro chỉ ghi khi bạn bấm bắt đầu. Tắt mic ngay khi dừng thu. Không tải bản ghi lên cloud.</p></aside></div>`;
}
function recordingsMarkup(itemId) {
  const records=state.records.filter(r=>r.item_id===itemId);
  if (!records.length) return '<p class="muted small">Bản ghi đầu tiên sẽ xuất hiện ở đây. Bạn có thể nghe lại sau khi mở app lần sau.</p>';
  return records.map(r=>`<div class="recording-row"><p>${escape(new Date(r.created).toLocaleString('vi-VN'))}</p><audio controls preload="none" src="/recordings/${escape(r.id)}" aria-label="Bản ghi ${escape(dateText(r.created))}"></audio><button class="button danger small" data-action="delete-record" data-id="${escape(r.id)}">Xóa</button></div>`).join('');
}
async function toggleRecording() {
  if (state.recording) { state.recording.recorder.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Trình duyệt này chưa hỗ trợ thu âm. Hãy mở bằng Chrome hoặc Safari tại địa chỉ localhost.');
  stopAudio();
  const recordingRoute=state.route;
  const itemId=recordingRoute==='ipa'?state.recordItem.id:sentence().id;
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
  if (state.route!==recordingRoute || (recordingRoute==='ipa'?state.recordItem.id:sentence().id)!==itemId) {stream.getTracks().forEach(t=>t.stop());return;}
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));
  let recorder;
  try { recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{}); } catch(error) {stream.getTracks().forEach(t=>t.stop());throw error;}
  const chunks=[]; const started=Date.now();
  const button=document.querySelector('#record-button');
  button.textContent='■ Dừng & lưu';button.classList.add('recording');
  const status=document.querySelector('#record-status');
  const timer=setInterval(()=>{status.textContent=`Đang thu · ${Math.floor((Date.now()-started)/1000)} giây`;},500);
  const stopTimer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},90000);
  state.recording={recorder,stream,timer,stopTimer};
  recorder.addEventListener('dataavailable',event=>{if(event.data.size)chunks.push(event.data);});
  recorder.addEventListener('stop',async()=>{
    clearInterval(timer);clearTimeout(stopTimer);stream.getTracks().forEach(track=>track.stop());state.recording=null;
    button.disabled=true;button.textContent='Đang lưu…';button.classList.remove('recording');
    try {
      const blob=new Blob(chunks,{type:recorder.mimeType||mime});
      if(blob.size<1000)throw new Error('Bản ghi quá ngắn. Hãy thu lại một câu đầy đủ.');
      const response=await fetch('/api/recordings?item='+encodeURIComponent(itemId),{method:'POST',headers:{'X-Coach-Token':state.token,'Content-Type':blob.type},body:blob});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
      state.records=await api('recordings');
      if(state.route==='speak')renderSpeak();
      if(state.route==='ipa')renderIpaRecorder();
      toast('Đã lưu bản ghi. Nghe lại và so sánh với mẫu.');
    }catch(error){toast(error.message,true);if(document.contains(button)){button.disabled=false;button.textContent='● Thu âm lại';status.textContent='Chưa lưu được bản ghi.';}}
  });
  recorder.addEventListener('error',()=>{toast('Micro gặp lỗi. Hãy kiểm tra quyền microphone rồi thử lại.',true);if(recorder.state!=='inactive')recorder.stop();});
  try { recorder.start(); }
  catch(error) {
    clearInterval(timer);clearTimeout(stopTimer);stream.getTracks().forEach(track=>track.stop());state.recording=null;
    button.disabled=false;button.textContent='● Bắt đầu thu âm';button.classList.remove('recording');status.textContent='';
    throw new Error('Không bắt đầu được bản ghi. Kiểm tra microphone rồi thử lại.');
  }
}
function wordCard(word) {
  return `<article class="word-card"><div class="flex-between"><h3 lang="en">${escape(word.word)}</h3><span class="tag">Tuần ${word.unit}</span></div><div class="ipa">${escape(word.ipa)}</div><p class="meaning">${escape(word.meaning)}</p><p class="example" lang="en">${escape(word.example)}</p><div class="actions"><button class="button secondary small" data-action="play" data-id="${word.id}" aria-label="Nghe từ ${escape(word.word)}">▶ Từ</button><button class="button secondary small" data-action="example" data-id="${word.id}">▶ Câu</button><button class="button small" data-action="add-review" data-id="${word.id}" aria-label="Thêm ${escape(word.word)} vào ôn tập">＋ Ôn</button></div></article>`;
}
function dictionaryMarkup(result) {
  let info='';
  if(result.query&&result.pronunciations.length)info=`<div class="dictionary-result"><div class="flex-between"><strong>CMUdict · ${escape(result.query)}</strong><button class="button secondary small" data-action="dictionary-audio" data-word="${escape(result.query)}">▶ Nghe</button></div>${result.pronunciations.map(p=>`<code>${escape(p)}</code>`).join('')}<p class="inline-note">ARPAbet: số 1 = trọng âm chính, 2 = phụ, 0 = không nhấn. Đây không phải IPA. Giọng tổng hợp có thể chọn một biến thể theo ngữ cảnh.</p>${!result.words.length?'<p class="small">Từ này có phát âm trong kho. Gói hiện tại chưa có nghĩa Việt được biên tập.</p>':''}</div>`;
  if(result.query&&!result.words.length&&!result.pronunciations.length)info='<div class="empty"><h2>Chưa tìm thấy từ này</h2><p>Thử dạng gốc hoặc một phần của từ. Ứng dụng không tự đoán nghĩa còn thiếu.</p></div>';
  const suggestions=result.query?`<div class="chips">${result.suggestions.map(term=>`<button class="chip" data-action="search-term" data-word="${escape(term)}">${escape(term)}</button>`).join('')}</div>`:'';
  return info+suggestions+`<p class="count-label">${result.words.length} mục có nghĩa Việt · ${result.dictionary_count.toLocaleString('vi-VN')} từ CMUdict tra phát âm offline</p><div class="word-grid">${result.words.map(wordCard).join('')}</div>`;
}
function renderDictionary(result) {
  main.innerHTML=heading('Gặp từ mới? Bắt đầu ở đây.','Nghe cách đọc, hiểu ngữ cảnh, rồi mang từ đó vào lịch ôn của bạn.','YOUR PERSONAL WORD ROOM')+
    '<form id="search-form" class="search-row"><label class="sr-only" for="search">Tìm từ tiếng Anh hoặc nghĩa Việt</label><input id="search" type="search" placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt…" autocomplete="off"><button class="button" type="submit">Tìm từ</button><button class="button secondary" type="button" data-action="week-words">Từ tuần này</button></form><div class="actions bottom-space"><button class="text-link" data-action="quiz">Luyện hiểu nghĩa từ tuần này →</button></div><div id="dictionary-results">'+dictionaryMarkup(result)+'</div>';
}
async function search(query) {
  const sequence=++state.searchSequence;
  const result=await api('search?q='+encodeURIComponent(query));
  if(sequence!==state.searchSequence||state.route!=='dictionary')return;
  document.querySelector('#dictionary-results').innerHTML=dictionaryMarkup(result);
}
function renderQuiz() {
  const word=state.lesson.words[state.quizIndex%state.lesson.words.length];
  const others=state.lesson.words.filter(w=>w.id!==word.id).slice(0,3);
  const choices=[word,...others].sort((a,b)=>a.meaning.localeCompare(b.meaning));
  const result=state.quizResult;
  main.innerHTML=heading('Hiểu từ trong câu.','Chọn nghĩa phù hợp với ngữ cảnh.','TỪ VỰNG · TUẦN '+state.lesson.unit.id)+`<div class="panel review-card"><p class="eyebrow">MỤC ${state.quizIndex+1} / ${state.lesson.words.length}</p><h2 class="word-heading" lang="en">${escape(word.word)}</h2><p class="big-quote" lang="en">${escape(word.example)}</p><div class="choices">${choices.map(w=>`<button class="choice" data-action="quiz-answer" data-answer="${escape(w.meaning)}" ${result?'disabled':''}>${escape(w.meaning)}</button>`).join('')}</div>${result?`<div class="info-banner">${result.correct?'✓ Chính xác.':'Nghĩa của mục này: '+escape(word.meaning)}</div><button class="button" data-action="quiz-next">${state.quizIndex+1===state.lesson.words.length?'Xong →':'Mục tiếp theo →'}</button>`:''}<div class="actions"><button class="text-link" data-action="retry">← Về kho từ</button></div></div>`;
}
function renderReview() {
  const word=state.reviewItems[state.reviewIndex];
  if(!word){main.innerHTML=heading('Nhớ lâu hơn, từng chút một.','Lịch ôn được lưu trên máy, riêng cho từng mục từ.','SPACED PRACTICE')+'<div class="empty"><h2>Đã xong lượt ôn này.</h2><p>Chưa có mục nào khác trong lượt. Từ chọn “Chưa nhớ” vẫn đến hạn hôm nay; có thể quay lại sau một khoảng nghỉ.</p><a class="button" href="#dictionary">Chọn từ để học →</a></div>';return;}
  main.innerHTML=heading('Nhớ lâu hơn, từng chút một.','Tự nhớ nghĩa trước khi lật thẻ. Chọn mức nhớ đúng với bạn.','SPACED PRACTICE')+
    `<div class="panel review-card"><p class="eyebrow">${state.reviewIndex+1} / ${state.reviewItems.length} MỤC ĐẾN HẠN</p><h2 class="word-heading" lang="en">${escape(word.word)}</h2><div class="ipa">${escape(word.ipa)}</div><button class="button secondary small" data-action="play" data-id="${word.id}">▶ Nghe từ</button>${state.flipped?`<div class="review-meaning">${escape(word.meaning)}</div><p lang="en">${escape(word.example)}</p><div class="actions review-ratings">${[['again','Chưa nhớ'],['hard','Hơi khó'],['good','Nhớ được'],['easy','Rất dễ']].map(([rating,label])=>`<button class="button ${rating==='good'?'':'secondary'}" data-action="rate" data-rating="${rating}">${label}</button>`).join('')}</div>`:'<div class="review-ratings"><button class="button" data-action="flip">Hiện nghĩa →</button></div>'}<p class="field-help">Lịch ôn cơ bản: tăng khoảng cách khi nhớ được, ôn lại trong ngày khi chưa nhớ. Không phải điểm kiểm tra.</p></div>`;
}
function renderRoadmap(units) {
  main.innerHTML=heading('90 ngày, theo nhịp của bạn.','12 chủ đề và 6 ngày nhìn lại. Có thể trở lại bất kỳ ngày nào.','THE LEARNING PATH')+
    '<div class="info-banner">Bản khởi đầu có 5 câu và 10 mục từ/nghĩa mỗi tuần, luân phiên để luyện lại. Chưa có 90 bộ nội dung riêng hoặc bài thi CEFR.</div><div class="roadmap-grid">'+units.map(unit=>`<article class="unit-card ${unit.id===Math.min(12,Math.ceil(state.day/7))?'current':''}"><p class="eyebrow">TUẦN ${String(unit.id).padStart(2,'0')}</p><h3>${escape(unit.title)}</h3><p>${escape(unit.subtitle)}</p><progress value="${unit.completed}" max="7" aria-label="${unit.completed} trên 7 ngày hoàn thành"></progress><div class="days">${unit.days.map(day=>`<button data-action="day" data-day="${day}" class="${state.dashboard.completed_days.includes(day)?'done':''}" aria-label="Học ngày ${day}">${day}</button>`).join('')}</div></article>`).join('')+'</div><div class="panel"><h3>Ngày 85–90 · Nghe lại chính mình</h3><p class="muted small">Ôn tổng hợp và so sánh bản ghi. Gói hiện tại dùng lại câu tuần 12, chưa có bộ kiểm tra độc lập.</p><div class="days">'+[85,86,87,88,89,90].map(day=>`<button data-action="day" data-day="${day}" class="${state.dashboard.completed_days.includes(day)?'done':''}">${day}</button>`).join('')+'</div></div>';
}
function renderProgress() {
  const history=state.dashboard.history;
  main.innerHTML=heading('Nhìn thấy từng bước tiến.','Lưu lại việc bạn đã làm, để biết ngày mai nên luyện gì.','YOUR PRACTICE JOURNAL')+stats()+
    `<section class="panel"><div class="section-head"><h2>Những lượt học gần đây</h2><span class="muted small">Tối đa 20 lượt gần nhất</span></div>${history.length?`<table class="history-table"><thead><tr><th>Nội dung</th><th>Kết quả</th><th>Ngày</th></tr></thead><tbody>${history.map(row=>`<tr><td><strong lang="en">${escape(row.result.reference)}</strong><br><span class="muted">${escape(row.result.meaning)}</span></td><td><span class="tag ${row.score<100?'orange':''}">${row.score}%</span><br><span class="small">${row.kind==='dictation'?'Nghe–chép':'Hiểu nghĩa'}${row.assisted?' · có gợi ý':''}</span></td><td>${escape(dateText(row.created))}</td></tr>`).join('')}</tbody></table>`:'<div class="empty"><h2>Bắt đầu câu đầu tiên.</h2><p>Kết quả sẽ xuất hiện sau khi bạn hoàn thành một bài luyện.</p><a class="button" href="#listen">Luyện nghe →</a></div>'}</section><div class="info-banner">“Nghe lần đầu” chỉ tính lần gặp đầu tiên của một câu, nghe đúng một lượt và chưa xem gợi ý. Số mục đã nhớ là tự đánh giá qua thẻ ôn. Không có điểm accent tự động.</div><section class="panel"><h2>Sổ lỗi cần nghe lại</h2>${history.filter(row=>row.score<100&&row.kind==='dictation').slice(0,6).map(row=>`<div class="recording-row"><p lang="en">${escape(row.result.reference)}</p><button class="button secondary small" data-action="play" data-id="${escape(row.item_id)}">▶ Nghe lại</button></div>`).join('')||'<p class="muted small">Chưa có lỗi nghe–chép được ghi nhận trong các lượt gần đây.</p>'}</section>`;
}
function renderSettings() {
  const settings=state.dashboard.settings;
  main.innerHTML=heading('Góc học, theo cách của bạn.','Mọi tiến độ và bản ghi được lưu trên máy này. Không cần tài khoản.','PREFERENCES')+
    `<div class="settings-grid"><section class="panel"><h2>Nhịp học mỗi ngày</h2><form id="settings-form"><div class="form-field"><label for="name">Tên bạn</label><input id="name" name="name" maxlength="60" value="${escape(settings.name)}" placeholder="Bạn muốn được gọi là gì?"></div><div class="form-field"><label for="minutes">Thời gian dành cho tiếng Anh</label><select id="minutes" name="minutes">${[30,60,90].map(n=>`<option value="${n}" ${settings.minutes===n?'selected':''}>${n} phút / ngày</option>`).join('')}</select><p class="field-help">Mục tiêu thời gian để bạn tự sắp xếp; app chưa tự đo thời gian học.</p></div><div class="form-field"><label for="level">Bạn tự đánh giá ở mức nào?</label><select id="level" name="level">${[['beginner','Mới bắt đầu'],['basic','Biết cơ bản'],['intermediate','Đã giao tiếp được']].map(([value,label])=>`<option value="${value}" ${settings.level===value?'selected':''}>${label}</option>`).join('')}</select><p class="field-help">Lưu trong hồ sơ; gói khởi đầu dùng chung nội dung, chưa có bài xếp lớp tự động.</p></div><div class="form-field"><label for="voice">Giọng Mỹ tổng hợp trên máy</label><select id="voice" name="voice">${['Samantha','Eddy (English (US))'].map(voice=>`<option ${voice===settings.voice?'selected':''}>${voice}</option>`).join('')}</select></div><button class="button" type="submit">Lưu cài đặt ✓</button></form></section><div><section class="panel"><h2>Dữ liệu của bạn</h2><p class="muted small">Tải bản sao tiến độ, lịch ôn và cài đặt. File JSON không chứa audio cá nhân; sao chép cả thư mục data để giữ mọi bản ghi.</p><a class="button secondary" href="/api/export" download>Sao lưu tiến độ ↓</a><hr class="divider"><label for="restore-file">Khôi phục tiến độ từ file JSON</label><input class="file-input" id="restore-file" type="file" accept=".json,application/json"><p class="field-help">Khôi phục thay thế tiến độ hiện tại; audio vẫn giữ nguyên. Hãy sao lưu trước.</p><label><input id="restore-confirm" type="checkbox"> Tôi muốn thay tiến độ bằng bản sao lưu</label><button class="button secondary small" data-action="restore">Khôi phục file đã chọn</button></section><section class="panel"><h3>Nguồn và giới hạn bản đầu</h3><p class="small muted">120 mục từ/nghĩa, 60 câu và 12 hướng dẫn được tự biên soạn cho bản khởi đầu; chưa được giáo viên duyệt độc lập. Kho phát âm mở rộng dùng CMUdict. Audio do macOS tạo local.</p><div class="source-links"><a href="https://github.com/cmusphinx/cmudict" target="_blank" rel="noreferrer">CMU Pronouncing Dictionary ↗</a></div><details><summary>Bản này có gì?</summary><p>Nghe–chép, tra từ offline, ôn theo mức nhớ, ghi âm và nghe lại. Chưa có nhận dạng giọng nói, chấm lỗi âm tự động, bài kiểm tra CEFR hay nội dung người thật. Giọng hệ thống chỉ dùng cho học cá nhân trên máy.</p></details></section></div></div>`;
}
function renderPhonemeChart() {
  const pack=state.phonemes;
  const done=Object.values(pack.progress).filter(p=>p.comfort==='comfortable').length;
  const practiced=Object.values(pack.progress).filter(p=>p.comfort!=='new').length;
  const groups=[['vowel','01','Nguyên âm đơn','12 ký hiệu · nghe vị trí lưỡi và độ mở miệng'],['diphthong','02','Nguyên âm đôi','8 ký hiệu · nghe chuyển động giữa các âm'],['consonant','03','Phụ âm','24 ký hiệu · vị trí tạo âm và độ rung']];
  main.innerHTML=heading('Một âm rõ. Ngàn từ mở ra.','Chọn một ký hiệu để luyện khẩu hình, nghe từ mẫu và thu âm. Kho từ đi kèm được lọc theo cách phát âm Mỹ.','YOUR AMERICAN ENGLISH SOUND LAB')+
    `<section class="ipa-summary"><div><span class="eyebrow">BẢNG 44 IPA</span><strong>${practiced}<span> / 44 mục đã bắt đầu</span></strong><progress value="${practiced}" max="44" aria-label="${practiced} trên 44 mục đã bắt đầu"></progress></div><div><span class="eyebrow">KHO TỪ OFFLINE</span><strong>${pack.stats.words.toLocaleString('vi-VN')}</strong><span>mục từ · toàn bộ words.txt</span></div><div><span class="eyebrow">ĐÃ GHÉP PHÁT ÂM</span><strong>${pack.stats.with_pronunciation.toLocaleString('vi-VN')}</strong><span>mục có dữ liệu CMUdict</span></div></section>`+
    `<div class="chart-note"><span class="note-dot">i</span><p>Bảng 44 truyền thống có ký hiệu Anh–Anh. Các mục có dấu <strong>US</strong> chỉ rõ cách đọc Mỹ tương ứng. ${done} mục bạn tự đánh giá đã quen.</p></div>`+
    groups.map(([group,number,title,description])=>`<section class="phoneme-section"><div class="section-head"><div><span class="eyebrow">${number} / SOUND FAMILY</span><h2>${title}</h2></div><span class="muted small">${description}</span></div><div class="phoneme-grid ${group==='consonant'?'consonants':''}">${pack.phonemes.filter(p=>p.group===group).map(p=>{
      const comfort=pack.progress[p.id]?.comfort||'new';
      return `<a class="phoneme-tile ${comfort}" href="#ipa?phoneme=${p.id}" aria-label="Luyện âm ${escape(p.symbol)}, ví dụ ${escape(p.example)}"><span class="tile-top"><span>${p.us!==p.symbol?'US /'+escape(p.us)+'/':''}</span><span>${comfort==='comfortable'?'✓':comfort==='practicing'?'◐':''}</span></span><span class="ipa-glyph">${escape(p.symbol)}</span><span class="phoneme-word" lang="en">${escape(p.example)}</span><span class="phoneme-count">${p.count.toLocaleString('vi-VN')} từ liên quan ↗</span></a>`;
    }).join('')}</div></section>`).join('')+
    '<div class="info-banner">Audio mẫu là giọng Mỹ tổng hợp đọc từ ví dụ, không phải bản thu âm vị tách riêng. Từ có phiên âm được lọc từ CMUdict; các từ còn thiếu vẫn tra cứu được trong kho đầy đủ.</div>';
}
function phoneme() {return state.phonemes.phonemes.find(p=>p.id===state.selectedPhoneme);}
function lexiconMarkup(result) {
  const pages=Math.ceil(result.total/result.limit);
  const focus=result.phoneme?state.phonemes.phonemes.find(p=>p.id===result.phoneme)?.us:'';
  return `<div class="lexicon-meta"><span>${result.total.toLocaleString('vi-VN')} mục${result.phoneme?' chứa âm Mỹ tương ứng':''}${result.query?' bắt đầu bằng “'+escape(result.query)+'”':''}</span><span>Trang ${result.page} / ${Math.max(1,pages)}</span></div>`+
    (result.items.length?`<div class="lexicon-list">${result.items.map(word=>`<article class="lexicon-row"><div class="lexicon-word"><strong lang="en">${escape(word.word)}</strong><div class="lexicon-pronunciation">${word.pronunciations.length?word.pronunciations.map(p=>ipaMarkup(p.ipa,focus)).join(''):'<span class="muted small">Chưa có IPA trong từ điển.</span>'}</div><span class="pronunciation-tag ${word.pronunciations.length?'known':'unknown'}">${word.pronunciations[0]?.source==='ipa-dict'?'IPA Mỹ':word.pronunciations.length?'CMU → IPA · chưa có dấu nhấn':'TTS đọc ước lượng'}</span></div><div class="lexicon-meanings">${meaningsMarkup(word.definitions)}</div><div class="actions"><button class="button secondary small" data-action="dictionary-audio" data-word="${escape(word.word)}" aria-label="Nghe ${escape(word.word)}">▶ Nghe</button>${state.route==='ipa'?`<button class="button small" data-action="practice-lex-word" data-word="${escape(word.word)}" data-ipa="${escape(word.pronunciations[0]?.ipa||'')}">Thu âm</button>`:''}</div></article>`).join('')}</div>`:'<div class="empty"><h3>Chưa có từ khớp bộ lọc</h3><p>Thử một tiền tố ngắn hơn hoặc bỏ bộ lọc âm.</p></div>')+
    `<div class="pagination"><button class="button secondary small" data-action="lexicon-page" data-page="${result.page-1}" ${result.page<=1?'disabled':''}>← Trang trước</button><span class="small muted">${result.limit} mục / trang</span><button class="button secondary small" data-action="lexicon-page" data-page="${result.page+1}" ${result.page>=pages?'disabled':''}>Trang sau →</button></div>`;
}
function ipaHelp() {
  return '<div class="ipa-help"><p><strong>Đọc phiên âm:</strong> <span class="ipa">ˈ</span> đứng trước âm tiết nhấn chính; <span class="ipa">ˌ</span> là nhấn phụ. Nguồn Mỹ thường viết /i, u/ tương ứng /iː, uː/ trên bảng; /ɫ/ là biến thể của /l/.</p><button class="button secondary small" data-action="ipa-size" aria-pressed="'+document.documentElement.classList.contains('ipa-large')+'">Aa · IPA lớn hơn</button></div>';
}
function renderFullDictionary(result) {
  main.innerHTML=heading('466.550 từ, ngay trên máy.','Tra từ, xem phiên âm Mỹ và nghĩa tiếng Việt. Dữ liệu nằm trên máy, không mất phí dịch.','THE COMPLETE WORD LIBRARY')+
    `<form id="lexicon-form" class="search-row"><label class="sr-only" for="search">Tìm từ bắt đầu bằng</label><input id="search" type="search" placeholder="Nhập từ hoặc phần đầu của từ, ví dụ: pronounce…" autocomplete="off"><label class="sr-only" for="phoneme-filter">Lọc theo âm IPA</label><select id="phoneme-filter"><option value="">Tất cả âm</option>${state.phonemes.phonemes.map(p=>`<option value="${p.id}">/${escape(p.symbol)}/ · US /${escape(p.us)}/</option>`).join('')}</select><button class="button" type="submit">Tìm từ</button></form><div class="actions bottom-space"><button class="button secondary small" data-action="curated-words">120 mục bài học & ví dụ →</button></div><div class="chart-note"><span class="note-dot">i</span><p><strong>${result.stats.with_meaning.toLocaleString('vi-VN')} mục có nghĩa Việt</strong> · ${result.stats.with_ipa.toLocaleString('vi-VN')} mục có IPA. Nghĩa thichhoc là bản dịch máy chưa kiểm duyệt; từ thiếu nghĩa được ghi rõ. Kho đầy đủ gồm cả tên riêng và từ hiếm.</p></div>${ipaHelp()}<div id="lexicon-results">${lexiconMarkup(result)}</div>`;
}
function renderPhonemeDetail(result) {
  const p=phoneme();const comfort=state.phonemes.progress[p.id]?.comfort||'new';
  main.innerHTML=`<a class="text-link" href="#ipa">← Bảng 44 âm IPA</a>`+heading('Luyện /'+p.symbol+'/','Bắt đầu với từ mẫu, kiểm tra vị trí tạo âm, rồi luyện cùng những từ trong kho.','SOUND LAB · '+(p.group==='consonant'?'PHỤ ÂM':p.group==='vowel'?'NGUYÊN ÂM ĐƠN':'NGUYÊN ÂM ĐÔI'))+
    `<div class="phoneme-detail-layout"><section class="panel sound-guide"><div class="sound-heading"><span class="detail-glyph">${escape(p.symbol)}</span><div><span class="eyebrow">CÁCH ĐỌC MỸ</span><div class="ipa">/${escape(p.us)}/</div><strong lang="en">${escape(p.example)}</strong></div></div><h3>Cách đặt miệng và lưỡi</h3><p>${escape(p.tip)}</p><div class="phonics-example">${escape(p.note)}</div><button class="button" data-action="play" data-id="ipa-${p.id}">▶ Nghe từ “${escape(p.example)}”</button><p class="audio-label">Audio đọc từ ví dụ bằng giọng Mỹ local.</p><hr class="divider"><label>Mức tự đánh giá của bạn</label><div class="comfort-options">${[['new','Chưa luyện'],['practicing','Đang luyện'],['comfortable','Đã quen']].map(([value,label])=>`<button class="choice" data-action="phoneme-progress" data-comfort="${value}" aria-pressed="${comfort===value}">${label}</button>`).join('')}</div><p class="field-help">Mức này do bạn đánh giá; chưa chấm phát âm tự động.</p></section><section class="panel" id="ipa-recorder"></section></div><section class="panel phoneme-vocabulary"><div class="section-head"><div><p class="eyebrow">WORDS WITH THIS SOUND</p><h2>Từ đi kèm /${escape(p.symbol)}/</h2></div><span class="tag">Đối chiếu Mỹ /${escape(p.us)}/</span></div><form id="lexicon-form" class="search-row"><label class="sr-only" for="search">Tìm từ trong âm này</label><input id="search" type="search" placeholder="Lọc theo phần đầu của từ…" autocomplete="off"><button class="button" type="submit">Tìm từ</button></form><p class="inline-note">Âm đang luyện được tô đậm trong IPA. Từ thông dụng được đưa lên trước; toàn bộ kết quả vẫn gồm cả tên riêng và từ hiếm. Nghĩa Việt có ghi nguồn bên dưới.</p>${ipaHelp()}<div id="lexicon-results">${lexiconMarkup(result)}</div></section>`;
  renderIpaRecorder();
}
function renderIpaRecorder() {
  const item=state.recordItem;
  const host=document.querySelector('#ipa-recorder');if(!host)return;
  host.innerHTML=`<p class="eyebrow">YOUR TURN · NGHE LẠI CHÍNH MÌNH</p><div class="ipa-record-heading"><h2 class="word-heading" lang="en">${escape(item.text)}</h2>${item.ipa?ipaMarkup(item.ipa,phoneme().us):''}${meaningsMarkup(item.definitions||[])}</div><p class="muted small">Nghe mẫu → thu âm → nghe bản của bạn → thử lại.</p><div class="actions"><button class="button secondary" data-action="ipa-play">▶ Nghe mẫu</button><button class="button" id="record-button" data-action="record">● Bắt đầu thu âm</button></div><div id="record-status" class="timer" role="status"></div><p class="audio-label">Tối đa 90 giây · bản ghi chỉ ở máy này</p><hr class="divider"><h3>Bản ghi của từ này</h3><div id="recordings-list">${recordingsMarkup(item.id)}</div><div class="rubric"><label><input type="checkbox"> Vị trí miệng và lưỡi đúng theo hướng dẫn.</label><label><input type="checkbox"> Tôi nghe ra sự khác biệt với từ mẫu.</label></div>`;
}
async function searchLexicon(query,page) {
  const sequence=++state.searchSequence;
  const filter=state.route==='ipa'?state.selectedPhoneme:(document.querySelector('#phoneme-filter')?.value||'');
  const result=await api('lexicon?'+new URLSearchParams({q:query,phoneme:filter,page}));
  if(sequence!==state.searchSequence||!document.querySelector('#lexicon-results'))return;
  state.lexiconQuery=query;state.lexiconPage=page;state.lexiconFilter=filter;
  document.querySelector('#lexicon-results').innerHTML=lexiconMarkup(result);
}

async function refreshDashboard() {state.dashboard=await api('dashboard');}
async function handleAction(button) {
  const action=button.dataset.action;
  if(state.recording&&!['record'].includes(action)){toast('Dừng và lưu bản ghi trước khi đổi bài.');return;}
  if(action==='ipa-size'){
    const large=document.documentElement.classList.toggle('ipa-large');
    button.setAttribute('aria-pressed',String(large));
    try{localStorage.setItem('ipa-large',String(large));}catch{}
    return;
  }
  if(action==='retry')return navigate();
  if(action==='day'){state.day=Number(button.dataset.day);state.sentenceIndex=0;state.results.clear();state.listens.clear();state.revealed.clear();location.hash='today';if(state.route==='today')await navigate();return;}
  if(action==='play'||action==='example')return play(button.dataset.id,{example:action==='example'});
  if(action==='dictionary-audio')return play(null,{word:button.dataset.word});
  if(action==='listen'){
    const item=sentence();const speed=Number(document.querySelector('#speed').value);
    if(await play(item.id,{speed})){state.listens.set(item.id,(state.listens.get(item.id)||0)+1);document.querySelector('.practice-counter').textContent=state.listens.get(item.id)+' lần nghe';}
    return;
  }
  if(action==='sentence'){stopAudio();state.sentenceIndex=Number(button.dataset.index);state.route==='speak'?renderSpeak():renderListen();return;}
  if(action==='reveal'){state.revealed.add(sentence().id);renderListen();return;}
  if(action==='try-again'){const item=sentence();state.results.delete(item.id);state.listens.delete(item.id);/* A revealed item remains assisted within this session. */pendingRequests.delete('dictation-'+state.day+'-'+item.id);sessionStorage.removeItem('draft-'+state.day+'-'+item.id);renderListen();return;}
  if(action==='next-sentence'){if(state.sentenceIndex<2){state.sentenceIndex++;renderListen();}else{location.hash='today';}return;}
  if(action==='complete'){await api('complete',{day:state.day});state.lesson.completed=true;await refreshDashboard();toast('Đã hoàn thành ngày '+state.day+'. Tiến độ đã lưu.');renderListen();return;}
  if(action==='record')return toggleRecording();
  if(action==='delete-record'){await api('recordings/delete',{id:button.dataset.id});state.records=state.records.filter(r=>r.id!==button.dataset.id);document.querySelector('#recordings-list').innerHTML=recordingsMarkup(state.route==='ipa'?state.recordItem.id:sentence().id);toast('Đã xóa bản ghi.');return;}
  if(action==='add-review'){await api('review',{request_id:id(),item_id:button.dataset.id,rating:'again'});toast('Đã thêm vào mục ôn hôm nay.');return;}
  if(action==='search-term'){document.querySelector('#search').value=button.dataset.word;return document.querySelector('#lexicon-form')?searchLexicon(button.dataset.word,1):search(button.dataset.word);}
  if(action==='lexicon-page')return searchLexicon(state.lexiconQuery,Number(button.dataset.page));
  if(action==='all-words'){state.lexiconFilter='';return navigate();}
  if(action==='curated-words'){const result=await api('search');renderDictionary(result);return;}
  if(action==='phoneme-progress'){
    state.phonemes.progress=await api('phoneme-progress',{id:state.selectedPhoneme,comfort:button.dataset.comfort});
    document.querySelectorAll('[data-action="phoneme-progress"]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.comfort===button.dataset.comfort)));
    toast('Đã lưu mức tự đánh giá cho âm này.');return;
  }
  if(action==='practice-lex-word'){
    const result=await api('lexicon?q='+encodeURIComponent(button.dataset.word));
    if(state.route!=='ipa'||!state.selectedPhoneme)return;
    const word=result.items.find(w=>w.word===button.dataset.word);
    state.recordItem={id:'lex-'+button.dataset.word,text:button.dataset.word,ipa:button.dataset.ipa||'',definitions:word?.definitions||[]};
    renderIpaRecorder();document.querySelector('#ipa-recorder').scrollIntoView({behavior:'smooth',block:'center'});return;
  }
  if(action==='ipa-play')return play(state.recordItem.id.startsWith('ipa-')?state.recordItem.id:null,state.recordItem.id.startsWith('lex-')?{word:state.recordItem.text}:{});
  if(action==='week-words'){const result=await api('search');result.words=result.words.filter(w=>w.unit===state.lesson.unit.id);document.querySelector('#search').value='';document.querySelector('#dictionary-results').innerHTML=dictionaryMarkup(result);return;}
  if(action==='flip'){state.flipped=true;renderReview();return;}
  if(action==='rate'){const word=state.reviewItems[state.reviewIndex];await api('review',{request_id:requestKey('review-'+word.id),item_id:word.id,rating:button.dataset.rating});pendingRequests.delete('review-'+word.id);state.reviewIndex++;state.flipped=false;renderReview();return;}
  if(action==='quiz'){state.quizIndex=0;state.quizResult=null;renderQuiz();return;}
  if(action==='quiz-answer'){const word=state.lesson.words[state.quizIndex];state.quizResult=await api('attempt',{request_id:requestKey('quiz-'+word.id),item_id:word.id,kind:'meaning',answer:button.dataset.answer,day:state.day});pendingRequests.delete('quiz-'+word.id);renderQuiz();return;}
  if(action==='quiz-next'){state.quizIndex++;state.quizResult=null;if(state.quizIndex>=state.lesson.words.length){toast('Đã lưu lượt luyện nghĩa.');return navigate();}return renderQuiz();}
  if(action==='restore'){
    const file=document.querySelector('#restore-file').files[0];
    if(!file)throw new Error('Chọn file JSON cần khôi phục.');
    if(!document.querySelector('#restore-confirm').checked)throw new Error('Đánh dấu xác nhận thay thế tiến độ trước khi khôi phục.');
    if(file.size>5*1024*1024)throw new Error('Bản sao lưu quá lớn (tối đa 5 MB).');
    let data;try{data=JSON.parse(await file.text());}catch{throw new Error('File không phải JSON hợp lệ.');}
    await api('restore',data);state.results.clear();pendingRequests.clear();await refreshDashboard();state.day=state.dashboard.day;renderSettings();toast('Đã khôi phục tiến độ.');
  }
}
main.addEventListener('click',async(event)=>{
  const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
  const allowDuringRecording=button.dataset.action==='record';
  button.disabled=true;
  try{await handleAction(button);}catch(error){toast(error.name==='NotAllowedError'?'Micro chưa được cho phép. Bấm biểu tượng quyền bên cạnh địa chỉ để bật microphone.':error.message,true);}
  finally{if(document.contains(button)&&(!state.recording||allowDuringRecording))button.disabled=false;}
});
main.addEventListener('submit',async(event)=>{
  event.preventDefault();const form=event.target;const submit=form.querySelector('[type=submit]');if(submit?.disabled)return;
  if(submit)submit.disabled=true;
  try{
    if(form.id==='dictation-form'){
      const item=sentence();const answer=document.querySelector('#answer').value.trim();
      if(!answer)throw new Error('Hãy viết những gì bạn nghe được trước khi kiểm tra.');
      if(!(state.listens.get(item.id)>0)&&!state.revealed.has(item.id))throw new Error('Bấm nghe câu trước khi trả lời.');
      const key='dictation-'+state.day+'-'+item.id;
      const result=await api('attempt',{request_id:requestKey(key),item_id:item.id,kind:'dictation',answer,day:state.day,listens:state.listens.get(item.id)||0,revealed:state.revealed.has(item.id)});
      result.answer=answer;state.results.set(item.id,result);pendingRequests.delete(key);state.lesson.attempted.push(item.id);renderListen();
    }
    if(form.id==='search-form')await search(document.querySelector('#search').value);
    if(form.id==='lexicon-form')await searchLexicon(document.querySelector('#search').value,1);
    if(form.id==='settings-form'){
      await api('settings',{name:document.querySelector('#name').value.trim(),minutes:Number(document.querySelector('#minutes').value),level:document.querySelector('#level').value,voice:document.querySelector('#voice').value,onboarded:true});
      await refreshDashboard();updateNav('settings');toast('Đã lưu. Bắt đầu buổi học khi bạn sẵn sàng.');
    }
  }catch(error){toast(error.message,true);}finally{if(submit&&document.contains(submit))submit.disabled=false;}
});
main.addEventListener('input',event=>{
  if(event.target.id==='answer')sessionStorage.setItem('draft-'+state.day+'-'+sentence().id,event.target.value);
});
window.addEventListener('hashchange',navigate);
window.addEventListener('beforeunload',event=>{if(state.recording){event.preventDefault();event.returnValue='';}});
async function start(){
  try{const bootstrap=await api('bootstrap');state.token=bootstrap.token;state.dashboard=bootstrap.dashboard;state.audio=bootstrap.audio;state.day=bootstrap.dashboard.day;await navigate();}
  catch(error){main.innerHTML=`<div class="error-box">${escape(error.message)}</div><p>Chạy <code>python3 app.py</code> rồi tải lại trang.</p>`;}
}
start();
