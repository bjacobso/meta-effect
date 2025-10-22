/**
 * Simulation Panel Component
 *
 * Controls and visualization for DAG workflow simulation
 */

import { useState, useEffect } from 'react'
import { Effect } from 'effect'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'
import type { DagConfigType } from '../lib/effect-dag/dag-config'
import { simulateDag, type SimulationEvent } from '../lib/effect-dag/dag-simulator'

interface SimulationPanelProps {
  dag: DagConfigType
  onHighlightNode?: (nodeId: string | null) => void
}

export function SimulationPanel({ dag, onHighlightNode }: SimulationPanelProps) {
  const [events, setEvents] = useState<SimulationEvent[]>([])
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const currentEvent = events[currentEventIndex]
  const isComplete = currentEventIndex >= events.length - 1

  // Reset simulation when DAG changes
  useEffect(() => {
    setEvents([])
    setCurrentEventIndex(0)
    setIsPlaying(false)
    onHighlightNode?.(null)
  }, [dag, onHighlightNode])

  // Run full simulation to get all events
  const runSimulation = async () => {
    setIsRunning(true)
    setEvents([])
    setCurrentEventIndex(0)
    onHighlightNode?.(null)

    try {
      const result = await Effect.runPromise(simulateDag(dag))
      setEvents(result.events)
    } catch (error) {
      console.error('Simulation error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying || isComplete) return

    const timer = setTimeout(() => {
      setCurrentEventIndex(prev => Math.min(prev + 1, events.length - 1))
    }, 600)

    return () => clearTimeout(timer)
  }, [isPlaying, currentEventIndex, events.length, isComplete])

  // Update highlighted node based on current event
  useEffect(() => {
    if (!currentEvent) {
      onHighlightNode?.(null)
      return
    }

    switch (currentEvent.type) {
      case 'node_start':
      case 'node_complete':
      case 'node_error':
      case 'gate_evaluated':
      case 'collect_waiting':
        onHighlightNode?.(currentEvent.nodeId)
        break
      default:
        onHighlightNode?.(null)
    }
  }, [currentEventIndex, currentEvent, onHighlightNode])

  // Stop playing when complete
  useEffect(() => {
    if (isComplete) {
      setIsPlaying(false)
    }
  }, [isComplete])

  const handlePlay = () => {
    if (events.length === 0) {
      runSimulation()
    }
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentEventIndex(0)
    onHighlightNode?.(null)
  }

  const handleStep = () => {
    if (events.length === 0) {
      runSimulation()
    } else {
      setCurrentEventIndex(prev => Math.min(prev + 1, events.length - 1))
    }
  }

  const getEventIcon = (event: SimulationEvent): string => {
    switch (event.type) {
      case 'node_start': return '▶️'
      case 'node_complete': return '✅'
      case 'node_error': return '❌'
      case 'gate_evaluated': return event.passed ? '🟢' : '🔴'
      case 'collect_waiting': return '📋'
      case 'batch_start': return '📦'
      case 'batch_complete': return '✓'
      case 'simulation_complete': return '🏁'
      default: return '•'
    }
  }

  const getEventDescription = (event: SimulationEvent): string => {
    switch (event.type) {
      case 'node_start':
        return `Starting node: ${event.nodeId} (${event.node._tag})`
      case 'node_complete':
        return `Completed node: ${event.nodeId}`
      case 'node_error':
        return `Error in node ${event.nodeId}: ${event.error}`
      case 'gate_evaluated':
        return `Gate ${event.nodeId}: ${event.passed ? 'PASSED' : 'FAILED'}`
      case 'collect_waiting':
        return `Waiting for input: ${event.formId}`
      case 'batch_start':
        return `Starting batch: ${event.nodeIds.join(', ')}`
      case 'batch_complete':
        return `Batch complete: ${event.nodeIds.join(', ')}`
      case 'simulation_complete':
        return 'Simulation complete!'
      default:
        return 'Unknown event'
    }
  }

  return (
    <div className="border rounded-lg p-6 bg-card">
      <h3 className="text-xl font-semibold mb-4">Workflow Simulation</h3>

      {/* Controls */}
      <div className="flex gap-2 mb-6">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {events.length === 0 ? 'Start' : 'Play'}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        )}

        <button
          onClick={handleStep}
          disabled={isRunning || isComplete}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent disabled:opacity-50"
        >
          <SkipForward className="w-4 h-4" />
          Step
        </button>

        <button
          onClick={handleReset}
          disabled={isRunning || events.length === 0}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Progress */}
      {events.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{currentEventIndex + 1} / {events.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentEventIndex + 1) / events.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Event Log */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {events.length === 0 && !isRunning && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Click "Start" to run the simulation
          </p>
        )}

        {isRunning && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Running simulation...
          </p>
        )}

        {events.map((event, index) => (
          <div
            key={index}
            className={`
              p-3 rounded-lg border-l-4 transition-all
              ${index === currentEventIndex
                ? 'bg-primary/10 border-l-primary'
                : index < currentEventIndex
                  ? 'bg-muted/50 border-l-muted opacity-60'
                  : 'bg-muted/20 border-l-transparent opacity-30'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{getEventIcon(event)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{getEventDescription(event)}</p>
                {event.type === 'node_error' && (
                  <p className="text-xs text-destructive mt-1">{event.error}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{index + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
