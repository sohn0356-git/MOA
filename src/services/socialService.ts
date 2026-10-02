import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { requireFirebase } from '../lib/firebase'
import type {
  DiaryPost,
  Friendship,
  GuestbookEntry,
  GuestbookVisibility,
  InventoryItem,
  MiniRoomLayout,
  MiniRoomPlacedItem,
  MusicTrack,
  Notification,
  Photo,
  Profile,
  ShopItem,
  Visibility,
} from '../types/social'
import { sanitizeUsername } from '../utils/social'

const now = () => Date.now()

export type RegisterInput = {
  email: string
  password: string
  username: string
  displayName: string
}

export type AuthSnapshot = {
  user: User | null
  profile: Profile | null
  loading: boolean
}

type CallableResult<T> = {
  data: T
}

export const defaultAvatar =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="38" fill="%23ffdba8"/><circle cx="80" cy="67" r="31" fill="%23a76535"/><path d="M34 146c7-31 25-49 46-49s39 18 46 49" fill="%23657a46"/></svg>'

export function normalizeUsername(username: string) {
  return sanitizeUsername(username)
}

function millis(value: unknown) {
  if (typeof value === 'number') {
    return value
  }

  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis() as number
  }

  return now()
}

function profileFromData(id: string, data: DocumentData): Profile {
  return {
    uid: String(data.uid ?? id),
    username: String(data.username ?? ''),
    usernameLowercase: String(data.usernameLowercase ?? data.username ?? ''),
    displayName: String(data.displayName ?? data.username ?? 'MOA friend'),
    displayNameLowercase: String(data.displayNameLowercase ?? data.displayName ?? ''),
    avatarUrl: String(data.avatarUrl ?? data.photoURL ?? defaultAvatar),
    photoURL: String(data.photoURL ?? data.avatarUrl ?? defaultAvatar),
    bio: String(data.bio ?? data.intro ?? ''),
    intro: String(data.intro ?? data.bio ?? '작은 인터넷 방에 오신 것을 환영합니다.'),
    statusMessage: String(data.statusMessage ?? '오늘도 내 방 정리 중'),
    homepageTitle: String(data.homepageTitle ?? `${String(data.displayName ?? '친구')}의 작은 방`),
    birthday: typeof data.birthday === 'string' ? data.birthday : undefined,
    friendCount: Number(data.friendCount ?? 0),
    todayVisitors: Number(data.todayVisitors ?? 0),
    totalVisitors: Number(data.totalVisitors ?? 0),
    activeThemeId: String(data.activeThemeId ?? 'warm-paper'),
    activeFrameId: String(data.activeFrameId ?? 'plain-frame'),
    activeBgmTrackId: String(data.activeBgmTrackId ?? 'lofi-postcard'),
    createdAt: millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
  }
}

function mapDoc<T>(id: string, data: DocumentData): T {
  return {
    id,
    ...data,
    createdAt: millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
  } as T
}

function userDoc(uid: string) {
  return doc(requireFirebase().db, 'users', uid)
}

export async function registerWithProfile(input: RegisterInput) {
  const username = normalizeUsername(input.username)
  if (username.length < 3) {
    throw new Error('Username must contain at least 3 letters, numbers, or underscores.')
  }

  const { auth, functions } = requireFirebase()
  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password)
  await updateProfile(credential.user, { displayName: input.displayName })
  await sendEmailVerification(credential.user)

  const createUserProfile = httpsCallable(functions, 'createUserProfile')
  await createUserProfile({
    username,
    displayName: input.displayName.trim() || username,
    photoURL: defaultAvatar,
  })

  return credential.user
}

export async function createCurrentUserProfile(input: {
  username: string
  displayName: string
}) {
  const { auth, functions } = requireFirebase()
  const user = auth.currentUser

  if (!user) {
    throw new Error('Login is required.')
  }

  const username = normalizeUsername(input.username)
  const displayName = input.displayName.trim() || user.displayName || username
  await updateProfile(user, { displayName })

  const createUserProfile = httpsCallable(functions, 'createUserProfile')
  await createUserProfile({
    username,
    displayName,
    photoURL: user.photoURL || defaultAvatar,
  })
}

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(requireFirebase().auth, email, password)
}

export function logout() {
  return signOut(requireFirebase().auth)
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(requireFirebase().auth, email)
}

export function subscribeAuth(callback: (snapshot: AuthSnapshot) => void) {
  const { auth, db } = requireFirebase()
  let unsubscribeProfile: Unsubscribe | undefined
  callback({ user: null, profile: null, loading: true })

  return onAuthStateChanged(auth, (user) => {
    unsubscribeProfile?.()
    if (!user) {
      callback({ user: null, profile: null, loading: false })
      return
    }

    unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      callback({
        user,
        profile: snapshot.exists() ? profileFromData(snapshot.id, snapshot.data()) : null,
        loading: false,
      })
    })
  })
}

export function subscribeValue<T>(path: string, callback: (value: T | null) => void) {
  const { db } = requireFirebase()
  const segments = path.split('/').filter(Boolean)

  if (segments[0] === 'profiles') {
    return onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
      const value = Object.fromEntries(
        snapshot.docs.map((item) => [item.id, profileFromData(item.id, item.data())]),
      )
      callback(value as T)
    })
  }

  if (segments[0] === 'wallets' && segments[1]) {
    return onSnapshot(doc(db, 'users', segments[1], 'private', 'wallet'), (snapshot) => {
      callback(snapshot.exists() ? mapDoc<T>(segments[1], snapshot.data()) : null)
    })
  }

  if (segments[0] === 'userInventory' && segments[1]) {
    return onSnapshot(collection(db, 'users', segments[1], 'inventory'), (snapshot) => {
      const value = Object.fromEntries(snapshot.docs.map((item) => [item.id, mapDoc<InventoryItem>(item.id, item.data())]))
      callback(value as T)
    })
  }

  if (segments[0] === 'miniroomLayouts' && segments[1]) {
    return onSnapshot(doc(db, 'users', segments[1], 'miniroom', 'layout'), (snapshot) => {
      callback(snapshot.exists() ? mapDoc<T>(snapshot.id, snapshot.data()) : null)
    })
  }

  if (segments[0] === 'shopItems') {
    return onSnapshot(query(collection(db, 'shopItems'), where('active', '==', true), limit(100)), (snapshot) => {
      const value = Object.fromEntries(snapshot.docs.map((item) => [item.id, mapDoc<ShopItem>(item.id, item.data())]))
      callback(value as T)
    })
  }

  if (segments[0] === 'musicTracks') {
    return onSnapshot(query(collection(db, 'musicTracks'), where('active', '==', true), limit(50)), (snapshot) => {
      const value = Object.fromEntries(snapshot.docs.map((item) => [item.id, mapDoc<MusicTrack>(item.id, item.data())]))
      callback(value as T)
    })
  }

  return onSnapshot(doc(db, path), (snapshot) => {
    callback(snapshot.exists() ? mapDoc<T>(snapshot.id, snapshot.data()) : null)
  })
}

export function subscribeList<T extends { id: string }>(
  path: string,
  callback: (value: T[]) => void,
) {
  const { db } = requireFirebase()
  const segments = path.split('/').filter(Boolean)
  let constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(50)]
  let ref = collection(db, segments[0] ?? path)

  if (segments[0] === 'diaryPosts' && segments[1]) {
    ref = collection(db, 'diaryPosts')
    constraints = [where('ownerUid', '==', segments[1]), orderBy('createdAt', 'desc'), limit(30)]
  } else if (segments[0] === 'photoAlbums' && segments[1]) {
    ref = collection(db, 'albums')
    constraints = [where('ownerUid', '==', segments[1]), orderBy('createdAt', 'desc'), limit(30)]
  } else if (segments[0] === 'photos' && segments[1]) {
    ref = collection(db, 'photos')
    constraints = [where('ownerUid', '==', segments[1]), orderBy('createdAt', 'desc'), limit(40)]
  } else if (segments[0] === 'guestbookEntries' && segments[1]) {
    ref = collection(db, 'guestbookEntries')
    constraints = [where('ownerUid', '==', segments[1]), orderBy('createdAt', 'desc'), limit(40)]
  } else if (segments[0] === 'notifications' && segments[1]) {
    ref = collection(db, 'users', segments[1], 'notifications')
    constraints = [orderBy('createdAt', 'desc'), limit(20)]
  } else if (segments[0] === 'friendships') {
    ref = collection(db, 'friendships')
    constraints = [orderBy('updatedAt', 'desc'), limit(100)]
  }

  return onSnapshot(query(ref, ...constraints), (snapshot) => {
    callback(snapshot.docs.map((item) => mapDoc<T>(item.id, item.data())))
  })
}

export async function findProfileByUsername(username: string) {
  const { db } = requireFirebase()
  const normalized = normalizeUsername(username)
  const usernameSnapshot = await getDoc(doc(db, 'usernames', normalized))
  if (!usernameSnapshot.exists()) {
    return null
  }

  const uid = String(usernameSnapshot.data().uid ?? '')
  const profileSnapshot = await getDoc(doc(db, 'users', uid))
  return profileSnapshot.exists() ? profileFromData(profileSnapshot.id, profileSnapshot.data()) : null
}

export async function searchProfiles(searchTerm: string) {
  const { db } = requireFirebase()
  const needle = normalizeUsername(searchTerm)
  if (!needle) {
    const snapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(12)))
    return snapshot.docs.map((item) => profileFromData(item.id, item.data()))
  }

  const snapshot = await getDocs(query(
    collection(db, 'users'),
    orderBy('usernameLowercase'),
    where('usernameLowercase', '>=', needle),
    where('usernameLowercase', '<=', `${needle}\uf8ff`),
    limit(20),
  ))

  return snapshot.docs.map((item) => profileFromData(item.id, item.data()))
}

export async function updateMyProfile(uid: string, patch: Partial<Profile>) {
  await updateDoc(userDoc(uid), {
    ...patch,
    displayNameLowercase: patch.displayName?.toLowerCase(),
    updatedAt: serverTimestamp(),
  })
}

export async function uploadAvatar(uid: string, file: File) {
  const extension = file.name.split('.').pop() || 'webp'
  const path = `users/${uid}/profile/${now()}.${extension}`
  const uploadTask = uploadBytesResumable(storageRef(requireFirebase().storage, path), file, {
    contentType: file.type,
  })
  await uploadTask
  return getDownloadURL(uploadTask.snapshot.ref)
}

export async function sendFriendRequest(from: Profile, toUid: string, nickname: string) {
  const callable = httpsCallable(requireFirebase().functions, 'sendFriendRequest')
  await callable({ toUid, nickname, fromUsername: from.username })
}

export async function respondToFriendRequest(friendship: Friendship, accepted: boolean, nickname: string) {
  const callable = httpsCallable(requireFirebase().functions, 'respondToFriendRequest')
  await callable({ friendshipId: friendship.id, accepted, nickname })
}

export async function removeFriend(friendship: Friendship) {
  const callable = httpsCallable(requireFirebase().functions, 'removeFriend')
  await callable({ friendshipId: friendship.id })
}

export async function recordHomepageVisit(owner: Profile, viewerUid: string | null) {
  if (!viewerUid || viewerUid === owner.uid) {
    return
  }

  const callable = httpsCallable(requireFirebase().functions, 'recordHomepageVisit')
  await callable({ ownerUid: owner.uid })
}

export async function createDiaryPost(
  owner: Profile,
  input: Pick<DiaryPost, 'title' | 'content' | 'mood' | 'visibility'>,
) {
  const postRef = await addDoc(collection(requireFirebase().db, 'diaryPosts'), {
    authorId: owner.uid,
    ownerUid: owner.uid,
    title: input.title,
    content: input.content,
    mood: input.mood,
    visibility: input.visibility,
    commentCount: 0,
    reactionCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await updateDoc(postRef, { id: postRef.id })
}

export async function deleteDiaryPost(_ownerUid: string, postId: string) {
  await deleteDoc(doc(requireFirebase().db, 'diaryPosts', postId))
}

export async function updateDiaryPost(
  postId: string,
  input: Pick<DiaryPost, 'title' | 'content' | 'mood' | 'visibility'>,
) {
  await updateDoc(doc(requireFirebase().db, 'diaryPosts', postId), {
    ...input,
    updatedAt: serverTimestamp(),
  })
}

export async function addDiaryComment(ownerUid: string, postId: string, author: Profile, message: string) {
  const commentRef = await addDoc(collection(requireFirebase().db, 'diaryPosts', postId, 'comments'), {
    ownerUid,
    targetId: postId,
    authorUid: author.uid,
    authorName: author.displayName,
    authorAvatarUrl: author.avatarUrl,
    message,
    createdAt: serverTimestamp(),
  })
  await updateDoc(commentRef, { id: commentRef.id })
  await createNotification(ownerUid, 'diary_comment', author.uid, postId)
}

export async function createAlbum(ownerUid: string, name: string) {
  const albumRef = await addDoc(collection(requireFirebase().db, 'albums'), {
    ownerUid,
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await updateDoc(albumRef, { id: albumRef.id })
  return { id: albumRef.id, ownerUid, name, createdAt: now(), updatedAt: now() }
}

export async function renameAlbum(albumId: string, name: string) {
  await updateDoc(doc(requireFirebase().db, 'albums', albumId), {
    name,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAlbum(albumId: string) {
  await deleteDoc(doc(requireFirebase().db, 'albums', albumId))
}

export async function uploadPhoto(
  owner: Profile,
  albumId: string,
  file: File,
  caption: string,
  visibility: Visibility,
) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are supported.')
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Images must be 8MB or smaller.')
  }

  const extension = file.name.split('.').pop() || 'webp'
  const id = crypto.randomUUID()
  const path = `users/${owner.uid}/photos/${id}.${extension}`
  const uploadTask = uploadBytesResumable(storageRef(requireFirebase().storage, path), file, {
    contentType: file.type,
  })
  await uploadTask
  const imageUrl = await getDownloadURL(uploadTask.snapshot.ref)
  await setDoc(doc(requireFirebase().db, 'photos', id), {
    id,
    albumId,
    ownerUid: owner.uid,
    caption,
    imageUrl,
    storagePath: path,
    visibility,
    commentCount: 0,
    reactionCount: 0,
    createdAt: serverTimestamp(),
  })
}

export async function addPhotoComment(ownerUid: string, photoId: string, author: Profile, message: string) {
  const commentRef = await addDoc(collection(requireFirebase().db, 'photos', photoId, 'comments'), {
    ownerUid,
    targetId: photoId,
    authorUid: author.uid,
    authorName: author.displayName,
    authorAvatarUrl: author.avatarUrl,
    message,
    createdAt: serverTimestamp(),
  })
  await updateDoc(commentRef, { id: commentRef.id })
  await createNotification(ownerUid, 'photo_comment', author.uid, photoId)
}

export async function updatePhoto(photoId: string, patch: Pick<Partial<Photo>, 'albumId' | 'caption' | 'visibility'>) {
  await updateDoc(doc(requireFirebase().db, 'photos', photoId), patch)
}

export async function deletePhoto(photoId: string) {
  await deleteDoc(doc(requireFirebase().db, 'photos', photoId))
}

export async function createGuestbookEntry(
  ownerUid: string,
  author: Profile,
  message: string,
  visibility: GuestbookVisibility,
) {
  const entryRef = await addDoc(collection(requireFirebase().db, 'guestbookEntries'), {
    ownerUid,
    authorUid: author.uid,
    authorName: author.displayName,
    authorAvatarUrl: author.avatarUrl,
    message,
    visibility,
    reply: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await updateDoc(entryRef, { id: entryRef.id })
  await createNotification(ownerUid, 'guestbook_message', author.uid, entryRef.id)
}

export async function replyGuestbook(owner: Profile, entry: GuestbookEntry, reply: string) {
  await updateDoc(doc(requireFirebase().db, 'guestbookEntries', entry.id), {
    reply,
    updatedAt: serverTimestamp(),
  })
  await createNotification(entry.authorUid, 'guestbook_reply', owner.uid, entry.id)
}

export async function deleteGuestbookEntry(_ownerUid: string, entryId: string) {
  await deleteDoc(doc(requireFirebase().db, 'guestbookEntries', entryId))
}

export function defaultMiniRoomLayout(ownerUid: string): MiniRoomLayout {
  return {
    ownerUid,
    backgroundItemId: 'bg-sunlit-window',
    floorItemId: 'floor-honey-wood',
    character: 'smile',
    items: [
      { placementId: 'bed-default', itemId: 'item-blue-bed', x: 18, y: 66, z: 1, scale: 1, rotation: 0 },
      { placementId: 'desk-default', itemId: 'item-writing-desk', x: 54, y: 58, z: 2, scale: 1, rotation: 0 },
      { placementId: 'plant-default', itemId: 'item-fern-pot', x: 82, y: 44, z: 3, scale: 1, rotation: 0 },
    ],
    updatedAt: now(),
  }
}

export async function saveMiniRoomLayout(ownerUid: string, layout: MiniRoomLayout) {
  await setDoc(doc(requireFirebase().db, 'users', ownerUid, 'miniroom', 'layout'), {
    ...layout,
    ownerUid,
    updatedAt: serverTimestamp(),
  })
}

export function createPlacement(itemId: string): MiniRoomPlacedItem {
  return {
    placementId: crypto.randomUUID(),
    itemId,
    x: 50,
    y: 50,
    z: 5,
    scale: 1,
    rotation: 0,
  }
}

export async function purchaseItem(_profile: Profile, item: ShopItem) {
  const purchase = httpsCallable(requireFirebase().functions, 'purchaseShopItem')
  await purchase({ itemId: item.id })
}

export async function toggleReaction(
  ownerUid: string,
  targetType: 'diary' | 'photo',
  targetId: string,
  userUid: string,
) {
  const ref = doc(requireFirebase().db, 'reactions', `${targetType}_${targetId}_${userUid}`)
  await setDoc(ref, {
    ownerUid,
    targetType,
    targetId,
    userUid,
    createdAt: serverTimestamp(),
  })
}

export async function applyAvatarUrl(uid: string, file: File) {
  const avatarUrl = await uploadAvatar(uid, file)
  await updateMyProfile(uid, { avatarUrl, photoURL: avatarUrl })
}

export async function markNotificationRead(uid: string, notificationId: string) {
  await updateDoc(doc(requireFirebase().db, 'users', uid, 'notifications', notificationId), {
    read: true,
  })
}

export async function markAllNotificationsRead(uid: string) {
  const snapshot = await getDocs(collection(requireFirebase().db, 'users', uid, 'notifications'))
  await Promise.all(snapshot.docs.map((item) => updateDoc(item.ref, { read: true })))
}

async function createNotification(userId: string, type: Notification['type'], actorUid: string, targetId: string) {
  await addDoc(collection(requireFirebase().db, 'users', userId, 'notifications'), {
    type,
    actorUid,
    targetId,
    read: false,
    message: notificationMessage(type),
    href: '#/mini-room',
    createdAt: serverTimestamp(),
  })
}

function notificationMessage(type: Notification['type']) {
  const messages: Record<Notification['type'], string> = {
    diary_comment: '다이어리에 새 댓글이 달렸습니다.',
    friend_acceptance: '친구 신청이 수락되었습니다.',
    friend_request: '새 친구 신청이 도착했습니다.',
    guestbook_message: '새 방명록이 남겨졌습니다.',
    guestbook_reply: '방명록 답글이 달렸습니다.',
    photo_comment: '사진에 새 댓글이 달렸습니다.',
  }
  return messages[type]
}

export const seedTracks: Record<string, MusicTrack> = {
  'lofi-postcard': {
    id: 'lofi-postcard',
    title: 'Postcard Afternoon',
    artist: 'MOA Demo Band',
    audioUrl: '',
    durationSeconds: 96,
    active: true,
  },
  'window-rain': {
    id: 'window-rain',
    title: 'Window Rain Loop',
    artist: 'Archive Keys',
    audioUrl: '',
    durationSeconds: 122,
    active: true,
  },
  'small-town': {
    id: 'small-town',
    title: 'Small Town Login',
    artist: 'Pixel Letter',
    audioUrl: '',
    durationSeconds: 84,
    active: true,
  },
}

export const seedShopItems: Record<string, ShopItem> = {
  'bg-sunlit-window': item('bg-sunlit-window', 'Sunlit Window', 'Warm wall with a morning window.', 'miniroom-background', 90, '▤', true),
  'bg-blue-hour': item('bg-blue-hour', 'Blue Hour Wall', 'Late evening room background.', 'miniroom-background', 120, '◒', true),
  'floor-honey-wood': item('floor-honey-wood', 'Honey Wood Floor', 'Classic cozy plank floor.', 'miniroom-background', 70, '▥', true),
  'item-blue-bed': item('item-blue-bed', 'Cloud Bed', 'Soft blue bed for long diary nights.', 'furniture', 85, '▰', true),
  'item-writing-desk': item('item-writing-desk', 'Writing Desk', 'A desk for secret notes.', 'furniture', 100, '▤', true),
  'item-fern-pot': item('item-fern-pot', 'Fern Pot', 'Small plant with big personality.', 'decoration', 45, '♧', true),
  'item-record-player': item('item-record-player', 'Record Player', 'Retro BGM corner.', 'decoration', 130, '◉', true),
  'item-star-lamp': item('item-star-lamp', 'Star Lamp', 'A tiny light for guestbook replies.', 'decoration', 75, '◐', true),
  'frame-postage': item('frame-postage', 'Postage Frame', 'Stamped-paper profile frame.', 'profile-frame', 60, '▢', true),
  'theme-berry-paper': item('theme-berry-paper', 'Berry Paper Theme', 'Rose accent homepage theme.', 'homepage-theme', 110, '◆', true),
  'theme-forest-note': item('theme-forest-note', 'Forest Note Theme', 'Green notebook homepage theme.', 'homepage-theme', 110, '●', true),
  'avatar-red-scarf': item('avatar-red-scarf', 'Red Scarf', 'Avatar accessory placeholder.', 'avatar-accessory', 50, '〰', true),
}

function item(
  id: string,
  name: string,
  description: string,
  category: ShopItem['category'],
  price: number,
  image: string,
  unique: boolean,
): ShopItem {
  return {
    id,
    name,
    description,
    category,
    price,
    image,
    active: true,
    unique,
    payload: { image },
  }
}

export async function ensureSeedData() {
  const seed = httpsCallable(requireFirebase().functions, 'seedPublicCatalog')
  await seed({ tracks: seedTracks, shopItems: seedShopItems } satisfies {
    tracks: Record<string, MusicTrack>
    shopItems: Record<string, ShopItem>
  }) as CallableResult<{ ok: boolean }>
}
