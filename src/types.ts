export interface Attachment {
  id: string;
  image_url: string;
  category: 'invoice' | 'taxi' | 'meal' | 'hotel' | 'other' | string;
  fileName: string;
  base64?: string;
}

export interface ExpenseEntry {
  id: string;
  name: string;
  expense_date: string;
  amount: number;
  remark: string;
  attachments: Attachment[];
  submit_time?: string;
}

export interface Feedback {
  id: string;
  content: string;
  contact: string;
  createdAt: string;
}
