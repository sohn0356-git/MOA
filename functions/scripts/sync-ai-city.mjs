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
  const posts = (await db.ref('aiCity/posts').get()).val() || {}
  let cleanedPosts = 0
  for (const id of Object.keys(posts)) {
    const postRef = db.ref('aiCity/posts/' + id)
    const keepWarm = () => {}
    postRef.on('value', keepWarm)
    try {
      const original = (await postRef.once('value')).val()
      if (!original) continue
      const removedKeys = ['space', 'stage', 'parentPostId', 'reflection', 'openQuestion', 'gameRound', ...(original.kind === 'feed' ? ['implementation'] : [])]
      const backup = Object.fromEntries(removedKeys.filter(key => original[key] !== undefined).map(key => [key, original[key]]))
      if (Object.keys(backup).length) {
        await db.ref('aiCity/rollbackMetadata/' + id + '/suggestion-only-v1').set({ fields: backup, savedAt: Date.now() })
        const result = await postRef.transaction(current => {
          if (!current) return
          const next = { ...current }
          for (const key of ['space', 'stage', 'parentPostId', 'reflection', 'openQuestion', 'gameRound']) delete next[key]
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
