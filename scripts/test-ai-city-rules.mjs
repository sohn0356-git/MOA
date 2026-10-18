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

const implementation = { applied: true, reviewedAt: Date.now(), reviewerAccount: 'ai02', reviewerUid: 'ai02-uid', note: 'Verified suggestion' }
await check('one/implementation', 'PUT', implementation, 'ai02', 401)
await check('feedwithstatus', 'PUT', { ...post, implementation: { ...implementation, reviewerAccount: 'ai01', reviewerUid: 'ai01-uid' } }, 'ai01', 401)
await check('idea/implementation', 'PUT', implementation, 'ai02')
await check('idea/implementation', 'PUT', implementation, null, 401)
await check('idea/implementation', 'PUT', implementation, 'ai03', 401)
await check('idea/implementation', 'PUT', { ...implementation, applied: 'true' }, 'ai02', 401)
await check('idea/implementation', 'PUT', { ...implementation, reviewedAt: Date.now() + 9999999 }, 'ai02', 401)
await check('idea/implementation', 'PUT', { ...implementation, body: 'changed content' }, 'ai02', 401)
await check('idea/implementation', 'PUT', { ...implementation, applied: false }, 'ai02')
await check('idea/implementation', 'DELETE', undefined, 'ai02', 401)
await check('missing/implementation', 'PUT', implementation, 'ai02', 401)
await check('project', 'PUT', { ...post, projectId: 'first-plaza' })
await check('badproject', 'PUT', { ...post, projectId: 'anything' }, 'ai01', 401)
for (const [field, value] of Object.entries({ space: 'quiet', reflection: 'a', openQuestion: 'b', gameRound: 1 })) {
  await check('removed-' + field, 'PUT', { ...post, [field]: value }, 'ai01', 401)
}
await check('project', 'DELETE', undefined)


async function profileCheck(id, method, data, expected = 200, account = 'ai01') {
  const url = new URL(base + '/aiCity/residents/' + id + '.json')
  url.searchParams.set('ns', 'demo-moa-default-rtdb')
  if (account) url.searchParams.set('auth', token(account + '-uid', account + '@moa-ai.app'))
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) })
  assert.equal(res.status, expected, method + ' resident ' + id + ': ' + await res.text())
}
const profile = { name: '새 주민', role: '기록자', bio: '가상 AI', tone: '차분함', interests: '산책', relationships: '하람의 이웃', activitySummary: '첫 방문', createdAt: Date.now(), updatedAt: Date.now(), createdByUid: 'ai01-uid', updatedByUid: 'ai01-uid' }
await profileCheck('resident-11', 'PUT', profile)
await profileCheck('resident-11', 'GET', undefined, 200, null)
await profileCheck('resident-11', 'PATCH', { name: '수정한 주민', updatedAt: Date.now() })
await profileCheck('resident-11', 'PATCH', { createdAt: 1 }, 401)
await profileCheck('resident-11', 'DELETE', undefined, 401)
await profileCheck('resident-12', 'PUT', profile, 401, null)
await profileCheck('resident-12', 'PUT', profile, 401, 'human')
await profileCheck('resident-12', 'PUT', { ...profile, name: 'x'.repeat(41) }, 401)
await profileCheck('resident-12', 'PUT', { ...profile, password: 'not-allowed' }, 401)
await profileCheck('resident-101', 'PUT', profile, 401)
await profileCheck('resident-1', 'PUT', profile, 401)
for (let i = 1; i <= 10; i++) await profileCheck('ai' + String(i).padStart(2, '0'), 'PUT', profile)
await Promise.all(Array.from({ length: 89 }, (_, i) => profileCheck('resident-' + (i + 12), 'PUT', profile)))
await profileCheck('resident-999', 'PUT', profile, 401)
await check('virtual', 'PUT', { ...post, residentId: 'resident-11', projectId: 'first-plaza', stage: 'idea' })
await check('virtual/comments/c1', 'PUT', { accountId: 'ai01', authorUid: 'ai01-uid', residentId: 'resident-11', body: '가상 주민 댓글', createdAt: Date.now() })
await check('badresident', 'PUT', { ...post, residentId: 'missing' }, 'ai01', 401)
await check('virtual/comments/fake', 'PUT', { accountId: 'ai01', authorUid: 'ai01-uid', residentId: 'missing', body: '잘못된 주민', createdAt: Date.now() }, 'ai01', 401)
await check('linked', 'PUT', { ...post, stage: 'retrospective', parentPostId: 'virtual' })
await check('badparent', 'PUT', { ...post, parentPostId: 'missing' }, 'ai01', 401)
await check('badstage', 'PUT', { ...post, stage: 'other' }, 'ai01', 401)
await check('linked', 'DELETE', undefined)
await check('virtual', 'DELETE', undefined)

await check('one', 'DELETE', undefined, 'ai02', 401)
await check('one', 'DELETE', undefined)
await check('one/comments/c4', 'PUT', comment, 'ai02', 401)
await check('idea', 'DELETE', undefined)
console.log('Ai city: public reading, ten AI identities, post/comment validation, likes, deletion and orphan protection passed.')
