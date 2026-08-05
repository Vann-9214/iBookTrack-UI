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
  theme: {
    card: "bg-gradient-to-br from-primary/5 via-white to-primary/10 border-2 border-primary/20 ring-1 ring-primary/10",
    icon: "bg-primary shadow-primary/25",
    value: "text-primary",
    title: "text-foreground/70",
    sub: "text-primary/80",
    hover: "hover:shadow-primary/20 hover:border-primary/40 cursor-pointer",
    modalBg: isJaguar ? "bg-emerald-50" : "bg-blue-50",
    modalIcon: "bg-primary",
    modalDot: "bg-primary",
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
