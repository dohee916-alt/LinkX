import {playDiamond} from "./diamond-glow.js?v=1";
import {navigate,params} from "../../shared/navigation.js";
import {getStore,updateStore,saveConversation} from "../../shared/store.js";
import {greeting,exampleUser,replies,alternatives,errors} from "./scenario.js";
const $=id=>document.getElementById(id),root=$("emergency"),list=$("messages"),chat=$("chat"),input=$("message");
const query=params();const resumed=query.get("resume")==="1"?getStore().emergencyDraft:null;
let state=resumed||{id:"emergency-"+Date.now(),messages:[],turn:0,version:0,error:null,phase:"chat",scroll:null};
let timer=null,departureTimer=null,pending=false,noticeTimer=null; let greetingTimer=null, frameId=null; const DURATION=90000, TRAVEL=210.08; const isPreview=!!query.get("preview"); state.startedAt=state.startedAt||Date.now(); state.frozenX=null; let newRow=-1;
const preserve=()=>{if(!isPreview)updateStore({emergencyDraft:{...state,scroll:chat.scrollTop}})};
function button(label,text,fn){const b=document.createElement("button");b.type="button";b.setAttribute("aria-label",label);b.textContent=text;b.onclick=fn;return b}
function goSaved(){preserve();navigate("saved",{tab:"emergency",from:"emergency"})}
function home(){clearTimeout(timer);clearTimeout(departureTimer);preserve();navigate("home")}
function showNotice(text){$("notice").textContent=text;$("notice").hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$("notice").hidden=true,2500)}
function render({bottom=true}={}){list.replaceChildren();const first=state.messages.findIndex(m=>m.role==="ai");
state.messages.forEach((m,index)=>{const row=document.createElement("div");row.className="lx-row "+m.role;if(index===newRow)row.classList.add("lx-arriving");if(index===first){const c=document.createElement("div");c.className="lx-character";const i=document.createElement("img");i.src="../../assets/emergency/character.png";i.alt="";c.append(i);row.append(c)}const bubble=document.createElement("div");bubble.className="lx-bubble"+(m.text===greeting?" is-greeting":"");const label=document.createElement("span");label.className="lx-bubble-text";label.textContent=m.text;bubble.append(label);row.append(bubble);if(m.role==="ai"&&m.versions&&index===state.messages.length-1&&!pending){const tools=document.createElement("div");tools.className="lx-tools";if(m.versions.length>1)tools.append(button("이전 답변","‹",()=>version(index,-1)));tools.append(button("답변 재생성","⟲",()=>regenerate(index)));if(m.versions.length>1)tools.append(button("다음 답변","›",()=>version(index,1)));row.append(tools)}list.append(row)});
if(pending){const dots=document.createElement("div");dots.className="lx-loading";dots.setAttribute("aria-label","응답 생성 중");for(let i=0;i<4;i++)dots.append(document.createElement("i"));const row=document.createElement("div");row.className="lx-row ai";row.append(dots);list.append(row)}
if(state.error){const row=document.createElement("div");row.className="lx-error-row";const e=document.createElement("span");e.className="lx-error";e.textContent=errors[state.error]||errors.general;row.append(e,button("다시 시도","⟲",()=>generate()));list.append(row)}
newRow=-1;updateSendState();$("send").setAttribute("aria-label",pending?"생성 중지":"전송");$("send").replaceChildren();if(pending){const stop=document.createElement("img");stop.src="../../assets/emergency/label-stop.svg";stop.alt="";$("send").append(stop)}else{const a=document.createElement("img");a.src="../../assets/emergency/send.svg";a.alt="";$("send").append(a)}
if(bottom)requestAnimationFrame(()=>chat.scrollTop=chat.scrollHeight);preserve()}
function version(index,delta){const m=state.messages[index];m.version=(m.version+delta+m.versions.length)%m.versions.length;m.text=m.versions[m.version];render()}
function regenerate(index){const m=state.messages[index];if(!m.versions)return;const next=alternatives[m.versions.length%alternatives.length];if(m.versions.length<alternatives.length)m.versions.push(next);m.version=(m.version+1)%m.versions.length;m.text=m.versions[m.version];render()}
function generate(){clearTimeout(timer);state.error=null;pending=true;render();timer=setTimeout(()=>{pending=false;const forced=query.get("error");if(forced&&errors[forced]&&!state.errorShown){state.errorShown=true;state.error=forced;render();return}const text=replies[Math.min(state.turn-1,1)]||replies[0];const m={role:"ai",text};if(state.turn===1){m.versions=[text];m.version=0}newRow=state.messages.length;state.messages.push(m);render()},800)}
function send(){if(state.phase!=="chat")return;if(pending){clearTimeout(timer);pending=false;render();return}const text=input.value.trim();if(!text)return;input.value="";resizeComposer();if(!state.messages.length){clearTimeout(greetingTimer);state.messages.push({role:"ai",text:greeting})}state.messages.push({role:"user",text});state.turn++;generate()}
function departure(){$("diamond-glow").hidden=true;clearTimeout(timer);pending=false;state.phase="departure";root.classList.remove("is-transition");root.classList.add("is-departure");for(const id of ["chat","ready-area","composer"])$(id).hidden=true;$("departure").hidden=false;$("departure-title").textContent="이제 진짜 가보자";clearTimeout(departureTimer);departureTimer=setTimeout(()=>$("departure-title").textContent="잘 다녀와!",2600);preserve()}
function positionAt(now=Date.now()){return TRAVEL*Math.min(1,Math.max(0,(now-state.startedAt)/DURATION))}
function setReadyX(x){$("ready").style.setProperty("--ready-x",x+"px");root.style.setProperty("--light-x",(20.8+x+69.16)+"px")}
function tick(){if(state.phase!=="chat")return;const x=positionAt();setReadyX(x);if(x>=TRAVEL){if(!state.timedOut){state.timedOut=true;clearTimeout(timer);pending=false;state.error=null;newRow=state.messages.length;state.messages.push({role:"ai",text:replies[2]});render()}ready();return}frameId=requestAnimationFrame(tick)}
function ready(){if(state.phase!=="chat")return;state.frozenX=positionAt();setReadyX(state.frozenX);cancelAnimationFrame(frameId);clearTimeout(greetingTimer);state.phase="transition";clearTimeout(timer);pending=false;const bx=20.8+state.frozenX+69.16;const by=$("ready-area").offsetTop+$("ready").offsetTop+24.96;input.blur();root.classList.add("is-transition");preserve();playDiamond($("diamond-glow"),bx,by,departure)}
function showGreeting(){if(state.phase!=="chat"||state.messages.length)return;newRow=0;state.messages.push({role:"ai",text:greeting});render()}
$("composer").addEventListener("submit",e=>{e.preventDefault();send()});$("saved").onclick=goSaved;$("back").onclick=()=>{$("confirm").hidden=false};$("continue").onclick=()=>{$("confirm").hidden=true};$("leave").onclick=home;$("ready").onclick=ready;$("returned").onclick=()=>{saveConversation({id:state.id,type:"emergency",messages:state.messages,title:state.messages.find(m=>m.role==="user")?.text||greeting});updateStore({emergencyDraft:null});navigate("home")};
$("mic").onclick=()=>{const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){showNotice("이 브라우저에서는 음성 입력을 지원하지 않아요.");return}try{const s=new Speech();s.lang="ko-KR";s.onresult=e=>input.value=e.results[0][0].transcript;s.onerror=()=>showNotice("음성 입력을 사용할 수 없어요.");s.start()}catch{showNotice("음성 입력을 사용할 수 없어요.")}};
window.addEventListener("pagehide",preserve);chat.addEventListener("scroll",()=>{state.scroll=chat.scrollTop},{passive:true});
// Development-only preview states for Figma QA (not a visible production screen).
const preview=query.get("preview");if(preview){if(["long","scroll","loading","error","regenerate","transition","departure"].includes(preview)){let u1=exampleUser[0],u2=exampleUser[1];if(preview==="scroll"){u1+=" 저 사람 그리고 지금 이어폰 꽂고 음악 듣고 있는 것 같은데 내가 가서 말 걸어도 될까..?";u2="근데 그건 가상 상황 연습이었잖아. 실제 사람이 그러면 나 다시는 앞으로 시도 안 해볼 것 같아.. 아 어떡하지 못 가겠어.. 차라리 안 하고 상처도 안 받는게 나을 것 같아"}state.messages=[{role:"ai",text:greeting},{role:"user",text:u1},{role:"ai",text:replies[0],versions:[replies[0]],version:0}];state.turn=1;if(preview!=="regenerate"){state.messages.push({role:"user",text:u2});state.turn=2;if(!["error","loading"].includes(preview))state.messages.push({role:"ai",text:replies[1]},{role:"ai",text:replies[2]})}if(preview==="error")state.error=query.get("error")||"general";if(preview==="loading")pending=true}if(preview==="input"){state.messages=[{role:"ai",text:greeting}];input.value=exampleUser[0]}if(preview==="confirm"){state.messages=[{role:"ai",text:greeting}];$("confirm").hidden=false;}}
if(state.phase==="departure"||preview==="departure")departure();else{state.phase="chat";render();if(resumed){requestAnimationFrame(()=>chat.scrollTop=resumed.scroll??chat.scrollHeight)}if(isPreview){const p={long:90,scroll:90,loading:66.83,error:66.83,regenerate:19.79,transition:45,input:5.35,confirm:0};state.startedAt=Date.now()-(p[preview]||0)*1000;setReadyX(positionAt());if(preview==="transition")ready()}else{tick();if(!state.messages.length)greetingTimer=setTimeout(showGreeting,100)}}

// Fit the original Figma frame as one coordinate space; never individually shift its children.
function fitFrame(){const w=window.visualViewport?.width??window.innerWidth,h=window.visualViewport?.height??window.innerHeight;root.style.setProperty("--lx-frame-scale",Math.min(w/390,window.innerHeight/844,1));}
fitFrame();

let baselineHeight=window.visualViewport?.height||window.innerHeight;
let keyboardOpen=false;
function resizeComposer(){
 const composer=$("composer");
 composer.classList.remove("is-expanded");
 input.style.height="23px";
 let height=input.value?input.scrollHeight:23;
 const expanded=height>24;
 if(expanded){composer.classList.add("is-expanded");input.style.height="23px";height=Math.min(115,input.scrollHeight);}
 input.style.height=Math.max(23,height)+"px";
 const extra=expanded?Math.max(29.12,Math.round(height/23)*23+4):0;
 root.style.setProperty("--composer-extra",extra+"px");
 requestAnimationFrame(()=>chat.scrollTop=chat.scrollHeight);
}
function keyboardLayout(){
 const viewport=window.visualViewport;
 const focused=document.activeElement===input;
 const height=viewport?.height||window.innerHeight;
 if(!focused&&height>baselineHeight-100)baselineHeight=Math.max(baselineHeight,height);
 const scale=Math.min(window.innerWidth/390,baselineHeight/844,1);
 root.style.setProperty("--lx-frame-scale",scale);
 const keyboardHeight=focused?Math.max(0,baselineHeight-height):0;
 keyboardOpen=keyboardHeight>100;
 root.style.setProperty("--keyboard-offset",keyboardOpen?Math.min(420,keyboardHeight/scale)+"px":"0px");
 resizeComposer();
}
input.addEventListener("input",resizeComposer);
input.addEventListener("focus",()=>{baselineHeight=Math.max(baselineHeight,window.visualViewport?.height||window.innerHeight);keyboardLayout()});
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
