import type { CSSProperties } from 'react'
import {avatarSkins,avatarHairs,avatarShirts,avatarPants,defaultAvatar,type AvatarPose,type AvatarProfile} from './sanctuaryCommunity'
function Block({name,x,y,width,height,depth}:{name:string;x:number;y:number;width:number;height:number;depth:number}) {
 return <div className={'voxel-block voxel-'+name} style={{left:x,top:y,width,height,'--voxel-depth':depth+'px','--voxel-width':width+'px','--voxel-height':height+'px'} as CSSProperties}>
  {['front','back','right','left','top','bottom'].map(face=><i key={face} className={'voxel-face voxel-face-'+face}/>)}
 </div>
}
export function PixelAvatar({facing,moving,seated,scale,profile=defaultAvatar(),pose,label='나의 3D 픽셀 아바타'}:{facing:number;moving:boolean;seated:boolean;scale:number;profile?:AvatarProfile;pose?:AvatarPose;label?:string}) {
 const gender=profile.gender??'male'
 const narrow=gender==='female'
 const hairStyle=profile.hairStyle??0,longHair=narrow&&(hairStyle===0||hairStyle===3),bob=hairStyle===1
 return <div className="pixel-avatar" role="img" aria-label={label} data-gender={gender} data-hair-style={profile.hairStyle??0} data-top-style={profile.topStyle??0} data-accessory={profile.accessory??0} data-moving={moving} data-seated={pose?pose==='sitting':seated} data-pose={pose||(seated?'sitting':'standing')} style={{'--avatar-facing':facing+'deg','--avatar-scale':scale,'--avatar-skin':avatarSkins[profile.skin],'--avatar-hair':avatarHairs[profile.hair],'--avatar-shirt':avatarShirts[profile.shirt],'--avatar-pants':avatarPants[profile.pants??0]} as CSSProperties}>
  <span className="pixel-avatar-shadow"/>
  <div className="pixel-avatar-model">
   <div className="pixel-upper-body">
    <div className="pixel-head-rig">
     <Block name="head" x={8} y={0} width={18} height={18} depth={16}/>
     {hairStyle===2&&<Block name="hair-bun" x={15} y={-5} width={9} height={7} depth={9}/>}
     {(longHair||bob)&&<div className={'pixel-hair-mesh '+(longHair?'is-long':'is-bob')} aria-hidden="true">
      <Block name="hair-curtain" x={7} y={1} width={20} height={longHair?36:21} depth={6}/>
      <Block name="hair-left" x={5} y={4} width={4} height={longHair?35:18} depth={7}/>
      <Block name="hair-right" x={25} y={4} width={4} height={longHair?35:18} depth={7}/>
      {longHair&&<><Block name="hair-fringe-left" x={6} y={4} width={4} height={27} depth={3}/><Block name="hair-fringe-right" x={24} y={4} width={4} height={31} depth={3}/></>}
      {longHair&&<Block name="hair-tips" x={9} y={36} width={16} height={5} depth={5}/>}
      {longHair&&hairStyle===3&&<><Block name="hair-wave-left" x={4} y={25} width={5} height={16} depth={8}/><Block name="hair-wave-right" x={25} y={24} width={5} height={17} depth={8}/></>}
     </div>}
     {profile.accessory===3&&<Block name="hair-clip" x={24} y={5} width={4} height={2} depth={2}/>}
    </div>
    {!narrow&&<Block name="shoulders" x={6} y={20} width={22} height={6} depth={11}/>}
    <Block name="body" x={narrow?10:9} y={20} width={narrow?14:16} height={22} depth={10}/>
    {narrow&&<><Block name="blouse-hem" x={7} y={34} width={20} height={7} depth={11}/><Block name="tunic-flare" x={5} y={40} width={24} height={7} depth={13}/></>}
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
