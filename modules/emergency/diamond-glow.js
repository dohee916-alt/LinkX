// Figma background fills, not a foreground effect. Frame 390 × 844.
// Matrix maps normalized frame coordinates into gradient coordinates.
export const diamondFrames={
 center:[
 {id:"908:92730",m:[1.5495867729187012,-.2727273106575012,7.617588043212891,-6.095030307769775]},
 {id:"908:92928",m:[.7911391854286194,.10548529773950577,2.318727970123291,-1.5017590522766113]},
 {id:"908:93127",m:[.34153005480766296,.3296903371810913,.7395263314247131,-.13479046523571014]}
 ],
 end:[
 {id:"908:92625",m:[1.404494285583496,-.5898875594139099,6.904330253601074,-5.477517604827881]},
 {id:"908:92823",m:[.8700696229934692,-.17749422788619995,2.550063133239746,-1.7014708518981934]},
 {id:"908:93022",m:[.3858024775981903,.19958846271038055,.8353909254074097,-.21707816421985626]}
 ]
};
const W=390,H=844;
const geometry=({m:[a,c,e,f]})=>({x:W*(.5-c)/a,y:H*(.5-f)/e,rx:W*.5/a,ry:H*.5/e});
const middle=diamondFrames.center.map(geometry),right=diamondFrames.end.map(geometry);
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
export const GLOW_DURATION=1800; // Existing transition duration; Figma provides three visual examples.
// Feather the outer diamond well past its former sharp edge.
// Keep the warm central glow and the original Figma timing/geometry.
const FEATHER_REACH=1.55;
let glowPixels=null;
export function drawDiamond(ctx,cx,cy,rx,ry,opacity=1){
 if(!glowPixels||glowPixels.width!==W||glowPixels.height!==H){
  glowPixels=ctx.createImageData(W,H);
  const data=glowPixels.data;
  for(let i=0;i<data.length;i+=4){data[i]=255;data[i+1]=249;data[i+2]=232;}
 }
 const pixels=glowPixels.data;
 const ix=1/Math.max(1,rx),iy=1/Math.max(1,ry);
 const strength=Math.max(0,Math.min(1,opacity))*255;
 let k=3;
 for(let y=0;y<H;y++){
  const dy=Math.abs(y+.5-cy)*iy;
  for(let x=0;x<W;x++,k+=4){
   // L1 metric maintains the four-pointed Figma star silhouette.
   const d=(Math.abs(x+.5-cx)*ix+dy)/FEATHER_REACH;
   const t=Math.max(0,1-d);
   // Smoothstep reaches zero with a flat slope: no visible cutoff contour.
   pixels[k]=Math.round(strength*t*t*(3-2*t));
  }
 }
 ctx.putImageData(glowPixels,0,0);
}
export function playDiamond(canvas,buttonX,buttonY,done){
 const ctx=canvas.getContext("2d");canvas.hidden=false;
 const blend=Math.min(1,Math.max(0,(buttonX-195)/(300.04-195)));
 const frames=middle.map((a,i)=>{
  const b=right[i];
  return {x:buttonX+mix(a.x-195,b.x-300.04,blend),y:buttonY+mix(a.y-729.04,b.y-729.04,blend),rx:mix(a.rx,b.rx,blend),ry:mix(a.ry,b.ry,blend)};
 });
 // At the exact sampled button positions, these reproduce Figma's sampled geometry.
 const start=performance.now();
 const step=now=>{
  const elapsed=Math.max(0,now-start),p=Math.min(1,elapsed/GLOW_DURATION);
  const q=p*3;
  const i=Math.min(2,Math.floor(q)),t=smooth(q-i);
  const to=frames[i],from=frames[Math.max(0,i-1)];
  const alpha=i===0?t:1;
  drawDiamond(ctx,mix(from.x,to.x,t),mix(from.y,to.y,t),mix(from.rx,to.rx,t),mix(from.ry,to.ry,t),alpha);
  if(p<1)requestAnimationFrame(step);else done();
 };
 requestAnimationFrame(step);
}
