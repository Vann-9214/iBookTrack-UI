'use client'

import { useEffect, useRef } from 'react'
import type { BookInBox, InventoryBox } from '../types/inventory.types'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bwipjs = require('bwip-js')

export function InventoryPrintSlip({
  box,
  book,
  books = [],
  bookType = '',
  onAfterPrint,
}: {
  box: InventoryBox | null
  book?: BookInBox | null
  books?: BookInBox[]
  bookType?: string
  onAfterPrint?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!box) return
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      if (book) {
        canvas.width = 600
        canvas.height = 120
        bwipjs.toCanvas(canvas, {
          bcid: 'code128',
          text: book.isbn,
          scale: 3,
          height: 18,
          includetext: false,
          paddingwidth: 4,
          paddingheight: 2,
        })
      } else {
        canvas.width = 300
        canvas.height = 300
        const bookLines = books.map((b) => `${b.isbn}=${b.scan_status === 'processable' ? 'P' : 'NP'}`).join(';')
        const qrText = [
          `LOT:${box.lot?.lot_number || ''}`,
          `BOX:${box.box_number}`,
          `TYPE:${bookType || 'Mustang'}`,
          bookLines ? `BOOKS:${bookLines}` : '',
        ].filter(Boolean).join('|')
        bwipjs.toCanvas(canvas, { bcid: 'qrcode', text: qrText, scale: 4, eclevel: 'M' })
      }
    } catch (error) { console.error(book ? 'Book barcode error:' : 'QR code error:', error) }
    const printTimer = window.setTimeout(() => window.print(), 100)
    const onAfterPrintHandler = () => { onAfterPrint?.() }
    window.addEventListener('afterprint', onAfterPrintHandler)
    return () => {
      window.clearTimeout(printTimer)
      window.removeEventListener('afterprint', onAfterPrintHandler)
    }
  }, [box, book, books, bookType, onAfterPrint])
  if (!box) return null
  if (book) {
    return (
      <div className="hidden print:flex print:fixed print:inset-0 print:bg-white print:z-[9999] print:items-start print:justify-start">
        <div style={{
          width: '148mm',
          minHeight: '105mm',
          backgroundColor: '#fff',
          border: '1.5px solid #111',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#111',
          boxSizing: 'border-box',
          padding: '5mm',
          gap: '3mm',
        }}>
          <div style={{ borderBottom: '1.5px solid #111', paddingBottom: '2mm', marginBottom: '1mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Book Slip</span>
            <span style={{ fontSize: '8pt', color: '#555' }}>
              {box.lot?.lot_number ? `Lot: ${box.lot.lot_number}` : ''}
              {box.lot?.lot_number && box.box_number ? '  ·  ' : ''}
              {box.box_number ? `Box: ${box.box_number}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1mm' }}>
            <canvas ref={canvasRef} width={600} height={120} style={{ width: '100%', maxWidth: '120mm', height: '14mm', imageRendering: 'pixelated', display: 'block' }} />
            <div style={{ fontSize: '7pt', textAlign: 'center', letterSpacing: '1px' }}>{book.isbn}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2mm', marginTop: '1mm' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '28mm 1fr', gap: '1mm 2mm', fontSize: '8pt' }}>
              <span style={{ fontWeight: 700, color: '#555' }}>ISBN</span>
              <span style={{ fontWeight: 600 }}>{book.isbn}</span>
              <span style={{ fontWeight: 700, color: '#555' }}>Type</span>
              <span>{book.book_type ? book.book_type.charAt(0).toUpperCase() + book.book_type.slice(1).toLowerCase() : '—'}</span>
              <span style={{ fontWeight: 700, color: '#555' }}>Status</span>
              <span style={{ textTransform: 'capitalize' }}>{book.scan_status?.replace('_', ' ') || '—'}</span>
              <span style={{ fontWeight: 700, color: '#555' }}>Box</span>
              <span>{box.box_number}</span>
              <span style={{ fontWeight: 700, color: '#555' }}>Lot</span>
              <span>{box.lot?.lot_number || '—'}</span>
            </div>
          </div>
          <div style={{ marginTop: 'auto', borderTop: '1px solid #ccc', paddingTop: '2mm', display: 'flex', justifyContent: 'space-between', fontSize: '7pt', color: '#777' }}>
            <span>Received by: ___________________________</span>
            <span>Date: _______________</span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="hidden print:flex print:fixed print:inset-0 print:bg-white print:z-[9999] print:items-start print:justify-start">
      <div style={{
        width: '148mm',
        height: '105mm',
        backgroundColor: '#FFC107',
        border: '2px solid #111',
        display: 'flex',
        flexDirection: 'row',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#111',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '3mm',
        gap: '3mm',
      }}>
        <div style={{ flex: '0 0 52mm', display: 'flex', flexDirection: 'column', border: '1.5px solid #111' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 8mm 12mm', borderBottom: '1px solid #111', fontSize: '7pt', fontWeight: 700, textAlign: 'center' }}>
            <div style={{ borderRight: '1px solid #111', padding: '1mm' }}>Process</div>
            <div style={{ borderRight: '1px solid #111', padding: '1mm' }}></div>
            <div style={{ padding: '1mm', lineHeight: 1.1 }}>No. of<br />Books</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 8mm 12mm', borderBottom: '1px solid #111', flex: 1 }}>
            <div style={{ borderRight: '1px solid #111', padding: '1.5mm 2mm', fontSize: '8pt', lineHeight: 1.15 }}>Inventory &amp; Registration</div>
            <div style={{ borderRight: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #111', background: 'transparent', display: 'inline-block' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14pt', fontWeight: 300 }}>{books.length || box.total_expected_books || '—'}</div>
          </div>
          {['Cutting', 'Book Endorsement', 'Scanning', 'Book Storage'].map((label) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 8mm 12mm', borderBottom: '1px solid #111', flex: 1 }}>
              <div style={{ borderRight: '1px solid #111', padding: '1.5mm 2mm', fontSize: '8pt', lineHeight: 1.15 }}>{label}</div>
              <div style={{ borderRight: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #111', background: 'transparent', display: 'inline-block' }} />
              </div>
              <div style={{ borderRight: '1px solid #111' }} />
            </div>
          ))}
          <div style={{ borderTop: '1px solid #111', padding: '1.5mm 2mm', fontSize: '6pt', lineHeight: 1.4, flex: '0 0 auto' }}>
            <div style={{ fontWeight: 700, fontSize: '7pt', marginBottom: '0.5mm' }}>REMARKS</div>
            <div>Mismatch Title-</div>
            <div>Rejects -</div>
            <div>Excess (not in the PL) -</div>
            <div>Duplicate -</div>
            <div>Not yet approved -</div>
            <div>Mix Box -</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
          <div style={{ border: '2px solid #111', display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
            <div style={{ borderBottom: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.8mm 2mm' }}>
              <span style={{ fontSize: '22pt', fontWeight: 900, letterSpacing: '-0.5px', textAlign: 'center', lineHeight: 1, textTransform: 'uppercase' }}>{bookType || 'Mustang'}</span>
            </div>
            <div style={{ borderBottom: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.8mm 2mm' }}>
              <span style={{ fontSize: '15pt', fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>{box.lot?.lot_number || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.8mm 2mm' }}>
              <span style={{ fontSize: '34pt', fontWeight: 900, textAlign: 'center', lineHeight: 1, letterSpacing: '-1px' }}>
                {(() => { const m = box.box_number.match(/-0*([1-9]\d*)$/); return m ? m[1] : box.box_number })()}
              </span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5mm' }}>
            <canvas ref={canvasRef} width={300} height={300} style={{ width: 'auto', height: '100%', maxHeight: '42mm', imageRendering: 'pixelated', display: 'block' }} />
            <div style={{ fontSize: '5pt', textAlign: 'center', wordBreak: 'break-all', color: '#555' }}>{box.box_number}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
