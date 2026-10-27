import canalImage from './assets/village-morning.webp'
import gardenImage from './assets/village-garden.webp'
import atelierImage from './assets/village-atelier.webp'
import type {VillagePoint} from './cityVillageGround'
export type VillageAreaId='canal'|'garden'|'atelier'
export const villageAreaIds:VillageAreaId[]=['canal','garden','atelier']
export const villageAreas={
 canal:{name:'운하 산책길',image:canalImage,start:{x:52,y:80},residents:[{x:19,y:44},{x:31,y:34},{x:49,y:28},{x:60,y:34},{x:79,y:49},{x:69,y:72},{x:43,y:79},{x:32,y:70}]},
 garden:{name:'햇살 정원',image:gardenImage,start:{x:50,y:74},residents:[{x:30,y:45},{x:44,y:35},{x:66,y:40},{x:75,y:55},{x:60,y:65},{x:39,y:66},{x:49,y:53},{x:26,y:56}]},
 atelier:{name:'공방 골목',image:atelierImage,start:{x:50,y:73},residents:[{x:32,y:44},{x:47,y:35},{x:65,y:42},{x:74,y:55},{x:60,y:66},{x:40,y:66},{x:50,y:53},{x:28,y:55}]},
} satisfies Record<VillageAreaId,{name:string;image:string;start:VillagePoint;residents:VillagePoint[]}>
export type VillageGate={id:string;from:VillageAreaId;to:VillageAreaId;at:VillagePoint;arrival:VillagePoint}
export const villageGates:VillageGate[]=[
 {id:'canal-garden',from:'canal',to:'garden',at:{x:60,y:23},arrival:{x:50,y:86}},
 {id:'canal-atelier',from:'canal',to:'atelier',at:{x:38,y:94},arrival:{x:50,y:28}},
 {id:'garden-canal',from:'garden',to:'canal',at:{x:50,y:94},arrival:{x:57,y:25}},
 {id:'garden-atelier',from:'garden',to:'atelier',at:{x:50,y:20},arrival:{x:50,y:86}},
 {id:'atelier-canal',from:'atelier',to:'canal',at:{x:50,y:20},arrival:{x:40,y:91}},
 {id:'atelier-garden',from:'atelier',to:'garden',at:{x:50,y:94},arrival:{x:50,y:28}},
]
export function villageGateAt(area:VillageAreaId,p:VillagePoint){return villageGates.find(g=>g.from===area&&Math.hypot((g.at.x-p.x)*1.5,g.at.y-p.y)<2.5)}
export function residentVillageArea(id:string):VillageAreaId{
 if(['ai03','ai04','ai06','ai09','resident-14','resident-16','resident-18','resident-21','resident-22'].includes(id))return 'atelier'
 if(['ai02','ai05','ai07','resident-11','resident-12','resident-20'].includes(id))return 'garden'
 return 'canal'
}
