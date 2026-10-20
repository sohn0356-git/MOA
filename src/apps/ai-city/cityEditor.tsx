import {useRef,useState} from 'react'
type Phase='idle'|'saving'|'saved'|'failed'
export function useCityEditor<T>(value:T){
 const baseline=useRef(JSON.stringify(value)),launcher=useRef<HTMLElement|null>(null),pending=useRef<(()=>void)|null>(null),closeTrigger=useRef<HTMLElement|null>(null)
 const [phase,setPhase]=useState<Phase>('idle'),[confirm,setConfirm]=useState(false)
 const dirty=JSON.stringify(value)!==baseline.current
 function begin(next:T,element?:HTMLElement|null){baseline.current=JSON.stringify(next);launcher.current=element??(document.activeElement as HTMLElement|null);setPhase('idle');setConfirm(false)}
 function focusBack(){setTimeout(()=>launcher.current?.focus(),0)}
 function close(action:()=>void){if(phase==='saving')return;closeTrigger.current=document.activeElement as HTMLElement|null;if(dirty){pending.current=action;setConfirm(true)}else{action();focusBack()}}
 function finishClose(){const action=pending.current;pending.current=null;setConfirm(false);action?.();focusBack()}
 async function save(action:()=>Promise<boolean>,after:T=value){setPhase('saving');try{const result=await action();if(result){baseline.current=JSON.stringify(after);setPhase('saved')}else setPhase('failed');return result}catch{setPhase('failed');return false}}
 function reset(next:T){baseline.current=JSON.stringify(next);setPhase('idle')}
 function keepClose(action:()=>void){pending.current=null;setConfirm(false);action();focusBack()}
 function saved(next:T=value){baseline.current=JSON.stringify(next);setPhase('saved')}
 const status=phase==='saving'?'저장중':phase==='failed'?'실패 · 입력을 유지했습니다. 다시 저장할 수 있습니다.':phase==='saved'&&!dirty?'저장됨':dirty?'미저장 변경':'변경 없음'
 return{begin,close,save,saved,reset,keepClose,dirty,status,confirm,phase,continueEditing:()=>{setConfirm(false);setTimeout(()=>closeTrigger.current?.focus(),0)},discard:finishClose,finishClose,focusBack}
}
export function CityEditorFeedback({editor,name,draft}:{editor:{status:string;confirm:boolean;phase:Phase;continueEditing:()=>void;discard:()=>void};name:string;draft?:{save:()=>void;failed?:boolean}}){
 return <section className="city-editor-feedback" aria-label={name+' 저장 안내'}><p role="status">{name} · {editor.status}</p>{editor.confirm?<div className="city-safe-close" role="group" aria-label={name+' 닫기 확인'}><p>저장하지 않은 변경이 있습니다.</p><p>{draft?'이 작성창은 현재 브라우저의 주민별 초안을 보관합니다. 게시와는 별개입니다.':'이 도구는 초안 보관을 지원하지 않습니다. 변경 버리기를 선택하면 서버에 저장하지 않은 입력을 버리고 닫습니다.'}</p><button type="button" autoFocus disabled={editor.phase==='saving'} onClick={editor.continueEditing}>계속 편집</button>{draft?<button type="button" disabled={editor.phase==='saving'||draft.failed} onClick={draft.save}>초안으로 보관 후 닫기</button>:null}<button type="button" disabled={editor.phase==='saving'} onClick={editor.discard}>변경 버리기</button></div>:null}</section>
}
