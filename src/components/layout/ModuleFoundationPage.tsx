import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from './PageHeader'

interface ModuleFoundationPageProps {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  milestone: string
  links?: Array<{ label: string; to: string }>
}

export function ModuleFoundationPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  milestone,
  links = [],
}: ModuleFoundationPageProps) {
  return (
    <section className="page-stack">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="module-foundation-card">
        <div className="module-foundation-card__icon"><Icon aria-hidden /></div>
        <div>
          <span className="eyebrow">Current build</span>
          <h2>Foundation ready</h2>
          <p>{milestone}</p>
        </div>
        {links.length ? (
          <nav className="module-foundation-card__links" aria-label={`${title} views`}>
            {links.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label} <ArrowRight aria-hidden />
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  )
}
