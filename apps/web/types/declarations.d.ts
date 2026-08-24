// Ambient module fallback declarations for monorepo IDE language server indexing

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}

declare module 'react' {
  export const useState: any
  export const useEffect: any
  export const useMemo: any
  export const useCallback: any
  export const useRef: any
  export const useContext: any
  export const createContext: any
  export const Fragment: any
  export type ReactNode = any
  export type FC<P = {}> = (props: P) => any
  export type FormEvent<T = any> = any
  export type ChangeEvent<T = any> = any
  export type MouseEvent<T = any> = any
  export type KeyboardEvent<T = any> = any
  const React: any
  export default React
}

declare module 'react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}

declare module 'next/navigation' {
  export const useRouter: () => any
  export const usePathname: () => string
  export const useSearchParams: () => any
  export const redirect: (url: string) => never
  export const notFound: () => never
}

declare module 'next/link' {
  const Link: (props: any) => any
  export default Link
}

declare module 'next/server' {
  export class NextResponse {
    static json(body: any, init?: any): any
    static redirect(url: string | URL, status?: number): any
    static next(): any
  }
  export type NextRequest = any
}

declare module 'lucide-react'

declare module 'framer-motion'
