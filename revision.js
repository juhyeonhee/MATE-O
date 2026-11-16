(() => {
 const get = id => document.getElementById(id);
 const draft = get('beforeText'), revision = get('afterText');
 const key = 'mate-c-book-review-writing-v1';
 const split = text => (text.match(/[^.!?。！？\n]+(?:[.!?。！？]+|$)/g) || []).map(s=>s.trim()).filter(Boolean);
 const count = (text,re) => (text.match(re)||[]).length;
 const concerns = s => {
  const reasons=[];
  if(s.length>100) reasons.push('100자를 넘는 문장입니다. 중심 생각이 둘 이상이면 나누어 볼까요?');
  if(/재미있|감동적|좋았다|유익했|훌륭/.test(s) && !/장면|구절|때문|예를|쪽/.test(s)) reasons.push('감상의 이유를 책의 장면이나 구절로 설명해 볼까요?');
  if(/무조건|누구나|모든 사람|반드시|항상/.test(s)) reasons.push('이 판단이 적용되지 않는 경우도 있을까요? 단정의 범위를 확인하세요.');
  if(/현대 사회에서|오늘날|우리 사회/.test(s) && !/예를|사례|경험|때문/.test(s)) reasons.push('현대 사회와의 연결을 구체적인 사례로 뒷받침해 볼까요?');
  return reasons;
 };
 function message(text){get('writingStatus').textContent=text;}
 function marked(target,text,highlight) {
  target.replaceChildren();
  if(!text.trim()){target.textContent='입력된 글이 없습니다.';return;}
  // Preserve paragraphs and punctuation while adding safe text-only highlights.
  text.split(/(\n+)/).forEach(part=>{
   if(/^\n+$/.test(part)){target.append(document.createTextNode(part));return;}
   split(part).forEach(s=>{const el=document.createElement(highlight(s)?'mark':'span');el.textContent=s;target.append(el,document.createTextNode(' '));});
  });
 }
 function review(text,label) {
  if(!text.trim()){message(`${label}를 먼저 입력해 주세요.`);return;}
  get('sentenceCheck').hidden=false;
  const sentences=split(text), flagged=sentences.filter(s=>concerns(s).length);
  get('sentenceCheckTitle').textContent=`${label} 문장 점검 · ${sentences.length}문장 중 ${flagged.length}문장 검토`;
  marked(get('markedWriting'),text,s=>concerns(s).length>0);
  get('sentenceAdvice').replaceChildren();
  for(const s of flagged){const li=document.createElement('li');li.textContent=`「${s}」 — ${concerns(s).join(' ')}`;get('sentenceAdvice').append(li);}
  if(!flagged.length){const li=document.createElement('li');li.textContent='현재 규칙에서 검토 단서를 찾지 못했습니다. 책 내용의 정확성, 인용 출처, 비평의 근거는 직접 확인하세요.';get('sentenceAdvice').append(li);}
  message(`${label} 점검을 완료했습니다.`);
 }
 function stats(text){return [text.replace(/\s/g,'').length,split(text).length,text.split(/\n\s*\n|\n/).filter(x=>x.trim()).length,count(text,/재미있|감동적|좋았다|유익했|훌륭/g),count(text,/장면|구절|예를 들어|\d+\s*쪽/g),count(text,/그러나|하지만|한계|아쉽|반면/g),count(text,/생각한다|해석|나의|내가|판단/g),split(text).filter(s=>concerns(s).length).length];}
 function list(target,items){target.replaceChildren();items.forEach(t=>{const li=document.createElement('li');li.textContent=t;target.append(li);});}
 function compare(){
  if(!draft.value.trim()||!revision.value.trim()){message('초고와 수정본을 모두 입력한 뒤 비교해 주세요.');return;}
  get('revisionComparison').hidden=false;
  const original=new Set(split(draft.value)), revised=new Set(split(revision.value));
  marked(get('originalCompare'),draft.value,s=>!revised.has(s));marked(get('revisedCompare'),revision.value,s=>!original.has(s));
  const labels=['글자 수(공백 제외)','문장 수','문단 수','감상 표현 단서 수','장면·구절·구체적 근거 단서 수','비판·한계 표현 단서 수','서평자 관점 표현 단서 수','수정 검토 문장 수'];
  const a=stats(draft.value),b=stats(revision.value);get('writingComparisonRows').replaceChildren();
  labels.forEach((label,i)=>{const row=document.createElement('tr');[label,a[i],b[i],b[i]-a[i]>0?'+'+(b[i]-a[i]):String(b[i]-a[i])].forEach(v=>{const td=document.createElement('td');td.textContent=v;row.append(td);});get('writingComparisonRows').append(row);});
  const changes=labels.map((label,i)=>`${label}: ${a[i]} → ${b[i]}`).filter((_,i)=>a[i]!==b[i]);
  list(get('writingChanges'),changes.length?changes:['비교 지표의 수치 변화가 없습니다. 문장 내용의 변화는 위 원문에서 확인하세요.']);
  const next=[];
  if(b[4]===0)next.push('평가를 뒷받침할 구체적인 장면·구절과 쪽수를 제시했나요?');
  if(b[5]===0)next.push('책의 의의와 함께 한계도 검토했나요?');
  if(b[6]===0)next.push('줄거리 요약과 구별되는 자신의 해석과 판단이 드러나나요?');
  if(b[7])next.push(`수정본의 검토 대상 ${b[7]}문장을 다시 살펴보세요.`);
  next.push('고전으로서의 가치 평가와 직접·간접 인용의 정확성을 10개 채점 기준과 대조하세요.');
  list(get('writingNext'),next);message('수정 전후 비교를 완료했습니다.');get('revisionComparison').scrollIntoView({behavior:'smooth'});
 }
 get('reviewDraft').addEventListener('click',()=>review(draft.value,'초고'));
 get('reviewRevision').addEventListener('click',()=>review(revision.value,'수정본'));
 get('copyDraft').addEventListener('click',()=>{if(!draft.value.trim()){message('초고를 먼저 입력해 주세요.');return;}if(revision.value.trim()&&!confirm('수정창의 글을 초고로 바꿀까요?'))return;revision.value=draft.value;revision.dispatchEvent(new Event('input',{bubbles:true}));revision.focus();message('초고를 수정창에 복사했습니다.');});
 get('saveWriting').addEventListener('click',()=>{try{localStorage.setItem(key,JSON.stringify({draft:draft.value,revision:revision.value,title:get('bookTitle').value,author:get('bookAuthor').value}));message('현재 브라우저에 원문과 수정본을 저장했습니다.');}catch{message('브라우저 저장이 제한되어 있습니다. 글을 별도로 복사해 보관하세요.');}});
 get('restoreWriting').addEventListener('click',()=>{try{const raw=localStorage.getItem(key);if(!raw){message('저장된 글이 없습니다.');return;}if((draft.value.trim()||revision.value.trim())&&!confirm('현재 글을 저장한 글로 바꿀까요?'))return;const data=JSON.parse(raw);for(const [id,prop] of [['beforeText','draft'],['afterText','revision'],['bookTitle','title'],['bookAuthor','author']]){get(id).value=typeof data[prop]==='string'?data[prop]:'';get(id).dispatchEvent(new Event('input',{bubbles:true}));}message('저장한 글을 불러왔습니다.');}catch{message('저장한 글을 불러오지 못했습니다.');}});
 get('clearSavedWriting').addEventListener('click',()=>{try{localStorage.removeItem(key);message('브라우저에 저장한 글을 삭제했습니다. 현재 입력창의 글은 유지됩니다.');}catch{message('브라우저 저장소에 접근할 수 없습니다.');}});
 get('compareWriting').addEventListener('click',compare);
 get('backToRevision').addEventListener('click',()=>{revision.scrollIntoView({behavior:'smooth'});revision.focus();});
 function stale(){get('sentenceCheck').hidden=true;get('revisionComparison').hidden=true;message('글이 변경됐습니다. 문장 점검과 비교를 다시 실행해 주세요.');}
 [draft,revision,get('bookTitle'),get('bookAuthor')].forEach(el=>el.addEventListener('input',stale));get('sampleBtn').addEventListener('click',stale);
})();
