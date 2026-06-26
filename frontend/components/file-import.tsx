'use client'

import { useState, useRef } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'

interface FileImportProps {
  onDataImport: (data: any) => void
}

export function FileImport({ onDataImport }: FileImportProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const row: Record<string, any> = {}
      headers.forEach((header, index) => {
        row[header] = isNaN(Number(values[index])) ? values[index] : Number(values[index])
      })
      return row
    })
    return { headers, data }
  }

  const handleFile = async (file: File) => {
    setError(null)
    setIsLoading(true)

    try {
      const text = await file.text()
      let parsedData

      if (file.name.endsWith('.csv')) {
        parsedData = parseCSV(text)
      } else if (file.name.endsWith('.json')) {
        parsedData = JSON.parse(text)
      } else {
        throw new Error('Unsupported file format. Please upload CSV or JSON.')
      }

      setFileName(file.name)
      onDataImport(parsedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:border-primary/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,.xlsx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />

        <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
        <p className="text-sm font-medium text-foreground mb-1">
          {isLoading ? 'Parsing file...' : 'Drag & drop your file here'}
        </p>
        <p className="text-xs text-muted-foreground">
          or click to select CSV, JSON, or Excel file
        </p>

        {fileName && (
          <p className="text-xs text-primary mt-2">
            ✓ {fileName}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-destructive/10 border border-destructive rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
