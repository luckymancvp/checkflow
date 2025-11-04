import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: { productType: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    const productType = decodeURIComponent(params.productType)

    const { data, error } = await supabase
      .from("product_type_notes")
      .select("*")
      .eq("product_type", productType)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching product type note:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch product type note" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || null,
    })
  } catch (error) {
    console.error("Error in GET /api/product-type-notes/[productType]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { productType: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    const productType = decodeURIComponent(params.productType)
    const { content } = await request.json()

    // Check if note already exists
    const { data: existingNote } = await supabase
      .from("product_type_notes")
      .select("id")
      .eq("product_type", productType)
      .single()

    let result
    if (existingNote) {
      // Update existing note
      result = await supabase
        .from("product_type_notes")
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("product_type", productType)
        .select()
        .single()
    } else {
      // Create new note
      result = await supabase
        .from("product_type_notes")
        .insert({
          product_type: productType,
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error("Error saving product type note:", result.error)
      return NextResponse.json({ success: false, error: "Failed to save product type note" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error("Error in POST /api/product-type-notes/[productType]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
