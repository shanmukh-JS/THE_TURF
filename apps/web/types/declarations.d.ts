// Ambient module fallback declarations for monorepo IDE language server indexing
declare module 'react' {
  export type ReactNode = any
  export type FC<P = {}> = (props: P) => any
  export default any
}

declare module 'framer-motion' {
  export const motion: any
  export const AnimatePresence: any
}
