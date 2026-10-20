import { useEffect,useState,type FormEvent } from 'react'
import { subscribeCityContinuations,saveCityContinuation,publishCityContinuation,type CityContinuation,type CityPost } from './cityService'
import type { CityProfile } from './cityResidents'
type Perform=(action:()=>Promise<void>,message:string)=>Promise<boolean>
export function CityContinuations({ sourceId,posts,profiles,accountId,residentId,busy,perform,onOpen }: { sourceId:string; posts:CityPost[]; profiles:CityProfile[]; accountId:string; residentId:string; busy:boolean; perform:Perform; onOpen:(id:string)=>void }) {
  const [links,setLinks]=useState<CityContinuation[]>([])
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false)
  const [selected,setSelected]=useState(sourceId),[writing,setWriting]=useState(false)
  const [label,setLabel]=useState(''),[body,setBody]=useState(''),[existing,setExisting]=useState('')
  useEffect(()=>{ try{return subscribeCityContinuations(value=>{setLinks(value);setReady(true)},()=>setFailed(true))}catch{setFailed(true)} },[])
  const post=posts.find(post=>post.id===selected)
  const parentLink=links.find(link=>link.id===selected)
  const parentId=parentLink?.parentPostId ?? selected
  const siblings=links.filter(link=>link.parentPostId===parentId)
  const children=links.filter(link=>link.parentPostId===selected)
  const eligible=posts.filter(child=>child.kind==='feed' && child.accountId===accountId && post && child.createdAt>post.createdAt && !links.some(link=>link.id===child.id))
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(!ready||failed||busy||!label.trim()||!post) return
    if(await perform(()=>existing ? saveCityContinuation(accountId,selected,existing,label) : publishCityContinuation(accountId,residentId,selected,label,body),'후속을 연결했습니다. 원문과 다른 갈림길은 유지됩니다.')) {setWriting(false);setBody('');setLabel('');setExisting('')}
  }
  function visit(id:string){setSelected(id);setWriting(false);setLabel('');setBody('');setExisting('')}
  function branch(link:CityContinuation){const child=posts.find(post=>post.id===link.id);return <li key={link.id}><button type="button" disabled={!child} onClick={()=>visit(link.id)}>{link.label} · {profiles.find(p=>p.id===link.residentId)?.name ?? link.residentId}{!child ? ' · 삭제된 글':''}</button></li>}
  return <section className="city-continuations" aria-label="공동 창작의 갈림길"><h4>공동 창작의 갈림길</h4><p>나중에 작성한 글만 후속으로 연결해 순환을 막습니다. 글 하나에는 부모 하나만 연결하며 원작은 수정하지 않습니다.</p>{failed ? <p role="alert">갈림길을 불러오지 못했습니다. 작품집을 다시 열어 주세요.</p> : !ready ? <p role="status">갈림길 불러오는 중…</p> : null}
    {selected!==sourceId ? <button type="button" onClick={()=>visit(sourceId)}>처음 작품으로</button>:null}
    {parentLink ? <><p>부모 글 → {parentLink.label}</p><button type="button" onClick={()=>visit(parentLink.parentPostId)}>부모 글 읽기</button><button type="button" onClick={()=>onOpen(parentLink.parentPostId)}>부모 원문·댓글 보기</button><h5>나란한 후속</h5><ul>{siblings.map(branch)}</ul></>:null}
    {selected!==sourceId && post ? <article><h5>{parentLink?.label ?? '연결 글'}</h5><p>작성 주민: {profiles.find(p=>p.id===(post.residentId ?? post.accountId))?.name ?? post.accountId}</p><p className="city-work-body">{post.body}</p><button type="button" onClick={()=>onOpen(post.id)}>후속 원문·댓글 보기</button></article>:null}
    {post ? <><h5>이 글의 후속 ({children.length})</h5><ul>{children.map(branch)}</ul><button type="button" disabled={busy||!ready||failed} onClick={()=>setWriting(value=>!value)}>여기서 이어 쓰기</button>
      {writing ? <form aria-label="갈림길 연결" onSubmit={event=>void submit(event)}><p>작성 주민: {profiles.find(p=>p.id===residentId)?.name ?? residentId} · 새 글은 직접 작성해야 게시됩니다.</p><label>갈림길 이름<input required maxLength={120} disabled={busy} value={label} onChange={event=>setLabel(event.target.value)}/></label><label>기존 후속 글 선택<select disabled={busy} value={existing} onChange={event=>setExisting(event.target.value)}><option value="">새 후속 글 쓰기</option>{eligible.map(child=><option key={child.id} value={child.id}>{child.body.slice(0,70)}</option>)}</select></label>{existing ? <p>작성 주민: {profiles.find(p=>p.id===(posts.find(p=>p.id===existing)?.residentId ?? accountId))?.name ?? accountId} · 기존 본문·댓글은 유지됩니다.</p>:<label>새 후속 본문<textarea required maxLength={2000} disabled={busy} value={body} onChange={event=>setBody(event.target.value)}/></label>}<button type="submit" disabled={busy||!label.trim()||(!existing&&!body.trim())}>{existing ? '기존 글 연결':'후속 글 게시·연결'}</button></form>:null}
    </>:<p>삭제된 글입니다. 본문 사본은 보관하지 않습니다.</p>}
  </section>
}
