export const ISSUE_LABELS: Record<string, string> = {
  'scanning': 'Scanning/Barcode Error',
  'cut': 'Cut Error',
  'transmission': 'Transmission Error',
  'split-pages': 'Split Pages',
  'bleed-through': 'Bleed Through',
  'misaligned-cut': 'Misaligned Cut',
  'dog-ears': 'Dog Ears',
  'torn-cover': 'Torn Cover',
  'sync_error': 'Sync Error',
  'barcode_error': 'Barcode Error'
}

export const getTone = (isJaguar: boolean) => ({
  theme: isJaguar
    ? {
        card: "bg-emerald-50 border-2 border-emerald-200/80 ring-emerald-100/70",
        icon: "bg-emerald-600 shadow-emerald-500/25",
        value: "text-emerald-700",
        title: "text-emerald-950/70",
        sub: "text-emerald-600/80",
        hover: "hover:shadow-emerald-200/60 cursor-pointer",
        modalBg: "bg-emerald-600",
        modalIcon: "bg-emerald-600",
        modalDot: "bg-emerald-500",
      }
    : {
        card: "bg-blue-50 border-2 border-blue-200/80 ring-blue-100/70",
        icon: "bg-blue-600 shadow-blue-500/25",
        value: "text-blue-700",
        title: "text-blue-950/70",
        sub: "text-blue-600/80",
        hover: "hover:shadow-blue-200/60 cursor-pointer",
        modalBg: "bg-blue-50",
        modalIcon: "bg-blue-600",
        modalDot: "bg-blue-500",
      },
  red: {
    card: "bg-gradient-to-br from-red-500 via-red-500 to-rose-600 border-2 border-red-600/40 ring-red-300/30 text-white",
    icon: "bg-white/20 shadow-black/10",
    value: "text-white",
    title: "text-white/90",
    sub: "text-white/70",
    hover: "hover:shadow-red-500/40 cursor-pointer",
    modalBg: "bg-red-50",
    modalIcon: "bg-red-600",
    modalDot: "bg-red-500",
  }
})
