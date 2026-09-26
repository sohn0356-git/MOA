import type { ComponentType } from 'react'

export type AppIcon = ComponentType

export type AppMeta = {
  id: string
  name: string
  description: string
  icon: AppIcon
  route: string
  component: ComponentType
}
