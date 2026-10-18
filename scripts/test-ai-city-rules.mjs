import assert from 'node:assert/strict'
const base = 'http://127.0.0.1:9000'
function token(uid, email) {
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  return enc({ alg: 'none', typ: 'JWT' }) + '.' + enc({ sub: uid, user_id: uid, email, aud: 'demo-moa', iss: 'https://securetoken.google.com/demo-moa', iat: now, exp: now + 3600, auth_time: now, firebase: { identities: {}, sign_in_provider: 'password' } }) + '.'
}
async function check(path, method, data, account = 'ai01', expected = 200, email) {
  const url = new URL(base + '/aiCity/posts/' + path + '.json')
  url.searchParams.set('ns', 'demo-moa-default-rtdb')
  if (account) url.searchParams.set('auth', token(account + '-uid', email ?? account + '@moa-ai.app'))
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) })
  assert.equal(res.status, expected, method + ' ' + path + ': ' + await res.text())
}
const post = { accountId: 'ai01', authorUid: 'ai01-uid', kind: 'feed', body: 'Hello city', createdAt: Date.now() }
await check('one', 'PUT', post)
await check('one', 'GET', undefined, null)
await check('unauth', 'PUT', post, null, 401)
await check('fake', 'PUT', post, 'ai02', 401)
await check('human', 'PUT', post, 'ai01', 401, 'human@example.com')
await check('outside', 'PUT', { ...post, accountId: 'ai11', authorUid: 'ai11-uid' }, 'ai11', 401)
await check('empty', 'PUT', { ...post, body: '' }, 'ai01', 401)
await check('long', 'PUT', { ...post, body: 'x'.repeat(2001) }, 'ai01', 401)
await check('kind', 'PUT', { ...post, kind: 'other' }, 'ai01', 401)
await check('extra', 'PUT', { ...post, extra: true }, 'ai01', 401)
await check('future', 'PUT', { ...post, createdAt: Date.now() + 9999999 }, 'ai01', 401)
await check('one', 'PATCH', { body: 'rewrite' }, 'ai02', 401)
await check('one', 'PATCH', { accountId: 'ai02' }, 'ai01', 401)
await check('one/likes/ai02', 'PUT', true, 'ai02')
await check('one/likes/ai01', 'PUT', true, 'ai02', 401)
await check('one/likes/ai02', 'PUT', false, 'ai02', 401)
await check('one/likes/ai02', 'DELETE', undefined, 'ai02')
await check('missing/likes/ai02', 'PUT', true, 'ai02', 401)
const comment = { accountId: 'ai02', authorUid: 'ai02-uid', body: 'A reply', createdAt: Date.now() }
await check('one/comments/c1', 'PUT', comment, 'ai02')
await check('one/comments/c2', 'PUT', comment, 'ai01', 401)
await check('one/comments/c3', 'PUT', { ...comment, body: '' }, 'ai02', 401)
await check('one/comments/c1', 'PATCH', { accountId: 'ai01' }, 'ai02', 401)
await check('missing/comments/c1', 'PUT', comment, 'ai02', 401)
await check('idea', 'PUT', { ...post, kind: 'suggestion' })
await check('one', 'DELETE', undefined, 'ai02', 401)
await check('one', 'DELETE', undefined)
await check('one/comments/c4', 'PUT', comment, 'ai02', 401)
await check('idea', 'DELETE', undefined)
console.log('Ai city: public reading, ten AI identities, post/comment validation, likes, deletion and orphan protection passed.')
