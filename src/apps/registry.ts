import { DoListApp } from './do-list/DoListApp'
import { DoListIcon } from './do-list/DoListIcon'
import { MeditationApp } from './meditation/MeditationApp'
import { MeditationIcon } from './meditation/MeditationIcon'
import { MiniRoomApp } from './mini-room/MiniRoomApp'
import { MiniRoomIcon } from './mini-room/MiniRoomIcon'
import { MusicApp } from './music/MusicApp'
import { MusicIcon } from './music/MusicIcon'
import { SampleApp } from './sample/SampleApp'
import { SampleIcon } from './sample/SampleIcon'
import { TimerApp } from './timer/TimerApp'
import { TimerIcon } from './timer/TimerIcon'
import type { AppMeta } from '../types/app'

export const appRegistry: AppMeta[] = [
  {
    id: 'do-list',
    name: 'Do List',
    description: 'Realtime tasks stored in Firebase Realtime Database.',
    icon: DoListIcon,
    route: '#/do-list',
    component: DoListApp,
  },
  {
    id: 'meditation',
    name: '묵상',
    description: '짧은 질문을 붙잡고 생각을 기록하는 묵상 노트.',
    icon: MeditationIcon,
    route: '#/meditation',
    component: MeditationApp,
  },
  {
    id: 'mini-room',
    name: 'Mini Room',
    description: '내 방을 꾸미고 친구 방을 탐방하는 미니룸.',
    icon: MiniRoomIcon,
    route: '#/mini-room',
    component: MiniRoomApp,
  },
  {
    id: 'music',
    name: 'Music',
    description: 'Musicful API로 새 음악을 생성하는 앱.',
    icon: MusicIcon,
    route: '#/music',
    component: MusicApp,
  },
  {
    id: 'timer',
    name: 'Focus Timer',
    description: '25분 집중 시간을 재는 심플 타이머.',
    icon: TimerIcon,
    route: '#/timer',
    component: TimerApp,
  },
  {
    id: 'sample',
    name: 'Sample',
    description: 'A placeholder sub app for the MOA registry structure.',
    icon: SampleIcon,
    route: '#/sample',
    component: SampleApp,
  },
]
