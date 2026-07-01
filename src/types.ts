export type AttachmentCategory = 'invoice' | 'payment' | 'itinerary' | 'other';

export interface Attachment {
  id: string; // unique local ID for drag-and-drop and state management
  image_url: string; // Base64 or local server URL or Supabase Storage URL
  category: AttachmentCategory;
  fileName: string;
  base64?: string;
}

export interface Expense {
  id: string;
  name: string;
  expense_date: string;
  amount: number;
  remark: string;
  attachments: Attachment[];
  created_at: string;
}

export interface DashboardStats {
  totalPeople: number;
  totalAmount: number;
  todayCount: number;
  thisMonthCount: number;
}
