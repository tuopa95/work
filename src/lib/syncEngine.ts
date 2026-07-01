/**
 * Dual-Write Offline-Sync Engine
 * Ensures data entered is backed up in browser's local storage and automatically
 * synced back to the server if the container restarts and wipes the ephemeral JSON file.
 */

export interface Attachment {
  id: string;
  image_url: string;
  category: string;
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

const BACKUP_KEY = "reimbursement_expenses_backup_v1";

/**
 * Loads backup expenses list from localStorage
 */
export function getLocalBackup(): Expense[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read local expenses backup:", e);
    return [];
  }
}

/**
 * Saves a list of expenses to client localStorage backup
 */
export function saveLocalBackup(expenses: Expense[]) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error("Failed to write local expenses backup:", e);
  }
}

/**
 * Appends a new single expense to client localStorage backup
 */
export function appendToLocalBackup(expense: Expense) {
  const current = getLocalBackup();
  // Avoid duplicate insertion
  if (!current.some(e => e.id === expense.id)) {
    current.unshift(expense);
    saveLocalBackup(current);
  }
}

/**
 * Synchronizes client backup expenses with server
 * @param serverExpenses The expenses loaded from the server
 * @returns Synchronized list of all expenses
 */
export async function syncExpensesWithServer(serverExpenses: Expense[]): Promise<Expense[]> {
  const localBackup = getLocalBackup();
  
  // 1. Update our local backup with anything new from the server
  const localMap = new Map(localBackup.map(e => [e.id, e]));
  let hasNewFromServer = false;
  
  for (const exp of serverExpenses) {
    if (!localMap.has(exp.id)) {
      localBackup.push(exp);
      localMap.set(exp.id, exp);
      hasNewFromServer = true;
    }
  }
  
  if (hasNewFromServer) {
    // Sort descending by date
    localBackup.sort((a, b) => {
      const timeA = new Date(a.created_at || a.expense_date).getTime();
      const timeB = new Date(b.created_at || b.expense_date).getTime();
      return timeB - timeA;
    });
    saveLocalBackup(localBackup);
  }
  
  // 2. Identify if there are any records in local backup missing on the server
  const serverMap = new Map(serverExpenses.map(e => [e.id, e]));
  const missingOnServer = localBackup.filter(e => !serverMap.has(e.id));
  
  if (missingOnServer.length > 0) {
    console.log(`SyncEngine: Found ${missingOnServer.length} records missing on server. Synchronizing...`);
    try {
      const response = await fetch("/api/expenses/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: missingOnServer })
      });
      const result = await response.json();
      if (result.success) {
        console.log(`SyncEngine: Successfully synchronized and restored ${result.addedCount} records back to the server.`);
        // Re-fetch or merge locally
        const updatedResponse = await fetch("/api/expenses");
        const updatedResult = await updatedResponse.json();
        if (updatedResult.success) {
          return updatedResult.data;
        }
      }
    } catch (err) {
      console.error("SyncEngine: Failed to sync missing records with server:", err);
    }
  }
  
  return localBackup;
}
