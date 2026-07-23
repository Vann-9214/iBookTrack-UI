import { Book } from 'lucide-react'

interface BookInfoCardProps {
  book: {
    isbn: string
    title: string
    language: string
    expectedBox: number
    publisher?: string
    pages?: string | number
    lotNumber?: string
    boxNumber?: string
    datePurchased?: string
    dateCatalogued?: string
    found?: boolean
  }
}

export function BookInfoCard({ book }: BookInfoCardProps) {
  const languageColor = book.language === 'Mustang' 
    ? 'text-blue-400 bg-blue-400/10' 
    : 'text-purple-400 bg-purple-400/10'

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Book className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {book.title}
          </h3>
          
          {/* Main Info Grid */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">ISBN</p>
              <p className="text-sm text-foreground">{book.isbn}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Language</p>
              <p className={`text-sm font-medium px-2 py-1 rounded w-fit ${languageColor}`}>
                {book.language}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Expected Box</p>
              <p className="text-sm font-semibold text-foreground">Box {book.expectedBox}</p>
            </div>
          </div>

          {/* Additional Details from iLMS API */}
          {book.found && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
              {book.publisher && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Publisher</p>
                  <p className="text-sm text-foreground">{book.publisher}</p>
                </div>
              )}
              {book.pages && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pages</p>
                  <p className="text-sm text-foreground">{book.pages}</p>
                </div>
              )}
              {book.lotNumber && book.lotNumber !== 'N/A' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Lot Number</p>
                  <p className="text-sm text-foreground">{book.lotNumber}</p>
                </div>
              )}
              {book.boxNumber && book.boxNumber !== 'N/A' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Box Number</p>
                  <p className="text-sm text-foreground">{book.boxNumber}</p>
                </div>
              )}
              {book.datePurchased && book.datePurchased !== 'N/A' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date Purchased</p>
                  <p className="text-sm text-foreground">{book.datePurchased}</p>
                </div>
              )}
              {book.dateCatalogued && book.dateCatalogued !== 'N/A' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date Catalogued</p>
                  <p className="text-sm text-foreground">{book.dateCatalogued}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
