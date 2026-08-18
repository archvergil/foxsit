import { BrandMark } from '@/components/ui/BrandMark'

export function AppLoading() {
  return (
    <main className="app-loading" aria-busy="true" aria-label="Loading workspace">
      <div className="app-loading__mark">
        <BrandMark decorative />
      </div>
      <span className="app-loading__pulse" aria-hidden />
    </main>
  )
}
