import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BookOpen,
  Camera,
  Coins,
  Heart,
  Home,
  LogOut,
  Music,
  Save,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react'
import type { User } from 'firebase/auth'
import { isFirebaseConfigured } from '../../lib/firebase'
import {
  addDiaryComment,
  addPhotoComment,
  createAlbum,
  createDiaryPost,
  createGuestbookEntry,
  createCurrentUserProfile,
  createPlacement,
  defaultMiniRoomLayout,
  deleteDiaryPost,
  deleteGuestbookEntry,
  ensureSeedData,
  findProfileByUsername,
  logout,
  markAllNotificationsRead,
  purchaseItem,
  recordHomepageVisit,
  removeFriend,
  replyGuestbook,
  respondToFriendRequest,
  saveMiniRoomLayout,
  searchProfiles,
  seedShopItems,
  seedTracks,
  sendFriendRequest,
  subscribeAuth,
  subscribeList,
  subscribeValue,
  updateMyProfile,
  uploadPhoto,
} from '../../services/socialService'
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
  PhotoAlbum,
  Profile,
  ShopItem,
  Visibility,
  Wallet,
} from '../../types/social'
import { canViewContent, friendshipId } from '../../utils/social'

type MiniTab = 'home' | 'diary' | 'photos' | 'miniroom' | 'guestbook' | 'friends'

const tabs: Array<{ id: MiniTab; label: string }> = [
  { id: 'home', label: 'HOME' },
  { id: 'diary', label: 'DIARY' },
  { id: 'photos', label: 'PHOTOS' },
  { id: 'miniroom', label: 'MINIROOM' },
  { id: 'guestbook', label: 'GUESTBOOK' },
  { id: 'friends', label: 'FRIENDS' },
]

const moods = ['cozy', 'happy', 'quiet', 'blue', 'busy']
const visibilityOptions: Visibility[] = ['public', 'friends', 'private']
const guestbookVisibilityOptions: GuestbookVisibility[] = ['public', 'private-to-owner']

function handleBackHome() {
  history.pushState('', document.title, window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

function routeUsername() {
  const match = window.location.hash.match(/^#\/home\/([^/?]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function goHome(username: string) {
  window.location.hash = `/home/${encodeURIComponent(username)}`
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function listFromRecord<T>(record: Record<string, T> | null | undefined) {
  return Object.values(record ?? {})
}

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}

function canSeeGuestbook(entry: GuestbookEntry, profile: Profile | null, target: Profile) {
  if (entry.visibility === 'public') {
    return true
  }

  return Boolean(profile && (profile.uid === target.uid || profile.uid === entry.authorUid))
}

function acceptedFriendship(friendships: Friendship[], a: string, b: string) {
  return friendships.find((item) => item.id === friendshipId(a, b) && item.status === 'accepted')
}

function relationship(friendships: Friendship[], a: string, b: string) {
  return friendships.find((item) => item.id === friendshipId(a, b)) ?? null
}

function useHashUsername() {
  const [username, setUsername] = useState(routeUsername())

  useEffect(() => {
    function updateUsername() {
      setUsername(routeUsername())
    }

    updateUsername()
    window.addEventListener('hashchange', updateUsername)
    return () => window.removeEventListener('hashchange', updateUsername)
  }, [])

  return username
}

export function MiniRoomApp() {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<MiniTab>('home')
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [diaryPosts, setDiaryPosts] = useState<DiaryPost[]>([])
  const [albums, setAlbums] = useState<PhotoAlbum[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>([])
  const [miniRoom, setMiniRoom] = useState<MiniRoomLayout | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [shopItems, setShopItems] = useState<ShopItem[]>(Object.values(seedShopItems))
  const [tracks, setTracks] = useState<MusicTrack[]>(Object.values(seedTracks))
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [isEditingRoom, setIsEditingRoom] = useState(false)
  const [playingTrackId, setPlayingTrackId] = useState('')
  const routedUsername = useHashUsername()

  const viewerUid = userProfile?.uid ?? null
  const isOwner = Boolean(userProfile && targetProfile && userProfile.uid === targetProfile.uid)
  const friendship = userProfile && targetProfile
    ? relationship(friendships, userProfile.uid, targetProfile.uid)
    : null
  const isFriend = Boolean(userProfile && targetProfile && acceptedFriendship(friendships, userProfile.uid, targetProfile.uid))
  const unreadCount = notifications.filter((item) => !item.read).length
  const ownedItemIds = new Set(inventory.map((item) => item.itemId))
  const visibleDiary = diaryPosts.filter((post) =>
    canViewContent(post.visibility, post.ownerUid, viewerUid, isFriend),
  )
  const visiblePhotos = photos.filter((photo) =>
    canViewContent(photo.visibility, photo.ownerUid, viewerUid, isFriend),
  )
  const visibleGuestbook = guestbookEntries.filter((entry) =>
    targetProfile ? canSeeGuestbook(entry, userProfile, targetProfile) : false,
  )
  const friendProfiles = useMemo(() => {
    if (!targetProfile) {
      return []
    }

    const ids = friendships
      .filter((item) => item.status === 'accepted' && (item.fromUid === targetProfile.uid || item.toUid === targetProfile.uid))
      .map((item) => item.fromUid === targetProfile.uid ? item.toUid : item.fromUid)

    return allProfiles.filter((profile) => ids.includes(profile.uid))
  }, [allProfiles, friendships, targetProfile])
  const activeTrack = tracks.find((track) => track.id === (targetProfile?.activeBgmTrackId || playingTrackId)) ?? tracks[0]

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setAuthError('Firebase 환경 변수가 설정되지 않았습니다. .env.example을 기준으로 설정하세요.')
      setIsAuthLoading(false)
      return undefined
    }

    void ensureSeedData().catch(() => undefined)
    return subscribeAuth((snapshot) => {
      setAuthUser(snapshot.user)
      setUserProfile(snapshot.profile)
      setIsAuthLoading(snapshot.loading)
      if (snapshot.profile && !routeUsername()) {
        goHome(snapshot.profile.username)
      }
    })
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined
    }

    return subscribeValue<Record<string, Profile>>('profiles', (value) => {
      setAllProfiles(listFromRecord(value))
    })
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined
    }

    return subscribeList<Friendship>('friendships', setFriendships)
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured() || !userProfile) {
      return undefined
    }

    const unsubscribeWallet = subscribeValue<Wallet>(`wallets/${userProfile.uid}`, setWallet)
    const unsubscribeInventory = subscribeValue<Record<string, InventoryItem>>(
      `userInventory/${userProfile.uid}`,
      (value) => setInventory(listFromRecord(value)),
    )
    const unsubscribeNotifications = subscribeList<Notification>(
      `notifications/${userProfile.uid}`,
      setNotifications,
    )

    return () => {
      unsubscribeWallet()
      unsubscribeInventory()
      unsubscribeNotifications()
    }
  }, [userProfile])

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined
    }

    const unsubscribeShop = subscribeValue<Record<string, ShopItem>>('shopItems', (value) => {
      setShopItems(listFromRecord(value) || Object.values(seedShopItems))
    })
    const unsubscribeTracks = subscribeValue<Record<string, MusicTrack>>('musicTracks', (value) => {
      setTracks(listFromRecord(value) || Object.values(seedTracks))
    })

    return () => {
      unsubscribeShop()
      unsubscribeTracks()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadTargetProfile() {
      const username = routedUsername || userProfile?.username || ''
      if (!username) {
        setTargetProfile(null)
        return
      }

      const profile = await findProfileByUsername(username)
      if (!cancelled) {
        setTargetProfile(profile)
      }
    }

    if (isFirebaseConfigured()) {
      void loadTargetProfile().catch((error) => setStatus(friendlyError(error)))
    }

    return () => {
      cancelled = true
    }
  }, [routedUsername, userProfile])

  useEffect(() => {
    if (!targetProfile || !isFirebaseConfigured()) {
      return undefined
    }

    const unsubscribeDiary = subscribeList<DiaryPost>(`diaryPosts/${targetProfile.uid}`, setDiaryPosts)
    const unsubscribeAlbums = subscribeList<PhotoAlbum>(`photoAlbums/${targetProfile.uid}`, setAlbums)
    const unsubscribePhotos = subscribeList<Photo>(`photos/${targetProfile.uid}`, setPhotos)
    const unsubscribeGuestbook = subscribeList<GuestbookEntry>(
      `guestbookEntries/${targetProfile.uid}`,
      setGuestbookEntries,
    )
    const unsubscribeRoom = subscribeValue<MiniRoomLayout>(
      `miniroomLayouts/${targetProfile.uid}`,
      (value) => setMiniRoom(value ?? defaultMiniRoomLayout(targetProfile.uid)),
    )

    if (userProfile) {
      void recordHomepageVisit(targetProfile, userProfile.uid).catch(() => undefined)
    }

    return () => {
      unsubscribeDiary()
      unsubscribeAlbums()
      unsubscribePhotos()
      unsubscribeGuestbook()
      unsubscribeRoom()
    }
  }, [targetProfile, userProfile])

  async function runAction(action: () => Promise<unknown>, success = '') {
    setIsBusy(true)
    setStatus('')
    try {
      await action()
      if (success) {
        setStatus(success)
      }
    } catch (error) {
      setStatus(friendlyError(error))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleProfileSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const username = String(form.get('username') ?? '')
    const displayName = String(form.get('displayName') ?? '')

    await runAction(async () => {
      await createCurrentUserProfile({ username, displayName })
    }, '미니홈피 프로필을 만들었습니다.')
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(async () => {
      setSearchResults(await searchProfiles(query))
    })
  }

  if (isAuthLoading) {
    return <MiniRoomShell><div className="mh-skeleton">미니홈피를 불러오는 중입니다.</div></MiniRoomShell>
  }

  if (!authUser) {
    return (
      <MiniRoomShell>
        <section className="mh-auth-card" aria-label="로그인 필요">
          <div>
            <p className="mh-kicker">MOA Minihome</p>
            <h2>로그인이 필요합니다</h2>
            <p>MOA에 로그인한 뒤 미니홈피를 사용할 수 있습니다.</p>
          </div>
          {(authError || status) ? <p className="mh-message">{authError || status}</p> : null}
        </section>
      </MiniRoomShell>
    )
  }

  if (!userProfile) {
    return (
      <MiniRoomShell>
        <section className="mh-auth-card" aria-label="미니홈피 프로필 설정">
          <div>
            <p className="mh-kicker">MOA Minihome</p>
            <h2>미니홈피 이름을 정합니다</h2>
            <p>이미 로그인된 Firebase 계정으로 개인 미니홈피 프로필만 생성합니다.</p>
          </div>
          <form className="mh-form" onSubmit={(event) => void handleProfileSetup(event)}>
            <label>
              사용자 이름
              <input required name="username" pattern="[a-zA-Z0-9_]{3,20}" placeholder="my_room" />
            </label>
            <label>
              표시 이름
              <input
                required
                name="displayName"
                maxLength={24}
                placeholder={authUser.displayName || '나의 별명'}
              />
            </label>
            <button disabled={isBusy} type="submit">
              미니홈피 만들기
            </button>
          </form>
          {(authError || status) ? <p className="mh-message">{authError || status}</p> : null}
        </section>
      </MiniRoomShell>
    )
  }

  if (!targetProfile) {
    return (
      <MiniRoomShell profile={userProfile} onLogout={() => void logout()}>
        <section className="mh-panel">
          <h2>홈페이지를 찾을 수 없습니다.</h2>
          <button type="button" onClick={() => goHome(userProfile.username)}>내 미니홈피로 이동</button>
        </section>
      </MiniRoomShell>
    )
  }

  return (
    <MiniRoomShell profile={userProfile} unreadCount={unreadCount} onLogout={() => void logout()}>
      <div className={`mh-notebook mh-theme-${targetProfile.activeThemeId}`}>
        <aside className="mh-profile-card">
          <div className={`mh-avatar-frame mh-frame-${targetProfile.activeFrameId}`}>
            <img src={targetProfile.avatarUrl} alt={`${targetProfile.displayName} avatar`} />
          </div>
          <h2>{targetProfile.displayName}</h2>
          <p className="mh-username">@{targetProfile.username}</p>
          <p className="mh-status">{targetProfile.statusMessage}</p>
          <dl className="mh-stats">
            <div><dt>TODAY</dt><dd>{targetProfile.todayVisitors}</dd></div>
            <div><dt>TOTAL</dt><dd>{targetProfile.totalVisitors}</dd></div>
            <div><dt>FRIENDS</dt><dd>{targetProfile.friendCount}</dd></div>
          </dl>
          <BgmPlayer
            track={activeTrack}
            isPlaying={playingTrackId === activeTrack?.id}
            onToggle={() => setPlayingTrackId(playingTrackId === activeTrack?.id ? '' : activeTrack?.id ?? '')}
          />
          {!isOwner ? (
            <FriendAction
              isBusy={isBusy}
              friendship={friendship}
              viewer={userProfile}
              target={targetProfile}
              onRequest={(nickname) => runAction(
                () => sendFriendRequest(userProfile, targetProfile.uid, nickname),
                '친구 신청을 보냈습니다.',
              )}
              onRemove={() => friendship ? runAction(() => removeFriend(friendship), '친구를 삭제했습니다.') : undefined}
            />
          ) : null}
        </aside>

        <main className="mh-page">
          <header className="mh-home-title">
            <div>
              <p className="mh-kicker">Mini Homepage</p>
              <h1>{targetProfile.homepageTitle}</h1>
            </div>
            <div className="mh-toolbar">
              <button type="button" onClick={() => setActiveTab('home')}><Home size={17} />홈</button>
              <button type="button" onClick={() => setActiveTab('friends')}><Users size={17} />친구</button>
              <button type="button" onClick={() => setActiveTab('miniroom')}><Sparkles size={17} />방</button>
            </div>
          </header>

          <nav className="mh-tabs" aria-label="미니홈피 탭">
            {tabs.map((tab) => (
              <button
                aria-current={activeTab === tab.id ? 'page' : undefined}
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {status ? <p className="mh-message">{status}</p> : null}

          {activeTab === 'home' ? (
            <HomeTab
              diaryPosts={visibleDiary.slice(0, 3)}
              photos={visiblePhotos.slice(0, 6)}
              guestbookEntries={visibleGuestbook.slice(0, 3)}
              miniRoom={miniRoom}
              profile={targetProfile}
              shopItems={shopItems}
              onTab={setActiveTab}
            />
          ) : null}

          {activeTab === 'diary' ? (
            <DiaryTab
              isOwner={isOwner}
              isBusy={isBusy}
              posts={visibleDiary}
              profile={userProfile}
              target={targetProfile}
              onCreate={(input) => runAction(() => createDiaryPost(userProfile, input), '다이어리를 저장했습니다.')}
              onDelete={(postId) => runAction(() => deleteDiaryPost(targetProfile.uid, postId), '다이어리를 삭제했습니다.')}
              onComment={(postId, message) => runAction(() => addDiaryComment(targetProfile.uid, postId, userProfile, message), '댓글을 남겼습니다.')}
            />
          ) : null}

          {activeTab === 'photos' ? (
            <PhotosTab
              albums={albums}
              isOwner={isOwner}
              isBusy={isBusy}
              photos={visiblePhotos}
              profile={userProfile}
              target={targetProfile}
              onCreateAlbum={(name) => runAction(() => createAlbum(userProfile.uid, name), '앨범을 만들었습니다.')}
              onUpload={(albumId, file, caption, visibility) => runAction(
                () => uploadPhoto(userProfile, albumId, file, caption, visibility),
                '사진을 업로드했습니다.',
              )}
              onComment={(photoId, message) => runAction(() => addPhotoComment(targetProfile.uid, photoId, userProfile, message), '사진 댓글을 남겼습니다.')}
            />
          ) : null}

          {activeTab === 'miniroom' ? (
            <MiniRoomTab
              inventory={inventory}
              isEditing={isEditingRoom}
              isOwner={isOwner}
              layout={miniRoom ?? defaultMiniRoomLayout(targetProfile.uid)}
              shopItems={shopItems}
              onAddItem={(itemId) => {
                setMiniRoom((current) => ({
                  ...(current ?? defaultMiniRoomLayout(targetProfile.uid)),
                  items: [...(current?.items ?? []), createPlacement(itemId)],
                }))
              }}
              onChange={setMiniRoom}
              onEdit={setIsEditingRoom}
              onReset={() => setMiniRoom(defaultMiniRoomLayout(targetProfile.uid))}
              onSave={(layout) => runAction(() => saveMiniRoomLayout(userProfile.uid, layout), '미니룸을 저장했습니다.')}
            />
          ) : null}

          {activeTab === 'guestbook' ? (
            <GuestbookTab
              entries={visibleGuestbook}
              isOwner={isOwner}
              isBusy={isBusy}
              profile={userProfile}
              target={targetProfile}
              onCreate={(message, visibility) => runAction(
                () => createGuestbookEntry(targetProfile.uid, userProfile, message, visibility),
                '방명록을 남겼습니다.',
              )}
              onDelete={(entryId) => runAction(() => deleteGuestbookEntry(targetProfile.uid, entryId), '방명록을 삭제했습니다.')}
              onReply={(entry, reply) => runAction(() => replyGuestbook(userProfile, entry, reply), '답글을 저장했습니다.')}
            />
          ) : null}

          {activeTab === 'friends' ? (
            <FriendsTab
              allProfiles={allProfiles}
              friendships={friendships}
              isBusy={isBusy}
              profile={userProfile}
              target={targetProfile}
              friends={friendProfiles}
              onAccept={(request, nickname) => runAction(() => respondToFriendRequest(request, true, nickname), '친구 신청을 수락했습니다.')}
              onReject={(request) => runAction(() => respondToFriendRequest(request, false, ''), '친구 신청을 거절했습니다.')}
            />
          ) : null}
        </main>

        <aside className="mh-side-panel">
          <section className="mh-panel">
            <h3><Search size={17} /> 사람 찾기</h3>
            <form className="mh-inline-form" onSubmit={(event) => void handleSearch(event)}>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="username or name" />
              <button type="submit" disabled={isBusy}>검색</button>
            </form>
            <div className="mh-compact-list">
              {searchResults.map((profile) => (
                <button key={profile.uid} type="button" onClick={() => goHome(profile.username)}>
                  <img src={profile.avatarUrl} alt="" />
                  <span>{profile.displayName}<small>@{profile.username}</small></span>
                </button>
              ))}
            </div>
          </section>

          <section className="mh-panel">
            <h3><Bell size={17} /> 알림 {unreadCount ? `(${unreadCount})` : ''}</h3>
            {notifications.slice(0, 5).map((item) => (
              <p className={item.read ? 'mh-muted-note' : 'mh-notification'} key={item.id}>{item.message}</p>
            ))}
            <button type="button" onClick={() => void markAllNotificationsRead(userProfile.uid)}>모두 읽음</button>
          </section>

          <ShopPanel
            inventoryIds={ownedItemIds}
            isBusy={isBusy}
            items={shopItems}
            wallet={wallet}
            onApply={(item) => {
              if (item.category === 'homepage-theme') {
                void runAction(() => updateMyProfile(userProfile.uid, { activeThemeId: item.id }), '테마를 적용했습니다.')
              } else if (item.category === 'profile-frame') {
                void runAction(() => updateMyProfile(userProfile.uid, { activeFrameId: item.id }), '프레임을 적용했습니다.')
              } else if (item.category === 'miniroom-background') {
                const current = miniRoom ?? defaultMiniRoomLayout(userProfile.uid)
                setMiniRoom({ ...current, backgroundItemId: item.id })
              } else {
                setMiniRoom((current) => ({
                  ...(current ?? defaultMiniRoomLayout(userProfile.uid)),
                  items: [...(current?.items ?? []), createPlacement(item.id)],
                }))
                setActiveTab('miniroom')
              }
            }}
            onBuy={(item) => runAction(() => purchaseItem(userProfile, item), '구매했습니다. 인벤토리에 추가됐습니다.')}
          />
        </aside>
      </div>
    </MiniRoomShell>
  )
}

function MiniRoomShell({
  children,
  onLogout,
  profile,
  unreadCount = 0,
}: {
  children: React.ReactNode
  onLogout?: () => void
  profile?: Profile
  unreadCount?: number
}) {
  return (
    <section className="mh-app">
      <header className="mh-topbar">
        <button aria-label="Back to MOA apps" className="nav-icon-button" type="button" onClick={handleBackHome}>
          <Home size={20} />
        </button>
        <div>
          <p>MOA Minihome</p>
          <strong>My own little place</strong>
        </div>
        {profile ? (
          <div className="mh-session">
            <button type="button" onClick={() => goHome(profile.username)}>내 홈</button>
            <span aria-label={`${unreadCount} unread notifications`}><Bell size={16} />{unreadCount}</span>
            <button aria-label="Logout" type="button" onClick={onLogout}><LogOut size={17} /></button>
          </div>
        ) : null}
      </header>
      {children}
    </section>
  )
}

function BgmPlayer({
  isPlaying,
  onToggle,
  track,
}: {
  isPlaying: boolean
  onToggle: () => void
  track?: MusicTrack
}) {
  return (
    <div className="mh-bgm">
      <Music size={18} />
      <div>
        <strong>{track?.title ?? 'No track'}</strong>
        <span>{track?.artist ?? 'Select BGM'}</span>
      </div>
      <button type="button" onClick={onToggle}>{isPlaying ? 'Pause' : 'Play'}</button>
    </div>
  )
}

function FriendAction({
  friendship,
  isBusy,
  onRemove,
  onRequest,
  target,
  viewer,
}: {
  friendship: Friendship | null
  isBusy: boolean
  onRemove: () => void | Promise<void> | undefined
  onRequest: (nickname: string) => void
  target: Profile
  viewer: Profile
}) {
  const [nickname, setNickname] = useState('')

  if (friendship?.status === 'accepted') {
    return <button className="mh-danger-button" type="button" onClick={onRemove}>친구 끊기</button>
  }

  if (friendship?.status === 'pending') {
    return <p className="mh-muted-note">친구 신청 대기 중</p>
  }

  return (
    <form className="mh-inline-form" onSubmit={(event) => {
      event.preventDefault()
      onRequest(nickname || `${target.displayName} 친구`)
    }}>
      <input aria-label="친구 별명" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder={`${viewer.displayName}만의 별명`} />
      <button disabled={isBusy} type="submit"><Send size={16} />친구 신청</button>
    </form>
  )
}

function HomeTab({
  diaryPosts,
  guestbookEntries,
  miniRoom,
  onTab,
  photos,
  profile,
  shopItems,
}: {
  diaryPosts: DiaryPost[]
  guestbookEntries: GuestbookEntry[]
  miniRoom: MiniRoomLayout | null
  onTab: (tab: MiniTab) => void
  photos: Photo[]
  profile: Profile
  shopItems: ShopItem[]
}) {
  return (
    <div className="mh-home-grid">
      <section className="mh-panel mh-room-preview">
        <h3>Mini Room</h3>
        <RoomCanvas layout={miniRoom ?? defaultMiniRoomLayout(profile.uid)} shopItems={shopItems} readonly />
        <button type="button" onClick={() => onTab('miniroom')}>방 구경하기</button>
      </section>
      <section className="mh-panel">
        <h3><BookOpen size={17} /> 최근 다이어리</h3>
        {diaryPosts.map((post) => <ArticlePreview key={post.id} title={post.title} body={post.content} />)}
        {diaryPosts.length === 0 ? <p className="mh-empty">아직 공개된 다이어리가 없습니다.</p> : null}
      </section>
      <section className="mh-panel">
        <h3><Camera size={17} /> 최근 사진</h3>
        <div className="mh-photo-grid">
          {photos.map((photo) => <img key={photo.id} src={photo.imageUrl} alt={photo.caption || 'album photo'} />)}
        </div>
        {photos.length === 0 ? <p className="mh-empty">앨범이 비어 있습니다.</p> : null}
      </section>
      <section className="mh-panel">
        <h3>방명록</h3>
        {guestbookEntries.map((entry) => <ArticlePreview key={entry.id} title={entry.authorName} body={entry.message} />)}
        {guestbookEntries.length === 0 ? <p className="mh-empty">첫 방명록을 기다리고 있습니다.</p> : null}
      </section>
    </div>
  )
}

function ArticlePreview({ body, title }: { body: string; title: string }) {
  return (
    <article className="mh-preview">
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  )
}

function DiaryTab({
  isBusy,
  isOwner,
  onComment,
  onCreate,
  onDelete,
  posts,
  profile,
}: {
  isBusy: boolean
  isOwner: boolean
  onComment: (postId: string, message: string) => void
  onCreate: (input: Pick<DiaryPost, 'title' | 'content' | 'mood' | 'visibility'>) => void
  onDelete: (postId: string) => void
  posts: DiaryPost[]
  profile: Profile
  target: Profile
}) {
  const [comment, setComment] = useState('')

  return (
    <section className="mh-stack">
      {isOwner ? (
        <form className="mh-panel mh-form" onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          onCreate({
            title: String(form.get('title') ?? ''),
            content: String(form.get('content') ?? ''),
            mood: String(form.get('mood') ?? 'cozy'),
            visibility: String(form.get('visibility') ?? 'public') as Visibility,
          })
          event.currentTarget.reset()
        }}>
          <h3>오늘의 다이어리</h3>
          <input required name="title" placeholder="제목" />
          <textarea required name="content" rows={5} placeholder="오늘 있었던 일을 적어보세요." />
          <div className="mh-form-row">
            <select name="mood">{moods.map((mood) => <option key={mood}>{mood}</option>)}</select>
            <select name="visibility">{visibilityOptions.map((option) => <option key={option}>{option}</option>)}</select>
          </div>
          <button disabled={isBusy} type="submit"><Save size={16} />저장</button>
        </form>
      ) : null}

      {posts.map((post) => (
        <article className="mh-diary-page" key={post.id}>
          <header>
            <span>{post.mood}</span>
            <time>{formatDate(post.createdAt)}</time>
          </header>
          <h3>{post.title}</h3>
          <p>{post.content}</p>
          <footer>
            <span>{post.visibility}</span>
            <span><Heart size={15} /> {post.reactionCount}</span>
            {isOwner ? <button type="button" onClick={() => onDelete(post.id)}>삭제</button> : null}
          </footer>
          <form className="mh-inline-form" onSubmit={(event) => {
            event.preventDefault()
            onComment(post.id, comment)
            setComment('')
          }}>
            <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={`${profile.displayName}님의 댓글`} />
            <button type="submit">댓글</button>
          </form>
        </article>
      ))}
      {posts.length === 0 ? <p className="mh-empty">볼 수 있는 다이어리가 없습니다.</p> : null}
    </section>
  )
}

function PhotosTab({
  albums,
  isBusy,
  isOwner,
  onComment,
  onCreateAlbum,
  onUpload,
  photos,
  profile,
}: {
  albums: PhotoAlbum[]
  isBusy: boolean
  isOwner: boolean
  onComment: (photoId: string, message: string) => void
  onCreateAlbum: (name: string) => void
  onUpload: (albumId: string, file: File, caption: string, visibility: Visibility) => void
  photos: Photo[]
  profile: Profile
  target: Profile
}) {
  const [comment, setComment] = useState('')
  const firstAlbumId = albums[0]?.id ?? ''

  return (
    <section className="mh-stack">
      {isOwner ? (
        <div className="mh-panel mh-photo-tools">
          <form className="mh-inline-form" onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            onCreateAlbum(String(form.get('album') ?? '새 앨범'))
            event.currentTarget.reset()
          }}>
            <input name="album" placeholder="앨범 이름" />
            <button disabled={isBusy} type="submit">앨범 만들기</button>
          </form>
          <form className="mh-form" onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const file = form.get('photo')
            if (file instanceof File && file.size > 0) {
              onUpload(
                String(form.get('albumId') || firstAlbumId),
                file,
                String(form.get('caption') ?? ''),
                String(form.get('visibility') ?? 'public') as Visibility,
              )
              event.currentTarget.reset()
            }
          }}>
            <select name="albumId">{albums.map((album) => <option value={album.id} key={album.id}>{album.name}</option>)}</select>
            <input required name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
            <input name="caption" placeholder="사진 설명" />
            <select name="visibility">{visibilityOptions.map((option) => <option key={option}>{option}</option>)}</select>
            <button disabled={isBusy || !firstAlbumId} type="submit">사진 올리기</button>
          </form>
        </div>
      ) : null}

      <div className="mh-album-grid">
        {photos.map((photo) => (
          <article className="mh-photo-card" key={photo.id}>
            <img src={photo.imageUrl} alt={photo.caption || 'album photo'} />
            <p>{photo.caption || 'Untitled photo'}</p>
            <small>{photo.visibility}</small>
            <form className="mh-inline-form" onSubmit={(event) => {
              event.preventDefault()
              onComment(photo.id, comment)
              setComment('')
            }}>
              <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={`${profile.displayName} 댓글`} />
              <button type="submit">댓글</button>
            </form>
          </article>
        ))}
      </div>
      {photos.length === 0 ? <p className="mh-empty">볼 수 있는 사진이 없습니다.</p> : null}
    </section>
  )
}

function MiniRoomTab({
  inventory,
  isEditing,
  isOwner,
  layout,
  onAddItem,
  onChange,
  onEdit,
  onReset,
  onSave,
  shopItems,
}: {
  inventory: InventoryItem[]
  isEditing: boolean
  isOwner: boolean
  layout: MiniRoomLayout
  onAddItem: (itemId: string) => void
  onChange: (layout: MiniRoomLayout) => void
  onEdit: (isEditing: boolean) => void
  onReset: () => void
  onSave: (layout: MiniRoomLayout) => void
  shopItems: ShopItem[]
}) {
  const ownedFurniture = inventory
    .map((item) => shopItems.find((shopItem) => shopItem.id === item.itemId))
    .filter((item): item is ShopItem => Boolean(item && ['furniture', 'decoration'].includes(item.category)))

  return (
    <section className="mh-stack">
      <div className="mh-panel">
        <div className="mh-room-actions">
          <h3>Mini Room</h3>
          {isOwner ? (
            <div>
              <button type="button" onClick={() => onEdit(!isEditing)}>{isEditing ? '미리보기' : '편집'}</button>
              <button type="button" onClick={onReset}>초기화</button>
              <button type="button" onClick={() => onSave(layout)}><Save size={16} />저장</button>
            </div>
          ) : null}
        </div>
        <RoomCanvas editable={isEditing && isOwner} layout={layout} shopItems={shopItems} onChange={onChange} />
      </div>
      {isOwner ? (
        <section className="mh-panel">
          <h3>인벤토리에서 배치</h3>
          <div className="mh-shop-grid">
            {ownedFurniture.map((item) => (
              <button key={item.id} type="button" onClick={() => onAddItem(item.id)}>
                <span>{item.image}</span>
                {item.name}
              </button>
            ))}
          </div>
          {ownedFurniture.length === 0 ? <p className="mh-empty">상점에서 가구를 구매하면 여기에 표시됩니다.</p> : null}
        </section>
      ) : null}
    </section>
  )
}

function RoomCanvas({
  editable = false,
  layout,
  onChange,
  readonly = false,
  shopItems,
}: {
  editable?: boolean
  layout: MiniRoomLayout
  onChange?: (layout: MiniRoomLayout) => void
  readonly?: boolean
  shopItems: ShopItem[]
}) {
  const roomRef = useRef<HTMLDivElement | null>(null)
  const bg = shopItems.find((item) => item.id === layout.backgroundItemId)

  function updatePlacement(placementId: string, patch: Partial<MiniRoomPlacedItem>) {
    onChange?.({
      ...layout,
      items: layout.items.map((item) => item.placementId === placementId ? { ...item, ...patch } : item),
    })
  }

  function onPointerMove(event: React.PointerEvent, placement: MiniRoomPlacedItem) {
    if (!editable || readonly) {
      return
    }

    const rect = roomRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    updatePlacement(placement.placementId, {
      x: Math.max(3, Math.min(97, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(10, Math.min(92, ((event.clientY - rect.top) / rect.height) * 100)),
    })
  }

  return (
    <div className={`mh-room-canvas mh-room-${layout.backgroundItemId}`} ref={roomRef}>
      <div className="mh-room-wall">{bg?.name ?? 'Sunlit Window'}</div>
      <div className="mh-room-floor" />
      <div className="mh-room-character" style={{ left: '45%', top: '55%' }}>웃</div>
      {layout.items.map((placement) => {
        const item = shopItems.find((shopItem) => shopItem.id === placement.itemId)
        return (
          <button
            aria-label={item?.name ?? placement.itemId}
            className="mh-room-item"
            key={placement.placementId}
            style={{
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              zIndex: placement.z,
              transform: `translate(-50%, -50%) scale(${placement.scale}) rotate(${placement.rotation}deg)`,
            }}
            type="button"
            onPointerDown={(event) => {
              if (editable) {
                event.currentTarget.setPointerCapture(event.pointerId)
              }
            }}
            onPointerMove={(event) => onPointerMove(event, placement)}
          >
            {item?.image ?? '□'}
          </button>
        )
      })}
    </div>
  )
}

function GuestbookTab({
  entries,
  isBusy,
  isOwner,
  onCreate,
  onDelete,
  onReply,
  profile,
  target,
}: {
  entries: GuestbookEntry[]
  isBusy: boolean
  isOwner: boolean
  onCreate: (message: string, visibility: GuestbookVisibility) => void
  onDelete: (entryId: string) => void
  onReply: (entry: GuestbookEntry, reply: string) => void
  profile: Profile
  target: Profile
}) {
  return (
    <section className="mh-stack">
      <form className="mh-panel mh-form" onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        onCreate(
          String(form.get('message') ?? ''),
          String(form.get('visibility') ?? 'public') as GuestbookVisibility,
        )
        event.currentTarget.reset()
      }}>
        <h3>{target.displayName}님 방명록</h3>
        <textarea required name="message" rows={3} placeholder={`${profile.displayName}님의 방문 흔적`} />
        <select name="visibility">{guestbookVisibilityOptions.map((option) => <option key={option}>{option}</option>)}</select>
        <button disabled={isBusy} type="submit">남기기</button>
      </form>
      {entries.map((entry) => (
        <article className="mh-guestbook-entry" key={entry.id}>
          <img src={entry.authorAvatarUrl} alt="" />
          <div>
            <strong>{entry.authorName}</strong>
            <time>{formatDate(entry.createdAt)}</time>
            <p>{entry.message}</p>
            {entry.reply ? <p className="mh-reply">주인장 답글: {entry.reply}</p> : null}
            {(isOwner || entry.authorUid === profile.uid) ? <button type="button" onClick={() => onDelete(entry.id)}>삭제</button> : null}
            {isOwner ? (
              <form className="mh-inline-form" onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                onReply(entry, String(form.get('reply') ?? ''))
                event.currentTarget.reset()
              }}>
                <input name="reply" placeholder="답글" />
                <button type="submit">답글</button>
              </form>
            ) : null}
          </div>
        </article>
      ))}
      {entries.length === 0 ? <p className="mh-empty">아직 방명록이 없습니다.</p> : null}
    </section>
  )
}

function FriendsTab({
  allProfiles,
  friends,
  friendships,
  isBusy,
  onAccept,
  onReject,
  profile,
  target,
}: {
  allProfiles: Profile[]
  friends: Profile[]
  friendships: Friendship[]
  isBusy: boolean
  onAccept: (request: Friendship, nickname: string) => void
  onReject: (request: Friendship) => void
  profile: Profile
  target: Profile
}) {
  const requests = friendships.filter((item) => item.toUid === profile.uid && item.status === 'pending')

  return (
    <section className="mh-stack">
      {target.uid === profile.uid ? (
        <section className="mh-panel">
          <h3>받은 친구 신청</h3>
          {requests.map((request) => {
            const sender = allProfiles.find((item) => item.uid === request.fromUid)
            return (
              <div className="mh-friend-row" key={request.id}>
                <span>{sender?.displayName ?? 'Unknown'} <small>{request.fromNickname}</small></span>
                <button disabled={isBusy} type="button" onClick={() => onAccept(request, `${sender?.displayName ?? '친구'}님`)}>수락</button>
                <button disabled={isBusy} type="button" onClick={() => onReject(request)}>거절</button>
              </div>
            )
          })}
          {requests.length === 0 ? <p className="mh-empty">새 친구 신청이 없습니다.</p> : null}
        </section>
      ) : null}
      <section className="mh-panel">
        <h3>{target.displayName}님의 친구</h3>
        <div className="mh-compact-list">
          {friends.map((friend) => (
            <button key={friend.uid} type="button" onClick={() => goHome(friend.username)}>
              <img src={friend.avatarUrl} alt="" />
              <span>{friend.displayName}<small>@{friend.username}</small></span>
            </button>
          ))}
        </div>
        {friends.length === 0 ? <p className="mh-empty">아직 친구가 없습니다.</p> : null}
      </section>
    </section>
  )
}

function ShopPanel({
  inventoryIds,
  isBusy,
  items,
  onApply,
  onBuy,
  wallet,
}: {
  inventoryIds: Set<string>
  isBusy: boolean
  items: ShopItem[]
  onApply: (item: ShopItem) => void
  onBuy: (item: ShopItem) => void
  wallet: Wallet | null
}) {
  return (
    <section className="mh-panel">
      <h3><ShoppingBag size={17} /> 상점</h3>
      <p className="mh-wallet"><Coins size={16} /> Pine {wallet?.balance ?? 0}</p>
      <div className="mh-shop-grid">
        {items.filter((item) => item.active).slice(0, 12).map((item) => {
          const owned = inventoryIds.has(item.id)
          return (
            <div className="mh-shop-item" key={item.id}>
              <span>{item.image}</span>
              <strong>{item.name}</strong>
              <small>{item.price} Pine</small>
              <button disabled={isBusy} type="button" onClick={() => owned ? onApply(item) : onBuy(item)}>
                {owned ? '적용' : '구매'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
