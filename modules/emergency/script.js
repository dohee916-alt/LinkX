import {keys,labels} from "./keyboard-layout.js";
import {messageBubble} from "./components.js";
import {playDiamond} from "./diamond-glow.js?v=1";
import {navigate,params,openSaved,syncScrollEdges} from "../../shared/navigation.js?v=edges1";
import {getStore,updateStore,saveConversation} from "../../shared/store.js";
import {greeting,exampleUser,replies,alternatives,errors} from "./scenario.js";
const $=id=>document.getElementById(id),root=$("emergency"),list=$("messages"),chat=$("chat"),input=$("message");
const query=params();const resumed=query.get("resume")==="1"?getStore().emergencyDraft:null;
let state=resumed||{id:"emergency-"+Date.now(),messages:[],turn:0,version:0,error:null,phase:"chat",scroll:null};
let timer=null,departureTimer=null,pending=false,noticeTimer=null; let greetingTimer=null, frameId=null, finalTimer=null; const DURATION=60000, TRAVEL=210.08, FINAL_LEAD=6000; const isPreview=!!query.get("preview"); state.startedAt=state.startedAt||Date.now(); state.frozenX=null; let newRow=-1;
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
function regenerate(index){if(state.timedOut)return;const m=state.messages[index];if(!m.versions)return;const next=alternatives[m.versions.length%alternatives.length];if(m.versions.length<alternatives.length)m.versions.push(next);m.version=(m.version+1)%m.versions.length;m.text=m.versions[m.version];render()}

const autoDemo=query.get("auto")!=="0"&&!isPreview;
let demoTimer=null,typing=false,demoCancelled=false;
function stopDemo(){clearTimeout(demoTimer);typing=false;demoCancelled=true}
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
  const chars=typingFrames(exampleUser[state.turn]);let i=0;typing=true;input.focus();
  function step(){if(!typing||demoCancelled||state.phase!=="chat"||state.timedOut)return;
   input.value=chars[i++];input.dispatchEvent(new Event("input",{bubbles:true}));
   if(i<chars.length)demoTimer=setTimeout(step,95);
   else{typing=false;demoTimer=setTimeout(()=>{if(!demoCancelled&&state.phase==="chat"){input.blur();send()}},650)}
  }step();
 },delay);
}
input.addEventListener("beforeinput",()=>stopDemo());

function generate(){if(state.timedOut||state.phase!=="chat")return;clearTimeout(timer);state.error=null;pending=true;render();timer=setTimeout(()=>{pending=false;const forced=query.get("error");if(forced&&errors[forced]&&!state.errorShown&&state.turn>=Number(query.get("errorTurn")||2)){state.errorShown=true;state.error=forced;render();return}const text=replies[Math.min(state.turn-1,1)]||replies[0];const m={role:"ai",text};if(state.turn===1){m.versions=[text];m.version=0}newRow=state.messages.length;state.messages.push(m);render();scheduleDemo(4500)},800)}
function send(){if(state.phase!=="chat"||state.timedOut)return;clearTimeout(demoTimer);typing=false;if(pending){stopDemo();clearTimeout(timer);pending=false;render();return}const text=input.value.trim();if(!text)return;input.value="";resizeComposer();if(!state.messages.length){clearTimeout(greetingTimer);state.messages.push({role:"ai",text:greeting})}state.messages.push({role:"user",text});state.turn++;generate()}
function departure(){$("diamond-glow").hidden=true;clearTimeout(timer);pending=false;state.phase="departure";$("chat-character").hidden=true;root.classList.remove("is-transition");root.classList.add("is-departure");for(const id of ["chat","ready-area","composer"])$(id).hidden=true;$("departure").hidden=false;$("departure-title").textContent=state.departureReason==="timeout"?"이제 진짜 가보자":"잘 다녀와!";clearTimeout(departureTimer);preserve()}
function positionAt(now=Date.now()){return TRAVEL*Math.min(1,Math.max(0,(now-state.startedAt)/DURATION))}
let readyAnimation=null,finishDeadline=null;function setReadyX(x){$("ready-motion").style.transform="translate3d("+x+"px,0,0)"}
function tick(){if(state.phase!=="chat")return;clearTimeout(finalTimer);clearTimeout(finishDeadline);const remaining=DURATION-(Date.now()-state.startedAt);finishDeadline=setTimeout(finishTimer,Math.max(0,remaining));if(remaining<=FINAL_LEAD)showFinal();else finalTimer=setTimeout(showFinal,remaining-FINAL_LEAD);const x=positionAt();setReadyX(x);if(x>=TRAVEL){finishTimer();return}readyAnimation=$("ready-motion").animate([{transform:"translate3d("+x+"px,0,0)"},{transform:"translate3d("+TRAVEL+"px,0,0)"}],{duration:DURATION*(1-x/TRAVEL),easing:"linear",fill:"forwards"});readyAnimation.onfinish=finishTimer}
function showFinal(){if(state.phase!=="chat"||state.timedOut)return;stopDemo();input.value="";resizeComposer();state.timedOut=true;clearTimeout(timer);clearTimeout(greetingTimer);pending=false;state.error=null;newRow=state.messages.length;state.messages.push({role:"ai",text:replies[2]});input.blur();input.readOnly=true;render()}
function finishTimer(){if(state.phase!=="chat")return;showFinal();ready("timeout")}
function ready(reason="manual"){if(state.phase!=="chat")return;stopDemo();clearTimeout(finalTimer);clearTimeout(finishDeadline);state.departureReason=reason==="timeout"?"timeout":"manual";state.frozenX=readyAnimation?new DOMMatrixReadOnly(getComputedStyle($("ready-motion")).transform).m41:positionAt();if(readyAnimation){readyAnimation.cancel();readyAnimation=null}setReadyX(state.frozenX);cancelAnimationFrame(frameId);clearTimeout(greetingTimer);state.phase="transition";clearTimeout(timer);pending=false;const bx=20.8+state.frozenX+69.16;const by=$("ready-area").offsetTop+$("ready-motion").offsetTop+24.96;input.blur();root.classList.add("is-transition");preserve();playDiamond($("diamond-glow"),bx,by,departure)}
function showGreeting(){if(state.phase!=="chat"||state.messages.length)return;newRow=0;state.messages.push({role:"ai",text:greeting});render();scheduleDemo(2500)}
$("composer").addEventListener("submit",e=>{e.preventDefault();send()});$("saved").onclick=goSaved;$("back").onclick=()=>{$("confirm").hidden=false};$("continue").onclick=()=>{$("confirm").hidden=true;scheduleDemo()};$("leave").onclick=home;$("ready").onclick=()=>ready("manual");$("returned").onclick=()=>{saveConversation({id:state.id,type:"emergency",messages:state.messages,title:state.messages.find(m=>m.role==="user")?.text||greeting});updateStore({emergencyDraft:null});location.href="../feedback/index.html?entry=returned"};
$("mic").onclick=()=>{const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){showNotice("이 브라우저에서는 음성 입력을 지원하지 않아요.");return}try{const s=new Speech();s.lang="ko-KR";s.onresult=e=>input.value=e.results[0][0].transcript;s.onerror=()=>showNotice("음성 입력을 사용할 수 없어요.");s.start()}catch{showNotice("음성 입력을 사용할 수 없어요.")}};
window.addEventListener("pagehide",preserve);chat.addEventListener("scroll",()=>{state.scroll=chat.scrollTop;syncScrollEdges(chat)},{passive:true});
// Development-only preview states for Figma QA (not a visible production screen).
const preview=query.get("preview");if(preview){if(["long","scroll","loading","error","regenerate","transition","departure"].includes(preview)){let u1=exampleUser[0],u2=exampleUser[1];if(preview==="scroll"){u1+=" 저 사람 그리고 지금 이어폰 꽂고 음악 듣고 있는 것 같은데 내가 가서 말 걸어도 될까..?";u2="근데 그건 가상 상황 연습이었잖아. 실제 사람이 그러면 나 다시는 앞으로 시도 안 해볼 것 같아.. 아 어떡하지 못 가겠어.. 차라리 안 하고 상처도 안 받는게 나을 것 같아"}state.messages=[{role:"ai",text:greeting},{role:"user",text:u1},{role:"ai",text:replies[0],versions:[replies[0]],version:0}];state.turn=1;if(preview!=="regenerate"){state.messages.push({role:"user",text:u2});state.turn=2;if(!["error","loading"].includes(preview))state.messages.push({role:"ai",text:replies[1]},{role:"ai",text:replies[2]})}if(preview==="error")state.error=query.get("error")||"general";if(preview==="loading"){pending=true;setTimeout(()=>{if(pending)generate()},600)}}if(preview==="input"){state.messages=[{role:"ai",text:greeting}];input.value=exampleUser[0]}if(preview==="confirm"){state.messages=[{role:"ai",text:greeting}];$("confirm").hidden=false;}}
if(state.phase==="departure"||preview==="departure")departure();else{state.phase="chat";render();if(resumed){input.value=resumed.draft||"";requestAnimationFrame(()=>{chat.scrollTop=resumed.scroll??chat.scrollHeight;syncScrollEdges(chat)});if(resumed.pending&&state.phase==="chat")generate()}if(isPreview){const p={long:60,scroll:60,loading:44.55,error:44.55,regenerate:13.19,transition:30,input:3.57,confirm:0};state.startedAt=Date.now()-(p[preview]||0)*1000;setReadyX(positionAt());if(preview==="transition")ready();if(preview==="greeting")showGreeting();if(preview==="input")input.focus()}else{tick();if(!state.messages.length)greetingTimer=setTimeout(showGreeting,100)}}

// Fit the original Figma frame as one coordinate space; never individually shift its children.
function fitFrame(){const w=window.visualViewport?.width??window.innerWidth,h=window.visualViewport?.height??window.innerHeight;root.style.setProperty("--lx-frame-scale",Math.min(w/390,window.innerHeight/844,1));}
fitFrame();
new ResizeObserver(()=>{syncScrollEdges(chat)}).observe(chat);
new ResizeObserver(()=>{updateChatLayout();syncScrollEdges(chat)}).observe(list);

let baselineHeight=window.visualViewport?.height||window.innerHeight;
const nativeTouch=matchMedia("(pointer:coarse)").matches && navigator.maxTouchPoints>0;
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

for(const k of keys){const label=labels.find(l=>Math.abs(l.x-k.x)<.01&&Math.abs(l.y-k.y)<8);const b=document.createElement("button");b.type="button";b.tabIndex=-1;b.setAttribute("aria-label",label?.text||k.name);Object.assign(b.style,{left:k.x+"px",top:k.y+"px",width:k.w+"px",height:k.h+"px"});b.addEventListener("pointerdown",e=>e.preventDefault());b.addEventListener("click",()=>{const name=k.name.split(" / ")[1];if(name==="Return"){input.blur();keyboardLayout();return}if(name==="Delete"){const a=input.selectionStart,z=input.selectionEnd;input.setRangeText("",a===z?Math.max(0,a-1):a,z,"end")}else if(name==="Space"){input.setRangeText(" ",input.selectionStart,input.selectionEnd,"end")}else if(name.length===1&&label){input.setRangeText(label.text,input.selectionStart,input.selectionEnd,"end")}else{return}input.dispatchEvent(new Event("input",{bubbles:true}));input.focus()});$("keyboard-keys").append(b)}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.activeElement===input){input.blur();keyboardLayout()}});
