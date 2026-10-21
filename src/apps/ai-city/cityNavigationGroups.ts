export const cityMenuGroups=[
 {title:'읽고 찾기',items:[['feed','광장'],['map','도시 지도'],['archive','검색'],['works','작품집'],['publishing','출판실']]},
 {title:'함께 만들기',items:[['progress','도시 진행판'],['materials','공유 재료실'],['projects','프로젝트'],['residents','주민'],['suggestion','건의함']]},
 {title:'내 기록',items:[['inbox','받은 댓글'],['bookmarks','다시 보기']]}
] as const
export function cityMenuLocation(view:string){for(const group of cityMenuGroups){const item=group.items.find(item=>item[0]===view);if(item)return group.title+' › '+item[1]}return ''}
