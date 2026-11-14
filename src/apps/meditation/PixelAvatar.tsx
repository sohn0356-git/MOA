import type { CSSProperties } from 'react'
import {avatarSkins,avatarHairs,avatarShirts,defaultAvatar,type AvatarProfile} from './sanctuaryCommunity'
function Block({name,x,y,width,height,depth}:{name:string;x:number;y:number;width:number;height:number;depth:number}) {
 return <div className={'voxel-block voxel-'+name} style={{left:x,top:y,width,height,'--voxel-depth':depth+'px','--voxel-width':width+'px','--voxel-height':height+'px'} as CSSProperties}>
  {['front','back','right','left','top','bottom'].map(face=><i key={face} className={'voxel-face voxel-face-'+face}/>)}
 </div>
}
export function PixelAvatar({facing,moving,seated,scale,profile=defaultAvatar(),label='나의 3D 픽셀 아바타'}:{facing:number;moving:boolean;seated:boolean;scale:number;profile?:AvatarProfile;label?:string}) {
 return <div className="pixel-avatar" role="img" aria-label={label} data-moving={moving} data-seated={seated} style={{'--avatar-facing':facing+'deg','--avatar-scale':scale,'--avatar-skin':avatarSkins[profile.skin],'--avatar-hair':avatarHairs[profile.hair],'--avatar-shirt':avatarShirts[profile.shirt]} as CSSProperties}>
  <span className="pixel-avatar-shadow"/>
  <div className="pixel-avatar-model">
   <Block name="head" x={8} y={0} width={18} height={18} depth={16}/>
   <Block name="body" x={9} y={20} width={16} height={22} depth={10}/>
   <div className="pixel-limb pixel-arm-left"><Block name="arm" x={0} y={0} width={6} height={23} depth={8}/></div>
   <div className="pixel-limb pixel-arm-right"><Block name="arm" x={0} y={0} width={6} height={23} depth={8}/></div>
   <div className="pixel-limb pixel-leg-left"><Block name="leg" x={0} y={0} width={7} height={22} depth={9}/></div>
   <div className="pixel-limb pixel-leg-right"><Block name="leg" x={0} y={0} width={7} height={22} depth={9}/></div>
  </div>
 </div>
}
