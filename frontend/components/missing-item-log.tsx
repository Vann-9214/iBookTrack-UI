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

const missingItems = [
  {
    bookTitle: "Operations Manual v3.2",
    lastSeenStation: "QC Station",
    reportedBy: "Maria Santos",
    time: "10 min ago",
  },
  {
    bookTitle: "Safety Handbook 2024",
    lastSeenStation: "Cut Station",
    reportedBy: "James Reyes",
    time: "25 min ago",
  },
  {
    bookTitle: "Equipment Log #47",
    lastSeenStation: "Scan Station",
    reportedBy: "Ana Cruz",
    time: "1 hr ago",
  },
  {
    bookTitle: "Inventory Sheet B-12",
    lastSeenStation: "Intake",
    reportedBy: "Paolo Garcia",
    time: "2 hrs ago",
  },
  {
    bookTitle: "QA Checklist Rev.8",
    lastSeenStation: "QA Review",
    reportedBy: "Lisa Tan",
    time: "3 hrs ago",
  },
]

export function MissingItemLog() {
  return (
    <Card className="border-border bg-card flex flex-col">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Ghost className="h-4 w-4 text-destructive" />
        <CardTitle className="text-base font-semibold text-card-foreground">
          Missing Item Log
        </CardTitle>
        <Badge variant="outline" className="ml-auto border-destructive/30 bg-destructive/10 text-destructive text-[10px]">
          {missingItems.length} items
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-medium">Book Title</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium hidden md:table-cell">Last Seen</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium hidden sm:table-cell">Reported By</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {missingItems.map((item, i) => (
              <TableRow key={i} className="border-border">
                <TableCell className="text-xs font-medium text-card-foreground">{item.bookTitle}</TableCell>
                <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                  <Badge variant="secondary" className="text-[10px] font-normal bg-secondary text-secondary-foreground">
                    {item.lastSeenStation}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{item.reportedBy}</TableCell>
                <TableCell className="text-xs text-muted-foreground text-right">{item.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
