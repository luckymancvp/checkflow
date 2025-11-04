export interface OrderComment {
  id: string
  order_item_id: string
  user_email: string
  user_name: string
  user_avatar?: string | null
  comment_text: string
  created_at: string
  updated_at: string
}

export interface CommentResponse {
  success: boolean
  data: OrderComment[]
  error?: string
}

export interface CreateCommentRequest {
  comment_text: string
  user_name: string
  user_email: string
  user_avatar?: string | null
}
