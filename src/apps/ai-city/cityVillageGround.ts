/** Coordinates are feet on the 3:2 illustration, never screen percentages. */
export type VillagePoint={x:number;y:number}
export const villageStart:VillagePoint={x:52,y:80}
export const villageResidents:VillagePoint[]=[{x:19,y:44},{x:31,y:34},{x:49,y:28},{x:60,y:34},{x:79,y:49},{x:69,y:72},{x:43,y:79},{x:32,y:70}]
const routes:Array<{points:number[][];width:number}>=[
 {points:[[38,96],[48,85],[52,80],[59,80],[69,72],[77,57],[84,50],[77,46],[68,40],[60,34],[55,32],[49,32],[43,33],[31,34],[21,40],[10,49],[17,56],[27,62],[32,70],[42,77],[48,80],[48,85]],width:2.8},
 {points:[[31,34],[46,29],[49,28],[55,25],[60,23]],width:2.8},
 {points:[[34,91],[43,79],[48,80],[59,91],[65,96]],width:4},
]
export function isVillageWalkable(p:VillagePoint){
 if(p.x<3||p.x>97||p.y<20||p.y>97)return false
 return routes.some(r=>r.points.slice(1).some((b,i)=>{const a=r.points[i],dx=(b[0]-a[0])*1.5,dy=b[1]-a[1],px=(p.x-a[0])*1.5,py=p.y-a[1],t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy)));return Math.hypot(px-t*dx,py-t*dy)<=r.width}))
}
/** Substeps prevent a long frame or a diagonal from tunnelling across the canal. */
export function moveVillage(p:VillagePoint,dx:number,dy:number){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx*1.5,dy)/.35));let next={...p}
 for(let i=0;i<steps;i++){const x=dx/steps,y=dy/steps,both={x:next.x+x,y:next.y+y};if(isVillageWalkable(both))next=both;else if(isVillageWalkable({x:next.x+x,y:next.y}))next.x+=x;else if(isVillageWalkable({x:next.x,y:next.y+y}))next.y+=y}
 return next
}
export function villageProjection(p:VillagePoint,width:number,height:number,zoom=1,camera:VillagePoint={x:50,y:50}){const w=Math.max(width,height*1.5),h=w/1.5;return {left:width/2+(p.x-camera.x)*w/100*zoom,top:height/2+(p.y-camera.y)*h/100*zoom}}
export function villageDepth(y:number){return .7+(y-25)/75*.5}

export function villageCamera(p:VillagePoint,width:number,height:number,zoom=1){const w=Math.max(width,height*1.5)*zoom,h=w/1.5,hx=width/w*50,hy=height/h*50;return {x:hx<35?Math.max(hx,Math.min(100-hx,p.x)):50,y:Math.max(hy,Math.min(100-hy,p.y))}}
