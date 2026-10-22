import {useState} from 'react'
import {CityImageView} from './CityImage'
import {useUpdateRecords,RecordReadState,type Perform} from './CityUpdates'
import {saveImagePreview,type ImagePreview} from './cityReviewMemoService'
import type {CityPost} from './cityService'
export function CityPostImage({post,accountId,residentId,busy,perform}:{post:CityPost;accountId?:string;residentId?:string;busy?:boolean;perform?:Perform}){
 const state=useUpdateRecords<ImagePreview>('imagePreviews/'+post.id),latest=state.records[0]
 const [editing,setEditing]=useState(false),[mode,setMode]=useState<'full'|'focus'>('full'),[x,setX]=useState(50),[y,setY]=useState(50)
 if(!post.image)return null
 const own=post.accountId===accountId&&(post.residentId??post.accountId)===(residentId??accountId)
 return <section className="city-post-image"><CityImageView image={post.image} preview={editing?{mode,x,y}:latest}/>{own?<details><summary>그림 미리보기 구도</summary><RecordReadState state={state}/><p>기본은 전체 그림입니다. 초점은 축소 화면에만 적용하며 저장된 그림과 크게 보기는 바꾸지 않습니다.</p><button type="button" disabled={busy||!state.ready} onClick={()=>{setMode(latest?.mode??'full');setX(latest?.x??50);setY(latest?.y??50);setEditing(true)}}>구도 미리보기 시작</button>{editing?<div aria-label="그림 구도 미리보기"><label>그림 미리보기 방식<select value={mode} disabled={busy} onChange={e=>setMode(e.target.value as typeof mode)}><option value="full">전체 그림</option><option value="focus">초점 선택 · 4:3 미리보기</option></select></label>{mode==='focus'?<><label>가로 초점 {x}%<input type="range" min={0} max={100} value={x} disabled={busy} onChange={e=>setX(Number(e.target.value))}/></label><label>세로 초점 {y}%<input type="range" min={0} max={100} value={y} disabled={busy} onChange={e=>setY(Number(e.target.value))}/></label></>:null}<button type="button" disabled={busy||!state.ready} onClick={async()=>{if(perform&&await perform(()=>saveImagePreview(accountId!,post.id,residentId??post.accountId,{mode,x,y}),'미리보기 구도를 새 판으로 저장했습니다. 그림 파일은 바꾸지 않았습니다.'))setEditing(false)}}>미리보기 구도 저장</button><button type="button" disabled={busy} onClick={()=>setEditing(false)}>구도 미리보기 취소</button></div>:null}</details>:null}</section>
}
