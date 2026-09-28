import { DoListApp } from './do-list/DoListApp'
import { DoListIcon } from './do-list/DoListIcon'
import { HabitApp } from './habit/HabitApp'
import { HabitIcon } from './habit/HabitIcon'
import { MeditationApp } from './meditation/MeditationApp'
import { MeditationIcon } from './meditation/MeditationIcon'
import { MemoApp } from './memo/MemoApp'
import { MemoIcon } from './memo/MemoIcon'
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
    id: 'memo',
    name: 'Memo',
    description: '생각과 링크를 바로 적어두는 빠른 메모장.',
    icon: MemoIcon,
    route: '#/memo',
    component: MemoApp,
  },
  {
    id: 'habit',
    name: 'Habit',
    description: '오늘의 기본 루틴을 체크하는 간단한 습관 앱.',
    icon: HabitIcon,
    route: '#/habit',
    component: HabitApp,
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
