import {useEffect,useState} from 'react'
import {subscribeCityLabs,subscribeCityProjectTasks,subscribeCityDesignReviews,type CityLabEvent,type CityDesignReview,type CityProjectTask,type CityPost} from './cityService'
import {designReviewState} from './CityDesignReview'
import {cityScrollBehavior} from './cityPresentation'
export function CityProjectActivities({projectId,posts,onChoose}:{projectId:string;posts:CityPost[];onChoose:(area:string)=>void}){
 const [tasks,setTasks]=useState<CityProjectTask[]>([]),[labs,setLabs]=useState<Record<string,CityLabEvent[]>>({}),[reviews,setReviews]=useState<CityDesignReview[]>([])
 const [ready,setReady]=useState({tasks:false,labs:false,reviews:false}),[failed,setFailed]=useState(false)
 useEffect(()=>{setReady({tasks:false,labs:false,reviews:false});setFailed(false);const stops:Array<()=>void>=[];const error=()=>setFailed(true)
  try{stops.push(subscribeCityProjectTasks(projectId,value=>{setTasks(value);setReady(old=>({...old,tasks:true}))},error));stops.push(subscribeCityLabs(projectId,value=>{setLabs(value);setReady(old=>({...old,labs:true}))},error));stops.push(subscribeCityDesignReviews(projectId,value=>{setReviews(value);setReady(old=>({...old,reviews:true}))},error))}catch{setFailed(true)}
  return()=>stops.forEach(stop=>stop())
 },[projectId])
 const conversations=posts.filter(post=>post.projectId===projectId&&post.kind==='feed')
 const labRecords=Object.values(labs).filter(events=>events.length)
 const reviewQuestion=reviews.map(review=>{const status=designReviewState(review);const last=Object.values(review.events).filter(event=>event.action==='selection'||event.action==='reopen').sort((a,b)=>b.createdAt-a.createdAt)[0];return status==='선택 기록'||status==='재검토'?last?.unresolved:review.topic.unresolved}).find(value=>value?.trim()&&value.trim()!=='없음')
 const labQuestion=labRecords.find(events=>events[0].phase!=='retrospective')?.[0].question
 const areas=[{id:'talk',title:'대화 읽기',count:conversations.length,ready:true,question:'',example:'예: 프로젝트의 첫 아이디어를 짧은 글로 남겨 보세요.'},{id:'design',title:'대안 검토',count:reviews.length,ready:ready.reviews,question:reviewQuestion,example:'예: 한 화면의 목적과 비교할 두 대안부터 적어 보세요.'},{id:'lab',title:'비교 준비',count:labRecords.length,ready:ready.labs,question:labQuestion,example:'예: 같은 그림에 문구만 다른 A/B와 판단 기준을 적어 보세요.'},{id:'tasks',title:'작은 일 자원',count:tasks.length,ready:ready.tasks,question:'',example:'예: 한 번의 검토처럼 작은 일을 등록하고 직접 자원해 보세요.'}]
 function choose(area:string){onChoose(area);if(area!=='talk'){const target=document.getElementById('city-project-'+projectId+'-'+area);if(target instanceof HTMLDetailsElement){target.open=true;const title=target.querySelector<HTMLElement>('[data-activity-title]');title?.focus();title?.scrollIntoView?.({behavior:cityScrollBehavior(),block:'start'})}}}
 return <section className="city-project-activities" aria-label="프로젝트 활동 안내"><h4>이 프로젝트에서 무엇을 할까요?</h4><p>아래 카드는 기존 기록과 영역으로 이동합니다. 담당·마감·완료를 자동으로 정하지 않습니다.</p>{failed?<p role="alert">일부 활동 기록 수를 확인하지 못했습니다. 영역을 열어 연결 상태를 확인해 주세요.</p>:null}<div>{areas.map(area=><button type="button" id={'city-activity-'+projectId+'-'+area.id} key={area.id} onClick={()=>choose(area.id)}><strong>{area.title}</strong><span>{area.ready&&!failed?'실제 기록 '+area.count+'개':'기록 수 확인 중'}</span>{area.ready&&!failed&&area.count===0?<span>아직 기록 없음 · {area.example}</span>:null}<small>미결 질문: {area.question||'별도로 표시된 질문 없음'}</small></button>)}</div></section>
}
export function returnToProjectActivity(projectId:string,area:string){const target=document.getElementById('city-activity-'+projectId+'-'+area);target?.focus();target?.scrollIntoView?.({behavior:cityScrollBehavior(),block:'center'})}
