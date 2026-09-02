const $ = (selector) => document.querySelector(selector);
const beforeText = $('#beforeText');
const afterText = $('#afterText');
const temperature = $('#temperature');

const metricLabels = {
  claim: '주장 명료성', evidence: '근거 활용', reasoning: '논증 연결',
  structure: '구조 완결성', academic: '학술 문체', readability: '가독성'
};

const toulminDefs = [
  ['claim', 'Claim · 주장', /(주장|생각|필요하다|해야 한다|할 수 있다|중요하다|본고|이 글)/],
  ['data', 'Data · 근거', /(자료|연구|통계|조사|사례|결과|에 따르면|보여 ?준다|나타났다|%|퍼센트)/],
  ['warrant', 'Warrant · 보증', /(왜냐하면|따라서|그러므로|이는|때문|의미한다|연결된다|근거로)/],
  ['backing', 'Backing · 보강', /(선행 ?연구|이론|전문가|보고서|법률|문헌|추가로|뒷받침)/],
  ['qualifier', 'Qualifier · 한정', /(대체로|일반적으로|일부|경우에 따라|가능성이|수 있다|한편|범위)/],
  ['rebuttal', 'Rebuttal · 반박', /(그러나|하지만|반면|그럼에도|반론|한계|예외|물론|비판)/]
];

const questionBank = {
  claim: ['핵심 주장을 한 문장으로 더 분명하게 말하면 무엇인가요?', '주장의 적용 범위를 어디까지로 한정할 수 있을까요?'],
  evidence: ['이 주장을 직접 뒷받침하는 검증 가능한 자료는 무엇인가요?', '제시한 사례가 전체 주장을 대표한다고 볼 근거가 있나요?'],
  reasoning: ['이 근거가 왜 그 주장으로 이어지는지 연결 문장을 써 볼까요?', '근거와 결론 사이에 생략된 판단 기준은 무엇인가요?'],
  structure: ['각 문단이 하나의 중심 생각을 맡고 있나요?', '반론을 어느 위치에 놓아야 논증의 흐름이 더 선명해질까요?'],
  academic: ['단정적인 표현을 근거의 강도에 맞게 조절할 부분이 있나요?', '인용의 출처와 자신의 해석을 명확히 구분했나요?'],
  readability: ['가장 긴 문장을 둘로 나누면 핵심이 더 잘 보일까요?', '반복되는 표현을 줄이고도 의미를 유지할 수 있나요?']
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
  const s = sentences(text);
  const w = words(text);
  const chars = text.replace(/\s/g, '').length;
  const avgSentence = chars / Math.max(1, s.length);
  const paragraphCount = text.split(/\n\s*\n|\n/).filter(p => p.trim()).length;
  const connectors = countMatches(text, /(따라서|그러나|하지만|또한|한편|즉|반면|그러므로|첫째|둘째|마지막으로)/g);
  const citations = countMatches(text, /(에 따르면|\([^)]*\d{4}[^)]*\)|「|『|%|퍼센트|연구|조사)/g);
  const hedges = countMatches(text, /(수 있다|가능성이|대체로|일반적으로|일부|보인다|판단된다)/g);
  const repeats = (() => {
    const clean = w.map(x => x.replace(/[^가-힣a-zA-Z0-9]/g, '')).filter(x => x.length > 1);
    return clean.length ? 1 - new Set(clean).size / clean.length : 0;
  })();
  const toulmin = Object.fromEntries(toulminDefs.map(([key, , regex]) => [key, regex.test(text)]));

  const enough = Math.min(chars / 350, 1);
  const metrics = {
    claim: clamp((toulmin.claim ? 62 : 28) + (s.length >= 2 ? 10 : 0) + Math.min(12, connectors * 3) + enough * 10),
    evidence: clamp((toulmin.data ? 58 : 25) + Math.min(20, citations * 6) + (toulmin.backing ? 12 : 0) + enough * 8),
    reasoning: clamp((toulmin.warrant ? 56 : 27) + Math.min(17, connectors * 4) + (toulmin.rebuttal ? 9 : 0) + enough * 8),
    structure: clamp(30 + Math.min(22, paragraphCount * 6) + Math.min(24, connectors * 4) + (toulmin.rebuttal ? 9 : 0) + enough * 8),
    academic: clamp(32 + Math.min(24, citations * 6) + Math.min(18, hedges * 4) + (toulmin.qualifier ? 9 : 0) + enough * 8),
    readability: clamp(86 - Math.max(0, avgSentence - 48) * .65 - repeats * 35 + Math.min(10, paragraphCount * 2) + enough * 6)
  };
  const score = clamp(Object.values(metrics).reduce((a, b) => a + b, 0) / 6);
  return { chars, sentenceCount: s.length, metrics, score, toulmin };
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
        <span class="status ${before.toulmin[key] ? 'present' : 'missing'}">전 ${before.toulmin[key] ? '확인' : '미확인'}</span>
        <span class="status ${after.toulmin[key] ? 'present' : 'missing'}">후 ${after.toulmin[key] ? '확인' : '미확인'}</span>
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

  const changes = improved.map(x => `${metricLabels[x.key]}가 ${x.delta >= 0 ? `${x.delta}점 향상` : `${Math.abs(x.delta)}점 낮아짐`}했습니다.`);
  if (added.length) changes.unshift(`논증 요소 ${added.join(', ')}이(가) 수정문에서 새롭게 확인됩니다.`);
  $('#changeList').innerHTML = changes.slice(0, 4).map(x => `<li>${x}</li>`).join('');

  const temp = Number(temperature.value);
  $('#questionList').innerHTML = needsWork.map((x, i) => {
    const variation = temp >= .55 ? i + after.chars : 0;
    return `<li>${seededPick(questionBank[x.key], after.score + i, variation)}</li>`;
  }).join('');
}

function analyzeAndRender() {
  if (!beforeText.value.trim() || !afterText.value.trim()) {
    alert('수정 전 글과 수정 후 글을 모두 입력해 주세요.');
    (!beforeText.value.trim() ? beforeText : afterText).focus();
    return;
  }
  const before = analyze(beforeText.value);
  const after = analyze(afterText.value);
  const delta = after.score - before.score;
  const now = new Date();
  const layer = $('#layerSelect').selectedOptions[0].textContent;

  $('#beforeScore').textContent = before.score;
  $('#afterScore').textContent = after.score;
  $('#overallDelta').textContent = delta > 0 ? `종합 +${delta}점` : delta < 0 ? `종합 ${delta}점` : '종합 변화 없음';
  $('#overallDelta').classList.toggle('down', delta < 0);
  $('#reportMeta').textContent = `${now.toLocaleDateString('ko-KR')} · ${layer} · Temperature ${Number(temperature.value).toFixed(2)}`;
  $('#printBefore').textContent = beforeText.value;
  $('#printAfter').textContent = afterText.value;
  renderMetrics(before, after);
  renderToulmin(before, after);
  renderFeedback(before, after);
  $('#emptyState').hidden = true;
  $('#results').hidden = false;
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setTemperature(value) {
  temperature.value = value;
  $('#temperatureValue').value = Number(value).toFixed(2);
  document.querySelectorAll('.preset').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.value) === Number(value)));
  const v = Number(value);
  $('#temperatureHint').textContent = v <= .25 ? '재현성과 일관성 우선' : v <= .5 ? '일관성과 질문 다양성의 균형' : '다양한 관점과 질문 탐색';
}

beforeText.addEventListener('input', () => updateCounter(beforeText, $('#beforeCount')));
afterText.addEventListener('input', () => updateCounter(afterText, $('#afterCount')));
temperature.addEventListener('input', () => setTemperature(temperature.value));
document.querySelectorAll('.preset').forEach(btn => btn.addEventListener('click', () => setTemperature(btn.dataset.value)));
$('#analyzeBtn').addEventListener('click', analyzeAndRender);
$('#printBtn').addEventListener('click', () => {
  if ($('#results').hidden) {
    analyzeAndRender();
    if ($('#results').hidden) return;
  }
  window.print();
});
$('#sampleBtn').addEventListener('click', () => {
  beforeText.value = '인공지능은 대학 글쓰기 교육에 필요하다. 학생들은 인공지능을 사용하면 글을 빨리 쓸 수 있다. 따라서 수업에서 인공지능을 많이 활용해야 한다.';
  afterText.value = '대학 글쓰기 수업에서는 학습자의 판단 과정을 보존하는 범위에서 인공지능을 활용할 필요가 있다. 한 대학의 수업 사례에 따르면 즉각적인 피드백은 초고 수정에 도움을 줄 수 있다. 이는 피드백의 속도가 학습자에게 반복 수정의 기회를 제공하기 때문이다. 그러나 인공지능이 문단 전체를 대신 작성하면 학습자의 사고 과정이 축소될 수 있다. 따라서 교수자의 확인 아래 진단과 질문 중심으로 활용하는 것이 타당하다.';
  updateCounter(beforeText, $('#beforeCount'));
  updateCounter(afterText, $('#afterCount'));
  setTemperature(.4);
  analyzeAndRender();
});

setTemperature(.4);
updateCounter(beforeText, $('#beforeCount'));
updateCounter(afterText, $('#afterCount'));
