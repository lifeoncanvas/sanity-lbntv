import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useClient } from 'sanity'
import * as XLSX from 'xlsx'

export function ExcelIcon() {
  return (
    <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="8" y1="13" x2="16" y2="13"></line>
      <line x1="8" y1="17" x2="16" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  )
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
type DayOfWeek = typeof DAYS[number]

const VALID_CATEGORIES = [
  'WORSHIP',
  'TEACHING',
  'HEALING',
  'TEENS & YOUTHS',
  'KIDDIES',
  'ROR',
  'TALK SHOWS',
  'PRAYER',
  'SPECIALS',
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  WORSHIP: { bg: 'rgba(99, 102, 241, 0.18)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.4)' },
  TEACHING: { bg: 'rgba(56, 189, 248, 0.18)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.4)' },
  HEALING: { bg: 'rgba(52, 211, 153, 0.18)', text: '#6ee7b7', border: 'rgba(52, 211, 153, 0.4)' },
  'TEENS & YOUTHS': { bg: 'rgba(251, 191, 36, 0.18)', text: '#fde047', border: 'rgba(251, 191, 36, 0.4)' },
  KIDDIES: { bg: 'rgba(244, 114, 182, 0.18)', text: '#f9a8d4', border: 'rgba(244, 114, 182, 0.4)' },
  ROR: { bg: 'rgba(168, 85, 247, 0.18)', text: '#d8b4fe', border: 'rgba(168, 85, 247, 0.4)' },
  'TALK SHOWS': { bg: 'rgba(148, 163, 184, 0.18)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.4)' },
  PRAYER: { bg: 'rgba(244, 63, 94, 0.18)', text: '#fda4af', border: 'rgba(244, 63, 94, 0.4)' },
  SPECIALS: { bg: 'rgba(14, 165, 233, 0.18)', text: '#bae6fd', border: 'rgba(14, 165, 233, 0.4)' },
}

interface SlotItem {
  id: string
  day: DayOfWeek
  order: number
  time: string
  title: string
  category: string
  duration: string
  host: string
  live: boolean
  startMinutes: number
  programmeRef?: string
  existingImage?: any
  warnings: string[]
}

interface GapAlert {
  day: DayOfWeek
  type: 'gap' | 'overlap' | 'typo' | 'missing'
  message: string
  timeA?: string
  timeB?: string
  slotIndex?: number
  slotId?: string
  suggestedTime?: string
}

function parseTime(raw: any): { time: string; startMinutes: number; valid: boolean } {
  if (raw == null || raw === '') {
    return { time: '06:00 AM', startMinutes: 360, valid: false }
  }

  if (typeof raw === 'number' && raw >= 0 && raw <= 1.0001) {
    const totalMinutes = Math.round(raw * 24 * 60)
    const hours24 = Math.floor(totalMinutes / 60) % 24
    const minutes = totalMinutes % 60
    const isPm = hours24 >= 12
    const displayHours = hours24 % 12 === 0 ? 12 : hours24 % 12
    const timeStr = `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`
    return { time: timeStr, startMinutes: hours24 * 60 + minutes, valid: true }
  }

  const s = String(raw).trim().toUpperCase()
  const m = s.match(/(\d{1,2})[:.](\d{2})(?::\d{2})?:?\s*(AM|PM)?/)
  if (m) {
    let hours = parseInt(m[1], 10)
    const minutes = parseInt(m[2], 10)
    const ampm = m[3] ? m[3].toUpperCase() : null

    if (ampm) {
      const isPm = ampm === 'PM'
      const normHours = hours === 12 ? 0 : hours
      const startMinutes = (normHours + (isPm ? 12 : 0)) * 60 + minutes
      const displayHours = hours % 12 === 0 ? 12 : hours % 12
      const timeStr = `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`
      return { time: timeStr, startMinutes, valid: true }
    } else {
      const isPm = hours >= 12
      const startMinutes = hours * 60 + minutes
      const displayHours = hours % 12 === 0 ? 12 : hours % 12
      const timeStr = `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`
      return { time: timeStr, startMinutes, valid: true }
    }
  }

  return { time: s, startMinutes: 0, valid: false }
}

function extractFromBanner(text: string) {
  if (!text) return null
  // Match parenthesized time ranges with optional whitespace e.g. ( 03:00PM - 04:00PM ) or ( 08:30 - 10:30PM )
  const m = text.match(/\(\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*\)/i)
  if (m) {
    let startRaw = m[1].trim()
    let endRaw = m[2].trim()
    const endAmPm = endRaw.match(/(AM|PM)/i)
    const startAmPm = startRaw.match(/(AM|PM)/i)

    // If start time does not specify AM/PM, borrow from end time
    if (!startAmPm && endAmPm) {
      startRaw += ' ' + endAmPm[1]
    }
    if (!startRaw.includes(':')) startRaw = startRaw.replace(/(AM|PM)/i, ':00 $1')
    if (!endRaw.includes(':')) endRaw = endRaw.replace(/(AM|PM)/i, ':00 $1')

    // Handle overnight broadcast banner typo e.g. 10:30PM - 12:30PM (should be 12:30AM)
    if (startRaw.includes('10:30 PM') && endRaw.includes('12:30 PM')) {
      endRaw = endRaw.replace('12:30 PM', '12:30 AM')
    }

    const parsedStart = parseTime(startRaw)
    const parsedEnd = parseTime(endRaw)
    const cleanTitle = text.replace(/\([^)]+\)/g, '').replace(/\{[^}]+\}/g, '').trim()

    let durationMinutes = 60
    if (parsedStart.valid && parsedEnd.valid) {
      let diff = parsedEnd.startMinutes - parsedStart.startMinutes
      if (diff < 0) diff += 1440
      durationMinutes = diff
    }

    return {
      title: cleanTitle || text.trim(),
      time: parsedStart.valid ? parsedStart.time : startRaw,
      startMinutes: parsedStart.startMinutes,
      duration: `${durationMinutes}m`,
      live: text.toUpperCase().includes('LIVE'),
    }
  }
  return null
}

function normalizeCategory(raw: any): string {
  if (!raw) return 'SPECIALS'
  const s = String(raw).trim().toUpperCase()
  if (s.includes('WORSHIP') || s.includes('PRAISE') || s.includes('MUSIC')) return 'WORSHIP'
  if (s.includes('TEACHING')) return 'TEACHING'
  if (s.includes('HEALING') || s.includes('HEALTH') || s.includes('WHOLENESS')) return 'HEALING'
  if (s.includes('TEEN') || s.includes('YOUTH')) return 'TEENS & YOUTHS'
  if (s.includes('KID') || s.includes('CHILD')) return 'KIDDIES'
  if (s.includes('ROR')) return 'ROR'
  if (s.includes('PRAY')) return 'PRAYER'
  if (s.includes('TALK') || s.includes('FINANCE') || s.includes('NEWS') || s.includes('CURRENT') || s.includes('FRUITFUL')) return 'TALK SHOWS'
  return 'SPECIALS'
}

function normalizeDay(raw: any): DayOfWeek | null {
  if (!raw) return null
  const s = String(raw).trim().toLowerCase()
  if (s.startsWith('mon')) return 'Monday'
  if (s.startsWith('tue')) return 'Tuesday'
  if (s.startsWith('wed')) return 'Wednesday'
  if (s.startsWith('thu')) return 'Thursday'
  if (s.startsWith('fri')) return 'Friday'
  if (s.startsWith('sat')) return 'Saturday'
  if (s.startsWith('sun')) return 'Sunday'
  return null
}

function formatMinutesToTime(totalMins: number): string {
  const hours24 = Math.floor(totalMins / 60) % 24
  const minutes = totalMins % 60
  const isPm = hours24 >= 12
  const displayHours = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`
}

function auditDaySchedule(slots: SlotItem[]): GapAlert[] {
  const alerts: GapAlert[] = []
  if (slots.length === 0) return alerts

  for (let i = 0; i < slots.length; i++) {
    const cur = slots[i]
    if (!cur.title) {
      alerts.push({
        day: cur.day,
        type: 'missing',
        message: `Slot #${i + 1} at ${cur.time} is missing a programme title.`,
        slotIndex: i,
        slotId: cur.id,
      })
    }

    if (i < slots.length - 1) {
      const next = slots[i + 1]
      const curDur = parseInt(cur.duration, 10) || 30

      const curStartAdj = cur.startMinutes >= 360 ? cur.startMinutes : cur.startMinutes + 1440
      const nextStartAdj = next.startMinutes >= 360 ? next.startMinutes : next.startMinutes + 1440
      const curEndAdj = curStartAdj + curDur

      const gapMinutes = nextStartAdj - curEndAdj

      if (gapMinutes > 15) {
        alerts.push({
          day: cur.day,
          type: 'gap',
          message: `Gap of ${gapMinutes} minutes between "${cur.title}" (${cur.time}) and "${next.title}" (${next.time}).`,
          timeA: cur.time,
          timeB: next.time,
          slotIndex: i,
          slotId: cur.id,
          suggestedTime: formatMinutesToTime(curEndAdj % 1440),
        })
      } else if (gapMinutes < -5) {
        alerts.push({
          day: cur.day,
          type: 'overlap',
          message: `Overlap: "${next.title}" starts at ${next.time}, but "${cur.title}" runs until ${formatMinutesToTime(curEndAdj % 1440)}.`,
          timeA: cur.time,
          timeB: next.time,
          slotIndex: i,
          slotId: next.id,
        })
      }
    }
  }

  return alerts
}

const STORAGE_PREFIX = 'libn_tv_epg_'

function safeStorageGet<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (raw !== null && raw !== undefined) {
      return JSON.parse(raw) as T
    }
  } catch (e) {
    try {
      const rawSession = window.sessionStorage.getItem(STORAGE_PREFIX + key)
      if (rawSession !== null && rawSession !== undefined) {
        return JSON.parse(rawSession) as T
      }
    } catch {}
  }
  return defaultValue
}

function safeStorageSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch (e) {
    try {
      window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    } catch {}
  }
}

function safeStorageRemove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {}
  try {
    window.sessionStorage.removeItem(STORAGE_PREFIX + key)
  } catch {}
}

function ScheduleExcelImporterInner() {
  const client = useClient({ apiVersion: '2026-02-01' })

  const [activeTab, setActiveTab] = useState<DayOfWeek>(() => {
    const saved = safeStorageGet<string>('active_tab', 'Monday')
    return (DAYS as readonly string[]).includes(saved) ? (saved as DayOfWeek) : 'Monday'
  })
  const [parsedSlots, setParsedSlots] = useState<SlotItem[]>(() => {
    return safeStorageGet<SlotItem[]>('slots', [])
  })
  const [fileName, setFileName] = useState<string>(() => {
    return safeStorageGet<string>('filename', '')
  })
  const [detectedFormat, setDetectedFormat] = useState<string>(() => {
    return safeStorageGet<string>('format', '')
  })
  const [uploadedAt, setUploadedAt] = useState<string>(() => {
    return safeStorageGet<string>('uploaded_at', '')
  })
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionProgress, setActionProgress] = useState<{ step: string; percent: number } | null>(null)
  const [logs, setLogs] = useState<string[]>(() => {
    return safeStorageGet<string[]>('logs', [])
  })

  const [stats, setStats] = useState<{ liveCount: number; draftCount: number; loading: boolean }>({
    liveCount: 0,
    draftCount: 0,
    loading: true,
  })

  const [programmes, setProgrammes] = useState<Array<{ _id: string; title: string; image?: any }>>([])
  const [existingItems, setExistingItems] = useState<Array<{ _id: string; title: string; day: string; image?: any; programmeRef?: any }>>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-sync persistent storage whenever state changes
  useEffect(() => {
    if (parsedSlots && parsedSlots.length > 0) {
      safeStorageSet('slots', parsedSlots)
    } else {
      safeStorageRemove('slots')
    }
  }, [parsedSlots])

  useEffect(() => {
    if (fileName) {
      safeStorageSet('filename', fileName)
    } else {
      safeStorageRemove('filename')
    }
  }, [fileName])

  useEffect(() => {
    if (detectedFormat) {
      safeStorageSet('format', detectedFormat)
    } else {
      safeStorageRemove('format')
    }
  }, [detectedFormat])

  useEffect(() => {
    if (uploadedAt) {
      safeStorageSet('uploaded_at', uploadedAt)
    } else {
      safeStorageRemove('uploaded_at')
    }
  }, [uploadedAt])

  useEffect(() => {
    safeStorageSet('active_tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    if (logs && logs.length > 0) {
      safeStorageSet('logs', logs)
    } else {
      safeStorageRemove('logs')
    }
  }, [logs])

  const addLog = (msg: string) => {
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 49),
    ])
  }

  const refreshStats = async () => {
    setStats((prev) => ({ ...prev, loading: true }))
    try {
      const [liveItems, draftItems, progs] = await Promise.all([
        client.fetch<Array<{ _id: string; title: string; day: string; image?: any; programmeRef?: any }>>(
          `*[_type == "scheduleItem" && !(_id in path("drafts.**"))]{ _id, title, day, image, programmeRef }`
        ),
        client.fetch<Array<{ _id: string }>>(
          `*[_type == "scheduleItem" && _id in path("drafts.**")]{ _id }`
        ),
        client.fetch<Array<{ _id: string; title: string; image?: any }>>(
          `*[_type == "programme"]{ _id, title, image }`
        ),
      ])

      setExistingItems(liveItems)
      setProgrammes(progs)
      setStats({
        liveCount: liveItems.length,
        draftCount: draftItems.length,
        loading: false,
      })

      // If slots are already restored from session storage, auto-enrich any unlinked slots with newly fetched images/refs
      setParsedSlots((currentSlots) => {
        if (!currentSlots || currentSlots.length === 0) return currentSlots
        let hasChanges = false
        const enriched = currentSlots.map((slot) => {
          if (slot.existingImage && slot.programmeRef) return slot
          const cleanTitle = slot.title.trim().toLowerCase()
          let newImg = slot.existingImage
          let newRef = slot.programmeRef

          const existing = liveItems.find(
            (it) => it.title.trim().toLowerCase() === cleanTitle && it.image
          )
          if (!newImg && existing?.image) {
            newImg = existing.image
          }
          if (!newRef && existing?.programmeRef?._ref) {
            newRef = existing.programmeRef._ref
          }

          if (!newImg || !newRef) {
            const prog = progs.find((p) => {
              const pt = p.title.trim().toLowerCase()
              return cleanTitle.includes(pt) || pt.includes(cleanTitle)
            })
            if (prog) {
              if (!newImg && prog.image) newImg = prog.image
              if (!newRef) newRef = prog._id.replace(/^drafts\./, '')
            }
          }

          if (newImg !== slot.existingImage || newRef !== slot.programmeRef) {
            hasChanges = true
            return {
              ...slot,
              existingImage: newImg,
              programmeRef: newRef,
            }
          }
          return slot
        })
        return hasChanges ? enriched : currentSlots
      })
    } catch (err: any) {
      addLog(`Error fetching current status: ${err.message}`)
      setStats((prev) => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    refreshStats()
  }, [])

  const findImageAndRef = (title: string) => {
    const cleanTitle = title.trim().toLowerCase()
    const existing = existingItems.find(
      (it) => it.title.trim().toLowerCase() === cleanTitle && it.image
    )
    if (existing?.image) {
      return { existingImage: existing.image, programmeRef: existing.programmeRef?._ref }
    }

    const prog = programmes.find((p) => {
      const pt = p.title.trim().toLowerCase()
      return cleanTitle.includes(pt) || pt.includes(cleanTitle)
    })

    if (prog) {
      return {
        existingImage: prog.image,
        programmeRef: prog._id.replace(/^drafts\./, ''),
      }
    }

    return { existingImage: undefined, programmeRef: undefined }
  }

  const handleWorkbook = (wb: XLSX.WorkBook, name: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setFileName(name)
    setUploadedAt(timeStr)
    addLog(`Analyzing file "${name}"...`)

    let extractedSlots: SlotItem[] = []

    const dayTabs = wb.SheetNames.filter((s) => normalizeDay(s) !== null)
    if (dayTabs.length >= 2) {
      setDetectedFormat(`Multi-Tab Workbook (${dayTabs.length} Day sheets)`)
      addLog(`Detected Multi-Tab sheet format with tabs: ${dayTabs.join(', ')}`)

      for (const tabName of dayTabs) {
        const day = normalizeDay(tabName)!
        const ws = wb.Sheets[tabName]
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const title = String(row.Title || row.Show || row.Programme || row['PROGRAM NAME'] || '').trim()
          if (!title) continue
          const rawTime = row.Time || row.Slot || row['Air Time'] || row['TIME']
          const { time, startMinutes } = parseTime(rawTime)
          const category = normalizeCategory(row.Category || row.Genre || row['GENRE'])
          const duration = String(row.Duration || row.Length || '30m').trim()
          const host = String(row.Host || row.Presenter || '').trim()
          const live = Boolean(row.Live || String(row.Live).toLowerCase() === 'yes')

          const { existingImage, programmeRef } = findImageAndRef(title)

          extractedSlots.push({
            id: `${day}-${i}`,
            day,
            order: i,
            time,
            title,
            category,
            duration,
            host,
            live,
            startMinutes,
            programmeRef,
            existingImage,
            warnings: [],
          })
        }
      }
    } else {
      const firstSheet = wb.Sheets[wb.SheetNames[0]]
      const rawRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

      const progHeaderCols: Array<{ r: number; c: number }> = []
      for (let r = 0; r < Math.min(60, rawRows.length); r++) {
        const row = rawRows[r]
        if (!row) continue
        for (let c = 0; c < row.length; c++) {
          const val = row[c]
          if (typeof val === 'string' && val.trim().toUpperCase() === 'PROGRAM NAME') {
            progHeaderCols.push({ r, c })
          }
        }
      }

      if (progHeaderCols.length >= 2) {
        setDetectedFormat(`Loveworld Multi-Column Broadcast Grid (${progHeaderCols.length} day columns found)`)
        addLog(`Detected Loveworld visual grid layout with ${progHeaderCols.length} day blocks.`)

        const sections: Array<{
          day: DayOfWeek
          headerRow: number
          titleCol: number
          genreCol: number
          timeCol: number
          snCol: number
        }> = []

        for (const hdr of progHeaderCols) {
          let foundDay: DayOfWeek | null = null
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -3; dc <= 3; dc++) {
              const checkR = hdr.r + dr
              const checkC = hdr.c + dc
              if (rawRows[checkR] && typeof rawRows[checkR][checkC] === 'string') {
                const cell = rawRows[checkR][checkC].trim().toUpperCase()
                for (const d of DAYS) {
                  if (cell === d.toUpperCase() || cell.startsWith(d.toUpperCase() + ' ') || cell.endsWith(' ' + d.toUpperCase())) {
                    foundDay = d
                    break
                  }
                }
              }
              if (foundDay) break
            }
            if (foundDay) break
          }

          if (foundDay) {
            sections.push({
              day: foundDay,
              headerRow: hdr.r,
              titleCol: hdr.c,
              genreCol: hdr.c + 1,
              timeCol: hdr.c + 2,
              snCol: hdr.c - 1,
            })
          }
        }

        for (const sec of sections) {
          const nextSecInCol = sections.find(
            (s) => Math.abs(s.titleCol - sec.titleCol) <= 2 && s.headerRow > sec.headerRow
          )
          const maxRow = nextSecInCol ? nextSecInCol.headerRow - 1 : rawRows.length - 1

          let r = sec.headerRow + 1
          const daySlots: SlotItem[] = []
          let passed10PM = false

          while (r <= maxRow) {
            const row = rawRows[r]
            if (!row) {
              r++
              continue
            }

            const snVal = row[sec.snCol]
            const titleVal = row[sec.titleCol]
            const genreVal = row[sec.genreCol]
            const timeVal = row[sec.timeCol]

            let title = titleVal ? String(titleVal).trim() : ''
            let time = timeVal ? String(timeVal).trim() : ''
            let genre = genreVal ? String(genreVal).trim() : ''
            let isLive = false
            let startMinutes = 360
            let duration = '30m'

            if (!title && typeof snVal === 'string' && (snVal.includes('(') || snVal.toUpperCase().includes('LIVE') || snVal.toUpperCase().includes('REBROADCAST'))) {
              title = snVal.trim()
            }

            if (!title && !time) {
              r++
              continue
            }

            const banner = extractFromBanner(title)
            if (banner) {
              title = banner.title
              time = banner.time
              startMinutes = banner.startMinutes
              duration = banner.duration
              isLive = banner.live
            } else {
              const parsedT = parseTime(time)
              time = parsedT.time
              startMinutes = parsedT.startMinutes
            }

            // Sheet typo auto-correction for known Loveworld India grid rows:
            // 1. Morning slot typo: Row 12 (ROR Travels) placed between 11:00 AM and 11:30 AM was marked as 11:00 PM
            if (daySlots.length === 3 && time === '11:00 PM') {
              time = '11:00 AM'
              startMinutes = 660
            }

            // 2. Post-midnight slot typo: Shows occurring late in the day (after 10:00 PM) marked as 01:00 PM / 02:00 PM
            if (passed10PM && (time === '01:00 PM' || time === '02:00 PM')) {
              time = time.replace('PM', 'AM')
              startMinutes = parseTime(time).startMinutes
            }

            if (startMinutes >= 1320) {
              passed10PM = true
            }

            if (title.toUpperCase().includes('{LIVE}') || title.toUpperCase().startsWith('{LIVE}')) {
              isLive = true
              title = title.replace(/\{LIVE\}/gi, '').replace(/^-\s*/, '').trim()
            }

            const { existingImage, programmeRef } = findImageAndRef(title)

            daySlots.push({
              id: `${sec.day}-${daySlots.length}`,
              day: sec.day,
              order: daySlots.length,
              title,
              time,
              category: normalizeCategory(genre),
              duration,
              host: '',
              live: isLive,
              startMinutes,
              programmeRef,
              existingImage,
              warnings: [],
            })

            r++
          }

          // Preserve exact Excel row order and calculate durations between consecutive shows
          for (let i = 0; i < daySlots.length; i++) {
            const cur = daySlots[i]
            cur.order = i
            if (i < daySlots.length - 1) {
              const next = daySlots[i + 1]
              const curAdj = cur.startMinutes >= 360 ? cur.startMinutes : cur.startMinutes + 1440
              const nextAdj = next.startMinutes >= 360 ? next.startMinutes : next.startMinutes + 1440
              const diff = nextAdj - curAdj
              cur.duration = `${diff}m`
            } else {
              cur.duration = '30m'
            }
            extractedSlots.push(cur)
          }
        }
      } else {
        setDetectedFormat('Standard Single Table with Day Column')
        const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
        const dayCounters: Record<string, number> = {}

        for (const row of rows) {
          const rawDay = row.Day || row.Weekday || row['Day of Week'] || row.DAY
          const day = normalizeDay(rawDay)
          const title = String(row.Title || row.Show || row.Programme || row['PROGRAM NAME'] || '').trim()

          if (!title || !day) continue
          if (!dayCounters[day]) dayCounters[day] = 0

          const rawTime = row.Time || row.Slot || row['Air Time'] || row['TIME']
          const { time, startMinutes } = parseTime(rawTime)
          const category = normalizeCategory(row.Category || row.Genre || row['GENRE'])
          const duration = String(row.Duration || row.Length || '30m').trim()
          const host = String(row.Host || row.Presenter || '').trim()
          const live = Boolean(row.Live || String(row.Live).toLowerCase() === 'yes')

          const { existingImage, programmeRef } = findImageAndRef(title)

          extractedSlots.push({
            id: `${day}-${dayCounters[day]}`,
            day,
            order: dayCounters[day]++,
            time,
            title,
            category,
            duration,
            host,
            live,
            startMinutes,
            programmeRef,
            existingImage,
            warnings: [],
          })
        }
      }
    }

    setParsedSlots(extractedSlots)
    addLog(`Successfully extracted ${extractedSlots.length} schedule slots across all 7 days!`)
  }

  const onFileChange = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        handleWorkbook(wb, file.name)
      } catch (err: any) {
        addLog(`Error parsing file: ${err.message}`)
        alert(`Error parsing Excel file: ${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const updateSlot = (slotId: string, field: keyof SlotItem, value: any) => {
    setParsedSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s
        const updated = { ...s, [field]: value }
        if (field === 'time') {
          const pt = parseTime(value)
          updated.time = pt.time
          updated.startMinutes = pt.startMinutes
        }
        return updated
      })
    )
  }

  // Calculate audit for all 7 days
  const weekAlertsByDay = useMemo(() => {
    const result: Record<DayOfWeek, GapAlert[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    }
    for (const d of DAYS) {
      const daySlots = parsedSlots.filter((s) => s.day === d)
      result[d] = auditDaySchedule(daySlots)
    }
    return result
  }, [parsedSlots])

  // Total issues across the entire weekly schedule
  const totalIssuesCount = useMemo(() => {
    let count = 0
    for (const d of DAYS) {
      count += weekAlertsByDay[d].length
    }
    return count
  }, [weekAlertsByDay])

  const activeDaySlots = useMemo(() => {
    return parsedSlots.filter((s) => s.day === activeTab)
  }, [parsedSlots, activeTab])

  const activeDayAlerts = useMemo(() => {
    return weekAlertsByDay[activeTab] || []
  }, [weekAlertsByDay, activeTab])

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of DAYS) counts[d] = 0
    for (const s of parsedSlots) counts[s.day] = (counts[s.day] || 0) + 1
    return counts
  }, [parsedSlots])

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const sampleSlots = [
      { Time: '06:00 AM', Title: 'Morning Prayer with Pastor Chris', Category: 'PRAYER', Duration: '60m', Host: 'Pastor Chris', Live: 'No' },
      { Time: '07:00 AM', Title: 'ROR Dailies', Category: 'ROR', Duration: '30m', Host: 'LBN Team', Live: 'No' },
      { Time: '07:30 AM', Title: 'Atmosphere for Miracles', Category: 'HEALING', Duration: '30m', Host: 'Healing School', Live: 'No' },
      { Time: '08:00 AM', Title: 'Your LoveWorld Praise & Worship', Category: 'WORSHIP', Duration: '60m', Host: 'LBN Studio', Live: 'No' },
      { Time: '09:00 AM', Title: 'Kids Kingdom', Category: 'KIDDIES', Duration: '60m', Host: 'Pastor Joy', Live: 'No' },
      { Time: '10:00 AM', Title: 'TeeVo Fire Live', Category: 'TEENS & YOUTHS', Duration: '60m', Host: 'Youth Ministry', Live: 'Yes' },
      { Time: '11:00 AM', Title: 'Pastor Chris Teaching', Category: 'TEACHING', Duration: '90m', Host: 'Pastor Chris', Live: 'No' },
      { Time: '12:30 PM', Title: 'Midday News & Current Affairs', Category: 'TALK SHOWS', Duration: '30m', Host: 'Vijay Bansode', Live: 'No' },
      { Time: '01:00 PM', Title: 'Healing Streams Live Broadcast', Category: 'HEALING', Duration: '120m', Host: 'Healing School', Live: 'Yes' },
      { Time: '03:00 PM', Title: 'Sound of Joy', Category: 'WORSHIP', Duration: '60m', Host: 'Voice of Praise', Live: 'No' },
      { Time: '04:00 PM', Title: 'Rhapsody in Multiple Languages', Category: 'ROR', Duration: '60m', Host: 'Global Translators', Live: 'No' },
      { Time: '05:00 PM', Title: 'Money Matters', Category: 'TALK SHOWS', Duration: '60m', Host: 'Deacon Raymond', Live: 'No' },
      { Time: '06:00 PM', Title: 'Evening Worship & Praise', Category: 'WORSHIP', Duration: '60m', Host: 'LBN Choir', Live: 'No' },
      { Time: '07:00 PM', Title: 'Healing to the Nations', Category: 'HEALING', Duration: '60m', Host: 'Pastor Chris', Live: 'No' },
      { Time: '08:00 PM', Title: 'Global Communion Service', Category: 'SPECIALS', Duration: '120m', Host: 'Pastor Chris', Live: 'Yes' },
      { Time: '10:00 PM', Title: 'Night of Blessings', Category: 'PRAYER', Duration: '120m', Host: 'Pastoral Team', Live: 'No' },
    ]

    for (const day of DAYS) {
      const ws = XLSX.utils.json_to_sheet(sampleSlots)
      ws['!cols'] = [
        { wch: 12 },
        { wch: 38 },
        { wch: 18 },
        { wch: 12 },
        { wch: 22 },
        { wch: 10 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, day)
    }

    XLSX.writeFile(wb, 'LIBN_TV_Schedule_Template.xlsx')
    addLog('Downloaded template "LIBN_TV_Schedule_Template.xlsx"')
  }

  const handleImportToDrafts = async () => {
    if (parsedSlots.length === 0) return
    if (totalIssuesCount > 0) {
      alert(`Cannot stage to Drafts: There are ${totalIssuesCount} unresolved gap or overlap notice(s) across your weekly schedule.\n\nPlease fix all highlighted schedule gaps first so your EPG broadcast guide is 100% gap-free.`)
      return
    }

    setIsProcessing(true)
    addLog(`Starting DRAFTS stage import for ${parsedSlots.length} schedule items...`)

    try {
      const groupedByDay: Record<string, SlotItem[]> = {}
      for (const slot of parsedSlots) {
        if (!groupedByDay[slot.day]) groupedByDay[slot.day] = []
        groupedByDay[slot.day].push(slot)
      }

      const totalItems = parsedSlots.length
      let committed = 0

      for (const day of Object.keys(groupedByDay)) {
        const daySlots = groupedByDay[day]
        const transaction = client.transaction()

        for (let i = 0; i < daySlots.length; i++) {
          const slot = daySlots[i]
          const docId = `drafts.scheduleItem-${day.toLowerCase()}-${String(i).padStart(2, '0')}`

          const doc: any = {
            _id: docId,
            _type: 'scheduleItem',
            title: slot.title,
            day: slot.day,
            time: slot.time,
            order: i,
            startMinutes: slot.startMinutes,
            category: slot.category,
            duration: slot.duration,
            host: slot.host || '',
            live: Boolean(slot.live),
          }

          if (slot.existingImage) {
            doc.image = slot.existingImage
          }

          if (slot.programmeRef) {
            doc.programmeRef = {
              _type: 'reference',
              _ref: slot.programmeRef,
            }
          }

          transaction.createOrReplace(doc)
          committed++
        }

        await transaction.commit()
        setActionProgress({
          step: `Saved ${day} drafts...`,
          percent: Math.round((committed / totalItems) * 100),
        })
        addLog(`Saved ${daySlots.length} drafts for ${day}`)
      }

      addLog(`SUCCESS: All ${committed} items staged into Sanity DRAFTS!`)
      alert(
        `SUCCESS! All ${committed} schedule items have been imported into Sanity as DRAFTS.\n\n` +
        `• Your LIVE website is completely unchanged.\n` +
        `• Review the yellow [Draft] items in the Studio Desk list.\n` +
        `• When you are ready, click "2. Publish All Live" here to update the website.`
      )
      await refreshStats()
    } catch (err: any) {
      addLog(`Drafts Import Error: ${err.message}`)
      alert(`Import failed: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setActionProgress(null)
    }
  }

  const handlePublishAllToLive = async () => {
    if (parsedSlots.length === 0) return
    const confirmed = window.confirm(
      `Are you sure you want to PUBLISH all ${parsedSlots.length} schedule slots LIVE to the website?\n\n` +
      `This will immediately update the live EPG schedule on LIBN TV.`
    )
    if (!confirmed) return

    setIsProcessing(true)
    addLog(`Publishing ${parsedSlots.length} items directly to LIVE...`)

    try {
      const groupedByDay: Record<string, SlotItem[]> = {}
      for (const slot of parsedSlots) {
        if (!groupedByDay[slot.day]) groupedByDay[slot.day] = []
        groupedByDay[slot.day].push(slot)
      }

      const totalItems = parsedSlots.length
      let committed = 0

      for (const day of Object.keys(groupedByDay)) {
        const daySlots = groupedByDay[day]
        const transaction = client.transaction()

        for (let i = 0; i < daySlots.length; i++) {
          const slot = daySlots[i]
          const liveDocId = `scheduleItem-${day.toLowerCase()}-${String(i).padStart(2, '0')}`
          const draftDocId = `drafts.${liveDocId}`

          const doc: any = {
            _id: liveDocId,
            _type: 'scheduleItem',
            title: slot.title,
            day: slot.day,
            time: slot.time,
            order: i,
            startMinutes: slot.startMinutes,
            category: slot.category,
            duration: slot.duration,
            host: slot.host || '',
            live: Boolean(slot.live),
          }

          if (slot.existingImage) {
            doc.image = slot.existingImage
          }

          if (slot.programmeRef) {
            doc.programmeRef = {
              _type: 'reference',
              _ref: slot.programmeRef,
            }
          }

          transaction.createOrReplace(doc)
          transaction.delete(draftDocId)
          committed++
        }

        await transaction.commit()
        setActionProgress({
          step: `Published ${day} live...`,
          percent: Math.round((committed / totalItems) * 100),
        })
        addLog(`Published ${daySlots.length} items live for ${day}`)
      }

      addLog(`SUCCESS: All ${committed} items are now LIVE!`)
      alert(`Success! All ${committed} schedule items have been PUBLISHED LIVE. The website schedule has been updated!`)
      await refreshStats()
    } catch (err: any) {
      addLog(`Publish Error: ${err.message}`)
      alert(`Publish failed: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setActionProgress(null)
    }
  }

  const handleDiscardDrafts = async () => {
    if (stats.draftCount === 0) {
      alert('No pending draft schedule items to discard.')
      return
    }
    const confirmed = window.confirm(
      `Are you sure you want to discard all ${stats.draftCount} draft schedule items? Your live schedule will NOT be touched.`
    )
    if (!confirmed) return

    setIsProcessing(true)
    addLog(`Discarding ${stats.draftCount} drafts...`)
    try {
      const drafts = await client.fetch<Array<{ _id: string }>>(
        `*[_type == "scheduleItem" && _id in path("drafts.**")]{ _id }`
      )
      const transaction = client.transaction()
      for (const d of drafts) {
        transaction.delete(d._id)
      }
      await transaction.commit()
      addLog(`Successfully discarded ${drafts.length} draft items.`)
      alert(`Discarded ${drafts.length} drafts.`)
      await refreshStats()
    } catch (err: any) {
      addLog(`Error discarding drafts: ${err.message}`)
      alert(`Error: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearUploadedSchedule = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear the uploaded schedule sheet from this session?\n\n' +
      '• Your LIVE and DRAFT schedules in Sanity will remain untouched.\n' +
      '• This will reset the importer so you can upload a new spreadsheet.'
    )
    if (!confirmed) return

    setParsedSlots([])
    setFileName('')
    setDetectedFormat('')
    setUploadedAt('')
    safeStorageRemove('slots')
    safeStorageRemove('filename')
    safeStorageRemove('format')
    safeStorageRemove('uploaded_at')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    addLog('Cleared uploaded schedule spreadsheet from session.')
  }

  return (
    <div style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '24px 20px 80px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#f8fafc',
      backgroundColor: '#0b0f19',
      minHeight: '100vh',
    }}>
      {/* TOP HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1e293b',
        paddingBottom: '20px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
          }}>
            📊
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Loveworld India TV · EPG Schedule Importer
            </h1>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13.5px' }}>
              Upload weekly schedule spreadsheet → Review shows & time gaps → Stage to <strong>Drafts</strong> → Publish Live.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleDownloadTemplate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 15px',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span>📥</span> Download Excel Template
          </button>

          {stats.draftCount > 0 && (
            <button
              onClick={handleDiscardDrafts}
              disabled={isProcessing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
              title="Purge pending draft documents from Sanity Studio"
            >
              <span>🗑️</span> Clear Drafts ({stats.draftCount})
            </button>
          )}

          <button
            onClick={refreshStats}
            style={{
              padding: '9px 14px',
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}>
        <div style={{
          backgroundColor: '#111827',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #1f2937',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live on Website
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {stats.loading ? '...' : `${stats.liveCount} shows`}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            Currently visible on LIBN TV
          </div>
        </div>

        <div style={{
          backgroundColor: stats.draftCount > 0 ? '#1f1a0e' : '#111827',
          padding: '16px 18px',
          borderRadius: '12px',
          border: stats.draftCount > 0 ? '1px solid #78350f' : '1px solid #1f2937',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: stats.draftCount > 0 ? '#fbbf24' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Staged in Drafts
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: stats.draftCount > 0 ? '#f59e0b' : '#6b7280', marginTop: '4px' }}>
            {stats.loading ? '...' : `${stats.draftCount} drafts`}
          </div>
          <div style={{ fontSize: '12px', color: stats.draftCount > 0 ? '#fcd34d' : '#4b5563', marginTop: '2px' }}>
            {stats.draftCount > 0 ? 'Ready for review in Studio' : 'No drafts pending'}
          </div>
        </div>

        <div style={{
          backgroundColor: parsedSlots.length > 0 ? (totalIssuesCount === 0 ? '#06281e' : '#271906') : '#111827',
          padding: '16px 18px',
          borderRadius: '12px',
          border: parsedSlots.length > 0 ? (totalIssuesCount === 0 ? '1px solid #065f46' : '1px solid #92400e') : '1px solid #1f2937',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: totalIssuesCount === 0 ? '#34d399' : '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Schedule Health Status
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: totalIssuesCount === 0 ? '#34d399' : '#f59e0b', marginTop: '4px' }}>
            {parsedSlots.length === 0 ? 'Awaiting Upload' : totalIssuesCount === 0 ? '100% Clean' : `${totalIssuesCount} Notice(s)`}
          </div>
          <div style={{ fontSize: '12px', color: totalIssuesCount === 0 ? '#6ee7b7' : '#fde047', marginTop: '2px' }}>
            {parsedSlots.length === 0 ? 'Drop Excel sheet below' : totalIssuesCount === 0 ? 'All 7 days gap-free' : 'Must fix before staging'}
          </div>
        </div>

        <div style={{
          backgroundColor: '#0f172a',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #1e293b',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Known Programmes
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {programmes.length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Auto-linked with images
          </div>
        </div>
      </div>

      {/* DROPZONE / LOADED FILE CARD */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileChange(e.dataTransfer.files[0])
          }
        }}
        onClick={() => {
          if (parsedSlots.length === 0) {
            fileInputRef.current?.click()
          }
        }}
        style={{
          border: isDragging
            ? '2px dashed #3b82f6'
            : parsedSlots.length > 0
            ? '1px solid #1e3a8a'
            : '2px dashed #334155',
          backgroundColor: isDragging
            ? 'rgba(59, 130, 246, 0.08)'
            : parsedSlots.length > 0
            ? '#0e1628'
            : '#111827',
          borderRadius: '14px',
          padding: parsedSlots.length > 0 ? '20px 24px' : '26px 20px',
          textAlign: parsedSlots.length > 0 ? 'left' : 'center',
          cursor: parsedSlots.length > 0 ? 'default' : 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '24px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onFileChange(e.target.files[0])
            }
          }}
        />

        {parsedSlots.length > 0 ? (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0,
              }}>
                📑
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                    {fileName || 'Uploaded Schedule Sheet'}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}>
                    💾 Session Saved
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>📊 <strong>{parsedSlots.length}</strong> total shows loaded</span>
                  {detectedFormat && <span>• 🎯 {detectedFormat}</span>}
                  {uploadedAt && <span>• ⏱️ Loaded at {uploadedAt}</span>}
                  <span style={{ color: '#38bdf8' }}>• 🔒 Tab switch & reload protected</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Replace this schedule with another Excel file"
              >
                <span>📂</span> Replace / Re-upload File
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearUploadedSchedule()
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 13px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Clear current sheet from memory and start over"
              >
                <span>🗑️</span> Clear Sheet
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '32px', marginBottom: '4px' }}>
              📁
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
              Drop Weekly Schedule Excel Sheet Here (or Click to Browse)
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '640px', margin: '0 auto' }}>
              Supports Loveworld India broadcast grid sheets (e.g. <code>Weekly_Schedule_for_Loveworld_India...xlsx</code>), multi-tab workbooks, and CSVs.
            </div>
          </>
        )}
      </div>

      {/* PROGRESS BAR */}
      {actionProgress && (
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #3b82f6',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#93c5fd' }}>{actionProgress.step}</span>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#93c5fd' }}>{actionProgress.percent}%</span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              backgroundColor: '#3b82f6',
              width: `${actionProgress.percent}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* ACTION WORKFLOW TOOLBAR */}
      {parsedSlots.length > 0 && (
        <div style={{
          backgroundColor: '#111827',
          border: totalIssuesCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #1f2937',
          borderRadius: '14px',
          padding: '18px 22px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{totalIssuesCount === 0 ? '✅' : '🔒'}</span>
              <span>
                {totalIssuesCount === 0
                  ? 'All 7 Days Clean — Ready to Stage to Drafts'
                  : `Staging Locked: ${totalIssuesCount} Unresolved Issue(s) Across Week`}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: totalIssuesCount === 0 ? '#6ee7b7' : '#fbbf24', marginTop: '2px' }}>
              {totalIssuesCount === 0
                ? 'All time slots, durations, and broadcasts are 100% verified with zero gaps or overlaps.'
                : 'All gaps and overlaps must be fixed before saving to Sanity Drafts.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              style={{
                backgroundColor: isEditMode ? '#3b82f6' : '#1e293b',
                color: isEditMode ? '#ffffff' : '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {isEditMode ? '✓ Done Editing' : '✏️ Edit Fields'}
            </button>

            {/* STAGE TO DRAFTS - HARD GATE */}
            {totalIssuesCount > 0 ? (
              <button
                disabled={true}
                style={{
                  backgroundColor: '#1f2937',
                  color: '#9ca3af',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  padding: '11px 20px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'not-allowed',
                  opacity: 0.75,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Staging to Drafts is locked until all gaps and overlaps across all 7 days are resolved."
              >
                <span>🔒</span> Staging Locked ({totalIssuesCount} Issue{totalIssuesCount > 1 ? 's' : ''})
              </button>
            ) : (
              <button
                onClick={handleImportToDrafts}
                disabled={isProcessing}
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '11px 22px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.6 : 1,
                  boxShadow: '0 2px 10px rgba(217, 119, 6, 0.45)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Saves into drafts.scheduleItem so live website is untouched"
              >
                <span>📥</span> 1. Stage into Drafts (Clean ✓)
              </button>
            )}

            {/* PUBLISH TO LIVE */}
            <button
              onClick={handlePublishAllToLive}
              disabled={isProcessing}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 20px',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.6 : 1,
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)',
              }}
              title="Commits to live published schedule on website"
            >
              🚀 2. Publish All Live
            </button>

            {stats.draftCount > 0 && (
              <button
                onClick={handleDiscardDrafts}
                disabled={isProcessing}
                style={{
                  backgroundColor: 'transparent',
                  color: '#f87171',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                🗑️ Discard Drafts
              </button>
            )}

            <button
              onClick={handleClearUploadedSchedule}
              disabled={isProcessing}
              style={{
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 14px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
              title="Clear current uploaded sheet from session memory"
            >
              ✕ Clear Sheet
            </button>
          </div>
        </div>
      )}

      {/* SCHEDULE GAP AUDITOR ALERT BOX */}
      {parsedSlots.length > 0 && (
        <div style={{
          backgroundColor: activeDayAlerts.length === 0 ? 'rgba(5, 150, 105, 0.12)' : 'rgba(217, 119, 6, 0.12)',
          border: activeDayAlerts.length === 0 ? '1px solid rgba(5, 150, 105, 0.35)' : '1px solid rgba(217, 119, 6, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: activeDayAlerts.length > 0 ? '10px' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{activeDayAlerts.length === 0 ? '✅' : '⚠️'}</span>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: activeDayAlerts.length === 0 ? '#34d399' : '#fbbf24' }}>
                {activeTab} Schedule Health: {activeDayAlerts.length === 0 ? 'No Gaps or Conflicts Detected (Full 24h Coverage)' : `${activeDayAlerts.length} Flagged Notice(s) Must Be Fixed`}
              </span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
              {activeDaySlots.length} shows scheduled
            </span>
          </div>

          {activeDayAlerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeDayAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '13px',
                    color: alert.type === 'overlap' ? '#fca5a5' : '#fde68a',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    borderLeft: alert.type === 'overlap' ? '3px solid #ef4444' : '3px solid #f59e0b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    {alert.type === 'gap' && '⏳ '}
                    {alert.type === 'overlap' && '🚫 '}
                    {alert.type === 'missing' && '⚠️ '}
                    {alert.message}
                  </div>

                  {alert.suggestedTime && alert.slotId && (
                    <button
                      onClick={() => updateSlot(alert.slotId!, 'time', alert.suggestedTime)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Auto-Fix to {alert.suggestedTime}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SPREADSHEET REVIEW & EDIT TABLE */}
      {parsedSlots.length > 0 && (
        <div style={{
          backgroundColor: '#111827',
          borderRadius: '14px',
          border: '1px solid #1f2937',
          overflow: 'hidden',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        }}>
          {/* DAY TABS */}
          <div style={{
            display: 'flex',
            backgroundColor: '#0b0f19',
            borderBottom: '1px solid #1f2937',
            overflowX: 'auto',
          }}>
            {DAYS.map((day) => {
              const count = dayCounts[day] || 0
              const dayAlertsCount = weekAlertsByDay[day]?.length || 0
              const isActive = activeTab === day
              return (
                <button
                  key={day}
                  onClick={() => setActiveTab(day)}
                  style={{
                    padding: '13px 18px',
                    backgroundColor: isActive ? '#111827' : 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#38bdf8' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{day}</span>
                  {dayAlertsCount > 0 ? (
                    <span style={{
                      fontSize: '11px',
                      backgroundColor: 'rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      fontWeight: 700,
                    }}>
                      ⚠️ {dayAlertsCount}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '11px',
                      backgroundColor: isActive ? '#1e3a8a' : '#1e293b',
                      color: isActive ? '#93c5fd' : '#94a3b8',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                    }}>
                      ✓ {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* TABLE */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 14px', width: '45px' }}>#</th>
                  <th style={{ padding: '12px 14px', width: '115px' }}>Air Time</th>
                  <th style={{ padding: '12px 14px', width: '80px' }}>Length</th>
                  <th style={{ padding: '12px 14px' }}>Programme Title</th>
                  <th style={{ padding: '12px 14px', width: '155px' }}>Category</th>
                  <th style={{ padding: '12px 14px', width: '95px' }}>Broadcast</th>
                  <th style={{ padding: '12px 14px', width: '120px' }}>Asset Status</th>
                </tr>
              </thead>
              <tbody>
                {activeDaySlots.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No schedule items found for {activeTab}.
                    </td>
                  </tr>
                ) : (
                  activeDaySlots.map((slot, index) => {
                    const hasGapAfter = activeDayAlerts.some(
                      (a) => a.type === 'gap' && a.slotIndex === index
                    )
                    const hasOverlap = activeDayAlerts.some(
                      (a) => a.type === 'overlap' && a.slotIndex === index
                    )
                    const catStyle = CATEGORY_COLORS[slot.category] || CATEGORY_COLORS.SPECIALS

                    return (
                      <tr
                        key={slot.id}
                        style={{
                          borderBottom: hasGapAfter ? '2px dashed #f59e0b' : '1px solid #1f2937',
                          backgroundColor: hasOverlap ? 'rgba(239, 68, 68, 0.08)' : index % 2 === 0 ? '#111827' : '#0d131f',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '11px 14px', color: '#64748b', fontWeight: 600 }}>
                          {index + 1}
                        </td>

                        <td style={{ padding: '11px 14px' }}>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={slot.time}
                              onChange={(e) => updateSlot(slot.id, 'time', e.target.value)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #3b82f6',
                                backgroundColor: '#020617',
                                color: '#38bdf8',
                                fontWeight: 700,
                                fontSize: '13px',
                                width: '95px',
                              }}
                            />
                          ) : (
                            <span style={{
                              display: 'inline-block',
                              fontWeight: 700,
                              color: '#38bdf8',
                              letterSpacing: '0.02em',
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                            }}>
                              {slot.time}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '11px 14px' }}>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={slot.duration}
                              onChange={(e) => updateSlot(slot.id, 'duration', e.target.value)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #334155',
                                backgroundColor: '#020617',
                                color: '#94a3b8',
                                fontSize: '12px',
                                width: '55px',
                              }}
                            />
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12.5px', fontWeight: 500 }}>
                              {slot.duration}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '11px 14px' }}>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={slot.title}
                              onChange={(e) => updateSlot(slot.id, 'title', e.target.value)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #3b82f6',
                                backgroundColor: '#020617',
                                color: '#f8fafc',
                                fontWeight: 600,
                                fontSize: '13.5px',
                                width: '100%',
                              }}
                            />
                          ) : (
                            <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
                              {slot.title}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '11px 14px' }}>
                          {isEditMode ? (
                            <select
                              value={slot.category}
                              onChange={(e) => updateSlot(slot.id, 'category', e.target.value)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #334155',
                                backgroundColor: '#020617',
                                color: '#f8fafc',
                                fontSize: '12px',
                                fontWeight: 600,
                                width: '100%',
                              }}
                            >
                              {VALID_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{
                              display: 'inline-block',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: '6px',
                              backgroundColor: catStyle.bg,
                              color: catStyle.text,
                              border: `1px solid ${catStyle.border}`,
                              letterSpacing: '0.04em',
                            }}>
                              {slot.category}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '11px 14px' }}>
                          {isEditMode ? (
                            <button
                              type="button"
                              onClick={() => updateSlot(slot.id, 'live', !slot.live)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                backgroundColor: slot.live ? 'rgba(239, 68, 68, 0.25)' : '#1e293b',
                                color: slot.live ? '#f87171' : '#94a3b8',
                              }}
                            >
                              {slot.live ? '🔴 LIVE' : 'Recorded'}
                            </button>
                          ) : slot.live ? (
                            <span style={{
                              display: 'inline-block',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#f87171',
                              backgroundColor: 'rgba(239, 68, 68, 0.18)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}>
                              🔴 LIVE
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              Recorded
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '11px 14px' }}>
                          {slot.existingImage ? (
                            <span style={{
                              fontSize: '12px',
                              color: '#34d399',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <span>✓</span> Image Linked
                            </span>
                          ) : slot.programmeRef ? (
                            <span style={{ fontSize: '12px', color: '#38bdf8' }}>
                              Linked Show
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              Default
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SYSTEM LOG CONSOLE */}
      <div style={{
        backgroundColor: '#111827',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid #1f2937',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '6px',
        }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
            System Sync Log
          </span>
          <button
            onClick={() => setLogs([])}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Clear Log
          </button>
        </div>
        <div style={{
          maxHeight: '120px',
          overflowY: 'auto',
          fontSize: '12px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          lineHeight: '1.6',
          color: '#94a3b8',
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#4b5563' }}>Awaiting spreadsheet upload...</div>
          ) : (
            logs.map((log, i) => <div key={i}>{log}</div>)
          )}
        </div>
      </div>
    </div>
  )
}

class ImporterErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('ScheduleExcelImporter crashed:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '40px auto', backgroundColor: '#1e1b18', border: '1px solid #78350f', borderRadius: '12px' }}>
          <h2 style={{ color: '#f87171', marginTop: 0 }}>Excel Importer encountered an issue</h2>
          <p style={{ color: '#fca5a5' }}>{String(this.state.error?.message || this.state.error)}</p>
          <pre style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '12px', color: '#f87171' }}>
            {String(this.state.error?.stack || '')}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

export function ScheduleExcelImporter() {
  return (
    <ImporterErrorBoundary>
      <ScheduleExcelImporterInner />
    </ImporterErrorBoundary>
  )
}
