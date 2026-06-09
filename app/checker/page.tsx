"use client"

import { useState, useMemo, useEffect } from "react"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, CalendarIcon, ChevronLeft, Clock, Eye, RefreshCw, TrendingUp, Users } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { MultiSelect } from "@/components/ui/multi-select"
import { ALL_STATUSES } from "@/constants/statuses"
import { useMeraProjects } from "@/hooks/use-mera-projects"

interface ReviewerStat {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: string
  total: number
  byStatus: Record<string, number>
  byChangeType: {
    design_error: number
    customer_change: number
  }
  bySource?: {
    sheet: number
    mera: number
  }
}

interface DetailedRecord {
  id: string
  item_id: string
  google_sheet_id: string
  source: "sheet" | "mera"
  status: string
  order_note: string | null
  designer: string | null
  design_link: string | null
  mockup_link: string | null
  customer_image: string | null
  personalization: string | null
  date: string | null
  store: string | null
  product_image: string | null
  product_type: string | null
  product_name: string | null
  change_type: string | null
  review_accuracy: string | null
  created_at: string
  reviewer: {
    id: string
    name: string
    email: string
    role: string
    avatar_url: string | null
  }
}

interface CheckerStatsResponse {
  success: boolean
  data: {
    timeRange: string
    dateRange: {
      start: string
      end: string
    } | null
    summary: {
      totalReviews: number
      uniqueReviewers: number
    }
    reviewerStats: ReviewerStat[]
    statusStats: Array<{ status: string; count: number }>
    dailyStats: Array<{
      date: string
      total: number
      byReviewer: Record<string, { name: string; count: number }>
    }>
    detailedRecords: DetailedRecord[]
  }
}

export default function CheckerPage() {
  const [timeRange, setTimeRange] = useState("today")
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null)
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [hasFallbackAttempted, setHasFallbackAttempted] = useState(false)
  const [clientTime, setClientTime] = useState<string>("")
  const [clientTimezone, setClientTimezone] = useState<string>("")
  const [serverTime, setServerTime] = useState<string>("")
  const [serverTimezone, setServerTimezone] = useState<string>("")

  // === Bộ lọc nguồn / sheet / project / trạng thái hiện tại (giống need-repair) ===
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([])
  const [selectedCurrentStatuses, setSelectedCurrentStatuses] = useState<string[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [includeSheet, setIncludeSheet] = useState(true)
  const [includeMera, setIncludeMera] = useState(true)

  const { data: sheetsResp } = useApi<{ data: Array<{ google_sheet_id: string; name?: string }> }>("/sheets")
  const sheetOptions = useMemo(
    () =>
      (sheetsResp?.data ?? []).map((s) => ({
        value: s.google_sheet_id,
        label: s.name || s.google_sheet_id,
      })),
    [sheetsResp],
  )
  const statusOptions = useMemo(() => ALL_STATUSES.map((s) => ({ value: s, label: s })), [])
  const { projects: meraProjects } = useMeraProjects()
  const projectOptions = useMemo(
    () => meraProjects.map((p) => ({ value: p.id, label: p.name })),
    [meraProjects],
  )

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.append("timeRange", timeRange)

    if (timeRange === "custom" && customDateRange.from && customDateRange.to) {
      // `to` từ Calendar là midnight ĐẦU ngày của ngày user chọn.
      // Cộng 1 ngày để khoảng [from, to+1) bao gồm trọn ngày cuối (giống preset "Today").
      const endExclusive = new Date(customDateRange.to.getTime() + 24 * 60 * 60 * 1000)
      params.append("startDate", customDateRange.from.toISOString())
      params.append("endDate", endExclusive.toISOString())
    }

    if (selectedReviewer) params.append("reviewerId", selectedReviewer)
    if (selectedSheetIds.length > 0) params.append("sheetIds", selectedSheetIds.join(","))
    if (selectedCurrentStatuses.length > 0) params.append("currentStatuses", selectedCurrentStatuses.join(","))
    if (selectedProjectIds.length > 0) params.append("projectIds", selectedProjectIds.join(","))
    if (!includeSheet) params.append("includeSheet", "false")
    if (!includeMera) params.append("includeMera", "false")

    return params.toString()
  }, [
    timeRange,
    customDateRange,
    selectedReviewer,
    selectedSheetIds,
    selectedCurrentStatuses,
    selectedProjectIds,
    includeSheet,
    includeMera,
  ])

  const { data: statsData, loading, error, refetch } = useApi<CheckerStatsResponse>(`/checker/stats?${queryParams}`)
  const { data: serverTimeData } = useApi<{ success: boolean; data: { serverTime: string; serverTimezone: string } }>(
    "/server-time",
  )

  useEffect(() => {
    const updateClientTime = () => {
      const now = new Date()
      setClientTime(now.toLocaleTimeString("en-US", { hour12: false }))
      setClientTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    }

    updateClientTime()
    const interval = setInterval(updateClientTime, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (serverTimeData?.success) {
      const serverDate = new Date(serverTimeData.data.serverTime)
      setServerTime(serverDate.toLocaleTimeString("en-US", { hour12: false }))
      setServerTimezone(serverTimeData.data.serverTimezone)
    }
  }, [serverTimeData])

  useEffect(() => {
    if (!loading && statsData && !hasFallbackAttempted) {
      const totalReviews = statsData.data?.summary?.totalReviews || 0

      if (totalReviews === 0) {
        if (timeRange === "today") {
          setTimeRange("yesterday")
          setHasFallbackAttempted(true)
        } else if (timeRange === "yesterday") {
          setTimeRange("last_week")
          setHasFallbackAttempted(true)
        }
      }
    }
  }, [loading, statsData, timeRange, hasFallbackAttempted])

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value)
    setHasFallbackAttempted(false)
    if (value !== "custom") {
      setCustomDateRange({ from: undefined, to: undefined })
    }
  }

  const handleReviewerClick = (reviewerId: string) => {
    if (selectedReviewer === reviewerId) {
      setSelectedReviewer(null)
    } else {
      setSelectedReviewer(reviewerId)
    }
  }

  const handleBackToOverview = () => {
    setSelectedReviewer(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DESIGNED":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            Designed
          </Badge>
        )
      case "NEED REPAIR":
      case "NEED_REPAIR":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            Need Repair
          </Badge>
        )
      case "CONFIRMED":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Confirmed
          </Badge>
        )
      case "REPAIRED":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Repaired
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const selectedReviewerData = useMemo(() => {
    if (!selectedReviewer || !statsData?.data?.reviewerStats) return null
    return statsData.data.reviewerStats.find((r) => r.id === selectedReviewer)
  }, [selectedReviewer, statsData])

  const filteredRecords = useMemo(() => {
    if (!selectedReviewer || !statsData?.data?.detailedRecords) return []
    return statsData.data.detailedRecords.filter((r) => r.reviewer.id === selectedReviewer)
  }, [selectedReviewer, statsData])

  const topPerformer = statsData?.data?.reviewerStats[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-96" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </div>

          {/* Time Range Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-[200px]" />
            </CardContent>
          </Card>

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-9 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Statistics</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refetch} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedReviewer && (
                <Button variant="ghost" size="sm" onClick={handleBackToOverview}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Overview
                </Button>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {selectedReviewer ? "Reviewer Details" : "Checker Dashboard"}
                </h1>
                <p className="text-gray-600 mt-2">
                  {selectedReviewer
                    ? `Detailed review history for ${selectedReviewerData?.name}`
                    : "Track reviewer performance and review statistics"}
                </p>
              </div>
            </div>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-pink-600" />
              Time Range
            </CardTitle>
            <CardDescription className="space-y-1">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-medium">Timezone: {clientTimezone || "Loading..."}</span>
                <span className="text-gray-400">|</span>
                <span>Client: {clientTime || "Loading..."}</span>
                <span className="text-gray-400">|</span>
                <span>
                  Server: {serverTime || "Loading..."} ({serverTimezone || "Loading..."})
                </span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {timeRange === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !customDateRange.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "LLL dd, y")} - {format(customDateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(customDateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customDateRange.from}
                      selected={{ from: customDateRange.from, to: customDateRange.to }}
                      onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters: Sheet / Mera projects / Trạng thái hiện tại / Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Lọc theo nguồn dữ liệu, sheet, project Mera, hoặc trạng thái hiện tại của đơn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium">Sheet</span>
                <MultiSelect
                  options={sheetOptions}
                  value={selectedSheetIds}
                  onChange={setSelectedSheetIds}
                  placeholder="All sheets"
                  className="w-56"
                  emptyText="No sheets"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium">Mera projects</span>
                <MultiSelect
                  options={projectOptions}
                  value={selectedProjectIds}
                  onChange={setSelectedProjectIds}
                  placeholder="All projects"
                  className="w-56"
                  emptyText="No projects"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium">Trạng thái hiện tại</span>
                <MultiSelect
                  options={statusOptions}
                  value={selectedCurrentStatuses}
                  onChange={setSelectedCurrentStatuses}
                  placeholder="All statuses"
                  className="w-56"
                  emptyText="No statuses"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium">Source</span>
                <div className="flex gap-1 h-10 items-center">
                  <Button
                    type="button"
                    size="sm"
                    variant={includeSheet ? "default" : "outline"}
                    onClick={() => setIncludeSheet((v) => !v)}
                    className={includeSheet ? "bg-pink-600 hover:bg-pink-700 text-white" : "bg-transparent"}
                  >
                    Sheet
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={includeMera ? "default" : "outline"}
                    onClick={() => setIncludeMera((v) => !v)}
                    className={includeMera ? "bg-pink-600 hover:bg-pink-700 text-white" : "bg-transparent"}
                  >
                    Mera
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedReviewer ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsData?.data?.summary.totalReviews || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {timeRange === "today" ? "Today" : `In ${timeRange.replace("_", " ")}`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Reviewers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsData?.data?.summary.uniqueReviewers || 0}</div>
                  <p className="text-xs text-muted-foreground">Unique reviewers</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg per Reviewer</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsData?.data?.summary.uniqueReviewers
                      ? Math.round(statsData.data.summary.totalReviews / statsData.data.summary.uniqueReviewers)
                      : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Reviews per person</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {topPerformer ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={topPerformer.avatar_url || undefined} />
                        <AvatarFallback className="bg-pink-100 text-pink-700">
                          {topPerformer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-lg font-bold">{topPerformer.name.split(" ")[0]}</div>
                        <p className="text-xs text-muted-foreground">{topPerformer.total} reviews</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold">N/A</div>
                      <p className="text-xs text-muted-foreground">No data</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Reviewer Statistics Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-pink-600" />
                  Reviewer Performance
                </CardTitle>
                <CardDescription>Click on a reviewer to see detailed review history</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reviewer</TableHead>
                      <TableHead className="text-right bg-slate-50">Total Reviews</TableHead>
                      <TableHead className="text-right bg-green-50">Confirmed</TableHead>
                      <TableHead className="text-right bg-red-50">Need Repair</TableHead>
                      <TableHead className="text-right bg-orange-50">Design Errors</TableHead>
                      <TableHead className="text-right bg-blue-50">Customer Changes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statsData?.data?.reviewerStats.map((reviewer) => (
                      <TableRow key={reviewer.id} className="cursor-pointer hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={reviewer.avatar_url || undefined} />
                              <AvatarFallback className="bg-pink-100 text-pink-700">
                                {reviewer.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{reviewer.name}</div>
                              <div className="text-xs text-gray-500">{reviewer.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold bg-slate-50">{reviewer.total}</TableCell>
                        <TableCell className="text-right font-semibold text-green-700 bg-green-50">
                          {reviewer.byStatus.CONFIRMED || 0}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-700 bg-red-50">
                          {(reviewer.byStatus["NEED REPAIR"] || reviewer.byStatus.NEED_REPAIR) || 0}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-orange-700 bg-orange-50">
                          {reviewer.byChangeType.design_error}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-700 bg-blue-50">
                          {reviewer.byChangeType.customer_change}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleReviewerClick(reviewer.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Reviewer Detail View */}
            {selectedReviewerData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedReviewerData.avatar_url || undefined} />
                      <AvatarFallback className="bg-pink-100 text-pink-700 text-2xl">
                        {selectedReviewerData.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl">{selectedReviewerData.name}</CardTitle>
                      <CardDescription>{selectedReviewerData.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Total Reviews</div>
                      <div className="text-2xl font-bold text-gray-900">{selectedReviewerData.total}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600">Confirmed</div>
                      <div className="text-2xl font-bold text-green-700">
                        {selectedReviewerData.byStatus.CONFIRMED || 0}
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-sm text-red-600">Design Errors</div>
                      <div className="text-2xl font-bold text-red-700">
                        {selectedReviewerData.byChangeType.design_error}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600">Customer Changes</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {selectedReviewerData.byChangeType.customer_change}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Review History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-pink-600" />
                  Review History ({filteredRecords.length} records)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredRecords.map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-semibold text-gray-900">#{record.item_id}</div>
                          <Badge
                            variant="outline"
                            className={
                              record.source === "mera"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }
                          >
                            {record.source === "mera" ? "Mera" : "Sheet"}
                          </Badge>
                          {getStatusBadge(record.status)}
                          {record.change_type && (
                            <Badge
                              variant="outline"
                              className={
                                record.change_type === "design_error"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }
                            >
                              {record.change_type === "design_error" ? "Design Error" : "Customer Change"}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{formatDate(record.created_at)}</div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {record.designer && (
                          <div>
                            <span className="text-gray-600">Designer:</span>{" "}
                            <span className="font-medium">{record.designer}</span>
                          </div>
                        )}
                        {record.product_type && (
                          <div>
                            <span className="text-gray-600">Product:</span>{" "}
                            <span className="font-medium">{record.product_type}</span>
                          </div>
                        )}
                        {record.store && (
                          <div>
                            <span className="text-gray-600">Store:</span>{" "}
                            <span className="font-medium">{record.store}</span>
                          </div>
                        )}
                        {record.date && (
                          <div>
                            <span className="text-gray-600">Order Date:</span>{" "}
                            <span className="font-medium">{record.date}</span>
                          </div>
                        )}
                      </div>

                      {record.order_note && (
                        <div className="mt-3 bg-gray-50 rounded p-3">
                          <div className="text-xs text-gray-600 mb-1">Note:</div>
                          <div className="text-sm text-gray-800">{record.order_note}</div>
                        </div>
                      )}

                      {record.personalization && (
                        <div className="mt-3 bg-blue-50 rounded p-3">
                          <div className="text-xs text-blue-600 mb-1">Personalization:</div>
                          <div className="text-sm text-blue-800">{record.personalization}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredRecords.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No review records found for this time range.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
