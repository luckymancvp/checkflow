export interface Sheet {
  id: string
  name: string
  description?: string
  google_sheet_id: string
  tab_name: string
  configuration: {
    dataRange: {
      startRow?: number
      endRow?: number | null
      headerRow?: number
      columns: string
    }
    syncRange: string
    syncStrategy: string
    columnMapping: {
      itemId: string
      status: string
      orderNote: string
      designer: string
      design: string
      mockup: string
      customerImage: string
      personalization: string
      date: string
      store: string
      image: string
      productType: string
      productName: string
    }
    readDirection: string
    maxRowsPerLoad: number
  }
  last_access?: string | null
  created_at: string
  updated_at: string
  createdBy: {
    id: string
    name: string
    role: string
    email: string
    avatar_url: string
  }
}
