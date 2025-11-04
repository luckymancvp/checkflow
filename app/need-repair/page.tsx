"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  Users,
  TrendingUp,
  CalendarIcon,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  User,
  Clock,
  Mail,
  Copy,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { format as timeAgo } from "timeago.js"
import type { DateRange } from "react-day-picker"
import Link from "next/link"

type TimeRange = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "all_time" | "custom"

export default function NeedRepairPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("this_week")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)

  const copyItemId = async (itemId: string) => {
    try {
      await navigator.clipboard.writeText(itemId)
      setCopiedItemId(itemId)
      setTimeout(() => setCopiedItemId(null), 2000)
    } catch (err) {
      console.error("Failed to copy item ID:", err)
    }
  }

  const getApiUrl = () => {
    const params = new URLSearchParams({ timeRange })
    if (timeRange === "custom" && dateRange?.from && dateRange?.to) {
      params.set("startDate", dateRange.from.toISOString())
      params.set("endDate", dateRange.to.toISOString())
    }
    return `/need-repair/stats?${params.toString()}`
  }

  const { data: stats, loading, error, refetch } = useApi(getApiUrl())

  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value)
    if (value !== "custom") {
      setDateRange(undefined)
    }
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to) {
      setTimeRange("custom")
      setIsCalendarOpen(false)
    }
  }

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "today":
        return "Today"
      case "yesterday":
        return "Yesterday"
      case "this_week":
        return "This Week"
      case "last_week":
        return "Last Week"
      case "this_month":
        return "This Month"
      case "last_month":
        return "Last Month"
      case "all_time":
        return "All Time"
      case "custom":
        if (dateRange?.from && dateRange?.to) {
          return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
        }
        return "Custom Range"
      default:
        return "This Week"
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-700">Failed to load repair statistics: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const summary = stats?.data?.summary || {}
  const designerStats = stats?.data?.designerStats || []
  const productTypeStats = stats?.data?.productTypeStats || []
  const detailedRecords = stats?.data?.detailedRecords || []

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Need Repair Statistics</h1>
          <p className="text-gray-600 mt-1">Track repair requests by designer and time period</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            {getTimeRangeLabel()}
          </Badge>
          <Button onClick={() => refetch()} className="bg-pink-600 hover:bg-pink-700 text-white shadow-md">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-lg">Time Period</CardTitle>
          <CardDescription>Select the time range for repair statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
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
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-64 justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
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
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleDateRangeSelect}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Repairs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary.totalRepairs || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Items needing repair</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Design Errors</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary.designErrors || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Designer mistakes</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Customer Changes</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary.customerChanges || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Customer requests</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Active Designers</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary.uniqueDesigners || 0}</div>
            <p className="text-xs text-gray-600 mt-1">Designers involved</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="designers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="designers">By Designer</TabsTrigger>
          <TabsTrigger value="products">By Product</TabsTrigger>
        </TabsList>

        <TabsContent value="designers" className="space-y-4">
          <Card className="shadow-md border-0">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center">
                <Users className="h-5 w-5 text-pink-600 mr-2" />
                Repair Statistics by Designer
              </CardTitle>
              <CardDescription>Breakdown of repair requests by designer and issue type</CardDescription>
            </CardHeader>
            <CardContent>
              {designerStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Designer</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Design Errors</TableHead>
                      <TableHead className="text-center">Customer Changes</TableHead>
                      <TableHead className="text-center">Error Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {designerStats.map((designer: any, index: number) => {
                      const errorRate =
                        designer.total > 0 ? ((designer.design_error / designer.total) * 100).toFixed(1) : "0.0"
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <Link
                                href={`/need-repair/${encodeURIComponent(designer.designer)}`}
                                className="text-pink-600 hover:text-pink-700 hover:underline font-medium"
                              >
                                {designer.designer}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-gray-50">
                              {designer.total}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {designer.design_error}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {designer.customer_change}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span
                                className={`font-medium ${Number.parseFloat(errorRate) > 20 ? "text-red-600" : Number.parseFloat(errorRate) > 10 ? "text-orange-600" : "text-green-600"}`}
                              >
                                {errorRate}%
                              </span>
                              {Number.parseFloat(errorRate) > 20 ? (
                                <ArrowUpRight className="h-3 w-3 text-red-600" />
                              ) : Number.parseFloat(errorRate) > 10 ? (
                                <TrendingUp className="h-3 w-3 text-orange-600" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 text-green-600" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No repair data found for the selected time period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card className="shadow-md border-0">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center">
                <Package className="h-5 w-5 text-pink-600 mr-2" />
                Repair Statistics by Product Type
              </CardTitle>
              <CardDescription>Breakdown of repair requests by product category</CardDescription>
            </CardHeader>
            <CardContent>
              {productTypeStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Type</TableHead>
                      <TableHead className="text-center">Repair Count</TableHead>
                      <TableHead className="text-center">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productTypeStats.map((product: any, index: number) => {
                      const percentage =
                        summary.totalRepairs > 0 ? ((product.count / summary.totalRepairs) * 100).toFixed(1) : "0.0"
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-400" />
                              {product.product}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                              {product.count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-gray-900">{percentage}%</span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No product data found for the selected time period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 text-pink-600 mr-2" />
            Detailed Repair Records
          </CardTitle>
          <CardDescription>Individual repair items with designer and error details</CardDescription>
        </CardHeader>
        <CardContent>
          {detailedRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item ID</TableHead>
                  <TableHead>Designer</TableHead>
                  <TableHead>Checker</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Issue Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedRecords.map((repair: any) => (
                  <TableRow key={repair.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                          {repair.item_id}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyItemId(repair.item_id)}
                          className="h-6 w-6 p-0 hover:bg-pink-50"
                          title="Copy Item ID"
                        >
                          <Copy
                            className={`h-3 w-3 ${copiedItemId === repair.item_id ? "text-green-600" : "text-gray-400"}`}
                          />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <Link
                          href={`/need-repair/${encodeURIComponent(repair.designer)}`}
                          className="text-pink-600 hover:text-pink-700 hover:underline font-medium"
                        >
                          {repair.designer}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{repair.users?.email || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        {repair.product_type}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                          {repair.order_note || "No description provided"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        {timeAgo(repair.created_at)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No repair records found for the selected time period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
