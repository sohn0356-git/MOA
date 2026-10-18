import assert from 'node:assert/strict'
const base = 'http://127.0.0.1:9000'
const ns = 'demo-moa-default-rtdb'
function token(uid) {
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
async function allowed(path, method, data, uid) {
  const res = await request(path, method, data, uid)
  assert.equal(res.status, 200, await res.text())
}
async function denied(path, method, data, uid) {
  const res = await request(path, method, data, uid)
  assert.equal(res.status, 401, await res.text())
}
const question = { authorUid: 'alice', authorName: 'Alice', title: '공개 질문', body: '질문 내용', createdAt: '2026-10-18T00:00:00Z', createdAtMs: 1, tags: ['기도'] }
const answer = { authorUid: 'bob', authorName: 'Bob', body: '다른 사용자의 답변', createdAt: '2026-10-18T00:01:00Z', createdAtMs: 2 }
await allowed('faithQuestions/q', 'PUT', question)
await allowed('faithQuestions/q', 'GET', undefined, 'bob')
assert.equal((await (await request('faithQuestions', 'GET', undefined, 'bob')).json()).q.title, question.title)
await denied('faithQuestions/q', 'GET', undefined, null)
await denied('faithQuestions/q', 'PATCH', { title: '타인 수정' }, 'bob')
await denied('faithQuestions/q', 'DELETE', undefined, 'bob')
await denied('faithQuestions/spoof', 'PUT', question, 'bob')
await denied('faithQuestions/q', 'PATCH', { authorUid: 'bob' })
await denied('faithQuestions/q', 'PATCH', { createdAtMs: 999 })
await denied('faithQuestions/q', 'PATCH', { title: null })
await allowed('faithQuestions/q', 'PATCH', { title: '작성자가 수정한 질문' })
await allowed('faithQuestionAnswers/q/a', 'PUT', answer, 'bob')
await allowed('faithQuestionAnswers/q/a', 'GET')
await denied('faithQuestionAnswers/q/a', 'PATCH', { body: '질문 작성자가 타인 답변 수정' })
await denied('faithQuestionAnswers/q/a', 'DELETE')
await denied('faithQuestionAnswers/q/a', 'PATCH', { authorUid: 'alice' }, 'bob')
await denied('faithQuestionAnswers/q/a', 'PATCH', { createdAtMs: 123 }, 'bob')
await denied('faithQuestionAnswers/q/spoof', 'PUT', answer)
await denied('faithQuestionAnswers/missing/a', 'PUT', answer, 'bob')
await denied('faithQuestionAnswers/q/a', 'PATCH', { body: '비로그인' }, null)
await allowed('faithQuestionAnswers/q/a', 'PATCH', { body: '내 답변 수정' }, 'bob')
await allowed('faithQuestionAnswers/q/own', 'PUT', { ...answer, authorUid: 'alice', authorName: 'Alice' })
await allowed('faithQuestionAnswers/q/own', 'DELETE')
await denied('faithQuestionAnswers/q', 'DELETE')
await denied('faithQuestions/q', 'DELETE')
await allowed('users/alice/faithQuestions/private', 'PUT', question)
await denied('users/alice/faithQuestions/private', 'GET', undefined, 'bob')
assert.equal((await (await request('faithQuestions', 'GET', undefined, 'bob')).json()).private, undefined)
await allowed('', 'PATCH', { 'faithQuestions/q': null, 'faithQuestionAnswers/q': null })
assert.equal(await (await request('faithQuestionAnswers/q', 'GET')).json(), null)
await denied('faithQuestionAnswers/q/late', 'PUT', answer, 'bob')
assert.equal((await (await request('users/alice/faithQuestions/private', 'GET')).json()).title, question.title)
await allowed('faithQuestions/q2', 'PUT', question)
await allowed('faithQuestionAnswers/q2/a', 'PUT', answer, 'bob')
await allowed('faithQuestionAnswers/q2/a', 'DELETE', undefined, 'bob')
assert.equal(await (await request('faithQuestionAnswers/q2', 'GET')).json(), null)
console.log('Shared questions: cross-account reads/answers, author-only mutations, private legacy isolation, immutable authorship, orphan prevention and atomic deletion passed.')
