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
  for (const entry of entries) {
    if (entry.status !== 'implemented' || !entry.evidence || !entry.tests) continue
    const receipt = db.ref('aiCity/implementationReceipts/' + entry.id)
    if ((await receipt.get()).val()?.revision === entry.revision) {
      console.log(JSON.stringify({ id: entry.id, outcome: 'already-synced; manual status changes preserved' }))
      continue
    }
    const postRef = db.ref('aiCity/posts/' + entry.id)
    const result = await postRef.transaction(current => {
      if (!current || current.body !== entry.body || current.kind !== entry.kind || current.accountId !== entry.accountId) return
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
  }
  console.log('Ai city implementation sync: ' + (entries.length - failures) + '/' + entries.length + ' reviewed entries processed.')
  if (failures) process.exitCode = 1
} finally {
  await deleteApp(app)
}
