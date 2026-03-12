import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { StatsBar } from "@/components/stats-bar"
import { ActivePipeline } from "@/components/active-pipeline"
import { TransmissionQueue } from "@/components/transmission-queue"
import { MissingItemLog } from "@/components/missing-item-log"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DashboardMain } from "./DashboardMain"
import { TopBar } from "@/components/top-bar"

export default function DashboardPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      {/* Main Content */}
      <DashboardMain>
        <TopBar />
        <ScrollArea className="h-[calc(100%-3.5rem)]">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            {/* Page Header */}
            <header>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Command Center
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Real-time overview of the 8-step pipeline, transmissions, and warehouse activity.
              </p>
            </header>

            {/* Top Stats Bar */}
            <StatsBar />

            {/* Active Pipeline Flowchart */}
            <ActivePipeline />

            {/* Bottom Split: Transmission Queue & Missing Item Log */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <TransmissionQueue />
              <MissingItemLog />
            </div>
          </div>
        </ScrollArea>
      </DashboardMain>
    </div>
  )
}
