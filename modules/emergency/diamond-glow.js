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
// Cubic spline keeps expansion velocity continuous through all sampled Figma shapes.
const catmull=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
const spline=(points,key,p)=>{
 const u=Math.min(2.999999,Math.max(0,p*3));
 const i=Math.floor(u),t=u-i;
 const a=points[Math.max(0,i-1)][key],b=points[i][key],c=points[i+1][key],d=points[Math.min(3,i+2)][key];
 // Extrapolate endpoint derivatives rather than pausing at the first/last knot.
 const prev=i===0?b-(c-b):a;
 const next=i===2?c+(c-b):d;
 return catmull(prev,b,c,next,t);
};
export const GLOW_DURATION=1800; // Existing transition duration; Figma provides three visual examples.
// Cache a single smooth, feathered L1 star texture. Animation frames only
// transform/composite this image; they never recalculate 390x844 alpha pixels.
const FEATHER_REACH=1.95;
const TEXTURE_SIZE=768;
let starTexture;
function getStarTexture(){
 if(starTexture)return starTexture;
 const texture=document.createElement("canvas");
 texture.width=texture.height=TEXTURE_SIZE;
 const tctx=texture.getContext("2d",{willReadFrequently:false});
 const img=tctx.createImageData(TEXTURE_SIZE,TEXTURE_SIZE);
 const data=img.data;
 for(let y=0;y<TEXTURE_SIZE;y++){
  const ny=Math.abs(2*(y+.5)/TEXTURE_SIZE-1);
  for(let x=0;x<TEXTURE_SIZE;x++){
   const nx=Math.abs(2*(x+.5)/TEXTURE_SIZE-1);
   const t=Math.max(0,1-nx-ny);
   const i=(y*TEXTURE_SIZE+x)*4;
   data[i]=255;data[i+1]=249;data[i+2]=232;
   data[i+3]=Math.round(255*t*t*(3-2*t));
  }
 }
 tctx.putImageData(img,0,0);
 starTexture=texture;
 return texture;
}
export function drawDiamond(ctx,cx,cy,rx,ry,opacity=1){
 ctx.clearRect(0,0,W,H);
 const w=Math.max(1,rx)*FEATHER_REACH,h=Math.max(1,ry)*FEATHER_REACH;
 ctx.save();
 ctx.globalAlpha=Math.max(0,Math.min(1,opacity));
 ctx.imageSmoothingEnabled=true;
 ctx.imageSmoothingQuality="high";
 ctx.drawImage(getStarTexture(),cx-w,cy-h,2*w,2*h);
 ctx.restore();
}
export function playDiamond(canvas,buttonX,buttonY,done){
 const ctx=canvas.getContext("2d");canvas.hidden=false;
 const blend=Math.min(1,Math.max(0,(buttonX-195)/(300.04-195)));
 const frames=middle.map((a,i)=>{
  const b=right[i];
  return {x:buttonX+mix(a.x-195,b.x-300.04,blend),y:buttonY+mix(a.y-729.04,b.y-729.04,blend),rx:mix(a.rx,b.rx,blend),ry:mix(a.ry,b.ry,blend)};
 });
 // The first third formerly interpolated frame[0] to itself, so the star
 // looked frozen. Expand continuously from a small origin through all three
 // Figma-sampled sizes, with no zero-velocity stop between them.
 const opening={x:buttonX,y:buttonY,rx:frames[0].rx*.23,ry:frames[0].ry*.23};
 const stops=[opening,...frames];
 const texture=getStarTexture(); // Prebuild texture before starting the timed motion.
 const start=performance.now();
 const step=now=>{
  const elapsed=Math.max(0,now-start),p=Math.min(1,elapsed/GLOW_DURATION);
  const cx=spline(stops,"x",p),cy=spline(stops,"y",p);
  const rx=Math.max(1,spline(stops,"rx",p)),ry=Math.max(1,spline(stops,"ry",p));
  const alpha=Math.min(1,p/.18);
  drawDiamond(ctx,cx,cy,rx,ry,alpha);
  if(p<1)requestAnimationFrame(step);else done();
 };
 requestAnimationFrame(step);
}
