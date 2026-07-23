import { formatSimflexStatus } from '../utils/checkpoints.helpers'
import type { ScannedBook, SimflexStatusResult, Stage } from '../types/checkpoints.types'

interface StageBoxBooksTableProps {
  books: ScannedBook[]
  selectedStage: Stage
  simflex: Record<string, SimflexStatusResult>
}

export function StageBoxBooksTable({ books, selectedStage, simflex }: StageBoxBooksTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b border-border grid grid-cols-[110px_minmax(0,1fr)_380px] gap-3 w-full">
            <th className="pb-2 text-left font-medium">ISBN</th>
            <th className="pb-2 text-left font-medium">Title</th>
            <th className="pb-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="block w-full">
          {books.map((book) => {
            const rawStatus = simflex?.[book.isbn] || book.transmission_status
            const simflexStatus =
              typeof rawStatus === 'string'
                ? rawStatus
                : rawStatus?.latestStatus || 'Pending'
            const isTransmissionCompleted =
              simflexStatus === 'COMPLETED' ||
              simflexStatus === 'Transmission_Archive COMPLETED'

            return (
              <tr
                key={book.id}
                className="border-b border-border/40 last:border-0 grid grid-cols-[110px_minmax(0,1fr)_380px] gap-3 w-full items-start"
              >
                <td
                  className="py-1.5 text-foreground font-mono tabular-nums truncate"
                  title={book.isbn}
                >
                  {book.isbn}
                </td>
                <td
                  className="py-1.5 text-foreground leading-tight truncate min-w-0"
                  title={book.title || undefined}
                >
                  {book.title || 'N/A'}
                </td>
                <td className="py-1.5 flex flex-row items-center justify-start gap-2 text-left overflow-hidden">
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      book.scan_status === 'processable'
                        ? 'bg-green-100 text-green-700'
                        : book.scan_status === 'non_processable'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {book.scan_status === 'processable'
                      ? 'Processable'
                      : book.scan_status === 'non_processable'
                      ? 'Non-Processable'
                      : book.scan_status}
                  </span>
                  {(selectedStage === 'scan' || selectedStage === 'storage') && (
                    <span
                      className="text-[9px] text-muted-foreground font-normal truncate"
                      title={`Simflex: ${
                        book.scan_status === 'non_processable'
                          ? 'Not Included'
                          : formatSimflexStatus(simflexStatus)
                      }`}
                    >
                      Simflex:{' '}
                      {book.scan_status === 'non_processable'
                        ? 'Not Included'
                        : formatSimflexStatus(simflexStatus)}
                    </span>
                  )}
                  {book.scan_status === 'non_processable' && book.flag?.issue && (
                    <span
                      className="text-[9px] text-red-500 font-normal opacity-90 truncate"
                      title={`Reason: ${book.flag.issue}`}
                    >
                      Reason: {book.flag.issue}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
