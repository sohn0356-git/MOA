import type {CityBuilding} from './cityBuildings'
export type Vec3=[number,number,number]
export type CityCamera={yaw:number;pitch:number;distance:number;target:Vec3;eye?:Vec3}
export const defaultCityCamera:CityCamera={yaw:.42,pitch:.72,distance:118,target:[0,0,0]}
export const sub=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]]
export const dot=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
export const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
export function normalize(a:Vec3):Vec3{const n=Math.hypot(...a)||1;return [a[0]/n,a[1]/n,a[2]/n]}
export function cameraBasis(camera:CityCamera){
 const eye:Vec3=camera.eye??[camera.target[0]+Math.sin(camera.yaw)*Math.cos(camera.pitch)*camera.distance,camera.target[1]+Math.sin(camera.pitch)*camera.distance,camera.target[2]+Math.cos(camera.yaw)*Math.cos(camera.pitch)*camera.distance]
 const forward=normalize(sub(camera.target,eye)),right=normalize(cross(forward,[0,1,0])),up=cross(right,forward)
 return {eye,forward,right,up}
}
export function multiply(a:Float32Array,b:Float32Array){
 const out=new Float32Array(16)
 for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k]
 return out
}
export function cameraMatrix(camera:CityCamera,aspect:number){
 const {eye,forward:f,right:s,up:u}=cameraBasis(camera)
 const view=new Float32Array([s[0],u[0],-f[0],0,s[1],u[1],-f[1],0,s[2],u[2],-f[2],0,-dot(s,eye),-dot(u,eye),dot(f,eye),1])
 const t=1/Math.tan(Math.PI/7),near=camera.eye ? .08 : 1,far=600
 const perspective=new Float32Array([t/aspect,0,0,0,0,t,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0])
 return multiply(perspective,view)
}
export function projectPoint(point:Vec3,matrix:Float32Array){
 const v=[...point,1],out=[0,0,0,0]
 for(let r=0;r<4;r++)for(let c=0;c<4;c++)out[r]+=matrix[c*4+r]*v[c]
 return {x:out[0]/out[3],y:out[1]/out[3],visible:out[3]>0&&Math.abs(out[0]/out[3])<1&&Math.abs(out[1]/out[3])<1}
}
export function cityRay(camera:CityCamera,x:number,y:number,aspect:number){
 const {eye,forward,right,up}=cameraBasis(camera),t=Math.tan(Math.PI/7)
 return {origin:eye,direction:normalize([forward[0]+right[0]*x*t*aspect+up[0]*y*t,forward[1]+right[1]*x*t*aspect+up[1]*y*t,forward[2]+right[2]*x*t*aspect+up[2]*y*t])}
}
export function rayBox(origin:Vec3,direction:Vec3,min:Vec3,max:Vec3){
 let near=-Infinity,far=Infinity
 for(let i=0;i<3;i++){
  if(Math.abs(direction[i])<1e-8){if(origin[i]<min[i]||origin[i]>max[i])return null;continue}
  let a=(min[i]-origin[i])/direction[i],b=(max[i]-origin[i])/direction[i]
  if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b)
  if(near>far)return null
 }
 return far<0?null:Math.max(0,near)
}
export function pickCityBuilding(buildings:readonly CityBuilding[],camera:CityCamera,x:number,y:number,aspect:number){
 const {origin,direction}=cityRay(camera,x,y,aspect)
 let picked:CityBuilding|null=null,best=Infinity
 for(const b of buildings){const cx=(b.x-600)/10,cz=(b.z-400)/10,d=rayBox(origin,direction,[cx-b.width/2,0,cz-b.depth/2],[cx+b.width/2,b.height+4,cz+b.depth/2]);if(d!==null&&d<best){picked=b;best=d}}
 return picked
}
