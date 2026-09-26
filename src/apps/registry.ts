import { DoListApp } from './do-list/DoListApp'
import { DoListIcon } from './do-list/DoListIcon'
import { SampleApp } from './sample/SampleApp'
import { SampleIcon } from './sample/SampleIcon'
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
    id: 'sample',
    name: 'Sample',
    description: 'A placeholder sub app for the MOA registry structure.',
    icon: SampleIcon,
    route: '#/sample',
    component: SampleApp,
  },
]
