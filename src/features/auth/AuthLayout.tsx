import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BrandMark } from '@/components/ui/BrandMark'
import { APP_NAME, productCopy } from '@/config/product'
import { backendEnvironment } from '@/config/backend'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  alternate?: { label: string; action: string; to: string }
}

export function AuthLayout({ title, subtitle, children, alternate }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <section className="auth-brand-panel" aria-label={`${APP_NAME} identity`}>
        <div className="auth-brand-panel__top">
          <div className="brand-lockup">
            <span className="brand-lockup__mark">
              <BrandMark decorative />
            </span>
            <span>{APP_NAME}</span>
          </div>
          <span className="auth-brand-panel__edition">
            {backendEnvironment.mode === 'local' ? 'Local workspace' : 'Private workspace'}
          </span>
        </div>
        <div className="auth-brand-panel__statement">
          <span className="eyebrow">Make room for what matters</span>
          <h2>{productCopy.tagline}</h2>
          <p>Plan the day, protect your attention, and keep your routines moving.</p>
        </div>
        <div className="auth-brand-panel__slash" aria-hidden />
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-panel__inner">
          <div className="auth-form-panel__mobile-brand brand-lockup">
            <span className="brand-lockup__mark">
              <BrandMark decorative />
            </span>
            <span>{APP_NAME}</span>
          </div>
          <header className="auth-heading">
            <span className="eyebrow">Personal productivity</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>
          {children}
          {alternate ? (
            <p className="auth-alternate">
              {alternate.label}{' '}
              <Link to={alternate.to}>
                {alternate.action} <ArrowUpRight aria-hidden />
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
