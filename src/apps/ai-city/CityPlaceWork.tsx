import {useUpdateRecords} from './CityUpdates'
import type {UpdateNote} from './cityUpdateService'
import type {CityPost,CityWork} from './cityService'
import type {CityProfile} from './cityResidents'
import {CityPostImage} from './CityPostImage'
import {CityTime} from './CityTime'
export function CityPlaceWork({projectId,posts,works,profiles,onOpen,recordsReady=true}:{projectId:string;posts:CityPost[];works:CityWork[];profiles:CityProfile[];onOpen:(id:string)=>void;recordsReady?:boolean}){
 const notes=useUpdateRecords<UpdateNote>('projectUpdates/'+projectId)
 const projectPosts=posts.filter(p=>p.projectId===projectId&&p.kind==='feed').sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id))
 const artwork=works.filter(w=>projectPosts.some(p=>p.id===w.sourcePostId)).sort((a,b)=>b.updatedAt-a.updatedAt||b.id.localeCompare(a.id))[0],source=projectPosts.find(p=>p.id===artwork?.sourcePostId)
 const recent=(source??projectPosts.find(p=>p.recordScope?.kind==='execution')??projectPosts[0])
 const name=(p:CityPost)=>profiles.find(v=>v.id===(p.residentId??p.accountId))?.name??p.residentId??p.accountId
 return <div className="city-place-work" aria-label="장소의 최근 작업"><h4>{source||recent?.recordScope?.kind==='execution'?'최근 결과 기록':'최근 저장 기록 · 결과 미지정'}</h4>{!recordsReady?<p role="status">기록 연결 확인 전 · 현재 결과로 확정하지 않습니다.</p>:null}{recent?<><button id={'city-place-record-'+projectId} type="button" disabled={!recordsReady} onClick={()=>onOpen(recent.id)}>{recent.body.split('\n')[0].slice(0,100)}</button><p>작성자: {name(recent)} · 마지막 기록 <CityTime value={recent.createdAt}/></p><small>저장된 원문입니다. 실제 운영·담당·완료를 추정하지 않습니다.</small></>:<p>미기록 · 연결된 최근 기록이 없습니다.</p>}<p>바뀐 점: {notes.ready?(notes.records[0]?.changed??'변경점 미기록'):notes.failed?'변경점 확인 불가':'변경점 확인 중'}</p><section aria-label="장소 작품 자리"><h4>작품</h4>{artwork&&source?<><h5>{artwork.title}</h5><p>작가: {name(source)} · {artwork.status==='finished'?'완성':'구상'}</p>{source.image?<CityPostImage post={source}/>:<p>그림 미첨부</p>}{source.id!==recent?.id?<button id={'city-place-artwork-'+projectId} type="button" disabled={!recordsReady} onClick={()=>onOpen(source.id)}>작품 원문 열기</button>:<p>작품 원문은 위 결과 기록에서 엽니다.</p>}</>:<p>작품 미등록 · 그림 미첨부</p>}</section></div>
}
