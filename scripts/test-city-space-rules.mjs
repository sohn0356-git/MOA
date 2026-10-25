import assert from 'node:assert/strict'
const ns='demo-moa-default-rtdb',base='http://127.0.0.1:9000'
function token(account,email){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:account+'-uid',user_id:account+'-uid',email:email??account+'@moa-ai.app',aud:'demo-moa',iss:'https://securetoken.google.com/demo-moa',iat:now,exp:now+3600,auth_time:now,firebase:{identities:{},sign_in_provider:'password'}})+'.'}
async function request(path,method,value,account='ai01',expected=200,email){
 const url=new URL(base+'/'+path+'.json');url.searchParams.set('ns',ns);if(account)url.searchParams.set('auth',token(account,email))
 const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},...(value===undefined?{}:{body:JSON.stringify(value)})}),text=await response.text()
 assert.equal(response.status,expected,method+' '+path+': '+text);return JSON.parse(text||'null')
}
const stamp={'.sv':'timestamp'},meta=(account='ai01',residentId=account)=>({residentId,operatorUid:account+'-uid',operatorAccount:account,createdAt:stamp})
const original={accountId:'ai01',authorUid:'ai01-uid',kind:'feed',body:'두 문장의 첫 원문',createdAt:Date.now()}
await request('aiCity/posts/space-source-one','PUT',original)
await request('aiCity/posts/space-source-two','PUT',{...original,body:'두 문장의 두 번째 원문'})
const material={residentId:'ai01',projectId:'',name:'계산 밑종이',description:'공간에서 참조할 자료',conditions:'수치는 계산용 가정이며 측정하지 않음',unverified:'실측값 미확인',sourcePostId:'space-source-one',parentId:'',operatorUid:'ai01-uid',operatorAccount:'ai01',createdAt:Date.now()}
await request('aiCity/materials/space-source-material','PUT',material)
const ref=(sourceId,kind='post')=>({kind,sourceId,role:'source',conditionKind:'assumption',condition:'계산용 가정이며 실측 전입니다.',x:0,y:0})
const version=(parentId='',account='ai01',residentId=account)=>({...meta(account,residentId),parentId,title:'두 문장 읽는 자리',purpose:'기존 장소의 이번 임시 용도',question:'어느 문장을 먼저 읽었나요?',endScope:'첫 회차 기록까지만, 계속 관리 동의 아님',reason:'좌우를 동등하게 비교하기 위해',layout:'equal',status:'open',references:[ref('space-source-one'),{...ref('space-source-two'),x:55}]})
const publish=(place,id,value,account='ai01',expected=200,email)=>request('aiCity/spaceUses/'+place,'PATCH',{currentId:id,['versions/'+id]:value},account,expected,email)
await publish('plaza','space-v1',version())
const savedV1=await request('aiCity/spaceUses/plaza/versions/space-v1','GET',undefined,null)
assert.equal(savedV1.references[0].conditionKind,'assumption')
await publish('cafe','anonymous',version(),null,401)
await publish('cafe','human',version(),'ai01',401,'human@example.com')
await publish('cafe','wrong-account',version(),'ai02',401)
await publish('cafe','wrong-resident',version('','ai02','ai01'),'ai02',401)
await publish('cafe','unregistered',version('','ai01','resident-101'),'ai01',401)
await publish('cafe','outside',version('','ai11'),'ai11',401)
if(!await request('aiCity/residents/resident-99','GET',undefined,null))await request('aiCity/residents/resident-99','PUT',{name:'공간 검증 주민',role:'기록',bio:'가상 주민',tone:'',interests:'',relationships:'',activitySummary:'',createdAt:Date.now(),updatedAt:Date.now(),createdByUid:'ai01-uid',updatedByUid:'ai01-uid'})
await publish('cafe','delegated',version('','ai02','resident-99'),'ai02')
await publish('missing-building','bad-place',version(),'ai01',401)
await request('aiCity/spaceUses/plaza/versions/space-v1','PATCH',{purpose:'이전 판 변조'},'ai01',401)
await request('aiCity/spaceUses/plaza/versions/space-v1','DELETE',undefined,'ai01',401)
await request('aiCity/spaceUses/plaza','DELETE',undefined,'ai01',401)
await request('aiCity/spaceUses/plaza/versions/orphan','PUT',version('space-v1'),'ai01',401)
await publish('plaza','stale',version(''),'ai01',401)
const response=(buildingId='plaza',account='ai02')=>({...meta(account),buildingId,firstSource:'post:space-source-one',reason:'제목의 약속을 먼저 확인하려고'})
await request('aiCity/spaceResponses/space-v1/first','PUT',response(),'ai02')
await request('aiCity/spaceResponses/space-v1/empty','PUT',{...response(),reason:''},'ai02',401)
await request('aiCity/spaceResponses/space-v1/fake-ref','PUT',{...response(),firstSource:'post:missing'},'ai02',401)
await request('aiCity/spaceResponses/space-v1/auto-consent','PUT',{...response(),consent:true},'ai02',401)
await request('aiCity/spaceResponses/space-v1/first','PATCH',{reason:'이유 변조'},'ai02',401)
for(const [name,patch] of Object.entries({extra:{copiedSourceBody:'원문 복제'},future:{createdAt:Date.now()+9999999},wrongLayout:{layout:'winner'},missing:{title:''},fakeParent:{parentId:'missing'}})){
 await publish('plaza','invalid-'+name,{...version('space-v1'),...patch},'ai01',401)
}
for(const [name,references]of Object.entries({duplicate:[ref('space-source-one'),ref('space-source-one')],missing:[ref('space-source-one'),ref('missing')],condition:[ref('space-source-one'),{...ref('space-source-two'),condition:''}],copy:[ref('space-source-one'),{...ref('space-source-two'),body:'복제 본문'}],badPosition:[ref('space-source-one'),{...ref('space-source-two'),x:101}],seven:Array.from({length:7},()=>ref('space-source-one')),hole:{0:ref('space-source-one'),2:ref('space-source-two')}})){
 await publish('plaza','bad-refs-'+name,{...version('space-v1'),references},'ai01',401)
}
const v2={...version('space-v1'),title:'자료 조건을 나란히 읽는 자리',layout:'free',references:[ref('space-source-one'),{...ref('space-source-material','material'),role:'derived',conditionKind:'measurement',condition:'측정 상태는 아직 미확인',x:65,y:55}]}
await publish('plaza','space-v2',v2)
await request('aiCity/spaceUses/plaza/currentId','PUT','space-v1','ai01',401)
await publish('plaza','concurrent-stale',version('space-v1'),'ai01',401)
await request('aiCity/spaceResponses/space-v1/late','PUT',response(),'ai02',401)
await request('aiCity/spaceResponses/space-v2/current','PUT',response(),'ai02')
await publish('plaza','wrong-close',{...version('space-v2','ai02'),status:'closed'},'ai02',401)
await publish('plaza','space-closed',{...v2,parentId:'space-v2',status:'closed',reason:'첫 회차의 정리만 종료하며 계속 관리하지 않음'})
await request('aiCity/spaceResponses/space-closed/after-close','PUT',response(),'ai02',401)
await request('aiCity/spaceResponses/space-v2/after-close','PUT',response(),'ai02',401)
assert.deepEqual(await request('aiCity/spaceUses/plaza/versions/space-v1','GET',undefined,null),savedV1)
assert.equal((await request('aiCity/spaceResponses/space-v1/first','GET',undefined,null)).reason,response().reason)
await publish('plaza','space-new-use',version('space-closed','ai02'),'ai02')
assert.equal((await request('aiCity/posts/space-source-one','GET',undefined,null)).body,original.body)
assert.deepEqual(await request('aiCity/materials/space-source-material','GET',undefined,null),material)
console.log('City space rules passed: public history, scoped actors, immutable versions/responses, atomic current/parent checks, concurrent/stale rejection, reference validation, preserved originals and conditions, voluntary reasons, owner closure, old-link preservation and reopening as a new edition.')
