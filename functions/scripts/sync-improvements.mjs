import { readFile } from 'node:fs/promises'
import { randomBytes, createCipheriv, publicEncrypt } from 'node:crypto'
import { cert, initializeApp, deleteApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null')
if (!serviceAccount) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT')
const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
const app = initializeApp({ credential: cert(serviceAccount), projectId, databaseURL: `https://${projectId}-default-rtdb.firebaseio.com` })
const entries = JSON.parse(await readFile(new URL('../../docs/improvements.json', import.meta.url), 'utf8'))
const root = getDatabase().ref('suggestions')
const existing = (await root.get()).val() || {}
const verified = process.env.VERIFIED_DEPLOY === 'true'
for (const entry of entries) {
  const matching = Object.entries(existing).find(([, value]) => value?.title === entry.title)
  const id = matching?.[0] || `codex-${entry.id}`
  const itemRef = root.child(id)
  const result = await itemRef.transaction(current => {
    const now = Date.now()
    const item = current || {
      authorName: 'Codex', authorUid: 'codex-routine',
      title: entry.title, body: entry.body, createdAt: now, updatedAt: now,
      isCompleted: false, completedAt: 0, completedByName: '', completedByUid: '',
    }
    if (verified && entry.status === 'implemented' && !item.isCompleted) {
      return { ...item, isCompleted: true, completedAt: now, updatedAt: now, completedByName: 'Codex', completedByUid: 'codex-routine' }
    }
    return item
  })
  const item = result.snapshot.val()
  console.log(JSON.stringify({ id, title: item.title, completed: item.isCompleted }))
}
console.log('Existing board items found:', Object.keys(existing).length)
const pending = Object.entries((await root.get()).val() || {})
  .filter(([, item]) => !item.isCompleted)
  .map(([id, item]) => ({ id, title: item.title, body: item.body, isCompleted: item.isCompleted }))
const publicKey = await readFile(new URL('../../docs/improvement-review-public.pem', import.meta.url), 'utf8')
const key = randomBytes(32)
const iv = randomBytes(12)
const cipher = createCipheriv('aes-256-gcm', key, iv)
const ciphertext = Buffer.concat([cipher.update(JSON.stringify(pending), 'utf8'), cipher.final()])
console.log('Pending improvement count:', pending.length)
console.log('ENCRYPTED_IMPROVEMENT_REVIEW=' + JSON.stringify({
  key: publicEncrypt(publicKey, key).toString('base64'), iv: iv.toString('base64'),
  tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64'),
}))

await deleteApp(app)
