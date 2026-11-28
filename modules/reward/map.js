import {MAP_SOURCE} from './map-source.js';
import {SVG_SIZES} from './map-assets.js';

// Approved M01 geography. Extra faint motifs are decorative previews, not new
// rewards, unlock rules or persisted user records.
const nodes=[[28,568,56],[137,455,56],[99,326,56],[238,300,56],[304,176,68],[494,184,52],[580,310,52],[690,236,52]];
const previews=[['story',786,358,52,.42],['people',115,755,50,.30],['moon',225,865,50,.30],['day',347,801,50,.30],['checklist',443,935,50,.30],['location',615,795,50,.24],['flag',699,675,50,.24],['gift',821,739,50,.24],['telescope',879,875,50,.24],['journey',775,999,50,.24],['orbits',276,1166,48,.18],['charm',396,1296,48,.18],['pair',536,1212,48,.18],['graph',644,1338,48,.18]];
const $=id=>document.getElementById(id);
function image(name,x,y,size,opacity=1){
  const img=document.createElement('img');img.src='./art/map/'+name+'.svg';img.alt='';img.draggable=false;
  const [w,h]=SVG_SIZES[name];img.style.cssText=`position:absolute;left:${x+(size-w)/2}px;top:${y+(size-h)/2}px;width:${w}px;height:${h}px;opacity:${opacity};pointer-events:none`;
  return img;
}
export function createRewardMap(){
  const viewport=$('reward-scroll'),canvas=$('map-canvas');
  const camera={zoom:1,x:0,y:0};
  const levels=MAP_SOURCE.cameras.map(c=>({zoom:c.width/1000,x:c.x,y:c.y}));
  const pointers=new Map();let drag=null,pinch=null,moved=false;
  const logical=e=>{const r=viewport.getBoundingClientRect();return {x:(e.clientX-r.left)*390/r.width,y:(e.clientY-r.top)*844/r.height};};
  function paint(){canvas.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`;viewport.dataset.zoom=String(camera.zoom);$('zoom-in').disabled=camera.zoom>=levels[2].zoom-.001;$('zoom-out').disabled=camera.zoom<=levels[1].zoom+.001;}
  function clamp(){camera.x=Math.min(0,Math.max(390-1000*camera.zoom,camera.x));camera.y=Math.min(0,Math.max(844-1500*camera.zoom,camera.y));}
  function zoomTo(zoom,anchor={x:195,y:422}){const old=camera.zoom;camera.zoom=Math.max(levels[1].zoom,Math.min(levels[2].zoom,zoom));camera.x=anchor.x-(anchor.x-camera.x)*camera.zoom/old;camera.y=anchor.y-(anchor.y-camera.y)*camera.zoom/old;clamp();paint();}
  function step(direction){
    const choices=[levels[1],levels[0],levels[2]];
    const next=direction>0?choices.find(c=>c.zoom>camera.zoom+.001):[...choices].reverse().find(c=>c.zoom<camera.zoom-.001);
    if(next){Object.assign(camera,next);clamp();paint();$('map-status').textContent=`지도 ${Math.round(camera.zoom*100)}%`;}
  }
  $('zoom-in').addEventListener('click',()=>step(1));$('zoom-out').addEventListener('click',()=>step(-1));
  viewport.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;pointers.set(e.pointerId,logical(e));moved=false;
    if(pointers.size===1){drag={...logical(e),startX:camera.x,startY:camera.y,target:e.target};pinch=null;}
    if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:camera.zoom};}
  });
  viewport.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;const point=logical(e);pointers.set(e.pointerId,point);
    if(pointers.size===2){const [a,b]=[...pointers.values()];if(pinch){zoomTo(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});moved=true;}return;}
    if(drag){const dx=point.x-drag.x,dy=point.y-drag.y;if(Math.hypot(dx,dy)>5){moved=true;viewport.setPointerCapture(e.pointerId);}if(moved){camera.x=drag.startX+dx;camera.y=drag.startY+dy;clamp();paint();}}
  });
  function end(e){pointers.delete(e.pointerId);if(!pointers.size){drag=null;pinch=null;}else if(pointers.size===1){const p=[...pointers.values()][0];drag={...p,startX:camera.x,startY:camera.y};pinch=null;}}
  viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
  viewport.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false;}},true);
  viewport.addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey||e.metaKey)zoomTo(camera.zoom*Math.exp(-e.deltaY*.003),logical(e));else{camera.x-=e.deltaX+(e.shiftKey?e.deltaY:0);camera.y-=e.shiftKey?0:e.deltaY;clamp();paint();}},{passive:false});
  viewport.addEventListener('keydown',e=>{const delta={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]}[e.key];if(delta){e.preventDefault();camera.x+=delta[0];camera.y+=delta[1];clamp();paint();}else if(e.key==='+'||e.key==='='){e.preventDefault();step(1);}else if(e.key==='-'){e.preventDefault();step(-1);}});
  for(const [x,y,size,opacity]of MAP_SOURCE.dust){const dot=document.createElement('i');dot.className='map-dust';dot.style.cssText=`left:${x}px;top:${y}px;width:${size}px;height:${size}px;opacity:${opacity}`;$('map-decor').append(dot);}
  for(const [x,y,size,opacity]of MAP_SOURCE.sparkles){const img=image('sparkle',x,y,size,opacity);img.style.width=size+'px';img.style.height=size+'px';img.style.left=x+'px';img.style.top=y+'px';$('map-decor').append(img);}
  for(const [name,x,y,size,opacity]of previews){const img=image('preview-'+name,x,y,size,opacity);if(opacity<.42)img.style.filter=`blur(${opacity===.30?.6:opacity===.24?.9:1.3}px)`;$('map-previews').append(img);}
  const halo=image('current-halo',263,135,150);halo.id='map-current-halo';$('map-decor').append(halo);
  $('map-paths').innerHTML=`<defs><linearGradient id="earned-line"><stop stop-color="#B8E1FA"/><stop offset=".5" stop-color="#F3F0E7"/><stop offset="1" stop-color="#D8CDF5"/></linearGradient></defs><path d="M56 596 L165 483 L127 354 L266 328 L307.5 222.5" fill="none" stroke="#C9ABE5" stroke-opacity=".16" stroke-width="7"/><path d="M56 596 L165 483 L127 354 L266 328 L307.5 222.5" fill="none" stroke="url(#earned-line)" stroke-width="1.6"/><g fill="none" stroke="#E0D7FC" stroke-width="1.4" stroke-opacity=".9"><path opacity=".42" d="M520 210 L606 336 L716 262 L812 384"/><path opacity=".30" d="M140 780 L250 890 L372 826 L468 960"/><path opacity=".24" d="M640 820 L724 700 L846 764 L904 900 L800 1024"/><path opacity=".18" d="M300 1190 L420 1320 L560 1236 L668 1362"/></g>`;
  paint();
  return {current:()=>({...camera}),render(order,owned,rewards,onOpen){
    $('reward-hits').replaceChildren();
    $('map-current-halo').hidden=!owned.has(5);
    for(const id of order){const [x,y,size]=nodes[id-1],hit=document.createElement('button');hit.type='button';hit.className='map-node'+(owned.has(id)?'':' locked');hit.dataset.id=String(id);hit.style.cssText=`left:${x}px;top:${y}px;width:${size}px;height:${size}px`;hit.setAttribute('aria-label',`${String(id).padStart(2,'0')} · ${rewards[id].name} ${owned.has(id)?'리워드 상세 보기':'미획득 리워드 안내'}`);hit.append(image('node-'+String(id).padStart(2,'0'),0,0,size));hit.addEventListener('click',()=>onOpen(id,hit));hit.addEventListener('focus',()=>{if(!hit.matches(':focus-visible'))return;camera.x=195-(x+size/2)*camera.zoom;camera.y=422-(y+size/2)*camera.zoom;clamp();paint();});$('reward-hits').append(hit);}
  }};
}
