/**
 * Navigation Component
 *
 * Shared navigation header for switching between registry and demo views
 */

import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'

export function Navigation() {
  const location = useLocation()

  const links = [
    { path: '/', label: 'Registry' },
    { path: '/demo', label: 'DAG Demo' },
    { path: '/cel-playground', label: 'CEL Playground' },
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Meta Effect
            </h2>
            <div className="flex gap-1">
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === link.path
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
