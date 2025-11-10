export interface Order {
  itemId: string
  sheetId: string
  status: "DESIGNED" | "NEED_REPAIR" | "CONFIRMED" | "REPAIRED"
  orderNote?: string
  designer?: string
  designLink?: string
  mockup?: string
  customerImage?: string
  personalization?: string
  date?: string
  store?: string
  productImage?: string
  productType?: string
  productName?: string
  rowPosition?: number // 1-based row number in the Google Sheet
  _changes?: Record<string, { old: string; new: string }> | null
  _itemIdChanged?: string // Stores the expected itemId before sync detected a different order
}

export interface OrderFilters {
  status?: string[]
  designer?: string[]
  productType?: string[]
  store?: string[]
  dateRange?: {
    from: string
    to: string
  }
  searchQuery?: string
}

export interface OrderListState {
  orders: Order[]
  filteredOrders: Order[]
  filters: OrderFilters
  selectedSheet: string | null
  loading: boolean
  error: string | null
  totalCount: number
  lastSync?: string
}
