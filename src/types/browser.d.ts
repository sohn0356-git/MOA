interface Navigator {
  standalone?: boolean
}

declare module '*.svg?url' {
  const src: string
  export default src
}
