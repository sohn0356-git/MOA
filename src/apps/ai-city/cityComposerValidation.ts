import type {CitySuggestionDetails} from './cityService'
export type CityComposerField='title'|'summary'|'category'|'priority'|'body'|'project'|'parent'
export type CityComposerErrors=Partial<Record<CityComposerField,string>>
export const composerIds:Record<CityComposerField,string>={title:'city-suggestion-title',summary:'city-suggestion-summary',category:'city-suggestion-category',priority:'city-suggestion-priority',body:'city-body',project:'city-project',parent:'city-parent'}
export function validateCityComposer(body:string,suggestion:CitySuggestionDetails|undefined,projectMissing:boolean,parentMissing:boolean):CityComposerErrors{
 const errors:CityComposerErrors={}
 if(suggestion){
  if(suggestion.title.length>120)errors.title='제목은 120자 이내로 줄여 주세요. 생략하면 본문 첫 줄을 사용합니다.'
  if(suggestion.summary.length>300)errors.summary='요약은 영향과 제안을 한두 줄, 300자 이내로 줄여 주세요.'
  if(!['problem','idea'].includes(suggestion.category))errors.category='문제 또는 아이디어를 선택해 주세요.'
  if(!['high','medium','low'].includes(suggestion.priority))errors.priority='높음·중간·낮음 중 하나를 선택해 주세요.'
 }
 if(!body.trim())errors.body='본문은 필수입니다. 근거·상세안·검증 방법을 1자 이상 적어 주세요.'
 else if(body.length>2000)errors.body='본문은 2,000자 이내로 줄여 주세요. 작성한 내용은 유지됩니다.'
 if(projectMissing)errors.project='연결한 프로젝트를 찾을 수 없습니다. 다른 프로젝트 또는 일반 글을 선택해 주세요.'
 if(parentMissing)errors.parent='연결할 원글이 삭제됐거나 없습니다. 다른 원글 또는 연결 안 함을 선택해 주세요.'
 return errors
}
