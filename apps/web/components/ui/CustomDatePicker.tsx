'use client'

import React, { useState, useRef, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { getLocalDateString } from '@/lib/utils'

interface CustomDatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
  minDate?: string // YYYY-MM-DD
  className?: string
  position?: 'top' | 'bottom'
}

export function CustomDatePicker({
  value,
  onChange,
  minDate,
  className = '',
  position = 'top',
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Exact local today reference
  const todayStr = getLocalDateString()
  const effectiveMinStr = minDate || todayStr

  // Selected date or today
  const parsedValue = value ? new Date(value + 'T00:00:00') : new Date()
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

  const todayObj = new Date()
  const prevMonth = () => {
    const currentMonthFirst = new Date(viewYear, viewMonth, 1)
    const todayFirst = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1)
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
    const todayFirst = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1)
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
        className="flex items-center justify-between w-full bg-black/50 hover:bg-black/70 rounded-lg px-4 py-3 border border-white/15 text-white transition-all text-left group focus:border-green-500"
      >
        <span className="font-semibold text-sm tracking-wide text-white">
          {formatDisplay(value || todayStr)}
        </span>
        <CalendarDays className="text-primary w-5 h-5 ml-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
      </button>

      {/* Custom Floating Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            position === 'top' ? 'bottom-full mb-3' : 'top-full mt-2'
          } left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 z-[100] w-80 bg-[#090e09] border border-green-500/30 rounded-2xl p-5 shadow-2xl shadow-black backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <h4 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-1.5">
              <span className="text-green-400">{monthNames[viewMonth]}</span> {viewYear}
            </h4>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                disabled={isPrevDisabled()}
                className={`p-1.5 rounded-lg border border-white/10 text-gray-300 transition-colors ${
                  isPrevDisabled()
                    ? 'opacity-20 cursor-not-allowed'
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
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {paddingArray.map((p) => (
              <div key={`pad-${p}`} className="h-9" />
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
                  className={`h-9 w-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-green-500 text-black font-black shadow-lg shadow-green-500/40 scale-105'
                      : isPast
                        ? 'text-gray-600 opacity-20 cursor-not-allowed line-through'
                        : isToday
                          ? 'border-2 border-green-500 text-green-400 hover:bg-green-500/20 font-extrabold'
                          : 'text-white hover:bg-white/15 hover:text-green-300'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr)
                const tObj = new Date()
                setViewYear(tObj.getFullYear())
                setViewMonth(tObj.getMonth())
                setIsOpen(false)
              }}
              className="px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                const tomorrowStr = getLocalDateString(tomorrow)
                onChange(tomorrowStr)
                setViewYear(tomorrow.getFullYear())
                setViewMonth(tomorrow.getMonth())
                setIsOpen(false)
              }}
              className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10 transition-all"
            >
              Tomorrow
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
