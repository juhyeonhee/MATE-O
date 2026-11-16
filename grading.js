(() => {
 const el=id=>document.getElementById(id);
 const panel=el('autoGradePanel'), comparison=el('revisionComparison');
 function tab(grading){panel.hidden=!grading;comparison.hidden=grading;el('autoGradeTab').setAttribute('aria-selected',String(grading));el('comparisonTab').setAttribute('aria-selected',String(!grading));}
 function grade(){
  tab(true);
  const revised=el('afterText').value.trim(),text=revised||el('beforeText').value.trim();
  if(!text){resetRubric();el('autoGradeStatus').textContent='초고 또는 수정본을 먼저 입력해 주세요.';return;}
  const threshold=Number(el('lengthThreshold').value);
  if(!Number.isInteger(threshold)||threshold<1){resetRubric();el('autoGradeStatus').textContent='분량 참고 기준을 1 이상의 정수로 입력해 주세요.';return;}
  const lines=text.split(/\n/).map(t=>t.trim()).filter(Boolean);
  const bullets=lines.filter(t=>/^([-*•▪]|\d+[.)]|[①-⑩])\s*/.test(t)).length;
  const prose=lines.length>0&&bullets<lines.length/2&&/[.!?。！？]|다[.\s]|요[.\s]/.test(text);
  const chars=text.replace(/\s/g,'').length;
  const title=el('reviewTitle').value.trim();
  const book=el('bookTitle').value.trim(),author=el('bookAuthor').value.trim();
  const checks=[
   [prose,`서술형 종결·문장부호 및 개조식 줄 ${bullets}/${lines.length}개를 참고했습니다.`],
   [chars>=threshold,`공백 제외 ${chars}자 / 참고 기준 ${threshold}자. 실제 A4 분량은 별도 확인이 필요합니다.`],
   [title.length>=4&&title!==book,`서평 제목 ${title?'「'+title+'」':'미입력'}. 제목의 독창성은 직접 검토하세요.`],
   [!!(book&&author&&/출판|출간|펴낸|발행/.test(text)&&/(?:19|20)\d{2}/.test(text)),`책 제목·저자 입력과 본문의 출판·연도 단서를 점검했습니다. 역자 해당 여부와 서지 정확성은 직접 확인하세요.`],
   [/(편찬|집필|출간|발표|저술|쓰인).{0,45}(배경|시대|당시)|(?:배경|당시|시대).{0,45}(편찬|집필|저술|쓰였|출간)/s.test(text),'편찬·집필과 시대·배경의 연결 표현을 점검했습니다.'],
   [/(핵심|주장|문제|주제).{0,70}(다룬|제기|말한|강조|묻|이다|있다)|저자는.{0,70}(주장|강조|문제)/s.test(text),'핵심 문제·주장과 설명의 연결 표현을 점검했습니다.'],
   [/(설득|비판|동의|공감|아쉽|장점|문제점|타당)/.test(text)&&/(때문|근거|장면|구절|예를|왜냐)/.test(text),'평가 표현과 판단의 근거 표현을 함께 점검했습니다.'],
   [/(현대|오늘날|현재|우리 사회)/.test(text)&&/(의의|의미|시사|가치|기여)/.test(text)&&/(한계|그러나|반면|부족|어렵)/.test(text),'현대 사회·의의·한계 단서의 동시 출현을 점검했습니다.'],
   [/(고전|시대를 넘어|오래도록|세대를 넘어)/.test(text)&&/(가치|의의|읽을|읽어야|보편|유효)/.test(text),'고전으로서의 지속적 가치에 관한 표현을 점검했습니다.'],
   [(/[“「][^”」]+[”」]/.test(text)||/(에 따르면|라고 (말|설명|주장)|라는 (주장|설명))/.test(text))&&(/\d+\s*(쪽|페이지)|p\.?\s*\d+/i.test(text)),'인용·간접 인용 표현과 쪽수 단서를 점검했습니다. 원문 대조는 별도 확인하세요.']
  ];
  checks.forEach(([pass,reason],i)=>{el('rubric'+i).value=pass?'1':'0';document.querySelectorAll('.grade-reason')[i].textContent=(pass?'1점 · ':'0점 · ')+reason;});
  updateRubric();el('autoGradeStatus').textContent=`${revised?'수정본':'초고'} 자동 채점 완료 · 규칙 기반 참고 점수입니다. 항목별 점수는 검토 후 조정할 수 있습니다.`;
 }
 el('autoGradeTab').addEventListener('click',grade);
 el('comparisonTab').addEventListener('click',()=>{tab(false);el('compareWriting').click();});
 el('compareWriting').addEventListener('click',()=>tab(false));
 function stale(){resetRubric();document.querySelectorAll('.grade-reason').forEach(x=>x.textContent='');el('autoGradeStatus').textContent='입력 내용이 변경됐습니다. 자동 채점 탭을 다시 눌러 주세요.';}
 ['beforeText','afterText','bookTitle','bookAuthor','reviewTitle','lengthThreshold'].forEach(id=>el(id).addEventListener('input',stale));
 el('resetRubric').addEventListener('click',stale);el('sampleBtn').addEventListener('click',stale);el('restoreWriting').addEventListener('click',stale);
})();
