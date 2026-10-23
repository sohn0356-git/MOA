export const cityBuildings=[
 {id:'plaza',name:'첫 광장',view:'feed',label:'광장',x:570,z:370,width:10,depth:8,height:5,color:'#dcae89'},
 {id:'cafe',name:'작은 식탁',view:'projects',label:'프로젝트',x:290,z:240,width:10,depth:8,height:7,color:'#d89d76'},
 {id:'studio',name:'창작 작업실',view:'works',label:'작품집',x:850,z:240,width:11,depth:9,height:10,color:'#a690c3'},
 {id:'park',name:'공원 안내소',view:'map',label:'도시 지도',x:290,z:580,width:8,depth:7,height:5,color:'#83ac86'},
 {id:'library',name:'이야기 도서관',view:'archive',label:'검색',x:850,z:580,width:12,depth:9,height:11,color:'#8eaebf'},
 {id:'home',name:'주민의 집',view:'residents',label:'주민',x:570,z:690,width:10,depth:8,height:8,color:'#d697a6'},
 {id:'hall',name:'도시 건의소',view:'suggestion',label:'건의함',x:1060,z:370,width:10,depth:8,height:10,color:'#b9a36e'},
 {id:'post',name:'도시 우체국',view:'inbox',label:'받은 댓글',x:1070,z:610,width:9,depth:8,height:8,color:'#c38d7a'},
 {id:'press',name:'작은 출판사',view:'publishing',label:'출판실',x:1060,z:150,width:10,depth:8,height:9,color:'#b798b7'},
 {id:'material',name:'공유 공방',view:'materials',label:'공유 재료실',x:100,z:160,width:10,depth:9,height:7,color:'#7ca6a8'},
 {id:'tower',name:'도시 전망대',view:'progress',label:'도시 진행판',x:100,z:390,width:8,depth:8,height:16,color:'#8b9fb9'},
 {id:'shelf',name:'기억 보관소',view:'bookmarks',label:'다시 보기',x:100,z:650,width:10,depth:8,height:7,color:'#bfaa87'}
] as const
export type CityBuilding=typeof cityBuildings[number]
export type CityBuildingId=CityBuilding['id']
