import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Ghost } from "lucide-react"

const unaccountedBooks = [
  {
    isbn: "978-0-13-468599-1",
    lotNumber: "LOT-2024-0891",
    stageDetected: "QC Station",
    reportedBy: "Maria Santos",
    date: "Mar 17, 2026",
  },
  {
    isbn: "978-0-13-468600-4",
    lotNumber: "LOT-2024-0890",
    stageDetected: "Cut Station",
    reportedBy: "James Reyes",
    date: "Mar 17, 2026",
  },
  {
    isbn: "978-0-13-468601-1",
    lotNumber: "LOT-2024-0889",
    stageDetected: "Scan Station",
    reportedBy: "Ana Cruz",
    date: "Mar 17, 2026",
  },
  {
    isbn: "978-0-13-468602-8",
    lotNumber: "LOT-2024-0888",
    stageDetected: "Intake",
    reportedBy: "Paolo Garcia",
    date: "Mar 16, 2026",
  },
  {
    isbn: "978-0-13-468603-5",
    lotNumber: "LOT-2024-0887",
    stageDetected: "QA Review",
    reportedBy: "Lisa Tan",
    date: "Mar 16, 2026",
  },
]

export function UnaccountedBooks() {
  return (
    <Card className="border-border bg-card flex flex-col">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Ghost className="h-4 w-4 text-destructive" />
        <CardTitle className="text-base font-semibold text-card-foreground">
          Unaccounted Books
        </CardTitle>
        <Badge variant="outline" className="ml-auto border-destructive/30 bg-destructive/10 text-destructive text-[10px]">
          {unaccountedBooks.length} books
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-medium">ISBN</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Lot#</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Stage Detected</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium hidden sm:table-cell">Reported By</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unaccountedBooks.map((item, i) => (
              <TableRow key={i} className="border-border">
                <TableCell className="font-mono text-xs text-card-foreground">{item.isbn}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{item.lotNumber}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] font-normal bg-secondary text-secondary-foreground">
                    {item.stageDetected}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{item.reportedBy}</TableCell>
                <TableCell className="text-xs text-muted-foreground text-right">{item.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
