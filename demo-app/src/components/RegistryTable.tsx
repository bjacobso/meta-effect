/**
 * RegistryTable Component
 *
 * Information-dense table display of registry components with search, filtering, and sorting
 */

import { useState, useMemo } from 'react'
import type { ComponentWithCode } from '../registry-types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { CodeDialog } from './CodeDialog'
import { Search } from 'lucide-react'

interface RegistryTableProps {
  components: ComponentWithCode[]
}

type SortField = 'name' | 'type' | 'files'
type SortDirection = 'asc' | 'desc'

const TYPE_COLORS: Record<string, string> = {
  'effect-vite': 'bg-blue-600 hover:bg-blue-700',
  'effect-remix': 'bg-purple-600 hover:bg-purple-700',
  'effect-ci': 'bg-green-600 hover:bg-green-700',
  'effect-livestore': 'bg-orange-600 hover:bg-orange-700',
  'effect-prisma': 'bg-cyan-600 hover:bg-cyan-700'
}

export function RegistryTable({ components }: RegistryTableProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('type')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedComponent, setSelectedComponent] = useState<ComponentWithCode | null>(null)

  // Get unique types for filter
  const types = useMemo(
    () => Array.from(new Set(components.map(c => c.type))).sort(),
    [components]
  )

  // Filter and sort components
  const filteredComponents = useMemo(() => {
    let filtered = components

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.description.toLowerCase().includes(searchLower) ||
          c.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.type === typeFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
          break
        case 'files':
          comparison = a.files.length - b.files.length
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [components, search, typeFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search components, descriptions, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredComponents.length} of {components.length} components
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="w-[180px] cursor-pointer hover:text-foreground"
                onClick={() => handleSort('name')}
              >
                Name <SortIndicator field="name" />
              </TableHead>
              <TableHead
                className="w-[140px] cursor-pointer hover:text-foreground"
                onClick={() => handleSort('type')}
              >
                Type <SortIndicator field="type" />
              </TableHead>
              <TableHead className="min-w-[250px]">Description</TableHead>
              <TableHead
                className="w-[80px] cursor-pointer hover:text-foreground text-center"
                onClick={() => handleSort('files')}
              >
                Files <SortIndicator field="files" />
              </TableHead>
              <TableHead className="w-[200px]">Dependencies</TableHead>
              <TableHead className="w-[180px]">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredComponents.map((component) => (
              <TableRow
                key={component.name}
                className="cursor-pointer"
                onClick={() => setSelectedComponent(component)}
              >
                <TableCell className="font-medium">{component.name}</TableCell>
                <TableCell>
                  <Badge
                    className={`${TYPE_COLORS[component.type] || 'bg-gray-600'} text-white border-0`}
                  >
                    {component.type.replace('effect-', '')}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {component.description}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{component.files.length}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {component.dependencies.slice(0, 2).map(dep => (
                      <Badge key={dep} variant="secondary" className="text-xs">
                        {dep}
                      </Badge>
                    ))}
                    {component.dependencies.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{component.dependencies.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {component.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {component.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{component.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Code Dialog */}
      {selectedComponent && (
        <CodeDialog
          component={selectedComponent}
          onClose={() => setSelectedComponent(null)}
        />
      )}
    </>
  )
}
