'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { colors } from '@/lib/ui/theme'

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  direction?: 'horizontal' | 'vertical'
  initialSplit?: number  // 0–100, percentage for first pane
  minSize?: number       // minimum px for each pane
}

export default function SplitPane({
  left,
  right,
  direction = 'horizontal',
  initialSplit = 50,
  minSize = 120,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [split, setSplit] = useState(initialSplit)
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }, [direction])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      let pct: number
      if (direction === 'horizontal') {
        const x = e.clientX - rect.left
        pct = (x / rect.width) * 100
        const minPct = (minSize / rect.width) * 100
        pct = Math.max(minPct, Math.min(100 - minPct, pct))
      } else {
        const y = e.clientY - rect.top
        pct = (y / rect.height) * 100
        const minPct = (minSize / rect.height) * 100
        pct = Math.max(minPct, Math.min(100 - minPct, pct))
      }
      setSplit(pct)
    }
    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [direction, minSize])

  const isHoriz = direction === 'horizontal'
  const dividerStyle: React.CSSProperties = isHoriz
    ? { width: 5, cursor: 'col-resize', flexShrink: 0 }
    : { height: 5, cursor: 'row-resize', flexShrink: 0 }

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexDirection: isHoriz ? 'row' : 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
    >
      <div style={{ [isHoriz ? 'width' : 'height']: `${split}%`, minWidth: isHoriz ? minSize : undefined, minHeight: isHoriz ? undefined : minSize, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {left}
      </div>

      {/* Draggable divider */}
      <div
        style={dividerStyle}
        onMouseDown={onMouseDown}
      >
        <div style={{
          width: isHoriz ? 1 : '100%',
          height: isHoriz ? '100%' : 1,
          margin: isHoriz ? '0 2px' : '2px 0',
          backgroundColor: colors.border,
          transition: 'background-color 0.15s',
        }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.border)}
        />
      </div>

      <div style={{ flex: 1, minWidth: isHoriz ? minSize : undefined, minHeight: isHoriz ? undefined : minSize, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {right}
      </div>
    </div>
  )
}
