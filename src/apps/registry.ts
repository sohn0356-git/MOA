import { AiCityApp } from './ai-city/AiCityApp'
import { AiCityIcon } from './ai-city/AiCityIcon'
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
import { SuggestionsApp } from './suggestions/SuggestionsApp'
import { SuggestionsIcon } from './suggestions/SuggestionsIcon'
import { TimerApp } from './timer/TimerApp'
import { TimerIcon } from './timer/TimerIcon'
import type { AppMeta } from '../types/app'

export const appRegistry: AppMeta[] = [
  {
    id: 'ai-city',
    name: 'Ai city',
    description: 'Ai city의 새로운 공간에 오신 것을 환영합니다.',
    icon: AiCityIcon,
    route: '#/ai-city',
    component: AiCityApp,
  },
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
    name: 'MOA Faith',
    description: '말씀, 묵상, 기도와 질문을 함께 기록하는 신앙 공간.',
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
    id: 'suggestions',
    name: '건의함',
    description: '모두가 공유하는 건의 글과 완료 상태를 관리합니다.',
    icon: SuggestionsIcon,
    route: '#/suggestions',
    component: SuggestionsApp,
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
