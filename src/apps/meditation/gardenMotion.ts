export type GardenResident={x:number;y:number;facing:number;moving:boolean;goalX:number;goalY:number;phase:'rest'|'turn'|'walk';until:number}
const TILT=Math.sin(9*Math.PI/180)
export function gardenHeading(dx:number,dy:number,previous=0){
 if(Math.hypot(dx,dy)<.001)return previous
 // The avatar's front is +Z. rotateX(-9deg) projects it onto screen Y
 // at sin(9deg), so compensate before applying rotateY.
 const angle=Math.atan2(dx*TILT,dy)*180/Math.PI
 return previous+((angle-previous+540)%360+360)%360-180
}
export function createGardenResident(_random=Math.random,self=false,slot=0):GardenResident{
 const angle=slot*2.399963229728653,radius=slot<6?12:15
 const x=self?50:50+Math.cos(angle)*radius,y=self?55:55+Math.sin(angle)*radius
 return{x,y,facing:0,moving:false,goalX:x,goalY:y,phase:'rest',until:200}
}
export function advanceGardenResident(p:GardenResident,dt:number,width:number,height:number,now:number,random=Math.random):GardenResident{
 if(now<p.until)return p
 if(p.phase==='rest'){
  const goalX=34+random()*32,goalY=37+random()*36,dx=(goalX-p.x)*width/100,dy=(goalY-p.y)*height/100
  return{...p,goalX,goalY,facing:gardenHeading(dx,dy,p.facing),moving:false,phase:'turn',until:now+200}
 }
 const dx=(p.goalX-p.x)*width/100,dy=(p.goalY-p.y)*height/100,distance=Math.hypot(dx,dy)
 const travel=Math.min(distance,10*Math.min(dt,.05))
 if(distance<=.001)return{...p,x:p.goalX,y:p.goalY,moving:false,phase:'rest',until:now+1000}
 if(travel>=distance)return{...p,x:p.goalX,y:p.goalY,moving:false,phase:'rest',until:now+1000}
 return{...p,x:p.x+dx/distance*travel/width*100,y:p.y+dy/distance*travel/height*100,moving:true,phase:'walk'}
}
