import { DEMO_CHANGED, STORAGE_KEY } from './store'

const refreshEvents = ['BOX_UPDATED', 'PIPELINE_UPDATED', 'DASHBOARD_REFRESH', 'FLAG_UPDATED', 'SCAN_UPDATED', 'STORAGE_UPDATED']
/** EventSource-compatible local transport; never opens a connection. */
export class DemoEventSource {
  private target = new EventTarget()
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  private closed = false
  private refresh = () => {
    if (!this.closed) for (const name of refreshEvents) this.dispatchEvent(new MessageEvent(name, { data: '{}' }))
  }
  private storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) this.refresh() }
  constructor(_url: string, _options?: EventSourceInit) {
    window.addEventListener(DEMO_CHANGED, this.refresh)
    window.addEventListener('storage', this.storage)
    queueMicrotask(() => {
      if (this.closed) return
      this.dispatchEvent(new MessageEvent('connected', { data: '{"message":"Local demo ready"}' }))
      for (const name of ['WAREHOUSE_LOCK_SNAPSHOT', 'INVENTORY_LOCK_SNAPSHOT']) this.dispatchEvent(new MessageEvent(name, { data: '{"locks":[]}' }))
    })
  }
  addEventListener(type: string, listener: (event: MessageEvent) => void, options?: boolean | AddEventListenerOptions): void {
    this.target.addEventListener(type, listener as EventListener, options)
  }
  removeEventListener(type: string, listener: (event: MessageEvent) => void, options?: boolean | EventListenerOptions): void {
    this.target.removeEventListener(type, listener as EventListener, options)
  }
  close() {
    this.closed = true
    window.removeEventListener(DEMO_CHANGED, this.refresh)
    window.removeEventListener('storage', this.storage)
  }
  dispatchEvent(event: Event) { return this.target.dispatchEvent(event) }
}
