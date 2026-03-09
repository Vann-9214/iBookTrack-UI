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
    timeSent: "2 min ago",
    fileSize: "4.2 MB",
    status: "verified",
  },
  {
    lotId: "LOT-2024-0890",
    timeSent: "8 min ago",
    fileSize: "3.8 MB",
    status: "verified",
  },
  {
    lotId: "LOT-2024-0889",
    timeSent: "15 min ago",
    fileSize: "5.1 MB",
    status: "failed",
  },
  {
    lotId: "LOT-2024-0888",
    timeSent: "22 min ago",
    fileSize: "4.0 MB",
    status: "verified",
  },
  {
    lotId: "LOT-2024-0887",
    timeSent: "31 min ago",
    fileSize: "3.5 MB",
    status: "verified",
  },
]

export function TransmissionQueue() {
  const failedCount = transmissionQueue.filter((t) => t.status === "failed").length

  return (
    <Card className="border-border bg-card flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground">
          Transmission Queue
        </CardTitle>
        {failedCount > 0 && (
          <Button variant="destructive" size="sm" className="h-7 gap-1.5 text-xs">
            <RotateCcw className="h-3 w-3" />
            Retry All Failed
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-medium">Lot ID</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">Time Sent</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium hidden sm:table-cell">File Size</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transmissionQueue.map((item) => (
              <TableRow key={item.lotId} className="border-border">
                <TableCell className="font-mono text-xs text-card-foreground">{item.lotId}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.timeSent}</TableCell>
                <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{item.fileSize}</TableCell>
                <TableCell className="text-right">
                  {item.status === "verified" ? (
                    <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[10px]">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
