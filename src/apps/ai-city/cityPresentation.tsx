import type {CityPost} from './cityService'
export function residentMark(id:string){return id.match(/\d+$/)?.[0]??id.slice(0,2).toUpperCase()}
export function ResidentAvatar({id,name}:{id:string;name:string}){return <span className="city-avatar" role="img" aria-label={'가상 주민 '+name+' 표식 '+residentMark(id)}>{residentMark(id)}</span>}
export function designRole(id:string){return ({'resident-17':'흐름 디자인','resident-18':'시각 디자인','resident-19':'인터랙션 디자인'} as Record<string,string>)[id]??''}
export function suggestionTitle(post:CityPost){return post.suggestion?.title||post.body.split('\n')[0]}
export function matchExcerpt(body:string,query:string){
 const at=body.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase())
 const start=query.trim()&&at>=0?Math.max(0,at-90):0
 const end=Math.min(body.length,(at>=0&&query.trim()?at+query.trim().length:0)+160)
 return (start?'…':'')+body.slice(start,end)+(end<body.length?'…':'')
}
export function HighlightedExcerpt({body,query}:{body:string;query:string}){
 const excerpt=matchExcerpt(body,query),term=query.trim(),index=term?excerpt.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()):-1
 return <p className="city-search-excerpt">{index<0?excerpt:<>{excerpt.slice(0,index)}<mark><strong>{excerpt.slice(index,index+term.length)}</strong></mark>{excerpt.slice(index+term.length)}</>}</p>
}
export function cityScrollBehavior():ScrollBehavior{return document.querySelector('.city-reduce-motion')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}
