'use client'

import { X } from 'lucide-react'
import { FileImport } from './file-import'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onDataImport: (data: any) => void
}

export function ImportModal({ isOpen, onClose, onDataImport }: ImportModalProps) {
  if (!isOpen) return null

  const handleDataImport = (data: any) => {
    onDataImport(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Import Delivery Data
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your CSV, JSON, or Excel file to import delivery data
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close import modal"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <FileImport onDataImport={handleDataImport} />
        </div>

              </div>
    </div>
  )
}
