const $ = (selector) => document.querySelector(selector);
const beforeText = $('#beforeText');
const afterText = $('#afterText');
const metricLabels = { understanding: '책의 이해', interpretation: '핵심 해석', critique: '비평과 근거', structure: '글의 구성', expression: '표현과 인용' };
const toulminDefs = [
 ['overview', 'Overview · 책 소개', /(저자|작가|소설|에세이|이 책|이 작품|다룬다|이야기)/],
 ['summary', 'Summary · 핵심 내용', /(주인공|내용|줄거리|핵심|주제|설명|다룬다)/],
 ['interpretation', 'Reading · 자신의 해석', /(의미|해석|생각|시사|드러낸다|보여 ?준다|읽었다)/],
 ['evidence', 'Evidence · 구체적 근거', /(장면|구절|문장|쪽|페이지|인용|예를 들어|「|“|『)/],
 ['critique', 'Critique · 가치와 한계', /(가치|한계|설득|아쉽|의의|비판|그러나|반면|장점)/],
 ['recommendation', 'Reader · 독자와 연결', /(추천|권하고|독자|우리|나의|삶|경험|사회)/]
];
const questionBank = {
 understanding: ['책이 다루는 핵심 문제를 자신의 말로 요약하면 무엇인가요?', '저자의 관점과 자신의 생각을 구분해 썼나요?'],
 interpretation: ['이 책을 관통하는 자신의 해석을 한 문장으로 써 볼까요?', '그 장면이 책 전체에서 갖는 의미는 무엇인가요?'],
 critique: ['책의 가치나 한계를 어떤 기준으로 판단했나요?', '자신의 평가를 뒷받침할 장면이나 구절은 어디에 있나요?'],
 structure: ['소개·요약·해석·평가가 자연스럽게 이어지나요?', '줄거리 요약을 줄이고 자신의 판단을 더할 부분이 있나요?'],
 expression: ['인용문과 자신의 해석을 구분하고 쪽수를 표시했나요?', '막연한 감상을 구체적인 문장으로 바꾸면 어떻게 될까요?']
};

function sentences(text) {
  return text.trim() ? text.trim().split(/(?<=[.!?。！？])\s+|\n+/).filter(Boolean) : [];
}

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function clamp(value, min = 0, max = 100) {
  return Math.round(Math.max(min, Math.min(max, value)));
}

function countMatches(text, regex) {
  const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
  return (text.match(new RegExp(regex.source, flags)) || []).length;
}

function analyze(text) {
 const list = sentences(text), chars = text.replace(/\s/g, '').length;
 const toulmin = Object.fromEntries(toulminDefs.map(([key,,regex]) => [key, regex.test(text)]));
 const paragraphs = text.split(/\n\s*\n|\n/).filter(p => p.trim()).length;
 const indicator = (keys) => clamp(keys.filter(k => toulmin[k]).length / keys.length * 100);
 const metrics = chars ? {
   understanding: indicator(['overview', 'summary']),
   interpretation: indicator(['interpretation', 'evidence']),
   critique: indicator(['critique', 'evidence']),
   structure: clamp((toulmin.overview ? 25 : 0) + (toulmin.interpretation ? 25 : 0) + (toulmin.critique ? 25 : 0) + (paragraphs >= 3 ? 25 : 0)),
   expression: clamp((/[.!?。！？]/.test(text) ? 25 : 0) + (paragraphs >= 2 ? 25 : 0) + (/\d+\s*(쪽|페이지)|p\.\s*\d+/i.test(text) ? 25 : 0) + (/[“”「」『』"]/.test(text) ? 25 : 0))
 } : Object.fromEntries(Object.keys(metricLabels).map(k => [k, 0]));
 return { chars, sentenceCount: list.length, metrics, score: clamp(Object.values(metrics).reduce((a,b)=>a+b,0)/5), toulmin };
}

function updateCounter(textarea, target) {
  const result = analyze(textarea.value);
  target.textContent = `${result.chars.toLocaleString()}자 · ${result.sentenceCount}문장`;
}

function deltaLabel(delta) {
  if (delta > 0) return `<span class="positive">+${delta}</span>`;
  if (delta < 0) return `<span class="negative">${delta}</span>`;
  return '±0';
}

function renderMetrics(before, after) {
  $('#metricList').innerHTML = Object.entries(metricLabels).map(([key, label]) => {
    const a = before.metrics[key], b = after.metrics[key], d = b - a;
    return `<div class="metric-row">
      <span class="metric-name">${label}</span>
      <div class="bars" aria-label="${label}: 수정 전 ${a}점, 수정 후 ${b}점">
        <div class="bar-track"><div class="bar bar-before" style="width:${a}%"></div></div>
        <div class="bar-track"><div class="bar bar-after" style="width:${b}%"></div></div>
      </div>
      <span class="metric-values">${a}→${b}<br>${deltaLabel(d)}</span>
    </div>`;
  }).join('');
}

function renderToulmin(before, after) {
  $('#toulminGrid').innerHTML = toulminDefs.map(([key, label]) => `
    <article class="toulmin-card">
      <header><strong>${label}</strong><span>${!before.toulmin[key] && after.toulmin[key] ? '새로 보완' : ''}</span></header>
      <div class="status-pair">
        <span class="status ${before.toulmin[key] ? 'present' : 'missing'}">전 ${before.toulmin[key] ? '단서 있음' : '단서 미검출'}</span>
        <span class="status ${after.toulmin[key] ? 'present' : 'missing'}">후 ${after.toulmin[key] ? '단서 있음' : '단서 미검출'}</span>
      </div>
    </article>`).join('');
}

function seededPick(items, seed, variation = 0) {
  const index = Math.abs(Math.floor(seed * 997 + variation * 101)) % items.length;
  return items[index];
}

function renderFeedback(before, after) {
  const ranked = Object.keys(metricLabels).map(key => ({ key, delta: after.metrics[key] - before.metrics[key], score: after.metrics[key] }));
  const improved = [...ranked].sort((a, b) => b.delta - a.delta).slice(0, 3);
  const needsWork = [...ranked].sort((a, b) => a.score - b.score).slice(0, 3);
  const added = toulminDefs.filter(([key]) => !before.toulmin[key] && after.toulmin[key]).map(([, label]) => label.split(' · ')[1]);

  const changes = improved.map(x => `${metricLabels[x.key]}가 ${x.delta >= 0 ? `${x.delta}점 증가` : `${Math.abs(x.delta)}점 낮아짐`}했습니다.`);
  if (added.length) changes.unshift(`서평 구성 요소 ${added.join(', ')}이(가) 수정문에서 새롭게 확인됩니다.`);
  $('#changeList').innerHTML = changes.slice(0, 4).map(x => `<li>${x}</li>`).join('');

  const temp = 0;
  $('#questionList').innerHTML = needsWork.map((x, i) => {
    const variation = temp >= .55 ? i + after.chars : 0;
    return `<li>${seededPick(questionBank[x.key], after.score + i, variation)}</li>`;
  }).join('');
}

function analyzeAndRender() {
  if (!beforeText.value.trim()) {
    alert('서평 초고를 입력해 주세요.');
    (!beforeText.value.trim() ? beforeText : afterText).focus();
    return;
  }
  const before = analyze(beforeText.value);
  const comparing = Boolean(afterText.value.trim());
  const after = analyze(comparing ? afterText.value : beforeText.value);
  const delta = after.score - before.score;
  const now = new Date();
  const book = [$('#bookTitle').value.trim(), $('#bookAuthor').value.trim()].filter(Boolean).join(' · ');
  $('#results').classList.toggle('single-review', !comparing);
  $('.after-score').hidden = !comparing;
  $('.score-arrow').hidden = !comparing;
  $('.before-score span').textContent = comparing ? '서평 초고' : '서평 초고 · 자동 점검 지수';

  $('#beforeScore').textContent = before.score;
  $('#afterScore').textContent = after.score;
  $('#overallDelta').textContent = !comparing ? '초고 점검' : delta > 0 ? `종합 +${delta}점` : delta < 0 ? `종합 ${delta}점` : '종합 변화 없음';
  $('#overallDelta').classList.toggle('down', delta < 0);
  $('#reportMeta').textContent = `${now.toLocaleDateString('ko-KR')} · ${book || '책 정보 미입력'} · ${comparing ? '수정 전후 비교' : '초고 점검'} · AI 의미 평가가 아닌 표현 단서 점검`;
  $('#printBefore').textContent = beforeText.value;
  $('#printAfter').textContent = afterText.value;
  renderMetrics(before, after);
  renderToulmin(before, after);
  if (!comparing) {
    $('#metricList').innerHTML = Object.entries(metricLabels).map(([key,label]) => `<div class="metric-row"><span class="metric-name">${label}</span><div class="bars"><div class="bar-track"><div class="bar bar-after" style="width:${before.metrics[key]}%"></div></div></div><span class="metric-values">${before.metrics[key]}</span></div>`).join('');
    $('#toulminGrid').innerHTML = toulminDefs.map(([key,label]) => `<article class="toulmin-card"><header>${label}</header><div class="status-pair"><span class="status ${before.toulmin[key] ? 'present' : 'missing'}">${before.toulmin[key] ? '단서 있음' : '단서 미검출'}</span></div></article>`).join('');
  }
  renderFeedback(before, after);
  if (!comparing) {
    $('#changeList').replaceChildren(...toulminDefs.map(([key,label]) => { const li = document.createElement('li'); li.textContent = `${label}: ${before.toulmin[key] ? '표현 단서 있음' : '단서 미검출 · 직접 검토 필요'}`; return li; }));
  }
  $('#emptyState').hidden = true;
  $('#results').hidden = false;
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

beforeText.addEventListener('input', invalidate);
afterText.addEventListener('input', invalidate);
$('#bookTitle').addEventListener('input', invalidate);
$('#bookAuthor').addEventListener('input', invalidate);
function invalidate() {
 updateCounter(beforeText, $('#beforeCount'));
 updateCounter(afterText, $('#afterCount'));
 $('#results').hidden = true;
 $('#emptyState').hidden = false;
}
$('#analyzeBtn').addEventListener('click', analyzeAndRender);
$('#printBtn').addEventListener('click', () => {
 if (beforeText.value.trim()) analyzeAndRender();
 document.body.classList.toggle('printing-report', !$('#results').hidden);
 // Open printing even for an empty worksheet; never depend on report visibility.
 window.print();
});
$('#sampleBtn').addEventListener('click', () => {
 $('#bookTitle').value = '어린 왕자'; $('#bookAuthor').value = '앙투안 드 생텍쥐페리';
 beforeText.value = '이 책은 어린 왕자가 여러 별을 여행하는 이야기이다. 재미있고 감동적이었다. 다른 사람에게도 추천하고 싶다.';
 afterText.value = '『어린 왕자』는 여행하는 주인공을 통해 관계의 의미를 묻는 소설이다. 이 책의 핵심은 특별한 관계가 시간과 돌봄으로 만들어진다는 데 있다고 생각한다.\n\n여우와 관계를 맺는 장면은 이러한 해석을 뒷받침한다. 어린 왕자가 자신의 장미를 새롭게 이해하는 변화는 관계의 가치가 겉모습보다 함께한 경험에 있음을 보여 준다.\n\n이 작품의 장점은 추상적인 문제를 구체적인 만남으로 드러낸다는 것이다. 그러나 관계에 대한 책임을 현실에서 어떻게 실천할지는 독자에게 남긴다. 타인과의 관계를 돌아보고 싶은 독자에게 이 책을 권하고 싶다.';
 invalidate(); analyzeAndRender();
});
invalidate();
