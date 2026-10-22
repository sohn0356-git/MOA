import {createPortal} from 'react-dom'
import {useEffect,useRef,useState} from 'react'
import {readCityImage,uploadCityImage} from './cityImageService'
import {imageFileError,type CityImage} from './cityImages'
type Perform=(action:()=>Promise<void>,message:string)=>Promise<boolean>
export function CityImageView({image,preview}:{image?:CityImage;preview?:{mode:'full'|'focus';x:number;y:number}}){
 const [url,setUrl]=useState(''),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0),[expanded,setExpanded]=useState(false)
 const opener=useRef<HTMLButtonElement>(null),close=useRef<HTMLButtonElement>(null)
 function dismiss(){setExpanded(false);setTimeout(()=>opener.current?.focus(),0)}
 useEffect(()=>{if(!expanded)return;close.current?.focus();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old}},[expanded])
 useEffect(()=>{if(!image)return;let active=true;setUrl('');setFailed(false);void Promise.resolve().then(()=>readCityImage(image,retry>0)).then(value=>{if(active)setUrl(value)}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[image?.ownerUid,image?.id,retry])
 if(!image)return null
 return <figure className="city-image">{failed?<div role="status">그림을 불러오지 못했습니다. <button type="button" onClick={()=>setRetry(v=>v+1)}>그림 다시 불러오기</button></div>:url?<><button type="button" className="city-image-open" ref={opener} onClick={()=>setExpanded(true)} aria-label={'그림 크게 보기: '+image.alt}><img src={url} width={image.width} height={image.height} alt={image.alt} style={preview?.mode==='focus'?{width:'100%',height:'auto',aspectRatio:'4 / 3',objectFit:'cover',objectPosition:preview.x+'% '+preview.y+'%'}:undefined} loading="lazy" decoding="async" onError={()=>setFailed(true)}/></button><figcaption>{image.alt} · 그림을 누르면 크게 봅니다.</figcaption></>:<p role="status">그림을 불러오는 중…</p>}{expanded&&url?createPortal(<div className="city-image-lightbox" role="dialog" aria-modal="true" aria-label="그림 크게 보기" onClick={e=>{if(e.target===e.currentTarget)dismiss()}} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dismiss()}if(e.key==='Tab'){e.preventDefault();close.current?.focus()}}}><button type="button" ref={close} onClick={dismiss}>큰 그림 닫기</button><img src={url} alt={image.alt}/><p>{image.alt}</p></div>,document.body):null}</figure>
}
export function CityImagePicker({value,accountId,busy,perform,onChange}:{value?:CityImage;accountId:string;busy:boolean;perform:Perform;onChange:(image:CityImage|undefined)=>void}){
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[alt,setAlt]=useState(''),[error,setError]=useState(''),[progress,setProgress]=useState<number|null>(null)
 const input=useRef<HTMLInputElement>(null),cancel=useRef<(()=>void)|null>(null),working=useRef(false),active=useRef(true)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file])
 async function attach(){
 if(!file||busy||working.current)return
 const selected=file,description=alt.trim()
 if(!description){setError('그림 설명을 적어 주세요.');document.getElementById('city-image-description')?.focus();return}
 working.current=true;setError('');setProgress(0)
 let uploaded:CityImage|undefined
 const ok=await perform(async()=>{uploaded=await uploadCityImage(accountId,selected,description,n=>{if(active.current)setProgress(n)},fn=>{cancel.current=fn});onChange(uploaded)},'그림을 초안에 첨부했습니다. 게시하기를 눌러 글과 함께 공개하세요.')
 working.current=false;cancel.current=null
 if(active.current){setProgress(null);if(ok){setFile(null);setAlt('');if(input.current)input.current.value=''}else setError('그림을 첨부하지 못했습니다. 선택한 파일과 설명은 유지됩니다. 다시 시도해 주세요.')}
 }
 return <section className="city-image-picker" aria-label="그림 첨부"><h4>그림 첨부</h4><p>JPG·PNG·WebP, 원본 8MB 이하 · 한 글에 1장. 긴 쪽 1,600px로 줄여 저장합니다. 그림은 512KB 이하로 압축합니다. 업로드한 파일은 공개 게시용으로 저장되며, 첨부 뒤 게시하기를 눌러 주세요.</p>{value?<><CityImageView image={value}/><label>첨부 그림 설명<input id="city-attached-image-description" maxLength={300} disabled={busy} value={value.alt} onChange={e=>onChange({...value,alt:e.target.value})}/></label><button type="button" disabled={busy} onClick={()=>onChange(undefined)}>그림 첨부 해제</button></>:null}
 <label>그림 파일 선택<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||progress!==null} onChange={e=>{const next=e.target.files?.[0];if(!next)return;const message=imageFileError(next);setError(message);if(message){e.target.value='';return}setFile(next);setAlt('');setError('')}}/></label>{file?<><p>선택한 파일: {file.name} · {(file.size/1024/1024).toFixed(2)}MB</p>{preview?<img className="city-image-preview" src={preview} alt="선택한 그림 미리보기"/>:null}<label>새 그림 설명<input id="city-image-description" maxLength={300} disabled={busy} value={alt} onChange={e=>setAlt(e.target.value)} placeholder="그림에 무엇이 있는지 적어 주세요."/></label><p>그림 첨부 버튼을 눌러야 초안에 보관됩니다. 새 그림을 첨부하면 현재 첨부를 바꿉니다.</p><button type="button" disabled={busy||progress!==null||!alt.trim()} onClick={()=>void attach()}>그림 첨부하기</button><button type="button" disabled={busy||progress!==null} onClick={()=>{setFile(null);setAlt('');setError('');if(input.current)input.current.value=''}}>파일 선택 취소</button></>:null}{progress!==null?<div role="status" aria-live="polite"><progress max={100} value={progress} aria-label="그림 준비·업로드 진행률"/>{progress}% · 그림 업로드 중{cancel.current?<button type="button" onClick={()=>cancel.current?.()}>그림 업로드 취소</button>:null}</div>:null}{error?<p role="alert">{error}</p>:null}</section>
}
