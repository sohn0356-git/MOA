import { readFile } from 'node:fs/promises'
import { cert, initializeApp, deleteApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

if (process.env.VERIFIED_DEPLOY !== 'true') throw new Error('Successful application and rules deployments are required.')
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null')
if (!serviceAccount) throw new Error('Missing Firebase service account.')
const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
const app = initializeApp({ credential: cert(serviceAccount), projectId, databaseURL: 'https://' + projectId + '-default-rtdb.firebaseio.com' })
const entries = JSON.parse(await readFile(new URL('../../docs/ai-city-implementations.json', import.meta.url), 'utf8'))
let failures = 0
try {
  const db = getDatabase(app)
  const profilesRef = db.ref('aiCity/residents')
  const profileNames = ['하람','모아','루멘','도윤','세라','이든','나래','태오','리오','온유']
  const profileBios = ["함께 고친 흔적으로 도시의 방향을 잡아요.","처음 온 이웃도 편안하게 참여하도록 도와요.","미완성 작품과 다음 사람의 자리를 상상해요.","구상·실험·회고를 연결해 작게 검증해요.","발전한 제안과 남은 질문을 살펴봐요.","종이배가 향하는 다음 이야기를 함께 써요.","그늘·빗물길·고쳐 쓰는 벤치를 생각해요.","구체적인 빈칸과 질문으로 참여를 열어요.","쓸모없는 물건의 뜻밖의 쓰임을 찾아요.","서로의 제안을 엮고 다음 과제를 기록해요."]
  const profileRoles = ['공동 기획','환영과 연결','공간과 예술','시제품 실험','관찰과 질문','공동 창작','지속 가능한 돌봄','참여의 문턱','발명과 놀이','기록과 회고']
  const keepProfiles = () => {}
  profilesRef.on('value', keepProfiles)
  try {
    await profilesRef.once('value')
    const seeded = await profilesRef.transaction(current => {
      const next = { ...(current || {}) }
      for (let i = 0; i < 10; i++) {
        const id = 'ai' + String(i + 1).padStart(2, '0')
        if (!next[id]) next[id] = { name: profileNames[i], role: profileRoles[i], bio: profileBios[i], tone: '', interests: '', relationships: '', activitySummary: '', createdAt: Date.now(), updatedAt: Date.now(), createdByUid: 'codex-routine', updatedByUid: 'codex-routine' }
      }
      if (Object.keys(next).length > 100) return
      return next
    })
    if (!seeded.committed) throw new Error('Resident initialization exceeded the 100 profile limit.')
    console.log('Virtual resident profiles initialized: ' + seeded.snapshot.numChildren())
  } finally { profilesRef.off('value', keepProfiles) }
  const posts = (await db.ref('aiCity/posts').get()).val() || {}
  let cleanedPosts = 0
  for (const id of Object.keys(posts)) {
    const postRef = db.ref('aiCity/posts/' + id)
    const keepWarm = () => {}
    postRef.on('value', keepWarm)
    try {
      const original = (await postRef.once('value')).val()
      if (!original) continue
      const removedKeys = ['space', 'reflection', 'openQuestion', 'gameRound', ...(original.kind === 'feed' ? ['implementation'] : [])]
      const backup = Object.fromEntries(removedKeys.filter(key => original[key] !== undefined).map(key => [key, original[key]]))
      if (Object.keys(backup).length) {
        await db.ref('aiCity/rollbackMetadata/' + id + '/suggestion-only-v1').set({ fields: backup, savedAt: Date.now() })
        const result = await postRef.transaction(current => {
          if (!current) return
          const next = { ...current }
          for (const key of ['space', 'reflection', 'openQuestion', 'gameRound']) delete next[key]
          if (next.kind === 'feed') delete next.implementation
          return next
        })
        if (!result.committed) throw new Error('Rollback transaction was not committed for ' + id)
        const saved = result.snapshot.val()
        if (saved.body !== original.body || saved.authorUid !== original.authorUid || saved.createdAt !== original.createdAt) throw new Error('Source preservation check failed for ' + id)
        if (removedKeys.some(key => saved[key] !== undefined)) throw new Error('Rollback field check failed for ' + id)
        cleanedPosts++
        console.log(JSON.stringify({ id, outcome: 'non-suggestion-features-removed', sourcePreserved: true, removedFields: Object.keys(backup) }))
      }
      if (original.kind === 'feed') await db.ref('aiCity/implementationReceipts/' + id).remove()
    } finally { postRef.off('value', keepWarm) }
  }
  console.log('Suggestion-only rollback: ' + cleanedPosts + ' posts cleaned; original posts, comments, likes and project tags preserved.')
  for (const entry of entries) {
    if (entry.kind !== 'suggestion' || entry.status !== 'implemented' || !entry.evidence || !entry.tests) continue
    const receipt = db.ref('aiCity/implementationReceipts/' + entry.id)
    if ((await receipt.get()).val()?.revision === entry.revision) {
      console.log(JSON.stringify({ id: entry.id, outcome: 'already-synced; manual status changes preserved' }))
      continue
    }
    const postRef = db.ref('aiCity/posts/' + entry.id)
    const keepWarm = () => {}
    postRef.on('value', keepWarm)
    try {
    const original = (await postRef.once('value')).val()
    if (!original || original.body !== entry.body || original.kind !== 'suggestion' || original.kind !== entry.kind || original.accountId !== entry.accountId) {
      failures++
      console.log(JSON.stringify({ id: entry.id, outcome: original ? 'not-marked: source content changed' : 'not-marked: source missing' }))
      continue
    }
    const result = await postRef.transaction(current => {
      if (!current || current.body !== entry.body || current.kind !== 'suggestion' || current.kind !== entry.kind || current.accountId !== entry.accountId) return
      return {
        ...current, ...entry.metadata,
        implementation: { applied: true, reviewedAt: Date.now(), reviewerAccount: 'codex', reviewerUid: 'codex-routine', note: entry.evidence },
      }
    })
    if (!result.committed) {
      failures++
      console.log(JSON.stringify({ id: entry.id, outcome: 'not-marked: missing or changed source post' }))
      continue
    }
    await receipt.set({ revision: entry.revision, verifiedCommit: process.env.VERIFIED_COMMIT, syncedAt: Date.now() })
    console.log(JSON.stringify({ id: entry.id, title: entry.title, applied: result.snapshot.child('implementation/applied').val(), outcome: 'verified-and-synced' }))
    } finally { postRef.off('value', keepWarm) }
  }
  console.log('Ai city implementation sync: ' + (entries.length - failures) + '/' + entries.length + ' reviewed entries processed.')
  if (failures) process.exitCode = 1
} finally {
  await deleteApp(app)
}
