import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Activity, AlertTriangle, FileOutput, HeartPulse } from "lucide-react"

interface StatsBarProps {
  stats?: any
}

export function StatsBar({ stats: dashboardStats }: StatsBarProps) {
  const stats = [
    {
      title: "Live Lots",
      value: dashboardStats?.activeLots?.toString() || "0",
      subtext: "Active in 8-step pipeline",
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Missing Books",
      value: dashboardStats?.unaccountedBooks?.toString() || "0",
      subtext: "Flagged at checkpoints",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Daily Output",
      value: dashboardStats?.dailyTransmitted?.toString() || "0",
      subtext: "Successfully transmitted",
      icon: FileOutput,
      color: "text-success",
      bgColor: "bg-success/10",
      unit: "Books",
    },
    {
      title: "Total Books",
      value: dashboardStats?.totalBooks?.toString() || "0",
      subtext: "In system",
      icon: HeartPulse,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", stat.bgColor)}>
              <stat.icon className={cn("h-6 w-6", stat.color)} />
            </div>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-2xl font-bold", stat.color)}>
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {stat.unit}
                  </span>
                )}
              </div>
              <span className="truncate text-xs text-muted-foreground">
                {stat.subtext}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
