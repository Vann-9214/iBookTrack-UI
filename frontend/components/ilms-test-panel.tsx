'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2, CheckCircle, XCircle } from 'lucide-react'
import bwipjs from 'bwip-js'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export function ILMSTestPanel() {
  const [isbn, setIsbn] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null)

  // Generate barcode when result is available
  useEffect(() => {
    // Only run in browser (not during SSR)
    if (typeof window === 'undefined') return
    
    if (result?.data?.ISBN && barcodeCanvasRef.current) {
      try {
        const cleanISBN = result.data.ISBN.replace(/-/g, '')
        
        bwipjs.toCanvas(barcodeCanvasRef.current, {
          bcid: 'code128',       // More flexible than EAN-13
          text: cleanISBN,
          scale: 2,
          height: 10,
          includetext: true,
          textxalign: 'center',
        })
      } catch (e) {
        console.error('Barcode generation error:', e)
        // If barcode fails, clear canvas and show error
        const ctx = barcodeCanvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, barcodeCanvasRef.current.width, barcodeCanvasRef.current.height)
        }
      }
    }
  }, [result])

  const testAPI = async () => {
    if (!isbn.trim()) {
      setError('Please enter an ISBN')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${API_URL}/api/books/ilms/search/${isbn}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setResult(data)
      } else {
        setError(data.message || data.error || 'Book not found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      testAPI()
    }
  }

  return (
    <Card className="border-blue-500/20 bg-blue-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-400">
          <Search className="h-5 w-5" />
          iLMS API Test - Search Book by ISBN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter ISBN (e.g., 9780123456789)"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={loading}
          />
          <Button 
            onClick={testAPI} 
            disabled={loading || !isbn.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Test API
              </>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-500/30 rounded-lg">
            <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-400">Error</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Success Display */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-950/30 border border-green-500/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <p className="font-medium text-green-400">API Connection Successful!</p>
                <p className="text-sm text-green-300">Book data retrieved from {result.source}</p>
              </div>
            </div>

            {/* Book Details - Formatted Print Slip Fields */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-4">Book Details (Print Slip Format):</h3>
              
              {/* Barcode at Top Center */}
              <div className="flex justify-center mb-6 pb-4 border-b border-border">
                <canvas ref={barcodeCanvasRef} className="mx-auto"></canvas>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">ISBN</p>
                  <p className="font-medium">{result.data?.ISBN || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Book Type</p>
                  <p className="font-medium">{result.data?.BookType || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Title</p>
                  <p className="font-medium">{result.data?.Title || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium">{result.data?.Description || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date Purchased</p>
                  <p className="font-medium">{result.data?.PurchaseApproval || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date Catalogued</p>
                  <p className="font-medium">{result.data?.uploadFileDate || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lot Number</p>
                  <p className="font-medium">{result.data?.LotNo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Box Number</p>
                  <p className="font-medium">{result.data?.BoxNo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Publisher</p>
                  <p className="font-medium">{result.data?.PublisherName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Language</p>
                  <p className="font-medium">{result.data?.LanguageofBook || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pages</p>
                  <p className="font-medium">{result.data?.EstimatedNumberofpages || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Condition</p>
                  <p className="font-medium">{result.data?.Condition || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!result && !error && !loading && (
          <div className="text-sm text-muted-foreground space-y-2 p-3 bg-muted/30 rounded-lg">
            <p className="font-medium">📝 How to test:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Enter an ISBN from your database (970k or 215k books)</li>
              <li>Click "Test API" or press Enter</li>
              <li>View the book details returned from iLMS system</li>
            </ol>
            <p className="mt-3 text-xs">
              💡 <strong>Tip:</strong> Use an ISBN from your imported books to verify the API is working correctly.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
