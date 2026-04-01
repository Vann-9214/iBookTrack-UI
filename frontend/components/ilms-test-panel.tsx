'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2, CheckCircle, XCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export function ILMSTestPanel() {
  const [isbn, setIsbn] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

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

            {/* Book Details */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-foreground mb-3">Book Details:</h3>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96">
                {JSON.stringify(result.data, null, 2)}
              </pre>
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
