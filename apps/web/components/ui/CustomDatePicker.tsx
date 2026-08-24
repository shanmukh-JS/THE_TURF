'use client'

import React, { useState, useRef, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

interface CustomDatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
  minDate?: string // YYYY-MM-DD
  className?: string
}

export function CustomDatePicker({
  value,
  onChange,
  minDate,
  className = '',
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Current today reference
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const effectiveMinStr = minDate || todayStr

  // Selected date or today
  const parsedValue = value ? new Date(value + 'T00:00:00') : today
  const [viewYear, setViewYear] = useState(parsedValue.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsedValue.getMonth()) // 0-indexed

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const prevMonth = () => {
    // Prevent navigating to months entirely in the past
    const currentMonthFirst = new Date(viewYear, viewMonth, 1)
    const todayFirst = new Date(today.getFullYear(), today.getMonth(), 1)
    if (currentMonthFirst <= todayFirst) return

    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  // Days in month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const paddingArray = Array.from({ length: firstDayOfWeek }, (_, i) => i)

  const isPrevDisabled = () => {
    const currentMonthFirst = new Date(viewYear, viewMonth, 1)
    const todayFirst = new Date(today.getFullYear(), today.getMonth(), 1)
    return currentMonthFirst <= todayFirst
  }

  const handleSelectDay = (day: number) => {
    const formattedDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (formattedDate < effectiveMinStr) return
    onChange(formattedDate)
    setIsOpen(false)
  }

  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select Date'
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    const [y, m, d] = parts
    return `${d}-${m}-${y}`
  }

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      {/* Clickable Display Input */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-black/40 hover:bg-black/60 rounded-lg px-4 py-3 border border-white/10 text-white transition-all text-left group"
      >
        <span className="font-semibold text-sm tracking-wide text-white">
          {formatDisplay(value || todayStr)}
        </span>
        <CalendarDays className="text-primary w-5 h-5 ml-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
      </button>

      {/* Custom Floating Calendar Popover */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 w-72 bg-[#0d140d] border border-white/15 rounded-2xl p-4 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/8">
            <h4 className="text-sm font-bold text-white tracking-wide">
              {monthNames[viewMonth]} {viewYear}
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                disabled={isPrevDisabled()}
                className={`p-1.5 rounded-lg border border-white/10 text-gray-300 transition-colors ${
                  isPrevDisabled()
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-white/10 hover:text-white'
                }`}
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {paddingArray.map((p) => (
              <div key={`pad-${p}`} className="h-8" />
            ))}

            {daysArray.map((day) => {
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isPast = dateStr < effectiveMinStr
              const isSelected = value === dateStr
              const isToday = dateStr === todayStr

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-green-500 text-black font-extrabold shadow-md shadow-green-500/30'
                      : isPast
                        ? 'text-gray-600 opacity-30 cursor-not-allowed line-through'
                        : isToday
                          ? 'border border-green-500/60 text-green-400 hover:bg-green-500/20'
                          : 'text-gray-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/8 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr)
                setViewYear(today.getFullYear())
                setViewMonth(today.getMonth())
                setIsOpen(false)
              }}
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)
                const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
                onChange(tomorrowStr)
                setViewYear(tomorrow.getFullYear())
                setViewMonth(tomorrow.getMonth())
                setIsOpen(false)
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Tomorrow
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
