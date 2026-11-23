// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {AvatarEditor} from './AvatarEditor'
import {PixelAvatar} from './PixelAvatar'
import {randomizeAvatar,avatarPresets,applyAvatarPreset,defaultAvatar,getAvatarHairStyles,matchesAvatarPreset,normalizeAvatar,selectAvatarGender} from './sanctuaryCommunity'
afterEach(cleanup)
describe('avatar samples and feminine appearance',()=>{
 it('offers six valid distinct samples for each gender and preserves the entered name',()=>{
  expect(avatarPresets).toHaveLength(12);expect(new Set(avatarPresets.map(p=>p.id)).size).toBe(12)
  expect(avatarPresets.filter(p=>p.appearance.gender==='female')).toHaveLength(6)
  expect(avatarPresets.filter(p=>p.appearance.gender==='male')).toHaveLength(6)
  expect(new Set(avatarPresets.map(p=>JSON.stringify(p.appearance))).size).toBe(12)
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
  expect(view.container.querySelector('.voxel-hair-curtain')).toHaveStyle({height:'36px'})
  expect(view.container.querySelector('.voxel-blouse-hem')).toBeInTheDocument()
  expect(view.container.querySelector('.voxel-tunic-flare')).toHaveStyle({width:'24px'})
  expect(view.container.querySelector('.voxel-hair-fringe-left')).toBeInTheDocument()
  expect(view.container.querySelector('.voxel-body')).toHaveStyle({width:'14px'})
  view.rerender(<PixelAvatar profile={{...profile,gender:'male'}} facing={-25} moving={false} seated={false} scale={1}/>)
  expect(view.container.querySelector('.pixel-hair-mesh.is-long')).toBeNull()
  expect(view.container.querySelector('.voxel-body')).toHaveStyle({width:'16px'})
  expect(view.container.querySelector('.voxel-shoulders')).toHaveStyle({width:'22px'})
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

it.each(['male','female'] as const)('randomizes valid appearance while retaining name and %s selection',gender=>{
 const original={...defaultAvatar('내 이름'),gender}
 const next=randomizeAvatar(original,()=>.99999)
 expect(next.name).toBe(original.name);expect(next.gender).toBe(gender)
 expect(normalizeAvatar(next)).toEqual(next)
 expect(original).toEqual({...defaultAvatar('내 이름'),gender})
})
it('always changes the preview even if random values repeat the existing appearance',()=>{
 const original=normalizeAvatar(defaultAvatar('하늘'))
 const first=randomizeAvatar(original,()=>0),second=randomizeAvatar(first,()=>0)
 expect(first.shirt).not.toBe(original.shirt);expect(second.shirt).not.toBe(first.shirt)
 expect(second.name).toBe('하늘')
})
it('rerolls in the editor without changing the name or saving until requested',async()=>{
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
 const random=vi.spyOn(Math,'random').mockReturnValue(0)
 let finish=()=>{};const save=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve})),close=vi.fn()
 try{
  const view=render(<AvatarEditor profile={defaultAvatar('하늘')} onSave={save} onClose={close}/>)
  fireEvent.change(screen.getByRole('textbox',{name:'캐릭터 이름'}),{target:{value:'내가 정한 이름'}})
  fireEvent.click(screen.getByRole('tab',{name:'여성'}))
  const preview=()=>view.container.querySelector('.sanctuary-avatar-turntable .pixel-avatar') as HTMLElement
  const before=preview().style.getPropertyValue('--avatar-shirt')
  fireEvent.click(screen.getByRole('button',{name:'아바타 랜덤 생성'}))
  const first=preview().style.getPropertyValue('--avatar-shirt');expect(first).not.toBe(before)
  fireEvent.click(screen.getByRole('button',{name:'아바타 랜덤 생성'}))
  expect(preview().style.getPropertyValue('--avatar-shirt')).not.toBe(first)
  expect(preview()).toHaveAttribute('data-gender','female')
  expect(screen.getByRole('textbox',{name:'캐릭터 이름'})).toHaveValue('내가 정한 이름')
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'캐릭터 저장'}))
  expect(screen.getByRole('button',{name:'아바타 랜덤 생성'})).toBeDisabled()
  expect(save).toHaveBeenCalledWith(expect.objectContaining({name:'내가 정한 이름',gender:'female'}))
  finish();await waitFor(()=>expect(close).toHaveBeenCalledOnce())
 }finally{random.mockRestore()}
})
