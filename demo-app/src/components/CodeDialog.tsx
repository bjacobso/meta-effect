/**
 * CodeDialog Component
 *
 * Modal dialog for viewing component source code with syntax highlighting
 */

import { useEffect, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-typescript'
import type { ComponentWithCode } from '../registry-types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Copy, Check } from 'lucide-react'

interface CodeDialogProps {
  component: ComponentWithCode
  onClose: () => void
}

export function CodeDialog({ component, onClose }: CodeDialogProps) {
  const [copied, setCopied] = useState(false)
  const [highlightedCode, setHighlightedCode] = useState('')

  useEffect(() => {
    // Highlight code when component changes
    const highlighted = Prism.highlight(
      component.code,
      Prism.languages.typescript,
      'typescript'
    )
    setHighlightedCode(highlighted)
  }, [component.code])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(component.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {component.name}
            <Badge variant="secondary">{component.type}</Badge>
          </DialogTitle>
          <DialogDescription>{component.description}</DialogDescription>
        </DialogHeader>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm border-b pb-4">
          <div>
            <span className="text-muted-foreground">Files:</span>{' '}
            <span className="font-medium">{component.files.join(', ')}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Dependencies:</span>{' '}
            <span className="font-medium">{component.dependencies.join(', ')}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {component.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Code */}
        <div className="flex-1 overflow-auto border rounded-lg relative">
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 z-10"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
          <pre className="!m-0 !rounded-lg">
            <code
              className="language-typescript"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}
