import assert from 'node:assert/strict'
const base = 'http://127.0.0.1:9000'
const ns = 'demo-moa-default-rtdb'
const token = uid => {
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  return enc({ alg: 'none', typ: 'JWT' }) + '.' + enc({ sub: uid, user_id: uid, aud: 'demo-moa', iss: 'https://securetoken.google.com/demo-moa', iat: now, exp: now + 3600, auth_time: now, firebase: { identities: {}, sign_in_provider: 'custom' } }) + '.'
}
async function request(path, method, data, uid = 'alice') {
  const url = new URL(base + '/' + path + '.json')
  url.searchParams.set('ns', ns)
  if (uid) url.searchParams.set('auth', token(uid))
  return fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) })
}
const original = { authorUid: 'alice', authorName: 'Alice', title: '제목', body: '내용', createdAt: 1, updatedAt: 1, isCompleted: false, completedAt: 0, completedByUid: '', completedByName: '' }
async function allowed(path, method, data, uid) {
  const res = await request(path, method, data, uid)
  assert.equal(res.status, 200, await res.text())
}
async function denied(path, method, data, uid) {
  const res = await request(path, method, data, uid)
  assert.equal(res.status, 401, await res.text())
}
await allowed('suggestions/a', 'PUT', original)
await denied('suggestions/b', 'PUT', original, 'bob')
await denied('suggestions/a', 'PATCH', { title: '다른 사람 수정' }, 'bob')
await denied('suggestions/a', 'DELETE', undefined, 'bob')
await denied('suggestions/a', 'PATCH', { body: '비로그인' }, null)
await denied('suggestions/a', 'PATCH', { authorUid: 'bob' })
await denied('suggestions/a', 'PATCH', { createdAt: 2 })
await denied('suggestions/a', 'PATCH', { title: null })
await denied('suggestions/a', 'PATCH', { body: '' })
await denied('suggestions/a', 'PATCH', { title: 'x'.repeat(81) })
await denied('suggestions/a', 'PATCH', { extra: 'not allowed' })
await allowed('suggestions/a', 'PATCH', { isCompleted: true, completedAt: 10, completedByUid: 'bob', completedByName: 'Bob', updatedAt: 10 }, 'bob')
await allowed('suggestions/a', 'PATCH', { title: '수정 제목', body: '여러 줄\n내용', updatedAt: 20 })
let item = await (await request('suggestions/a', 'GET')).json()
assert.equal(item.isCompleted, true)
assert.equal(item.completedAt, 10)
assert.equal(item.completedByUid, 'bob')
assert.equal(item.authorUid, 'alice')
await denied('suggestions/a', 'PATCH', { title: '수정과 동시에 상태 조작', isCompleted: false, completedAt: 0, completedByUid: '', completedByName: '' })
await allowed('suggestions/a', 'PATCH', { isCompleted: false, completedAt: 0, completedByUid: '', completedByName: '', updatedAt: 30 }, 'bob')
await allowed('suggestions/b', 'PUT', { ...original, authorUid: 'bob', authorName: 'Bob' }, 'bob')
await allowed('suggestions/a', 'DELETE')
assert.equal(await (await request('suggestions/a', 'GET')).json(), null)
assert.equal((await (await request('suggestions/b', 'GET', undefined, 'bob')).json()).title, original.title)
await denied('suggestions', 'DELETE', undefined, 'bob')
console.log('Suggestion rules: owner edit/delete, cross-user denial, metadata preservation, completion, validation and isolation passed.')
