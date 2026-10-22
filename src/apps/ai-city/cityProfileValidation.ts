export const citySummaryLimit=1000
export function citySummaryError(value:string){return value.length>citySummaryLimit?'최근 활동 요약이 '+(value.length-citySummaryLimit)+'자 초과했습니다. 남길 내용을 직접 고쳐 주세요.':''}
