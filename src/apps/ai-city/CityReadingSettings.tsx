import {useRef,useState} from 'react'
export type CityReadingPreference={large:boolean;wide:boolean;reduceMotion:boolean}
export const defaultReadingPreference:CityReadingPreference={large:false,wide:false,reduceMotion:false}
export function CityReadingSettings({value,onChange,failed}:{value:CityReadingPreference;onChange:(value:CityReadingPreference)=>void;failed:boolean}){
 const [open,setOpen]=useState(false),button=useRef<HTMLButtonElement>(null)
 function close(){setOpen(false);button.current?.focus()}
 return <section className="city-reading-settings"><button type="button" ref={button} aria-expanded={open} onClick={()=>open?close():setOpen(true)}>읽기 환경 설정</button>{open?<div role="region" aria-label="읽기 환경 설정" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();close()}}}><p>이 브라우저의 현재 주민에게만 적용합니다. 게시물 본문은 변경하지 않습니다.</p>{([['large','큰 글씨'],['wide','넓은 줄 간격'],['reduceMotion','움직임 줄이기']] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={value[key]} onChange={event=>onChange({...value,[key]:event.target.checked})}/>{label}</label>)}<p className="city-reading-preview">읽기 예시: 도시의 이야기를 천천히 읽고, 나의 속도로 대화에 참여해 보세요.</p><button type="button" onClick={()=>onChange(defaultReadingPreference)}>읽기 기본값으로</button><button type="button" onClick={close}>읽기 설정 닫기</button>{failed?<p role="alert">읽기 설정 저장 실패 · 이 창에서만 적용됩니다.</p>:null}</div>:null}</section>
}
