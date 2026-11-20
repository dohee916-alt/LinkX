import {keys,labels} from "./keyboard-layout.js";
import {messageBubble} from "./components.js";
import {playDiamond} from "./diamond-glow.js?v=1";
import {navigate,params,openSaved,syncScrollEdges} from "../../shared/navigation.js?v=edges1";
import {getStore,updateStore,saveConversation} from "../../shared/store.js";
import {greeting,exampleUser,replies,alternatives,errors} from "./scenario.js";
const $=id=>document.getElementById(id),root=$("emergency"),list=$("messages"),chat=$("chat"),input=$("message");
const query=params();const resumed=query.get("resume")==="1"?getStore().emergencyDraft:null;
let state=resumed||{id:"emergency-"+Date.now(),messages:[],turn:0,version:0,error:null,phase:"chat",scroll:null};
let timer=null,departureTimer=null,pending=false,noticeTimer=null; let greetingTimer=null, frameId=null, finalTimer=null; let DURATION=90000; const TRAVEL=210.08, FINAL_LEAD=4000; const isPreview=!!query.get("preview"); state.startedAt=state.startedAt||Date.now(); state.frozenX=null; let newRow=-1;
const preserve=()=>{if(!isPreview)updateStore({emergencyDraft:{...state,scroll:chat.scrollTop,draft:input.value,pending}})};
function button(label,text,fn){const b=document.createElement("button");b.type="button";b.setAttribute("aria-label",label);const icon={"이전 답변":"prev","다음 답변":"next","다시 시도":"retry","답변 재생성":text==="first"?"retryFirst":"retry"}[label];if(icon){b.className="lx-micro lx-"+icon;const im=document.createElement("img");im.src="../../assets/emergency/"+icon+".svg";im.alt="";b.append(im)}else b.textContent=text;b.onclick=fn;return b}
function goSaved(){preserve();openSaved("emergency",{resume:1})}
function home(){stopDemo();clearTimeout(finalTimer);clearTimeout(finishDeadline);clearTimeout(timer);clearTimeout(departureTimer);preserve();navigate("home")}
function showNotice(text){$("notice").textContent=text;$("notice").hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$("notice").hidden=true,2500)}

// The greeting character is a child of the actual message row, not a separately animated overlay.
const actor=$("chat-character");
function positionCharacter(){
 if(state.phase==="departure"){actor.hidden=true;return}
 const anchor=list.querySelector("[data-character-anchor]");
 if(!anchor){actor.hidden=true;return}
 const mode=state.timedOut?"ending":root.classList.contains("is-character-peek")?"peek":"greeting";
 const target=mode==="greeting"?anchor:root;
 if(actor.parentElement!==target)target.appendChild(actor);
 actor.dataset.mode=mode;actor.hidden=false;
}
function updateChatLayout(){const inset=parseFloat(getComputedStyle(root).getPropertyValue("--keyboard-offset"))||0;const extra=parseFloat(getComputedStyle(root).getPropertyValue("--composer-extra"))||0;const rows=Array.from(list.children);const content=rows.reduce((n,r)=>n+r.offsetHeight,0)+Math.max(0,rows.length-1)*12.48;const full=content+76.4>Math.max(0,514.8-inset-extra);root.classList.toggle("is-long-chat",full);root.classList.toggle("is-character-peek",content+76.4>514.8);positionCharacter();}
function render({bottom=true}={}){if(list.contains(actor))root.appendChild(actor);list.replaceChildren();const first=state.messages.findIndex(m=>m.role==="ai");
state.messages.forEach((m,index)=>{const row=document.createElement("div");row.className="lx-row "+m.role;if(index===newRow)row.classList.add("lx-arriving");if(index===first)row.dataset.characterAnchor="true";row.append(messageBubble(m));if(m.role==="ai"&&m.versions&&index===state.messages.length-1&&!pending){const tools=document.createElement("div");tools.className="lx-tools";if(m.version>0)tools.append(button("이전 답변","‹",()=>version(index,-1)));tools.append(button("답변 재생성",m.version===0&&m.versions.length===1?"first":"retry",()=>regenerate(index)));if(m.version<m.versions.length-1)tools.append(button("다음 답변","›",()=>version(index,1)));tools.dataset.multiple=String(m.versions.length>1);row.append(tools)}list.append(row)});
if(pending){const dots=document.createElement("div");dots.className="lx-loading";dots.setAttribute("aria-label","응답 생성 중");for(let i=0;i<4;i++)dots.append(document.createElement("i"));const row=document.createElement("div");row.className="lx-row ai";row.append(dots);list.append(row)}
if(state.error){const row=document.createElement("div");row.className="lx-error-row";const e=document.createElement("span");e.className="lx-error";e.textContent=errors[state.error]||errors.general;row.append(e,button("다시 시도","⟲",()=>generate()));list.append(row)}
newRow=-1;updateSendState();$("send").setAttribute("aria-label",pending?"생성 중지":"전송");$("send").replaceChildren();if(pending){const stop=document.createElement("img");stop.src="../../assets/emergency/label-stop.svg";stop.alt="";$("send").append(stop)}else{const a=document.createElement("img");a.src="../../assets/emergency/send.svg";a.alt="";$("send").append(a)}
updateChatLayout();requestAnimationFrame(()=>{if(bottom)chat.scrollTop=chat.scrollHeight;syncScrollEdges(chat);preserve()});preserve()}
function version(index,delta){if(state.timedOut)return;const m=state.messages[index];m.version=Math.max(0,Math.min(m.versions.length-1,m.version+delta));m.text=m.versions[m.version];render()}
function regenerate(index){if(state.timedOut)return;const m=state.messages[index];if(!m.versions)return;const opts=m.options||alternatives;const next=opts[m.versions.length%opts.length];if(m.versions.length<opts.length)m.versions.push(next);m.version=(m.version+1)%m.versions.length;m.text=m.versions[m.version];render()}

const autoDemo=query.get("auto")!=="0"&&!isPreview;
let demoTimer=null,typing=false,demoCancelled=false,autoFocus=false;
const direct=()=>state.manual||!autoDemo;
const pace=(i)=>[195,220,205,240,210,225,200][i%7];
const reading=t=>Math.max(2500,Math.min(8500,t.length*75));
const demoDuration=()=>100+2500+exampleUser.reduce((sum,t,i)=>sum+demoStrokes(t).reduce((n,_,j)=>n+pace(j),0)+650+2000+(i===0?reading(replies[0]):reading(replies[1])),0)+FINAL_LEAD;
function beginManual(){if(isPreview||state.phase!=="chat"||state.timedOut||state.manual)return;const wasTyping=typing||(!state.manual&&!!input.value);stopDemo();if(wasTyping){input.value="";resizeComposer();updateSendState()}state.manual=true;DURATION=90000;if(readyAnimation)readyAnimation.cancel();tick();preserve()}
const branches=[
[/거절|싫어|무시|반응|상처|이상하게|부담스러/,"상대가 어떻게 반응할지 몰라서 걱정되는구나. 인사 한마디만 건네도 충분해. 상대의 반응까지 네가 책임질 필요는 없어.","반응이 어떻든 먼저 인사해 본 것 자체가 오늘의 성공이야."],
[/영어|외국어|발음|문법|못 알아|못알아|언어/,"완벽한 영어가 필요하지 않아. 가볍게 Hi! 한마디부터 해볼까?","짧게 인사하고 미소 지어도 충분히 마음이 전달될 수 있어."],
[/뭐라고|무슨 말|어떻게|첫마디|첫 마디|인사|말 걸/,"처음엔 Hi! 또는 Hello! 정도면 충분해. 길게 대화해야 한다는 부담은 내려놓자.","눈이 마주쳤을 때 가볍게 웃으면서 인사해 보는 건 어때?"],
[/바빠|이어폰|혼자|시간|방해|통화/,"상대가 바빠 보이면 잠깐 기다려도 좋아. 눈이 마주치거나 여유 있어 보일 때 인사해 보자.","지금 당장 말하지 않아도 괜찮아. 편한 타이밍을 찾아보자."],
[/떨|긴장|불안|무서|겁|심장|두려|걱정/,"긴장되는 건 자연스러워. 숨을 천천히 한 번 쉬고, 오늘은 인사 한마디만 해보자.","우리가 연습한 것처럼 짧게 시작해도 괜찮아."],
[/안 할|안할|못 하|못하|포기|싫어|나중/,"부담이 크구나. 지금은 한마디만 건네는 작은 목표로 생각해 볼까?","네가 편한 속도로 시도해도 좋아. 준비되면 출발하자."],
[/할 수|할수|해볼|해 볼|가볼|가 볼|준비|자신/,"좋아! 지금 그 마음이면 충분해. 가볍게 인사부터 해보자.","잘하고 와. 한마디 건넨 것만으로도 좋은 경험이 될 거야."]
];
function responseOptions(t){const b=branches.find(x=>x[0].test(t));return b?[b[1],b[2]]:["어떤 마음인지 조금 더 이야기해 줘도 좋아. 오늘은 가볍게 인사 한마디만 건네는 걸 목표로 해보자.","부담 갖지 말고 네가 편한 방식으로 짧게 인사해 보자."] }

function stopDemo(){clearTimeout(demoTimer);clearKey();typing=false;demoCancelled=true}
// Emulate Korean IME composition: onset, vowel, then final consonant.
function typingFrames(text){
 const onset="ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", frames=[];let prefix="";
 for(const ch of text){const n=ch.charCodeAt(0)-0xAC00;
  if(n>=0&&n<11172){const l=Math.floor(n/588),v=Math.floor(n%588/28),t=n%28;frames.push(prefix+onset[l]);if(t)frames.push(prefix+String.fromCharCode(0xAC00+l*588+v*28));}
  prefix+=ch;frames.push(prefix);
 }return frames;
}
function scheduleDemo(delay=900){
 if(!autoDemo||demoCancelled||state.phase!=="chat"||state.timedOut||state.error||pending||state.turn>=exampleUser.length)return;
 clearTimeout(demoTimer);
 demoTimer=setTimeout(()=>{
  if(demoCancelled||state.phase!=="chat"||state.timedOut||state.error||pending||input.value||!$("confirm").hidden)return;
  const strokes=demoStrokes(exampleUser[state.turn]);const chars=strokes.map(x=>x.text);let i=0;typing=true;autoFocus=true;input.focus();autoFocus=false;
  function step(){if(!typing||demoCancelled||state.phase!=="chat"||state.timedOut)return;
   flashKey(strokes[i].key);input.value=chars[i++];input.dispatchEvent(new Event("input",{bubbles:true}));
   if(i<chars.length)demoTimer=setTimeout(step,pace(i-1));
   else{typing=false;demoTimer=setTimeout(()=>{if(!demoCancelled&&state.phase==="chat"){input.blur();send()}},650)}
  }step();
 },delay);
}
input.addEventListener("pointerdown",beginManual);input.addEventListener("focus",()=>{if(!autoFocus)beginManual()});input.addEventListener("beforeinput",beginManual);input.addEventListener("keydown",e=>{if(!autoFocus&&!state.manual&&!isPreview)beginManual()});

function generate(){if(state.timedOut||state.phase!=="chat")return;clearTimeout(timer);state.error=null;pending=true;render();timer=setTimeout(()=>{pending=false;const forced=query.get("error");if(forced&&errors[forced]&&!state.errorShown&&state.turn>=Number(query.get("errorTurn")||2)){state.errorShown=true;state.error=forced;render();return}const opts=direct()?responseOptions(state.messages.filter(m=>m.role==="user").at(-1)?.text||""):null;const text=opts?(opts.find(t=>!state.messages.some(m=>m.text===t))||opts[0]):(replies[Math.min(state.turn-1,1)]||replies[0]);const m={role:"ai",text};if(opts||state.turn===1){m.versions=[text];m.version=0;if(opts)m.options=[text,...opts.filter(t=>t!==text)]}newRow=state.messages.length;state.messages.push(m);render();if(!direct()){if(state.turn>=exampleUser.length){clearTimeout(finalTimer);finalTimer=setTimeout(showFinal,reading(text));}else scheduleDemo(reading(text));}},2000)}
function send(){if(state.phase!=="chat"||state.timedOut)return;clearTimeout(demoTimer);typing=false;if(pending){stopDemo();clearTimeout(timer);pending=false;render();return}const text=input.value.trim();if(!text)return;input.value="";resizeComposer();if(!state.messages.length){clearTimeout(greetingTimer);state.messages.push({role:"ai",text:greeting})}state.messages.push({role:"user",text});state.turn++;generate()}
function departure(){$("diamond-glow").hidden=true;clearTimeout(timer);pending=false;state.phase="departure";$("chat-character").hidden=true;root.classList.remove("is-transition");root.classList.add("is-departure");for(const id of ["chat","ready-area","composer"])$(id).hidden=true;$("departure").hidden=false;$("departure-title").textContent=state.departureReason==="timeout"?"이제 진짜 가보자":"잘 다녀와!";clearTimeout(departureTimer);preserve()}
function positionAt(now=Date.now()){return TRAVEL*Math.min(1,Math.max(0,(now-state.startedAt)/DURATION))}
let readyAnimation=null,finishDeadline=null;function setReadyX(x){$("ready-motion").style.transform="translate3d("+x+"px,0,0)"}
function tick(){if(state.phase!=="chat")return;clearTimeout(finalTimer);clearTimeout(finishDeadline);const remaining=DURATION-(Date.now()-state.startedAt);finishDeadline=setTimeout(finishTimer,Math.max(0,remaining));if(direct()){if(remaining<=FINAL_LEAD)showFinal();else finalTimer=setTimeout(()=>{if(!input.value.trim()&&!pending)showFinal()},remaining-FINAL_LEAD);}else if(state.turn>=exampleUser.length&&!pending){finalTimer=setTimeout(showFinal,Math.max(0,remaining-FINAL_LEAD));}const x=positionAt();setReadyX(x);if(x>=TRAVEL){finishTimer();return}readyAnimation=$("ready-motion").animate([{transform:"translate3d("+x+"px,0,0)"},{transform:"translate3d("+TRAVEL+"px,0,0)"}],{duration:DURATION*(1-x/TRAVEL),easing:"linear",fill:"forwards"});readyAnimation.onfinish=finishTimer}
function showFinal(){if(state.phase!=="chat"||state.timedOut)return;stopDemo();input.value="";resizeComposer();state.timedOut=true;clearTimeout(timer);clearTimeout(greetingTimer);pending=false;state.error=null;newRow=state.messages.length;state.messages.push({role:"ai",text:replies[2]});input.blur();input.readOnly=true;render()}
function finishTimer(){if(state.phase!=="chat")return;if(!direct()&&!state.timedOut){if(state.error){return}if(pending||typing||state.turn<exampleUser.length){finishDeadline=setTimeout(finishTimer,500);return}showFinal();finishDeadline=setTimeout(()=>ready("timeout"),FINAL_LEAD);return}showFinal();ready("timeout")}
function ready(reason="manual"){if(state.phase!=="chat")return;stopDemo();clearTimeout(finalTimer);clearTimeout(finishDeadline);state.departureReason=reason==="timeout"?"timeout":"manual";state.frozenX=readyAnimation?new DOMMatrixReadOnly(getComputedStyle($("ready-motion")).transform).m41:positionAt();if(readyAnimation){readyAnimation.cancel();readyAnimation=null}setReadyX(state.frozenX);cancelAnimationFrame(frameId);clearTimeout(greetingTimer);state.phase="transition";clearTimeout(timer);pending=false;const bx=20.8+state.frozenX+69.16;const by=$("ready-area").offsetTop+$("ready-motion").offsetTop+24.96;input.blur();root.classList.add("is-transition");preserve();playDiamond($("diamond-glow"),bx,by,departure)}
function showGreeting(){if(state.phase!=="chat"||state.messages.length)return;newRow=0;state.messages.push({role:"ai",text:greeting});render();scheduleDemo(2500)}
$("composer").addEventListener("submit",e=>{e.preventDefault();send()});$("saved").onclick=goSaved;$("back").onclick=()=>{$("confirm").hidden=false};$("continue").onclick=()=>{$("confirm").hidden=true;scheduleDemo()};$("leave").onclick=home;$("ready").onclick=()=>ready("manual");$("returned").onclick=()=>{saveConversation({id:state.id,type:"emergency",messages:state.messages,title:state.messages.find(m=>m.role==="user")?.text||greeting});updateStore({emergencyDraft:null});location.href="../feedback/index.html?entry=returned"};
$("mic").onclick=()=>{beginManual();const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){showNotice("이 브라우저에서는 음성 입력을 지원하지 않아요.");return}try{const s=new Speech();s.lang="ko-KR";s.onresult=e=>input.value=e.results[0][0].transcript;s.onerror=()=>showNotice("음성 입력을 사용할 수 없어요.");s.start()}catch{showNotice("음성 입력을 사용할 수 없어요.")}};
window.addEventListener("pagehide",preserve);chat.addEventListener("scroll",()=>{state.scroll=chat.scrollTop;syncScrollEdges(chat)},{passive:true});
// Development-only preview states for Figma QA (not a visible production screen).
const preview=query.get("preview");if(preview){if(["long","scroll","loading","error","regenerate","transition","departure"].includes(preview)){let u1=exampleUser[0],u2=exampleUser[1];if(preview==="scroll"){u1+=" 저 사람 그리고 지금 이어폰 꽂고 음악 듣고 있는 것 같은데 내가 가서 말 걸어도 될까..?";u2="근데 그건 가상 상황 연습이었잖아. 실제 사람이 그러면 나 다시는 앞으로 시도 안 해볼 것 같아.. 아 어떡하지 못 가겠어.. 차라리 안 하고 상처도 안 받는게 나을 것 같아"}state.messages=[{role:"ai",text:greeting},{role:"user",text:u1},{role:"ai",text:replies[0],versions:[replies[0]],version:0}];state.turn=1;if(preview!=="regenerate"){state.messages.push({role:"user",text:u2});state.turn=2;if(!["error","loading"].includes(preview))state.messages.push({role:"ai",text:replies[1]},{role:"ai",text:replies[2]})}if(preview==="error")state.error=query.get("error")||"general";if(preview==="loading"){pending=true;setTimeout(()=>{if(pending)generate()},600)}}if(preview==="input"){state.messages=[{role:"ai",text:greeting}];input.value=exampleUser[0]}if(preview==="confirm"){state.messages=[{role:"ai",text:greeting}];$("confirm").hidden=false;}}
// Fit the original Figma frame as one coordinate space; never individually shift its children.
function fitFrame(){const w=window.visualViewport?.width??window.innerWidth,h=window.visualViewport?.height??window.innerHeight;root.style.setProperty("--lx-frame-scale",Math.min(w/390,window.innerHeight/844,1));}
fitFrame();
new ResizeObserver(()=>{syncScrollEdges(chat)}).observe(chat);
new ResizeObserver(()=>{updateChatLayout();syncScrollEdges(chat)}).observe(list);

let baselineHeight=window.visualViewport?.height||window.innerHeight;
const embedded=window.parent!==window;const nativeTouch=!embedded&&matchMedia("(pointer:coarse)").matches&&navigator.maxTouchPoints>0;if(embedded)input.inputMode="none";
let previewKeyboard=false;
let keyboardOpen=false;
function resizeComposer(){
 const composer=$("composer");
 composer.classList.remove("is-expanded");
 input.style.height="23px";
 let height=input.value?input.scrollHeight:23;
 const expanded=height>24;
 if(expanded){composer.classList.add("is-expanded");input.style.height="23px";height=Math.min(69,input.scrollHeight);}
 input.style.height=Math.max(23,height)+"px";
 const extra=expanded?Math.min(72.96,Math.max(29.12,Math.round(height/23)*23+4)):0;
 root.style.setProperty("--composer-extra",extra+"px");
 requestAnimationFrame(()=>{updateChatLayout();syncScrollEdges(chat)});
}
function keyboardLayout(){
 const viewport=window.visualViewport;
 const focused=document.activeElement===input;
 const height=viewport?.height||window.innerHeight;
 if(!focused&&height>baselineHeight-100)baselineHeight=Math.max(baselineHeight,height);
 const scale=Math.min(window.innerWidth/390,baselineHeight/844,1);
 root.style.setProperty("--lx-frame-scale",scale);
 const keyboardHeight=focused?Math.max(0,baselineHeight-height):0;
 root.style.setProperty("--layout-height",baselineHeight+"px");
 keyboardOpen=keyboardHeight>100;
 previewKeyboard=focused&&!nativeTouch&&!keyboardOpen;
 root.classList.toggle("is-desktop-keyboard",previewKeyboard);
 $("preview-keyboard").hidden=!previewKeyboard;
 root.style.setProperty("--keyboard-offset",keyboardOpen?Math.min(420,keyboardHeight/scale)+"px":"0px");
 resizeComposer();
}
input.addEventListener("input",resizeComposer);
input.addEventListener("focus",()=>{baselineHeight=Math.max(baselineHeight,window.visualViewport?.height||window.innerHeight);keyboardLayout()});
$("composer").addEventListener("click",e=>{if(!e.target.closest("button")&&state.phase==="chat")input.focus()});
input.addEventListener("blur",()=>{setTimeout(keyboardLayout,250)});
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}});
window.visualViewport?.addEventListener("resize",keyboardLayout);
window.addEventListener("resize",keyboardLayout);
document.fonts?.ready.then(resizeComposer);
resizeComposer();

function updateSendState(){const b=$("send");b.dataset.sendState=pending?"stop":input.value.trim()?(document.activeElement===input?"active":"draft"):"idle"}
input.addEventListener("input",updateSendState);
input.addEventListener("focus",updateSendState);
input.addEventListener("blur",updateSendState);
updateSendState();


// Compose the touch keyboard locally (two-set Hangul, including compound finals/vowels).
const L="ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", V="ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ", T=" ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
const vowelJoin={"ㅗㅏ":"ㅘ","ㅗㅐ":"ㅙ","ㅗㅣ":"ㅚ","ㅜㅓ":"ㅝ","ㅜㅔ":"ㅞ","ㅜㅣ":"ㅟ","ㅡㅣ":"ㅢ"}, finalJoin={"ㄱㅅ":"ㄳ","ㄴㅈ":"ㄵ","ㄴㅎ":"ㄶ","ㄹㄱ":"ㄺ","ㄹㅁ":"ㄻ","ㄹㅂ":"ㄼ","ㄹㅅ":"ㄽ","ㄹㅌ":"ㄾ","ㄹㅍ":"ㄿ","ㄹㅎ":"ㅀ","ㅂㅅ":"ㅄ"};
const splitFinal=Object.fromEntries(Object.entries(finalJoin).map(([a,b])=>[b,[...a]]));
const splitVowel=Object.fromEntries(Object.entries(vowelJoin).map(([a,b])=>[b,[...a]]));
const syllable=(l,v,t=" ")=>String.fromCharCode(0xAC00+(L.indexOf(l)*21+V.indexOf(v))*28+T.indexOf(t));
function hangulAppend(s,k){const last=s.at(-1)||"",p=s.slice(0,-1),n=last.charCodeAt(0)-0xAC00;
 if(n>=0&&n<11172){const l=L[Math.floor(n/588)],v=V[Math.floor(n%588/28)],t=T[n%28];
 if(V.includes(k)){if(t!==" "){const [keep,move]=splitFinal[t]||[" ",t];return p+syllable(l,v,keep)+syllable(move,k)}const joined=vowelJoin[v+k];if(joined)return p+syllable(l,joined);return s+k}
 if(t===" "&&T.includes(k)&&k!==" ")return p+syllable(l,v,k);if(finalJoin[t+k])return p+syllable(l,v,finalJoin[t+k]);return s+k}
 if(L.includes(last)&&last&&V.includes(k))return p+syllable(last,k);return s+k}
function hangulDelete(s){const n=(s.at(-1)||"").charCodeAt(0)-0xAC00;if(!(n>=0&&n<11172))return s.slice(0,-1);const l=L[Math.floor(n/588)],v=V[Math.floor(n%588/28)],t=T[n%28],p=s.slice(0,-1);return t!==" "?p+syllable(l,v,splitFinal[t]?.[0]||" "):splitVowel[v]?p+syllable(l,splitVowel[v][0]):p+l}
function demoStrokes(text){let out=[],value="";for(const ch of text){const n=ch.charCodeAt(0)-0xAC00;let seq=[ch];if(n>=0&&n<11172){const l=L[Math.floor(n/588)],v=V[Math.floor(n%588/28)],t=T[n%28];seq=[l,...(splitVowel[v]||[v]),...(t===" "?[]:splitFinal[t]||[t])]}for(const k of seq){value=/^[ㄱ-ㅎㅏ-ㅣ]$/.test(k)?hangulAppend(value,k):value+k;out.push({key:k,text:value})}}return out}
let previewKey=null,previewTimer=null;
function clearKey(){clearTimeout(previewTimer);if(previewKey){previewKey.classList.remove("lx-key-down","lx-key-expanded");previewKey=null} $("key-preview")?.remove()}
function showKey(b,k){
 clearKey();if(!b)return;previewKey=b;b.classList.add("lx-key-down");
 if(!k||k===" ")return;
 b.classList.add("lx-key-expanded");
 const x=parseFloat(b.style.left),y=parseFloat(b.style.top),w=parseFloat(b.style.width),h=parseFloat(b.style.height);
 const W=61,H=48,px=Math.min(390-W-2,Math.max(2,x+w/2-W/2)),s=x-px,r=s+w,base=H+8+h;
 const pop=document.createElementNS("http://www.w3.org/2000/svg","svg");
 pop.id="key-preview";pop.setAttribute("viewBox","0 0 "+W+" "+base);
 Object.assign(pop.style,{left:px+"px",top:(y-H-8)+"px",width:W+"px",height:base+"px"});
 const path=document.createElementNS(pop.namespaceURI,"path");
 path.setAttribute("d",`M 9 0 H ${W-9} Q ${W} 0 ${W} 9 V ${H-8} Q ${W} ${H} ${W-8} ${H} C ${W-8} ${H+5} ${r} ${H+3} ${r} ${H+10} V ${base-5} Q ${r} ${base} ${r-5} ${base} H ${s+5} Q ${s} ${base} ${s} ${base-5} V ${H+10} C ${s} ${H+3} 8 ${H+5} 8 ${H} Q 0 ${H} 0 ${H-8} V 9 Q 0 0 9 0 Z`);
 path.setAttribute("fill","#77777F");pop.append(path);
 const label=document.createElementNS(pop.namespaceURI,"text");label.setAttribute("x",W/2);label.setAttribute("y",H/2+1);label.setAttribute("dominant-baseline","central");label.setAttribute("text-anchor","middle");label.setAttribute("fill","#fff");label.setAttribute("font-size","30");label.setAttribute("font-weight","400");label.textContent=k;pop.append(label);
 $("keyboard-keys").append(pop)
}
function flashKey(k){const plain={"ㄲ":"ㄱ","ㄸ":"ㄷ","ㅃ":"ㅂ","ㅆ":"ㅅ","ㅉ":"ㅈ","ㅒ":"ㅐ","ㅖ":"ㅔ"}[k]||k;const b=k===" "?$("keyboard-keys").querySelector('[data-key-name="Space"]'):keyButtons.find(x=>x.label===plain)?.b;showKey(b,k===" "?null:k);previewTimer=setTimeout(clearKey,105)}
let touchShift=false,touchMode="ko";
function touchKey(k){const a=input.selectionStart,z=input.selectionEnd;let left=input.value.slice(0,a),right=input.value.slice(z);if(k==="Delete")left=a===z?hangulDelete(left):left;else if(touchMode==="ko"&&/^[ㄱ-ㅎㅏ-ㅣ]$/.test(k))left=hangulAppend(left,k);else left+=k;input.value=left+right;input.setSelectionRange(left.length,left.length)}

const keyButtons=[];function refreshKeys(){for(const {b,name,label} of keyButtons){let k=touchMode==="ko"?(touchShift?({"ㅂ":"ㅃ","ㅈ":"ㅉ","ㄷ":"ㄸ","ㄱ":"ㄲ","ㅅ":"ㅆ","ㅐ":"ㅒ","ㅔ":"ㅖ"}[label]||label):label):touchMode==="en"?(touchShift?name:name.toLowerCase()):"1234567890@#$%&*()-+!?.,:;".at(keyButtons.findIndex(x=>x.name===name));b.textContent=touchMode==="ko"&&!touchShift?"":k||"";b.dataset.output=k||label;b.classList.toggle("lx-key-relabel",!!b.textContent);b.style.color="";b.style.background="";b.style.fontSize=""}}
for(const k of keys){const label=labels.find(l=>Math.abs(l.x-k.x)<.01&&Math.abs(l.y-k.y)<8);const b=document.createElement("button");b.type="button";b.tabIndex=-1;b.setAttribute("aria-label",label?.text||k.name);Object.assign(b.style,{left:k.x+"px",top:k.y+"px",width:k.w+"px",height:k.h+"px"});const name=k.name.split(" / ")[1];b.dataset.keyName=name;b.addEventListener("pointerdown",e=>{e.preventDefault();beginManual();showKey(b,name.length===1?b.dataset.output:null);try{b.setPointerCapture(e.pointerId)}catch{}});b.addEventListener("pointerup",()=>{previewTimer=setTimeout(clearKey,70)});b.addEventListener("pointercancel",clearKey);if(name.length===1&&label)keyButtons.push({b,name,label:label.text});b.addEventListener("click",()=>{beginManual();if(name==="Return"){input.blur();keyboardLayout();return}if(name==="Shift"){touchShift=!touchShift;refreshKeys();return}if(name==="한·영"){touchMode=touchMode==="ko"?"en":"ko";touchShift=false;refreshKeys();return}if(name==="숫자"){touchMode=touchMode==="num"?"ko":"num";refreshKeys();return}if(name==="Delete")touchKey("Delete");else if(name==="Space")touchKey(" ");else if(name.length===1&&label){touchKey(b.dataset.output||label.text);if(touchShift){touchShift=false;refreshKeys()}}else return;input.dispatchEvent(new Event("input",{bubbles:true}));input.focus()});$("keyboard-keys").append(b)}refreshKeys();
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.activeElement===input){input.blur();keyboardLayout()}});

if(autoDemo&&!state.manual)DURATION=demoDuration();if(state.phase==="departure"||preview==="departure")departure();else{state.phase="chat";render();if(resumed){input.value=resumed.draft||"";requestAnimationFrame(()=>{chat.scrollTop=resumed.scroll??chat.scrollHeight;syncScrollEdges(chat)});if(resumed.pending&&state.phase==="chat")generate()}if(isPreview){DURATION=60000;const p={long:60,scroll:60,loading:44.55,error:44.55,regenerate:13.19,transition:30,input:3.57,confirm:0};state.startedAt=Date.now()-(p[preview]||0)*1000;setReadyX(positionAt());if(preview==="transition")ready();if(preview==="greeting")showGreeting();if(preview==="input")input.focus()}else{tick();if(!state.messages.length)greetingTimer=setTimeout(showGreeting,100);else if(autoDemo&&!state.manual&&!pending){input.value="";scheduleDemo(900)}}}

