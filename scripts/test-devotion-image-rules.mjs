import assert from 'node:assert/strict'
const base = 'http://127.0.0.1:9000', ns = 'demo-moa-default-rtdb'
function token(uid) {
 const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url'), now=Math.floor(Date.now()/1000)
 return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,aud:'demo-moa',iss:'https://securetoken.google.com/demo-moa',iat:now,exp:now+3600,auth_time:now,firebase:{identities:{},sign_in_provider:'custom'}})+'.'
}
async function request(path,method,data,uid='image-alice') {
 const url=new URL(base+'/'+path+'.json'); url.searchParams.set('ns',ns); if(uid)url.searchParams.set('auth',token(uid))
 return fetch(url,{method,headers:{'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})})
}
async function allowed(path,method,data,uid) {const r=await request(path,method,data,uid);assert.equal(r.status,200,await r.text())}
async function denied(path,method,data,uid) {const r=await request(path,method,data,uid);assert.equal(r.status,401,await r.text())}
const author='image-alice', editor='image-bob', source='users/'+author+'/meditationEntries/shared', id='devotion_'+author+'_shared', share='crossPhotos/'+id
const image='data:image/png;base64,AAAA', changed='data:image/webp;base64,BBBB'
const original={authorUid:author,authorName:'Alice',audience:'public',mind:'공개 묵상 본문',apply:'적용',reference:'요한복음 13:34',selectedDate:'2026-11-11',createdAt:'2026-11-11T00:00:00Z',crossImage:image}
const published={ownerUid:author,authorUid:author,sourceType:'devotion',sourceEntryId:'shared',publicId:id,imageUrl:image,caption:'공개 묵상 본문',prayerCount:2,commentCount:1}
const pair=value=>({[source+'/crossImage']:value,[share+'/imageUrl']:value})
await allowed('', 'PATCH', {[source]:original,[share]:published})
await allowed(share,'GET',undefined,editor)
await denied(source,'GET',undefined,editor)
await denied(source+'/crossImage','GET',undefined,editor)
await allowed('', 'PATCH', pair(changed),editor)
assert.equal((await (await request(source,'GET')).json()).crossImage,changed)
assert.equal((await (await request(share,'GET',undefined,editor)).json()).imageUrl,changed)
assert.equal((await (await request(source,'GET')).json()).mind,original.mind)
await denied('', 'PATCH',pair(image),null)
await denied(source+'/mind','PUT','훼손',editor)
await denied(source,'DELETE',undefined,editor)
await denied(share,'DELETE',undefined,editor)
await denied(share+'/caption','PUT','본문 변경',editor)
await denied(share+'/ownerUid','PUT',editor,editor)
await denied(share+'/sourceEntryId','PUT','different',editor)
await denied(source+'/crossImage','PUT',image,editor)
await denied(share+'/imageUrl','PUT',image,editor)
await denied('', 'PATCH',{...pair(image),[source+'/mind']:'몰래 바꾼 본문'},editor)
assert.equal((await (await request(source,'GET')).json()).crossImage,changed,'failed mixed update must roll back the image')
await denied('', 'PATCH',pair('https://example.com/unsafe.svg'),editor)
await denied('', 'PATCH',pair('data:image/svg+xml;base64,AAAA'),editor)
await denied('', 'PATCH',pair('data:image/png;base64,'+'A'.repeat(204801)),editor)
await denied('', 'PATCH',pair(null),editor)
await allowed('', 'PATCH',pair(''),editor)
await allowed('', 'PATCH',pair(changed),editor)
await allowed(source+'/audience','PUT','private')
await denied('', 'PATCH',pair(image),editor)
await allowed(source+'/audience','PUT','group')
await denied('', 'PATCH',pair(image),editor)
await allowed(source+'/audience','PUT','public')
await allowed('', 'PATCH',pair(image),editor)
await allowed('', 'PATCH',{[source+'/audience']:'private',[share]:null})
await denied('', 'PATCH',pair(changed),editor)
await denied(source,'GET',undefined,editor)
await allowed(source+'/crossImage','PUT',changed)
const plain='crossPhotos/ordinary-image'
await allowed(plain,'PUT',{ownerUid:author,imageUrl:image,caption:'일반 사진'})
await denied(plain+'/imageUrl','PUT',changed,editor)
const emptySource='users/'+author+'/meditationEntries/empty', emptyShare='crossPhotos/devotion_'+author+'_empty'
await allowed('', 'PATCH',{[emptySource]:{...original,crossImage:null},[emptyShare]:{...published,sourceEntryId:'empty',publicId:'devotion_'+author+'_empty',imageUrl:''}})
await allowed('', 'PATCH',{[emptySource+'/crossImage']:changed,[emptyShare+'/imageUrl']:changed},editor)
await allowed('', 'PATCH',{[source]:null,[emptySource]:null,[emptyShare]:null,[plain]:null})
console.log('Public devotion images: cross-account add/replace/remove, atomic mirroring, private/read/text/delete isolation, stale-public revocation and image validation passed.')
