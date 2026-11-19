// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,describe,expect,it} from 'vitest'
import {cleanup,render} from '@testing-library/react'
import {PixelAvatar} from './PixelAvatar'
import {avatarPresets,applyAvatarPreset,defaultAvatar,getAvatarHairStyles,matchesAvatarPreset,normalizeAvatar,selectAvatarGender} from './sanctuaryCommunity'
afterEach(cleanup)
describe('avatar samples and feminine appearance',()=>{
 it('offers six valid distinct samples and preserves the entered name',()=>{
  expect(avatarPresets).toHaveLength(6);expect(new Set(avatarPresets.map(p=>p.id)).size).toBe(6)
  expect(avatarPresets.filter(p=>p.appearance.gender==='female')).toHaveLength(3)
  for(const preset of avatarPresets){
   const profile=applyAvatarPreset(defaultAvatar('내 이름'),preset.id)
   expect(profile.name).toBe('내 이름');expect(normalizeAvatar(profile)).toEqual(profile);expect(matchesAvatarPreset(profile,preset)).toBe(true)
  }
 })
 it('switches female selection to long hair while allowing later manual customization',()=>{
  const selected=selectAvatarGender({...defaultAvatar('하늘'),hairStyle:2},'female')
  expect(selected).toMatchObject({name:'하늘',gender:'female',hairStyle:0})
  expect(getAvatarHairStyles(selected.gender)[selected.hairStyle!]).toBe('긴 생머리')
  const custom={...selected,hairStyle:1};expect(getAvatarHairStyles(custom.gender)[custom.hairStyle]).toBe('단발')
 })
 it('renders actual shoulder-length hair geometry and a feminine top silhouette',()=>{
  const profile=selectAvatarGender(defaultAvatar(),'female')
  const view=render(<PixelAvatar profile={profile} facing={-25} moving={false} seated={false} scale={1}/>)
  expect(view.container.querySelector('.pixel-hair-mesh.is-long')).toBeInTheDocument()
  expect(view.container.querySelector('.voxel-hair-curtain')).toHaveStyle({height:'28px'})
  expect(view.container.querySelector('.voxel-blouse-hem')).toBeInTheDocument()
  expect(view.container.querySelector('.voxel-body')).toHaveStyle({width:'14px'})
  view.rerender(<PixelAvatar profile={{...profile,gender:'male'}} facing={-25} moving={false} seated={false} scale={1}/>)
  expect(view.container.querySelector('.pixel-hair-mesh.is-long')).toBeNull()
  expect(view.container.querySelector('.voxel-body')).toHaveStyle({width:'16px'})
 })
 it('attaches long hair and the bun to the same rig as the bowing head',()=>{
  const profile=applyAvatarPreset(defaultAvatar(),'sunshine')
  const view=render(<PixelAvatar profile={profile} facing={120} moving={false} seated={false} pose="kneeling" scale={1}/>)
  const rig=view.container.querySelector('.pixel-head-rig')!
  expect(rig.querySelector('.voxel-head')).toBeInTheDocument();expect(rig.querySelector('.voxel-hair-wave-left')).toBeInTheDocument()
  view.rerender(<PixelAvatar profile={{...profile,hairStyle:2}} facing={120} moving={false} seated={false} pose="kneeling" scale={1}/>)
  expect(view.container.querySelector('.pixel-head-rig .voxel-hair-bun')).toBeInTheDocument()
 })
 it('keeps old profiles compatible and allows overriding preset colors',()=>{
  expect(normalizeAvatar({name:'이전 캐릭터',skin:1,hair:2,shirt:3})).toMatchObject({name:'이전 캐릭터',skin:1,hair:2,shirt:3,hairStyle:0})
  const p=avatarPresets[0],profile=applyAvatarPreset(defaultAvatar(),p.id)
  expect(matchesAvatarPreset({...profile,shirt:8},p)).toBe(false)
  expect(applyAvatarPreset(profile,'unknown')).toEqual(profile)
 })
})
