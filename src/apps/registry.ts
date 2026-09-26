import { SampleApp } from './sample/SampleApp'
import { SampleIcon } from './sample/SampleIcon'
import type { AppMeta } from '../types/app'

export const appRegistry: AppMeta[] = [
  {
    id: 'sample',
    name: 'Sample',
    description: 'A placeholder sub app for the MOA registry structure.',
    icon: SampleIcon,
    route: '#/sample',
    component: SampleApp,
  },
]
