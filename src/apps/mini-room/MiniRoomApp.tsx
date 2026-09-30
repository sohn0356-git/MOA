import { useEffect, useMemo, useState } from 'react'
import { onValue, ref, serverTimestamp, set } from 'firebase/database'
import { getFirebaseAuth } from '../../services/firebase'
import { getRealtimeDb, isFirebaseConfigured } from '../../services/firebase'

type RoomTheme = 'mint' | 'pink' | 'night'
type RoomItemId = 'bed' | 'desk' | 'plant' | 'stereo' | 'album' | 'lamp'

type RoomState = {
  theme: RoomTheme
  items: RoomItemId[]
}

type PublicRoom = RoomState & {
  id: string
  owner: string
  title: string
  message: string
}

const localRoomKey = 'moa-mini-room'

const itemLabels: Record<RoomItemId, string> = {
  album: '앨범장',
  bed: '침대',
  desk: '책상',
  lamp: '스탠드',
  plant: '화분',
  stereo: '오디오',
}

const itemEmoji: Record<RoomItemId, string> = {
  album: '▣',
  bed: '▰',
  desk: '▤',
  lamp: '◐',
  plant: '♧',
  stereo: '◉',
}

const itemPositions: Record<RoomItemId, { left: string; top: string }> = {
  album: { left: '68%', top: '30%' },
  bed: { left: '13%', top: '58%' },
  desk: { left: '50%', top: '52%' },
  lamp: { left: '78%', top: '58%' },
  plant: { left: '22%', top: '31%' },
  stereo: { left: '39%', top: '35%' },
}

const themeLabels: Record<RoomTheme, string> = {
  mint: '민트 다락방',
  night: '밤하늘 방',
  pink: '핑크 미니룸',
}

const defaultRoom: RoomState = {
  theme: 'mint',
  items: ['bed', 'desk', 'plant'],
}

const sampleRooms: PublicRoom[] = [
  {
    id: 'sample-diary',
    owner: '다이어리 친구',
    title: '추억 상자 방',
    message: '오늘 기분은 맑음. 음악은 크게, 조명은 작게.',
    theme: 'pink',
    items: ['bed', 'album', 'lamp', 'plant'],
  },
  {
    id: 'sample-music',
    owner: '밤산책',
    title: '새벽 BGM 방',
    message: '방명록 남기고 가면 답방 갑니다.',
    theme: 'night',
    items: ['desk', 'stereo', 'album', 'lamp'],
  },
]

function handleBackHome() {
  history.pushState('', document.title, window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

function loadLocalRoom() {
  try {
    const savedRoom = localStorage.getItem(localRoomKey)
    if (!savedRoom) {
      return defaultRoom
    }

    const parsedRoom = JSON.parse(savedRoom) as Partial<RoomState>
    const items = Array.isArray(parsedRoom.items)
      ? parsedRoom.items.filter((item): item is RoomItemId => item in itemLabels)
      : defaultRoom.items

    return {
      theme: parsedRoom.theme && parsedRoom.theme in themeLabels ? parsedRoom.theme : defaultRoom.theme,
      items,
    }
  } catch {
    return defaultRoom
  }
}

function RoomPreview({ room }: { room: RoomState }) {
  return (
    <div className={`mini-room-stage mini-room-stage-${room.theme}`}>
      <div className="mini-room-wall" />
      <div className="mini-room-floor" />
      {room.items.map((item) => (
        <span
          className={`mini-room-object mini-room-object-${item}`}
          key={item}
          style={itemPositions[item]}
          title={itemLabels[item]}
        >
          {itemEmoji[item]}
        </span>
      ))}
    </div>
  )
}

export function MiniRoomApp() {
  const [room, setRoom] = useState<RoomState>(() => loadLocalRoom())
  const [title, setTitle] = useState('내 미니룸')
  const [message, setMessage] = useState('방명록에 남길 한 줄을 적어주세요.')
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>(sampleRooms)
  const [activeRoomId, setActiveRoomId] = useState('mine')
  const [publishStatus, setPublishStatus] = useState('')

  const activeRoom = useMemo(() => {
    if (activeRoomId === 'mine') {
      return {
        ...room,
        id: 'mine',
        owner: '나',
        title,
        message,
      }
    }

    return publicRooms.find((publicRoom) => publicRoom.id === activeRoomId) ?? publicRooms[0]
  }, [activeRoomId, message, publicRooms, room, title])

  useEffect(() => {
    localStorage.setItem(localRoomKey, JSON.stringify(room))
  }, [room])

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined
    }

    const roomsRef = ref(getRealtimeDb(), 'miniRooms/publicRooms')
    return onValue(roomsRef, (snapshot) => {
      const value = snapshot.val() as Record<string, Omit<PublicRoom, 'id'>> | null
      const remoteRooms = Object.entries(value ?? {}).map(([id, remoteRoom]) => ({
        id,
        owner: remoteRoom.owner || 'MOA 친구',
        title: remoteRoom.title || '미니룸',
        message: remoteRoom.message || '',
        theme: remoteRoom.theme in themeLabels ? remoteRoom.theme : 'mint',
        items: Array.isArray(remoteRoom.items)
          ? remoteRoom.items.filter((item): item is RoomItemId => item in itemLabels)
          : [],
      }))

      setPublicRooms([...sampleRooms, ...remoteRooms])
    })
  }, [])

  function toggleItem(item: RoomItemId) {
    setRoom((currentRoom) => ({
      ...currentRoom,
      items: currentRoom.items.includes(item)
        ? currentRoom.items.filter((currentItem) => currentItem !== item)
        : [...currentRoom.items, item],
    }))
  }

  async function publishRoom() {
    if (!isFirebaseConfigured()) {
      setPublishStatus('Firebase 설정이 없어 이 기기 안에만 저장됐어요.')
      return
    }

    const user = getFirebaseAuth().currentUser
    if (!user) {
      setPublishStatus('로그인 정보를 다시 확인한 뒤 공개할 수 있어요.')
      return
    }

    await set(ref(getRealtimeDb(), `miniRooms/publicRooms/${user.uid}`), {
      ...room,
      owner: user.displayName || 'MOA 친구',
      title: title.trim() || '내 미니룸',
      message: message.trim(),
      updatedAt: serverTimestamp(),
    })
    setPublishStatus('공개 완료. 친구들이 탐방 목록에서 볼 수 있어요.')
  }

  return (
    <section className="sub-app mini-room-app">
      <header className="utility-header">
        <button
          aria-label="Back to apps"
          className="nav-icon-button"
          type="button"
          onClick={handleBackHome}
        >
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path d="M15.7 5.3a1 1 0 0 1 0 1.4L10.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0Z" />
          </svg>
        </button>
        <div>
          <h2>Mini Room</h2>
          <p>내 방을 꾸미고 친구 방을 탐방합니다.</p>
        </div>
      </header>

      <div className="mini-room-layout">
        <section className="mini-room-card mini-room-editor" aria-label="내 방 꾸미기">
          <div className="mini-room-profile">
            <input
              aria-label="방 이름"
              maxLength={18}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <textarea
              aria-label="방명록 한 줄"
              maxLength={60}
              rows={2}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>

          <RoomPreview room={room} />

          <div className="mini-room-controls" aria-label="테마 선택">
            {(Object.keys(themeLabels) as RoomTheme[]).map((theme) => (
              <button
                aria-pressed={room.theme === theme}
                className={`mini-room-theme-button mini-room-theme-${theme}`}
                key={theme}
                type="button"
                onClick={() => setRoom((currentRoom) => ({ ...currentRoom, theme }))}
              >
                {themeLabels[theme]}
              </button>
            ))}
          </div>

          <div className="mini-room-item-grid" aria-label="가구 선택">
            {(Object.keys(itemLabels) as RoomItemId[]).map((item) => (
              <button
                aria-pressed={room.items.includes(item)}
                key={item}
                type="button"
                onClick={() => toggleItem(item)}
              >
                <span>{itemEmoji[item]}</span>
                {itemLabels[item]}
              </button>
            ))}
          </div>

          <button className="mini-room-publish-button" type="button" onClick={() => void publishRoom()}>
            방 공개하기
          </button>
          {publishStatus ? <p className="mini-room-status">{publishStatus}</p> : null}
        </section>

        <section className="mini-room-card mini-room-visit" aria-label="방 탐방">
          <div className="mini-room-visit-tabs">
            <button
              aria-current={activeRoomId === 'mine'}
              type="button"
              onClick={() => setActiveRoomId('mine')}
            >
              내 방
            </button>
            {publicRooms.map((publicRoom) => (
              <button
                aria-current={activeRoomId === publicRoom.id}
                key={publicRoom.id}
                type="button"
                onClick={() => setActiveRoomId(publicRoom.id)}
              >
                {publicRoom.owner}
              </button>
            ))}
          </div>

          <RoomPreview room={activeRoom} />
          <div className="mini-room-guestbook">
            <strong>{activeRoom.title}</strong>
            <span>{activeRoom.owner}</span>
            <p>{activeRoom.message}</p>
          </div>
        </section>
      </div>
    </section>
  )
}
