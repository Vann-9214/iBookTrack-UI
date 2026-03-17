import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react"

const transmissionQueue = [
  {
    lotId: "LOT-2024-0891",
    boxNumber: "BOX-001",
    booksReceived: 150,
    booksTransmitted: 150,
  },
  {
    lotId: "LOT-2024-0890",
    boxNumber: "BOX-002",
    booksReceived: 200,
    booksTransmitted: 200,
  },
  {
    lotId: "LOT-2024-0889",
    boxNumber: "BOX-003",
    booksReceived: 180,
    booksTransmitted: 120,
  },
  {
    lotId: "LOT-2024-0888",
    boxNumber: "BOX-004",
    booksReceived: 175,
    booksTransmitted: 175,
  },
  {
    lotId: "LOT-2024-0887",
    boxNumber: "BOX-005",
    booksReceived: 160,
    booksTransmitted: 80,
  },
]

export function TransmissionQueue() {
  const calculatePercentage = (transmitted: number, received: number) => {
    if (received === 0) return 0
    return Math.round((transmitted / received) * 100)
  }

  const incompleteCount = transmissionQueue.filter(
    (t) => calculatePercentage(t.booksTransmitted, t.booksReceived) < 100
  ).length

  return (
    <Card className="border-border bg-card flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Transmission Queue
        </CardTitle>
        {incompleteCount > 0 && (
          <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning text-xs">
            {incompleteCount} Incomplete
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-medium">Lot ID</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Box #</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-center">Books Received</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-center">Books Transmitted</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transmissionQueue.map((item) => {
              const percentage = calculatePercentage(item.booksTransmitted, item.booksReceived)
              return (
                <TableRow key={item.lotId} className="border-border">
                  <TableCell className="font-mono text-xs text-card-foreground">{item.lotId}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.boxNumber}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-center">{item.booksReceived}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-center">{item.booksTransmitted}</TableCell>
                  <TableCell className="text-right">
                    {percentage === 100 ? (
                      <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" />
                        {percentage}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning gap-1 text-[10px]">
                        <RotateCcw className="h-3 w-3" />
                        {percentage}%
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
