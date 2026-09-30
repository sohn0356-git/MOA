import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

const db = getFirestore()
const welcomeStars = 300
const visitWindowMs = 1000 * 60 * 60 * 6

function assertAuth(uid?: string) {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Login is required.')
  }
  return uid
}

function normalizeUsername(value: unknown) {
  const username = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (username.length < 3 || username.length > 20) {
    throw new HttpsError('invalid-argument', 'Invalid username.')
  }
  return username
}

function friendshipId(a: string, b: string) {
  return [a, b].sort().join('_')
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export const createUserProfile = onCall(async (request) => {
  const uid = assertAuth(request.auth?.uid)
  const username = normalizeUsername(request.data?.username)
  const displayName = String(request.data?.displayName ?? username).trim().slice(0, 40) || username
  const photoURL = String(request.data?.photoURL ?? '')
  const userRef = db.doc(`users/${uid}`)
  const usernameRef = db.doc(`usernames/${username}`)
  const walletRef = db.doc(`users/${uid}/private/wallet`)
  const transactionRef = db.collection(`users/${uid}/walletTransactions`).doc()
  const miniroomRef = db.doc(`users/${uid}/miniroom/layout`)

  await db.runTransaction(async (transaction) => {
    const [userSnapshot, usernameSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(usernameRef),
    ])

    if (userSnapshot.exists) {
      return
    }

    if (usernameSnapshot.exists) {
      throw new HttpsError('already-exists', 'Username is already taken.')
    }

    const now = FieldValue.serverTimestamp()
    transaction.set(usernameRef, { uid, username, createdAt: now })
    transaction.set(userRef, {
      uid,
      username,
      usernameLowercase: username,
      displayName,
      displayNameLowercase: displayName.toLowerCase(),
      photoURL,
      avatarUrl: photoURL,
      bio: 'Welcome to my small room on the internet.',
      intro: 'Welcome to my small room on the internet.',
      statusMessage: 'Decorating my room.',
      homepageTitle: `${displayName}'s room`,
      friendCount: 0,
      todayVisitors: 0,
      totalVisitors: 0,
      activeThemeId: 'warm-paper',
      activeFrameId: 'plain-frame',
      activeBgmTrackId: 'lofi-postcard',
      createdAt: now,
      updatedAt: now,
    })
    transaction.set(walletRef, { userId: uid, balance: welcomeStars, updatedAt: now })
    transaction.set(transactionRef, {
      id: transactionRef.id,
      userId: uid,
      amount: welcomeStars,
      type: 'credit',
      description: 'Welcome Stars',
      createdAt: now,
    })
    transaction.set(miniroomRef, {
      ownerUid: uid,
      backgroundItemId: 'bg-sunlit-window',
      floorItemId: 'floor-honey-wood',
      character: 'smile',
      items: [
        { placementId: 'bed-default', itemId: 'item-blue-bed', x: 18, y: 66, z: 1, scale: 1, rotation: 0 },
        { placementId: 'desk-default', itemId: 'item-writing-desk', x: 54, y: 58, z: 2, scale: 1, rotation: 0 },
        { placementId: 'plant-default', itemId: 'item-fern-pot', x: 82, y: 44, z: 3, scale: 1, rotation: 0 },
      ],
      updatedAt: now,
    })
  })

  return { ok: true }
})

export const sendFriendRequest = onCall(async (request) => {
  const fromUid = assertAuth(request.auth?.uid)
  const toUid = String(request.data?.toUid ?? '')
  const nickname = String(request.data?.nickname ?? '').slice(0, 50)

  if (!toUid || toUid === fromUid) {
    throw new HttpsError('invalid-argument', 'Invalid friend target.')
  }

  const id = friendshipId(fromUid, toUid)
  const friendshipRef = db.doc(`friendships/${id}`)
  const notificationRef = db.collection(`users/${toUid}/notifications`).doc()
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(friendshipRef)
    if (existing.exists && existing.data()?.status === 'accepted') {
      throw new HttpsError('failed-precondition', 'Already friends.')
    }

    const now = FieldValue.serverTimestamp()
    transaction.set(friendshipRef, {
      id,
      fromUid,
      toUid,
      participants: [fromUid, toUid],
      status: 'pending',
      fromNickname: nickname,
      toNickname: '',
      createdAt: now,
      updatedAt: now,
    }, { merge: true })
    transaction.set(notificationRef, {
      id: notificationRef.id,
      type: 'friend_request',
      actorUid: fromUid,
      targetId: id,
      read: false,
      message: 'New friend request.',
      href: '#/mini-room',
      createdAt: now,
    })
  })

  return { ok: true }
})

export const respondToFriendRequest = onCall(async (request) => {
  const uid = assertAuth(request.auth?.uid)
  const friendshipIdValue = String(request.data?.friendshipId ?? '')
  const accepted = Boolean(request.data?.accepted)
  const nickname = String(request.data?.nickname ?? '').slice(0, 50)
  const friendshipRef = db.doc(`friendships/${friendshipIdValue}`)

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(friendshipRef)
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Friend request not found.')
    }

    const data = snapshot.data()
    if (data?.toUid !== uid || data.status !== 'pending') {
      throw new HttpsError('permission-denied', 'Cannot respond to this request.')
    }

    const now = FieldValue.serverTimestamp()
    transaction.update(friendshipRef, {
      status: accepted ? 'accepted' : 'rejected',
      toNickname: nickname,
      updatedAt: now,
    })

    if (accepted) {
      transaction.update(db.doc(`users/${data.fromUid}`), { friendCount: FieldValue.increment(1) })
      transaction.update(db.doc(`users/${data.toUid}`), { friendCount: FieldValue.increment(1) })
      const notificationRef = db.collection(`users/${data.fromUid}/notifications`).doc()
      transaction.set(notificationRef, {
        id: notificationRef.id,
        type: 'friend_acceptance',
        actorUid: uid,
        targetId: friendshipIdValue,
        read: false,
        message: 'Friend request accepted.',
        href: '#/mini-room',
        createdAt: now,
      })
    }
  })

  return { ok: true }
})

export const removeFriend = onCall(async (request) => {
  const uid = assertAuth(request.auth?.uid)
  const friendshipIdValue = String(request.data?.friendshipId ?? '')
  const friendshipRef = db.doc(`friendships/${friendshipIdValue}`)

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(friendshipRef)
    if (!snapshot.exists) {
      return
    }

    const data = snapshot.data()
    if (![data?.fromUid, data?.toUid].includes(uid)) {
      throw new HttpsError('permission-denied', 'Cannot remove this friendship.')
    }

    transaction.delete(friendshipRef)
    if (data?.status === 'accepted') {
      transaction.update(db.doc(`users/${data.fromUid}`), { friendCount: FieldValue.increment(-1) })
      transaction.update(db.doc(`users/${data.toUid}`), { friendCount: FieldValue.increment(-1) })
    }
  })

  return { ok: true }
})

export const recordHomepageVisit = onCall(async (request) => {
  const visitorUid = assertAuth(request.auth?.uid)
  const ownerUid = String(request.data?.ownerUid ?? '')
  if (!ownerUid || ownerUid === visitorUid) {
    return { counted: false }
  }

  const bucket = Math.floor(Date.now() / visitWindowMs)
  const visitId = `${ownerUid}_${visitorUid}_${bucket}`
  const visitRef = db.doc(`homepageVisits/${visitId}`)
  const userRef = db.doc(`users/${ownerUid}`)

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(visitRef)
    if (existing.exists) {
      return
    }

    const now = FieldValue.serverTimestamp()
    transaction.set(visitRef, {
      id: visitId,
      ownerUid,
      visitorUid,
      day: todayKey(),
      bucket,
      createdAt: now,
    })
    transaction.update(userRef, {
      todayVisitors: FieldValue.increment(1),
      totalVisitors: FieldValue.increment(1),
      lastVisitAt: now,
    })
  })

  return { counted: true }
})

export const purchaseShopItem = onCall(async (request) => {
  const uid = assertAuth(request.auth?.uid)
  const itemId = String(request.data?.itemId ?? '')
  const itemRef = db.doc(`shopItems/${itemId}`)
  const walletRef = db.doc(`users/${uid}/private/wallet`)
  const inventoryRef = db.doc(`users/${uid}/inventory/${itemId}`)
  const transactionRef = db.collection(`users/${uid}/walletTransactions`).doc()

  await db.runTransaction(async (transaction) => {
    const [itemSnapshot, walletSnapshot, inventorySnapshot] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(walletRef),
      transaction.get(inventoryRef),
    ])

    if (!itemSnapshot.exists || itemSnapshot.data()?.active !== true) {
      throw new HttpsError('not-found', 'Shop item not found.')
    }

    const item = itemSnapshot.data()
    if (!item) {
      throw new HttpsError('not-found', 'Shop item not found.')
    }
    if (item.unique !== false && inventorySnapshot.exists) {
      throw new HttpsError('already-exists', 'Item already owned.')
    }

    const balance = Number(walletSnapshot.data()?.balance ?? 0)
    const price = Number(item.price ?? 0)
    if (balance < price) {
      throw new HttpsError('failed-precondition', 'Not enough Stars.')
    }

    const now = FieldValue.serverTimestamp()
    transaction.update(walletRef, { balance: balance - price, updatedAt: now })
    transaction.set(transactionRef, {
      id: transactionRef.id,
      userId: uid,
      amount: -price,
      type: 'purchase',
      description: item.name,
      createdAt: now,
    })
    transaction.set(inventoryRef, {
      id: itemId,
      userId: uid,
      itemId,
      purchasedAt: now,
      equipped: false,
      metadata: {},
    })
  })

  return { ok: true }
})

export const seedPublicCatalog = onCall(async (request) => {
  assertAuth(request.auth?.uid)
  const tracks = request.data?.tracks ?? {}
  const shopItems = request.data?.shopItems ?? {}
  const batch = db.batch()

  Object.entries(tracks).forEach(([id, value]) => {
    batch.set(db.doc(`musicTracks/${id}`), {
      ...(value as Record<string, unknown>),
      id,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  })

  Object.entries(shopItems).forEach(([id, value]) => {
    batch.set(db.doc(`shopItems/${id}`), {
      ...(value as Record<string, unknown>),
      id,
      imageURL: (value as { image?: string }).image ?? '',
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  })

  await batch.commit()
  return { ok: true, seededAt: Timestamp.now().toMillis() }
})
