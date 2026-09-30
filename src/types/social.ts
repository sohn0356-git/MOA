export type Visibility = 'public' | 'friends' | 'private'
export type GuestbookVisibility = 'public' | 'private-to-owner'
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'
export type ReactionTargetType = 'diary' | 'photo'
export type ShopCategory =
  | 'miniroom-background'
  | 'furniture'
  | 'decoration'
  | 'avatar-accessory'
  | 'homepage-theme'
  | 'profile-frame'

export type Profile = {
  uid: string
  username: string
  usernameLowercase?: string
  displayName: string
  displayNameLowercase?: string
  avatarUrl: string
  photoURL?: string
  bio?: string
  intro: string
  statusMessage: string
  homepageTitle: string
  birthday?: string
  friendCount: number
  todayVisitors: number
  totalVisitors: number
  activeThemeId: string
  activeFrameId: string
  activeBgmTrackId: string
  createdAt: number
  updatedAt: number
}

export type Friendship = {
  id: string
  fromUid: string
  toUid: string
  status: FriendshipStatus
  fromNickname: string
  toNickname: string
  createdAt: number
  updatedAt: number
}

export type FriendRequest = Friendship

export type DiaryPost = {
  id: string
  authorId?: string
  ownerUid: string
  title: string
  content: string
  mood: string
  visibility: Visibility
  commentCount: number
  reactionCount: number
  createdAt: number
  updatedAt: number
}

export type Comment = {
  id: string
  ownerUid: string
  targetId: string
  authorUid: string
  authorName: string
  authorAvatarUrl: string
  message: string
  createdAt: number
}

export type PhotoAlbum = {
  id: string
  ownerUid: string
  name: string
  createdAt: number
  updatedAt: number
}

export type Photo = {
  id: string
  albumId: string
  ownerUid: string
  caption: string
  imageUrl: string
  storagePath: string
  visibility: Visibility
  commentCount: number
  reactionCount: number
  createdAt: number
}

export type GuestbookEntry = {
  id: string
  ownerUid: string
  authorUid: string
  authorName: string
  authorAvatarUrl: string
  message: string
  visibility: GuestbookVisibility
  reply: string
  createdAt: number
  updatedAt: number
}

export type MiniRoomPlacedItem = {
  placementId: string
  itemId: string
  x: number
  y: number
  z: number
  scale: number
  rotation: number
}

export type MiniRoomLayout = {
  ownerUid: string
  backgroundItemId: string
  floorItemId: string
  character: string
  items: MiniRoomPlacedItem[]
  updatedAt: number
}

export type MusicTrack = {
  id: string
  title: string
  artist: string
  audioUrl: string
  durationSeconds: number
  active: boolean
}

export type ShopItem = {
  id: string
  name: string
  description: string
  category: ShopCategory
  price: number
  image: string
  active: boolean
  unique: boolean
  payload: Record<string, string | number | boolean>
}

export type Wallet = {
  userId: string
  balance: number
  updatedAt: number
}

export type WalletTransaction = {
  id: string
  userId: string
  amount: number
  type: 'credit' | 'debit' | 'purchase'
  description: string
  createdAt: number
}

export type InventoryItem = {
  id: string
  userId: string
  itemId: string
  purchasedAt: number
}

export type Notification = {
  id: string
  userId: string
  type:
    | 'friend_request'
    | 'friend_acceptance'
    | 'diary_comment'
    | 'photo_comment'
    | 'guestbook_message'
    | 'guestbook_reply'
  actorUid: string
  message: string
  href: string
  read: boolean
  createdAt: number
}
