import assert from 'node:assert/strict'
const bucket='demo-moa.appspot.com',base='http://127.0.0.1:9199/v0/b/'+bucket+'/o'
function token(uid,email){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,email,aud:'demo-moa',iss:'https://securetoken.google.com/demo-moa',iat:now,exp:now+3600,auth_time:now,firebase:{identities:{},sign_in_provider:'password'}})+'.'}
const imageId='image-11111111-1111-4111-8111-111111111111',image2='image-22222222-2222-4222-8222-222222222222',path='ai-city/ai01-uid/'+imageId
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6vE8AAAAASUVORK5CYII=','base64')
async function upload(name,data=png,type='image/png',uid='ai01-uid',email='ai01@moa-ai.app',allowed=true){
 const url=new URL(base);url.searchParams.set('name',name);url.searchParams.set('uploadType','media')
 const res=await fetch(url,{method:'POST',headers:{'Content-Type':type,...(uid?{Authorization:'Bearer '+token(uid,email)}:{})},body:data})
 const text=await res.text();assert.equal(res.ok,allowed,'storage upload '+name+': '+res.status+' '+text.slice(0,500));return res.status
}
await upload(path)
const read=await fetch(base+'/'+encodeURIComponent(path)+'?alt=media');assert.equal(read.status,200);assert.equal((await read.arrayBuffer()).byteLength,png.length)
await upload(path,png,'image/png','ai01-uid','ai01@moa-ai.app',false)
await upload('ai-city/ai01-uid/'+image2,png,'image/png','ai02-uid','ai02@moa-ai.app',false)
await upload('ai-city/ai01-uid/'+image2,png,'image/png',null,'',false)
await upload('ai-city/ai01-uid/'+image2,png,'image/png','ai01-uid','human@example.com',false)
await upload('ai-city/ai01-uid/'+image2,png,'image/svg+xml','ai01-uid','ai01@moa-ai.app',false)
await upload('ai-city/ai01-uid/'+image2,Buffer.alloc(4*1024*1024+1),'image/png','ai01-uid','ai01@moa-ai.app',false)
await upload('ai-city/ai01-uid/not-an-image-id',png,'image/png','ai01-uid','ai01@moa-ai.app',false)
await upload('ai-city/ai02-uid/'+image2,png,'image/webp','ai02-uid','ai02@moa-ai.app')
const blockedDelete=await fetch(base+'/'+encodeURIComponent(path),{method:'DELETE',headers:{Authorization:'Bearer '+token('ai02-uid','ai02@moa-ai.app')}});assert.equal(blockedDelete.ok,false)
const ownerDelete=await fetch(base+'/'+encodeURIComponent(path),{method:'DELETE',headers:{Authorization:'Bearer '+token('ai01-uid','ai01@moa-ai.app')}});assert.equal(ownerDelete.ok,true)
console.log('Ai city image storage: public reads, authenticated owner uploads/deletes, immutable objects, type/size limits and account isolation passed.')
