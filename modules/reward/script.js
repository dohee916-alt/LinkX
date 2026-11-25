import {getStore} from "../../shared/store.js";
import {navigate, registerRoute} from "../../shared/navigation.js";
import {REWARDS, unlockedIds, sortedRewards, recordFor} from "./data.js";
const $=id=>document.getElementById(id);
const positions=[[8,12],[170,172],[22,332],[158,492],[6,652],[168,812],[18,972],[160,1132]];
const state={sort:"newest",active:null,returnFocus:null};
const artworkSizes={1:[76,77],2:[150,150],3:[89,89],4:[97,97],5:[94,94],6:[78,79],7:[95,95],8:[84,84]};
const artwork=id=>"./art/reward-"+String(id).padStart(2,"0")+".png";
let store=getStore(), unlocked=new Set(unlockedIds(store));
function resizeDevice(){$("device").style.transform="scale("+Math.max(.1,Math.min(1,innerWidth/390,innerHeight/844))+")";}
resizeDevice();window.addEventListener("resize",resizeDevice);
function closeSort(){$("sort-menu").hidden=true;$("sort-toggle").setAttribute("aria-expanded","false");}
function setSort(order){
  if(!["newest","oldest"].includes(order))return;
  state.sort=order;
  const latest=sortedRewards(store,"newest").find(id=>unlocked.has(id));
  $("sort-label").textContent=order==="oldest"?"오래된순":"최신순";
  $("count").textContent="모은 리워드 "+unlocked.size+"개";
  $("empty-state").hidden=unlocked.size!==0;$("reward-scroll").hidden=unlocked.size===0;$("sort-toggle").hidden=unlocked.size===0;
  $("reward-hits").replaceChildren();
  sortedRewards(store,order).forEach((id,i)=>{
    const hit=document.createElement("button");hit.type="button";
    hit.className="reward-hit"+(unlocked.has(id)?"":" locked")+(id===latest?" latest":"");
    hit.style.left=positions[i][0]+"px";hit.style.top=positions[i][1]+"px";hit.dataset.id=String(id);
    const name=String(id).padStart(2,"0")+" · "+REWARDS[id].name;
    hit.setAttribute("aria-label",name+(unlocked.has(id)?" 리워드 상세 보기":" 미획득 리워드 안내"));
    const image=document.createElement("img");image.src=artwork(id);image.alt="";image.width=76;image.height=76;
    const title=document.createElement("span");title.className="reward-name";title.textContent=name;
    const caption=document.createElement("span");caption.className="reward-caption";caption.textContent=id===5?"먼저 인사하기":unlocked.has(id)?"획득한 리워드":"다음 도전을 기다려요";
    const status=document.createElement("span");status.className="reward-status";status.textContent=!unlocked.has(id)?"미획득":id===latest?"방금 획득":"획득";
    const slot=document.createElement("span");slot.className="reward-art-slot";slot.style.setProperty("--art-width",artworkSizes[id][0]+"px");slot.style.setProperty("--art-height",artworkSizes[id][1]+"px");slot.append(image);
    hit.append(slot,title,caption,status);hit.addEventListener("click",()=>openReward(id,hit));$("reward-hits").append(hit);
  });
  $("reward-scroll").scrollTop=0;
  for(const option of $("sort-menu").querySelectorAll("[data-sort]"))option.setAttribute("aria-checked",String(option.dataset.sort===order));
  closeSort();
}
$("sort-toggle").addEventListener("click",()=>{$("sort-menu").hidden=!$("sort-menu").hidden;$("sort-toggle").setAttribute("aria-expanded",String(!$("sort-menu").hidden));});
for(const option of $("sort-menu").querySelectorAll("[data-sort]"))option.addEventListener("click",()=>{setSort(option.dataset.sort);$("sort-toggle").focus();});
document.addEventListener("pointerdown",e=>{if(!$("sort-menu").contains(e.target)&&!$("sort-toggle").contains(e.target))closeSort();});
function openReward(id,from){
  if(!REWARDS[id])return;
  closeSort();state.active=id;state.returnFocus=from || document.activeElement;
  const owned=unlocked.has(id),record=recordFor(store,id),reward=REWARDS[id];
  document.querySelector(".detail-card").dataset.state=owned?"earned":"locked";
  $("detail-art").src=artwork(id);$("detail-art-slot").style.setProperty("--art-width",artworkSizes[id][0]+"px");$("detail-art-slot").style.setProperty("--art-height",artworkSizes[id][1]+"px");$("detail-number").textContent=(owned?"REWARD / ":"미획득 / ")+String(id).padStart(2,"0");
  $("detail-title").textContent=owned?reward.name:"아직 만나지 않은 별";
  $("detail-meaning").textContent=owned?reward.meaning || reward.name:reward.name;
  const mission=record?.missionTitle || reward.mission;
  $("detail-mission").hidden=!owned || !mission;$("mission-name").textContent=mission || "";
  $("detail-summary").hidden=owned && id!==5 && !record?.reflection;
  $("summary-label").textContent=owned?"미션 돌아보기":"미획득 리워드";
  $("summary-text").textContent=!owned?"다음 미션을 완료하면 새로운 별이 연결돼요. 먼저 현재 미션을 이어가 보세요.":record?.reflection || "아직 저장된 회고가 없어요. 리워드는 보관되어 있어요.";
  $("show-history").hidden=!owned || !record?.reflection;$("close-detail").textContent=owned?"닫기":"확인";
  $("gallery-shell").inert=true;$("modal-overlay").hidden=false;$("close-detail").focus();
}
function closeReward(){$("modal-overlay").hidden=true;$("gallery-shell").inert=false;state.active=null;(state.returnFocus?.isConnected?state.returnFocus:$("sort-toggle")).focus();}
$("close-detail").addEventListener("click",closeReward);
$("modal-overlay").addEventListener("click",e=>{if(e.target.dataset.dismiss==="true")closeReward();});
function openHistory(){
  const record=recordFor(store,state.active);if(!record?.reflection)return;
  $("history-number").textContent="REWARD / "+String(state.active).padStart(2,"0");$("record-source").hidden=record.source!=="demo";
  $("record-title").textContent=record.title || REWARDS[state.active].name;$("record-mission").textContent=record.missionTitle || REWARDS[state.active].mission || "";
  $("record-reflection").textContent=record.reflection;
  for(const key of ["achievement","next"]){$("record-"+key+"-box").hidden=!record[key];$("record-"+key).textContent=record[key] || "";}
  $("modal-overlay").inert=true;$("history-view").hidden=false;$("close-history").focus();
}
function closeHistory(){$("history-view").hidden=true;$("modal-overlay").inert=false;$("show-history").focus();}
$("show-history").addEventListener("click",openHistory);$("close-history").addEventListener("click",closeHistory);$("return-to-detail").addEventListener("click",closeHistory);
$("current-mission").addEventListener("click",()=>navigate("home"));
$("back").addEventListener("click",()=>{if(new URLSearchParams(location.search).get("from")==="mission"){registerRoute("reward-receipt","modules/mission/index.html");navigate("reward-receipt",{view:"reward-3"});}else navigate("home");});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){if(!$("history-view").hidden)closeHistory();else if(!$("modal-overlay").hidden)closeReward();else{closeSort();$("sort-toggle").focus();}}
  if(e.key!=="Tab")return;
  const panel=!$("history-view").hidden?$("history-view"):!$("modal-overlay").hidden?$("modal-overlay"):null;if(!panel)return;
  const buttons=[...panel.querySelectorAll("button")].filter(b=>!b.hidden&&!b.disabled),first=buttons[0],last=buttons.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
function refresh(){store=getStore();unlocked=new Set(unlockedIds(store));if(!$("history-view").hidden)closeHistory();if(!$("modal-overlay").hidden)closeReward();setSort(state.sort);}
window.addEventListener("storage",e=>{if(e.key==="linkx:v1")refresh();});
window.LinkXReward={open:id=>openReward(Number(id)),sort:setSort,current:()=>({sort:state.sort,active:state.active,unlocked:[...unlocked]}),refresh};
const params=new URLSearchParams(location.search);setSort(params.get("sort")==="oldest"?"oldest":"newest");
const requested=Number(params.get("reward"));if(REWARDS[requested])openReward(requested);
