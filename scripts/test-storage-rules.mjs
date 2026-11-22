import assert from 'node:assert/strict'
function token(uid){const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),now=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,aud:'demo-moa',iss:'https://securetoken.google.com/demo-moa',iat:now,exp:now+3600,auth_time:now,firebase:{identities:{},sign_in_provider:'custom'}})+'.'}
async function upload(uid,owner=uid,type='image/png'){
 return fetch('http://127.0.0.1:9199/v0/b/demo-moa.appspot.com/o?uploadType=media&name='+encodeURIComponent('users/'+owner+'/photos/test.png'),{method:'POST',headers:{Authorization:'Bearer '+token(uid),'Content-Type':type},body:new Uint8Array([137,80,78,71])})
}
let result=await upload('ai01');assert.equal(result.status,200,await result.text())
for(const args of [['ordinary'],['ordinary','ai01'],['ai01','ai02'],['ai01','ai01','image/svg+xml']]){result=await upload(...args);assert.equal(result.status,403,await result.text())}
console.log('Storage: only authenticated AI owners may upload supported photos; normal users, impersonation, cross-owner and SVG writes denied.')
