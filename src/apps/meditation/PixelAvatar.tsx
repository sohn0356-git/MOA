import type { CSSProperties } from 'react'
import {avatarSkins,avatarHairs,avatarShirts,defaultAvatar,type AvatarPose,type AvatarProfile} from './sanctuaryCommunity'
function Block({name,x,y,width,height,depth}:{name:string;x:number;y:number;width:number;height:number;depth:number}) {
 return <div className={'voxel-block voxel-'+name} style={{left:x,top:y,width,height,'--voxel-depth':depth+'px','--voxel-width':width+'px','--voxel-height':height+'px'} as CSSProperties}>
  {['front','back','right','left','top','bottom'].map(face=><i key={face} className={'voxel-face voxel-face-'+face}/>)}
 </div>
}
export function PixelAvatar({facing,moving,seated,scale,profile=defaultAvatar(),pose,label='나의 3D 픽셀 아바타'}:{facing:number;moving:boolean;seated:boolean;scale:number;profile?:AvatarProfile;pose?:AvatarPose;label?:string}) {
 return <div className="pixel-avatar" role="img" aria-label={label} data-moving={moving} data-seated={pose?pose==='sitting':seated} data-pose={pose||(seated?'sitting':'standing')} style={{'--avatar-facing':facing+'deg','--avatar-scale':scale,'--avatar-skin':avatarSkins[profile.skin],'--avatar-hair':avatarHairs[profile.hair],'--avatar-shirt':avatarShirts[profile.shirt]} as CSSProperties}>
  <span className="pixel-avatar-shadow"/>
  <div className="pixel-avatar-model">
   <div className="pixel-upper-body">
    <Block name="head" x={8} y={0} width={18} height={18} depth={16}/>
    <Block name="body" x={9} y={20} width={16} height={22} depth={10}/>
    <div className="pixel-limb pixel-arm-left"><Block name="arm" x={0} y={0} width={6} height={23} depth={8}/></div>
    <div className="pixel-limb pixel-arm-right"><Block name="arm" x={0} y={0} width={6} height={23} depth={8}/></div>
   </div>
   {['left','right'].map(side=><div className={'pixel-limb pixel-leg-'+side} key={side}><div className="pixel-thigh">
    <Block name="thigh" x={0} y={0} width={7} height={11} depth={8}/>
    <div className="pixel-shin"><Block name="shin" x={0} y={0} width={7} height={11} depth={8}/><Block name="shoe" x={0} y={8} width={7} height={4} depth={12}/></div>
   </div></div>)}
  </div>
 </div>
}
