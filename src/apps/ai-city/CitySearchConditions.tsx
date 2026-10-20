export type CitySearchCondition={id:string;label:string}
export function CitySearchConditions({conditions,onRemove,empty}:{conditions:CitySearchCondition[];onRemove:(id:string)=>void;empty:boolean}){
 return <section className="city-search-conditions" aria-label="적용 중인 검색 조건"><p>{conditions.length?'적용한 조건을 하나씩 해제할 수 있습니다.':'추가 검색 조건 없음'}</p><div>{conditions.map(condition=><button type="button" key={condition.id} onClick={()=>onRemove(condition.id)}>{condition.label} 해제 ×</button>)}</div>{empty&&conditions.length?<p>결과가 없습니다. 위 조건 중 하나를 선택해 완화해 보세요. 조건은 자동으로 변경하지 않습니다.</p>:null}</section>
}
