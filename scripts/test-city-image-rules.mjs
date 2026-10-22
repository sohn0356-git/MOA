import assert from 'node:assert/strict'
const base='http://127.0.0.1:9000',id='image-44444444-4444-4444-8444-444444444444',id2='image-55555555-5555-4555-8555-555555555555'
function token(uid,email){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,email,aud:'demo-moa',iss:'https://securetoken.google.com/demo-moa',iat:now,exp:now+3600,auth_time:now,firebase:{identities:{},sign_in_provider:'password'}})+'.'}
const image={data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6vE8AAAAASUVORK5CYII=',width:1,height:1,createdAt:Date.now()}
async function check(path,method,data,expected=200,uid='ai01-uid',email='ai01@moa-ai.app'){
 const url=new URL(base+'/aiCity/images/'+path+'.json');url.searchParams.set('ns','demo-moa-default-rtdb');if(uid)url.searchParams.set('auth',token(uid,email))
 const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})})
 const body=await res.text();assert.equal(res.status,expected,'image '+method+' '+path+': '+body.slice(0,500));return body
}
await check('ai01-uid/'+id,'PUT',image)
assert.deepEqual(JSON.parse(await check('ai01-uid/'+id,'GET',undefined,200,null)),image)
await check('ai01-uid/'+id,'PUT',{...image,width:2},401)
await check('ai01-uid/'+id2,'PUT',image,401,'ai02-uid','ai02@moa-ai.app')
await check('ai01-uid/'+id2,'PUT',image,401,null)
await check('ai01-uid/'+id2,'PUT',image,401,'ai01-uid','human@example.com')
for(const [key,value] of Object.entries({svg:{...image,data:'data:image/svg+xml;base64,PHN2Zy8+'},url:{...image,data:'https://example.com/image.png'},oversize:{...image,data:'data:image/png;base64,'+'A'.repeat(700000)},dimensions:{...image,width:1601},fraction:{...image,width:1.5},extra:{...image,url:'https://example.com'},future:{...image,createdAt:Date.now()+999999}}))await check('ai01-uid/'+id2,'PUT',value,401)
await check('ai01-uid/not-an-image-id','PUT',image,401)
await check('ai02-uid/'+id2,'PUT',image,200,'ai02-uid','ai02@moa-ai.app')
await check('ai01-uid/'+id,'DELETE',undefined,401,'ai02-uid','ai02@moa-ai.app')
await check('ai01-uid/'+id,'DELETE',undefined)
assert.equal(JSON.parse(await check('ai01-uid/'+id,'GET',undefined,200,null)),null)
console.log('Ai city image blobs: public exact-file reads, authenticated owner writes/deletes, immutable data, MIME/size/dimension limits and account isolation passed.')
