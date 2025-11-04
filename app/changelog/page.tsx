"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, Plus, Bug, Zap, ArrowUp } from "lucide-react"

interface ChangelogEntry {
  version: string
  date: string
  type: "feature" | "bugfix" | "improvement" | "breaking"
  changes: string[]
}

const changelogEntries: ChangelogEntry[] = [
  {
    version: "1.4.0",
    date: "2025-09-05",
    type: "improvement",
    changes: [
      "Loại bỏ hiển thị danh sách order, người dùng chuyển thẳng sang sequential review",
      "Thay đổi lựa chọn sheet từ dropdown sang định dạng card đẹp mắt hơn",
      "Filter mặc định hiển thị và tăng khả năng hiển thị product type filter",
      "Thêm số lượng đi kèm trong filter status để dễ theo dõi",
      "Sửa việc đếm status sử dụng toàn bộ orders không phụ thuộc pagination",
      "Tối ưu loading status count đồng thời cho tất cả sheets",
      "Thêm nút refresh và auto-refresh 10s cho status count",
      "Thêm validation cột mapping để phát hiện lỗi cấu hình",
      "Vô hiệu hóa sheet selection khi có lỗi column mapping",
      "Cải thiện giao diện và sửa ngôn ngữ hiển thị",
    ],
  },
  {
    version: "1.3.0",
    date: "2025-09-04",
    type: "improvement",
    changes: [
      "Tối ưu preload chỉ áp dụng cho ảnh mockup để giảm tải băng thông",
      "Sửa lỗi blob URL bị mất khi navigate back giữa các order",
      "Thêm phím tắt 'c' để copy itemId nhanh chóng",
      "Cập nhật page size: bỏ option 10, thêm 25, mặc định 50 items",
      "Lưu filter của user vào localStorage với default Status = DESIGNED hoặc REPAIRED",
      "Xóa trang dashboard và đặt /review làm trang chủ mặc định",
      "Sửa lỗi preventDefault trong passive event listener khi zoom ảnh",
    ],
  },
  {
    version: "1.2.0",
    date: "2025-09-04",
    type: "feature",
    changes: [
      "Thêm tính năng preload ảnh mockup để tối ưu tốc độ tải",
      "Cải thiện hệ thống cache blob URL cho ảnh",
      "Thêm phím tắt 's' để chụp màn hình và copy vào clipboard",
      "Refactor component OrderReviewModal thành các file nhỏ hơn để dễ maintain",
    ],
  },
  {
    version: "1.1.5",
    date: "2024-12-18",
    type: "bugfix",
    changes: [
      "Sửa lỗi preventDefault trong passive event listener khi zoom ảnh",
      "Khắc phục vấn đề blob URL bị revoke khi navigate giữa các order",
      "Loại bỏ console.log không cần thiết trong use-order-data.ts",
    ],
  },
  {
    version: "1.1.0",
    date: "2024-12-15",
    type: "feature",
    changes: [
      "Thêm tính năng review order với modal chi tiết",
      "Hỗ trợ xem ảnh mockup, design và product trong tabs",
      "Thêm keyboard shortcuts cho navigation nhanh",
      "Tích hợp Google Sheets để sync dữ liệu order",
    ],
  },
  {
    version: "1.0.5",
    date: "2024-12-10",
    type: "improvement",
    changes: [
      "Cải thiện UI/UX cho trang dashboard",
      "Tối ưu performance loading dữ liệu",
      "Thêm loading states cho các component",
    ],
  },
  {
    version: "1.0.0",
    date: "2024-12-01",
    type: "feature",
    changes: [
      "Ra mắt phiên bản đầu tiên của CheckFlow",
      "Tính năng đăng nhập với Supabase Auth",
      "Dashboard cơ bản với thống kê order",
      "Quản lý user và phân quyền",
    ],
  },
]

const getTypeIcon = (type: ChangelogEntry["type"]) => {
  switch (type) {
    case "feature":
      return <Plus className="h-4 w-4" />
    case "bugfix":
      return <Bug className="h-4 w-4" />
    case "improvement":
      return <ArrowUp className="h-4 w-4" />
    case "breaking":
      return <Zap className="h-4 w-4" />
    default:
      return <Plus className="h-4 w-4" />
  }
}

const getTypeBadge = (type: ChangelogEntry["type"]) => {
  const variants = {
    feature: "bg-green-100 text-green-800 border-green-200",
    bugfix: "bg-red-100 text-red-800 border-red-200",
    improvement: "bg-blue-100 text-blue-800 border-blue-200",
    breaking: "bg-orange-100 text-orange-800 border-orange-200",
  }

  const labels = {
    feature: "Tính năng mới",
    bugfix: "Sửa lỗi",
    improvement: "Cải thiện",
    breaking: "Thay đổi lớn",
  }

  return (
    <Badge className={`${variants[type]} border`}>
      {getTypeIcon(type)}
      <span className="ml-1">{labels[type]}</span>
    </Badge>
  )
}

export default function ChangelogPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Changelog</h1>
        <p className="text-gray-600">Theo dõi các cập nhật, tính năng mới và sửa lỗi của CheckFlow</p>
      </div>

      <div className="space-y-6">
        {changelogEntries.map((entry, index) => (
          <Card key={entry.version} className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-semibold">Version {entry.version}</CardTitle>
                  {getTypeBadge(entry.type)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(entry.date).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {entry.changes.map((change, changeIndex) => (
                  <li key={changeIndex} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                    <span className="text-gray-700 leading-relaxed">{change}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            {index < changelogEntries.length - 1 && <Separator className="mt-6" />}
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm">
          Để biết thêm thông tin chi tiết về các cập nhật, vui lòng liên hệ team phát triển.
        </p>
      </div>
    </div>
  )
}
