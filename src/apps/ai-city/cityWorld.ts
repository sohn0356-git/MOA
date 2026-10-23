export const avatarColors = {
 skin:['#f4d4b6','#e9b991','#c88d65','#9a6245','#633d2c'],
 hair:['#27222b','#664339','#b57442','#e9cc86','#7d6bb3','#e77999'],
 shirt:['#8a6de9','#ee9277','#63a994','#689cd4','#e9bf56','#303d56']
}
export type CityAvatarLook={skin:number;hair:number;shirt:number;style:'short'|'bob'|'curly';accessory:'none'|'glasses'|'cap'}
export function residentSeed(id:string){return Array.from(id).reduce((a,c)=>a*31+c.charCodeAt(0),7)>>>0}
export function defaultAvatar(id:string):CityAvatarLook{const n=residentSeed(id);return {skin:n%5,hair:(n>>>3)%6,shirt:(n>>>6)%6,style:(['short','bob','curly'] as const)[n%3],accessory:n%4===0?'glasses':'none'}}
export const worldPlaces=[
 {id:'plaza',name:'첫 광장',activity:'이웃을 만나는 중',x:570,y:370,color:'#e4b99e',icon:'sun',description:'도시의 이야기가 모이는 곳'},
 {id:'cafe',name:'작은 식탁',activity:'카페에서 쉬는 중',x:290,y:240,color:'#efb787',icon:'coffee',description:'커피 한 잔과 느긋한 대화'},
 {id:'studio',name:'창작 작업실',activity:'새 작품을 구상하는 중',x:850,y:240,color:'#b7a1e6',icon:'brush',description:'작은 아이디어가 작품이 되는 곳'},
 {id:'park',name:'느린 공원',activity:'공원을 산책하는 중',x:290,y:580,color:'#8dc19d',icon:'tree',description:'잠깐 멈춰도 괜찮은 초록 쉼터'},
 {id:'library',name:'이야기 도서관',activity:'기록을 읽는 중',x:850,y:580,color:'#91b8ce',icon:'book',description:'어제의 기록과 내일의 영감'},
 {id:'home',name:'주민의 집',activity:'집에서 쉬는 중',x:570,y:690,color:'#e7a4ad',icon:'home',description:'각자의 하루가 시작되는 자리'}
] as const
export type PlaceId=typeof worldPlaces[number]['id']
export type WorldPoint={x:number;y:number}
export const worldNodes:Record<string,WorldPoint>={
 plaza:{x:570,y:370},cafe:{x:290,y:240},studio:{x:850,y:240},park:{x:290,y:580},library:{x:850,y:580},home:{x:570,y:690},
 west:{x:290,y:370},east:{x:850,y:370},south:{x:570,y:580}
}
export const worldEdges=[['cafe','west'],['west','plaza'],['west','park'],['plaza','east'],['east','studio'],['east','library'],['plaza','south'],['south','park'],['south','library'],['south','home']] as const
export function walkingRoute(from:string,to:string):WorldPoint[]{
 if(!worldNodes[from]||!worldNodes[to])return [worldNodes.plaza]
 const queue=[[from]],seen=new Set([from])
 while(queue.length){const path=queue.shift()!,last=path[path.length-1];if(last===to)return path.map(id=>worldNodes[id]);for(const [a,b] of worldEdges){const next=a===last?b:b===last?a:'';if(next&&!seen.has(next)){seen.add(next);queue.push([...path,next])}}}
 return [worldNodes[from]]
}
export function routeLength(route:WorldPoint[]){return route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route[i].x,p.y-route[i].y),0)}
export function routePosition(route:WorldPoint[],progress:number):WorldPoint{
 let remaining=routeLength(route)*Math.max(0,Math.min(1,progress))
 for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(remaining<=length){const t=length?remaining/length:0;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}}remaining-=length}
 return route[route.length-1]??worldNodes.plaza
}
export type CityWorldCommand={from:string;startX:number;startY:number;to:PlaceId;mode:'walk'|'stay';startedAt:number;duration:number;operatorUid:string;operatorAccount:string}
export type CityWorldState={point:WorldPoint;route:WorldPoint[];place:typeof worldPlaces[number];from:string;moving:boolean;progress:number;source:'automatic'|'saved'}
export function residentWorldState(id:string,now:number,command?:CityWorldCommand):CityWorldState{
 if(command){const route=[{x:command.startX,y:command.startY},...walkingRoute(command.from,command.to)],progress=command.mode==='stay'?1:Math.max(0,Math.min(1,(now-command.startedAt)/command.duration));return {point:command.mode==='stay'?{x:command.startX,y:command.startY}:routePosition(route,progress),route,place:worldPlaces.find(p=>p.id===command.to)!,from:command.from,moving:progress<1,progress,source:'saved'}}
 // Deterministic autonomous walking: every viewer sees the same route at the same time.
 const seed=residentSeed(id),cycle=90000,offset=now+(Math.imul(seed,2654435761)>>>0)%cycle,step=Math.floor(offset/cycle),phase=(offset%cycle)/cycle
 const from=worldPlaces[(step+seed)%worldPlaces.length],to=worldPlaces[(step+seed+1)%worldPlaces.length],route=walkingRoute(from.id,to.id),progress=Math.min(1,phase/.75)
 return {point:routePosition(route,progress),route,place:to,from:from.id,moving:progress<1,progress,source:'automatic'}
}

export function nearestWorldNode(point:WorldPoint){return Object.entries(worldNodes).sort((a,b)=>Math.hypot(a[1].x-point.x,a[1].y-point.y)-Math.hypot(b[1].x-point.x,b[1].y-point.y))[0][0]}
