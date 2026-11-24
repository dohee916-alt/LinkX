import {getStore} from "../../shared/store.js";
import {back} from "../../shared/navigation.js";

const $ = id => document.getElementById(id);
const unlockedDefault = [1,2,3,4,5];
const rewards = {
  1:{name:"시작의 증표"},
  2:{name:"발견의 망원경"},
  3:{name:"마주한 순간"},
  4:{name:"작은 호감"},
  5:{name:"첫마디 명사수",mission:"짧게 먼저 말 걸어보기"},
  6:{name:"약속과 만남"},
  7:{name:"마음이 담긴 글씨"},
  8:{name:"별빛 추억"}
};
const placements = {
  oldest:[
    {id:1,x:6,y:16},{id:2,x:175,y:103},{id:3,x:142,y:264},
    {id:4,x:9,y:342},{id:5,x:26,y:526},{id:6,x:168,y:620},
    {id:7,x:143,y:796},{id:8,x:5,y:895}
  ],
  newest:[
    {id:8,x:6,y:16},{id:7,x:175,y:103},{id:6,x:142,y:264},
    {id:5,x:9,y:342},{id:4,x:26,y:526},{id:3,x:168,y:620},
    {id:2,x:143,y:796},{id:1,x:5,y:895}
  ]
};
const art = {
  oldest:"./art/constellation-oldest.png",
  newest:"./art/constellation-latest.png"
};
const state = {sort:"oldest",active:null,returnFocus:null,toastTimer:null};
const toId = value => Number(value);
function readUnlocked(){
  const s=getStore();
  const ids=s.unlockedRewards || s.rewardUnlocked || s.rewards?.unlocked;
  if(!Array.isArray(ids)) return new Set(unlockedDefault);
  return new Set(ids.map(toId).filter(n=>Number.isInteger(n)&&n>=1&&n<=8));
}
let unlocked=readUnlocked();

function resizeDevice(){
  const s=Math.min(1,window.innerWidth/390,window.innerHeight/844);
  $("device").style.transform="scale("+Math.max(0.1,s)+")";
}
resizeDevice();
window.addEventListener("resize",resizeDevice);

function setSort(order){
  if(!placements[order])return;
  state.sort=order;
  $("sort-label").textContent=order==="oldest"?"오래된순":"최신순";
  $("constellation-art").src=art[order];
  $("count").textContent="모은 리워드 "+unlocked.size+"개";
  const hits=$("reward-hits");
  hits.replaceChildren();
  for(const {id,x,y} of placements[order]){
    const hit=document.createElement("button");
    hit.type="button";
    hit.className="reward-hit"+(unlocked.has(id)?"":" locked");
    hit.style.left=x+"px";
    hit.style.top=y+"px";
    hit.dataset.id=String(id);
    const label=String(id).padStart(2,"0")+" · "+rewards[id].name;
    hit.setAttribute("aria-label",label+(unlocked.has(id)?" 리워드 상세 보기":" 아직 획득하지 않음"));
    hit.title=label;
    hit.addEventListener("click",()=>unlocked.has(id)?openReward(id,hit):toast("아직 획득하지 않은 리워드예요."));
    hits.append(hit);
  }
  $("reward-scroll").scrollTop=0;
  for(const button of $("sort-menu").querySelectorAll("button[data-sort]")){
    button.setAttribute("aria-checked",String(button.dataset.sort===order));
  }
  closeSort();
}
function closeSort(){
  $("sort-menu").hidden=true;
  $("sort-toggle").setAttribute("aria-expanded","false");
}
function toggleSort(){
  const menu=$("sort-menu");
  menu.hidden=!menu.hidden;
  $("sort-toggle").setAttribute("aria-expanded",String(!menu.hidden));
}
$("sort-toggle").addEventListener("click",toggleSort);
for(const option of $("sort-menu").querySelectorAll("[data-sort]")){
  option.addEventListener("click",()=>setSort(option.dataset.sort));
}
document.addEventListener("pointerdown",e=>{
  if(!$("sort-menu").hidden&&!$("sort-menu").contains(e.target)&&!$("sort-toggle").contains(e.target))closeSort();
});

function missionSummary(id){
  if(id!==5)return null;
  const mission=getStore().mission;
  if(!mission||typeof mission!=="object")return null;
  const text=mission.feedbackSummary??mission.summary??mission.reviewSummary??null;
  return typeof text==="string"&&text.trim()?text.trim():null;
}
function openReward(id,from=null){
  const reward=rewards[id];
  if(!reward||!unlocked.has(id))return;
  closeSort();
  state.active=id;
  state.returnFocus=from||document.activeElement;
  $("detail-title").textContent=String(id).padStart(2,"0")+" · "+reward.name;
  const coords=placements.oldest.find(p=>p.id===id);
  const icon=$("detail-art");
  icon.style.backgroundImage='url("'+art.oldest+'")';
  icon.style.backgroundPosition="-"+(coords.x+40)+"px -"+(coords.y-4)+"px";
  const mission=$("detail-mission");
  mission.hidden=!reward.mission;
  $("mission-name").textContent=reward.mission||"";
  const saved=missionSummary(id);
  $("summary-text").textContent=saved||"저장된 대화 요약이 아직 없어요.";
  $("show-history").hidden=id!==5;
  $("modal-overlay").hidden=false;
  $("close-detail").focus();
}
function closeReward(){
  $("modal-overlay").hidden=true;
  state.active=null;
  (state.returnFocus?.isConnected?state.returnFocus:$("sort-toggle")).focus();
}
$("close-detail").addEventListener("click",closeReward);
$("modal-overlay").addEventListener("click",e=>{
  if(e.target?.dataset?.dismiss==="true")closeReward();
});

function openHistory(){
  $("history-view").hidden=false;
  const frame=$("feedback-frame");
  const showLog=()=>{
    try{
      const api=frame.contentWindow.LinkXFeedback;
      if(api?.go)api.go(17,false);
    }catch{toast("연습 기록을 열지 못했어요.");}
  };
  frame.addEventListener("load",showLog,{once:true});
  frame.src="../feedback/index.html";
  toast("연습 로그 화면을 열어요.");
  $("close-history").focus();
}
function closeHistory(){
  $("history-view").hidden=true;
  $("feedback-frame").src="about:blank";
  $("show-history").focus();
}
$("show-history").addEventListener("click",openHistory);
$("close-history").addEventListener("click",closeHistory);

function toast(message){
  const elem=$("toast");
  if(state.toastTimer)clearTimeout(state.toastTimer);
  elem.textContent=message;
  elem.hidden=false;
  state.toastTimer=setTimeout(()=>{elem.hidden=true;},2600);
}

$("back").addEventListener("click",()=>{
  if(!$("history-view").hidden){closeHistory();return;}
  if(!$("modal-overlay").hidden){closeReward();return;}
  back("home");
});
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  if(!$("history-view").hidden){closeHistory();return;}
  if(!$("modal-overlay").hidden){closeReward();return;}
  if(!$("sort-menu").hidden){closeSort();$("sort-toggle").focus();}
});

/** Integration hooks for LinkX main / mission module, without editing other teams' modules. */
window.LinkXReward={
  open:id=>openReward(Number(id)),
  sort:setSort,
  current:()=>({sort:state.sort,active:state.active,unlocked:[...unlocked]}),
  refresh:()=>{unlocked=readUnlocked();setSort(state.sort)}
};
const params=new URLSearchParams(location.search);
setSort(params.get("sort")==="newest"?"newest":"oldest");
const requested=Number(params.get("reward"));
if(unlocked.has(requested))openReward(requested);
