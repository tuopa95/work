import React, { useState, useRef, useEffect } from "react";
import { Upload, X, Plus, Sparkles, CheckCircle2, ChevronRight, ArrowRight, GripVertical, Trash2, Save, RotateCcw, Calendar, Check } from "lucide-react";
import { Attachment, AttachmentCategory } from "../types";
import { appendToLocalBackup } from "../lib/syncEngine";

interface EmployeeFormProps {
  onSuccess: () => void;
}

interface ExpenseEntry {
  id: string;
  expenseDate: string;
  amount: string;
  remark: string;
  attachments: Attachment[];
}

export default function EmployeeForm({ onSuccess }: EmployeeFormProps) {
  // Main Form States
  const [name, setName] = useState("");
  const [entries, setEntries] = useState<ExpenseEntry[]>([
    {
      id: "initial-entry-1",
      expenseDate: new Date().toISOString().split("T")[0],
      amount: "",
      remark: "",
      attachments: []
    }
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Draft Persistence States
  const isInitialized = useRef(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [hasDraftLoaded, setHasDraftLoaded] = useState(false);

  // Per-entry Drag & Drop states for upload zones
  const [dragActiveStates, setDragActiveStates] = useState<{ [entryId: string]: boolean }>({});
  
  // Drag and drop sorting states for attachments
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);

  // Helper to calculate offset date string (YYYY-MM-DD)
  const getRelativeDateStr = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().split("T")[0];
  };

  // 1. Load draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("reimbursement_draft");
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.name) setName(parsed.name);
        if (parsed.entries && Array.isArray(parsed.entries) && parsed.entries.length > 0) {
          setEntries(parsed.entries);
          setHasDraftLoaded(true);
          // Auto fade out draft loaded indicator after 4 seconds
          setTimeout(() => setHasDraftLoaded(false), 4000);
        }
      }
    } catch (e) {
      console.error("加载草稿失败", e);
    } finally {
      isInitialized.current = true;
    }
  }, []);

  // 2. Auto save draft when content changes
  useEffect(() => {
    if (!isInitialized.current) return;

    const hasContent = name.trim() !== "" || entries.some(e => e.amount !== "" || e.remark !== "" || e.attachments.length > 0);
    if (hasContent) {
      const draft = { name, entries };
      localStorage.setItem("reimbursement_draft", JSON.stringify(draft));
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      setLastSavedTime(timeStr);
    }
  }, [name, entries]);

  // Clear draft & reset form
  const handleClearDraft = () => {
    if (window.confirm("确定要清空并重置当前编辑的所有内容吗？")) {
      localStorage.removeItem("reimbursement_draft");
      setName("");
      setEntries([
        {
          id: `entry-reset-${Date.now()}`,
          expenseDate: new Date().toISOString().split("T")[0],
          amount: "",
          remark: "",
          attachments: []
        }
      ]);
      setLastSavedTime("");
      setHasDraftLoaded(false);
    }
  };

  // References to file inputs (since each entry can trigger click)
  const fileInputRefs = useRef<{ [entryId: string]: HTMLInputElement | null }>({});

  // File category configuration
  const CATEGORIES: { value: AttachmentCategory; label: string; icon: string }[] = [
    { value: "invoice", label: "发票", icon: "📄" },
    { value: "payment", label: "付款截图", icon: "💳" },
    { value: "itinerary", label: "行程单", icon: "🚄" },
    { value: "other", label: "其它", icon: "📁" }
  ];

  // Map file names to a default category guess
  const guessCategory = (fileName: string): AttachmentCategory => {
    const lower = fileName.toLowerCase();
    
    // Invoice / 发票 / PDF / 收据
    if (
      lower.includes("fapiao") || 
      lower.includes("invoice") || 
      lower.includes("发票") || 
      lower.includes("pdf") ||
      lower.includes("收据") ||
      lower.includes("专票") ||
      lower.includes("普票") ||
      lower.includes("税") ||
      lower.includes("tax")
    ) {
      return "invoice";
    }
    
    // Itinerary / 行程单 / 交通打车 / 火车机票
    if (
      lower.includes("trip") ||
      lower.includes("train") ||
      lower.includes("flight") ||
      lower.includes("didi") ||
      lower.includes("gaotie") ||
      lower.includes("行程") ||
      lower.includes("火车") ||
      lower.includes("机票") ||
      lower.includes("滴滴") ||
      lower.includes("打车") ||
      lower.includes("出租车") ||
      lower.includes("客票") ||
      lower.includes("登机牌") ||
      lower.includes("动车") ||
      lower.includes("客运") ||
      lower.includes("高德") ||
      lower.includes("t3") ||
      lower.includes("携程") ||
      lower.includes("去哪儿") ||
      lower.includes("同程") ||
      lower.includes("12306") ||
      lower.includes("itinerary") ||
      lower.includes("boarding") ||
      lower.includes("ticket") ||
      lower.includes("taxi") ||
      lower.includes("subway") ||
      lower.includes("metro") ||
      lower.includes("bus") ||
      lower.includes("航旅") ||
      lower.includes("车票")
    ) {
      return "itinerary";
    }

    // Payment Screenshots / 付款截图 / 账单微信支付宝
    if (
      lower.includes("screenshot") ||
      lower.includes("pay") ||
      lower.includes("zhifubao") ||
      lower.includes("weixin") ||
      lower.includes("截图") ||
      lower.includes("微信") ||
      lower.includes("支付宝") ||
      lower.includes("meituan") ||
      lower.includes("美团") ||
      lower.includes("付款") ||
      lower.includes("支付") ||
      lower.includes("账单") ||
      lower.includes("扣款") ||
      lower.includes("交易") ||
      lower.includes("凭证") ||
      lower.includes("转账") ||
      lower.includes("receipt") ||
      lower.includes("bill")
    ) {
      return "payment";
    }

    return "other";
  };

  // Add another expense entry
  const handleAddEntry = () => {
    const lastEntryDate = entries[entries.length - 1]?.expenseDate || new Date().toISOString().split("T")[0];
    setEntries((prev) => [
      ...prev,
      {
        id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        expenseDate: lastEntryDate, // default to previous date to save typing
        amount: "",
        remark: "",
        attachments: []
      }
    ]);
  };

  // Remove an expense entry
  const handleRemoveEntry = (id: string) => {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  // Update specific field in an entry
  const updateEntryField = (id: string, field: keyof ExpenseEntry, value: any) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Convert files to Base64 and upload to server for a specific entry
  const processFiles = async (entryId: string, files: FileList) => {
    const newAttachments: Attachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        alert("目前仅支持上传图片格式（如发票、付款截图等）");
        continue;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            base64
          })
        });

        const result = await response.json();
        if (result.success) {
          newAttachments.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            image_url: result.url,
            category: guessCategory(file.name),
            fileName: file.name,
            base64: base64
          });
        } else {
          console.error("上传失败:", result.error);
        }
      } catch (error) {
        console.error("网络上传异常:", error);
      }
    }

    setEntries((prev) =>
      prev.map((item) =>
        item.id === entryId
          ? { ...item, attachments: [...item.attachments, ...newAttachments] }
          : item
      )
    );
  };

  const handleFileChange = (entryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(entryId, e.target.files);
    }
  };

  // Drag over upload container for an entry
  const handleDrag = (entryId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveStates((prev) => ({ ...prev, [entryId]: true }));
    } else if (e.type === "dragleave") {
      setDragActiveStates((prev) => ({ ...prev, [entryId]: false }));
    }
  };

  // Drop files onto upload container for an entry
  const handleDropFiles = (entryId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveStates((prev) => ({ ...prev, [entryId]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(entryId, e.dataTransfer.files);
    }
  };

  // Delete an attachment from an entry
  const deleteAttachment = (entryId: string, attachmentId: string) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.id === entryId
          ? { ...item, attachments: item.attachments.filter((a) => a.id !== attachmentId) }
          : item
      )
    );
  };

  // Change category of an attachment
  const handleCategoryChange = (entryId: string, attachmentId: string, category: AttachmentCategory) => {
    setEntries((prev) =>
      prev.map((item) =>
        item.id === entryId
          ? {
              ...item,
              attachments: item.attachments.map((a) =>
                a.id === attachmentId ? { ...a, category } : a
              )
            }
          : item
      )
    );
  };

  // Drag sorting events for images
  const handleItemDragStart = (e: React.DragEvent, entryId: string, index: number) => {
    setDraggedIndex(index);
    setDraggedEntryId(entryId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleItemDrop = (e: React.DragEvent, entryId: string, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedEntryId !== entryId || draggedIndex === targetIndex) return;

    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== entryId) return item;
        const list = [...item.attachments];
        const [draggedItem] = list.splice(draggedIndex, 1);
        list.splice(targetIndex, 0, draggedItem);
        return { ...item, attachments: list };
      })
    );
  };

  const handleItemDragEnd = () => {
    setDraggedIndex(null);
    setDraggedEntryId(null);
  };

  // Calculate combined totals for display
  const totalSummaryAmount = entries.reduce((sum, item) => {
    const val = Number(item.amount);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const totalSummaryAttachmentsCount = entries.reduce((sum, item) => {
    return sum + item.attachments.length;
  }, 0);

  // Submit Reimbursements (Batch / Parallel API submission)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("请输入您的姓名");

    // Validate entries
    for (let i = 0; i < entries.length; i++) {
      const item = entries[i];
      const entryNum = i + 1;
      if (!item.expenseDate) {
        return alert(`第 ${entryNum} 笔报销未选择日期`);
      }
      if (!item.amount || isNaN(Number(item.amount)) || Number(item.amount) <= 0) {
        return alert(`第 ${entryNum} 笔报销请输入有效的报销金额`);
      }
    }

    setIsSubmitting(true);
    let successCount = 0;

    try {
      // Submit each entry to the backend API sequentially
      for (let i = 0; i < entries.length; i++) {
        const item = entries[i];
        setSubmitProgress(`正在提交第 ${i + 1} / ${entries.length} 笔报销明细...`);

        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            expense_date: item.expenseDate,
            amount: Number(item.amount),
            remark: item.remark.trim(),
            attachments: item.attachments
          })
        });

        const result = await response.json();
        if (result.success) {
          successCount++;
          // Append to local storage backup to prevent any data loss on server restart
          if (result.data) {
            appendToLocalBackup(result.data);
          }
        } else {
          throw new Error(result.error || `第 ${i + 1} 笔报销明细上传失败`);
        }
      }

      if (successCount === entries.length) {
        setShowSuccessModal(true);
        // Clear draft from localStorage on successful submission
        localStorage.removeItem("reimbursement_draft");
        setLastSavedTime("");
        setHasDraftLoaded(false);
        // Reset state after successful submission
        setName("");
        setEntries([
          {
            id: "initial-entry-1",
            expenseDate: new Date().toISOString().split("T")[0],
            amount: "",
            remark: "",
            attachments: []
          }
        ]);
        onSuccess();
      }
    } catch (error: any) {
      alert(`报销提交失败: ${error.message || "网络异常，请稍后重试"}`);
    } finally {
      setIsSubmitting(false);
      setSubmitProgress("");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto" id="employee-submission-form-container">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-zinc-800 shadow-sm transition-all duration-300">
        
        {/* Header Summary info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150/40 dark:border-zinc-850 pb-5 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">提交多笔报销</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">支持按不同日期一次性添加并提报多笔报销明细</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold">报销人姓名:</span>
            <input
              id="form-global-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的真实姓名"
              className="px-3.5 py-1.5 rounded-lg border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#121214] text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs w-44"
            />
          </div>
        </div>

        {/* Draft Restore Alert */}
        {hasDraftLoaded && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in" id="draft-loaded-alert">
            <span className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              已自动恢复您上次填写的报销草稿内容，继续编辑即可
            </span>
            <button
              type="button"
              onClick={() => setHasDraftLoaded(false)}
              className="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-300 font-bold text-xs"
            >
              我知道了
            </button>
          </div>
        )}

        {/* Draft Saving Status Bar */}
        {lastSavedTime && (
          <div className="mb-5 px-4 py-2.5 bg-gray-50/50 dark:bg-zinc-900/40 rounded-xl border border-gray-150/40 dark:border-zinc-850 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              明细内容已于 <strong className="font-mono text-gray-700 dark:text-gray-200">{lastSavedTime}</strong> 自动保存至本地草稿箱
            </span>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
              title="清空当前草稿并重新填写"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>清空并重置表单</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Entries Cards List */}
          <div className="space-y-6" id="bulk-entries-container">
            {entries.map((item, index) => {
              const entryId = item.id;
              const isDragActive = !!dragActiveStates[entryId];

              return (
                <div
                  key={entryId}
                  className="p-5 md:p-6 rounded-2xl border border-gray-150 dark:border-zinc-850 bg-gray-50/40 dark:bg-zinc-900/10 hover:border-blue-200 dark:hover:border-zinc-800 transition-all relative group"
                >
                  {/* Card Title & Delete bar */}
                  <div className="flex items-center justify-between mb-4 border-b border-gray-150/40 dark:border-zinc-850/60 pb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
                      报销明细 #{index + 1}
                    </span>
                    
                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEntry(entryId)}
                        className="p-1 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                        title="删除该条明细"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>删除此明细</span>
                      </button>
                    )}
                  </div>

                  {/* Core Fields of Entry */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="md:col-span-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
                          消费日期 <span className="text-rose-500">*</span>
                        </label>
                        {item.expenseDate && (
                          <span className="text-[10px] text-blue-500 font-medium bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-md">
                            {(() => {
                              try {
                                const d = new Date(item.expenseDate);
                                const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
                                return days[d.getDay()];
                              } catch {
                                return "";
                              }
                            })()}
                          </span>
                        )}
                      </div>
                      
                      {/* Single ultra-premium custom styled date input with calendar icon */}
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
                          📅
                        </span>
                        <input
                          type="date"
                          required
                          value={item.expenseDate}
                          onChange={(e) => updateEntryField(entryId, "expenseDate", e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-[#121214] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-semibold font-mono cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        报销金额 (元) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">¥</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.amount}
                          onChange={(e) => updateEntryField(entryId, "amount", e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-6 pr-4 py-2 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-[#121214] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-mono font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">备注/用途说明</label>
                    <textarea
                      value={item.remark}
                      onChange={(e) => updateEntryField(entryId, "remark", e.target.value)}
                      placeholder="如：工作日加班打车、研发部团建就餐等 (可选)"
                      rows={1}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-[#121214] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs resize-none"
                    />
                  </div>

                  {/* Attachment uploads for this card entry */}
                  <div className="space-y-3">
                    <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
                      凭证图片图片 ({item.attachments.length}张)
                    </span>

                    {/* Entry Specific Dropzone */}
                    <div
                      onDragEnter={(e) => handleDrag(entryId, e)}
                      onDragOver={(e) => handleDrag(entryId, e)}
                      onDragLeave={(e) => handleDrag(entryId, e)}
                      onDrop={(e) => handleDropFiles(entryId, e)}
                      onClick={() => fileInputRefs.current[entryId]?.click()}
                      className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[80px] ${
                        isDragActive
                          ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 scale-[0.99]"
                          : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-[#121214]/50"
                      }`}
                    >
                      <input
                        ref={(el) => {
                          fileInputRefs.current[entryId] = el;
                        }}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileChange(entryId, e)}
                        className="hidden"
                      />
                      <Upload className="w-4 h-4 text-gray-400 mb-1" />
                      <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                        拖拽凭证或 <span className="text-blue-500 font-semibold">点击上传</span>
                      </p>
                    </div>

                    {/* Image thumb preview list */}
                    {item.attachments.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {item.attachments.map((att, attIndex) => (
                          <div
                            key={att.id}
                            draggable
                            onDragStart={(e) => handleItemDragStart(e, entryId, attIndex)}
                            onDragOver={handleItemDragOver}
                            onDrop={(e) => handleItemDrop(e, entryId, attIndex)}
                            onDragEnd={handleItemDragEnd}
                            className={`relative flex gap-2.5 p-2 bg-white dark:bg-[#121214] border border-gray-150/60 dark:border-zinc-850 rounded-xl transition-all text-xs ${
                              draggedIndex === attIndex && draggedEntryId === entryId
                                ? "opacity-40 border-blue-500"
                                : "hover:border-gray-200 dark:hover:border-zinc-800"
                            }`}
                          >
                            {/* Drag Grip */}
                            <div className="flex items-center text-gray-300 dark:text-zinc-700 cursor-grab active:cursor-grabbing hover:text-gray-400">
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>

                            {/* Image Thumbnail */}
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-gray-200/40 dark:border-zinc-700 flex-shrink-0">
                              <img
                                src={att.image_url}
                                alt={att.fileName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                              <div>
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-300 truncate pr-4" title={att.fileName}>
                                  {att.fileName}
                                </p>
                                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 block mt-1 mb-1.5">
                                  标定类型 (关系到后台筛选):
                                </span>
                              </div>

                              {/* Categorize line */}
                              <div className="flex flex-wrap gap-1.5">
                                {CATEGORIES.map((cat) => (
                                  <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => handleCategoryChange(entryId, att.id, cat.value)}
                                    className={`px-2 py-1 text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 border ${
                                      att.category === cat.value
                                        ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 font-bold shadow-xs scale-102"
                                        : "bg-gray-50/50 dark:bg-[#1a1a1c] text-gray-500 dark:text-gray-400 border-gray-150 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-gray-200"
                                    }`}
                                  >
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Close icon */}
                            <button
                              type="button"
                              onClick={() => deleteAttachment(entryId, att.id)}
                              className="absolute right-1.5 top-1.5 p-0.5 rounded-full text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add entry row and stats summary */}
          <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <button
              id="add-entry-row-btn"
              type="button"
              onClick={handleAddEntry}
              className="py-3 px-5 rounded-2xl border border-dashed border-gray-200 hover:border-blue-500 dark:border-zinc-800 dark:hover:border-blue-400 text-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>添加一笔新的报销明细</span>
            </button>

            {/* Subtotal counters box */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-150/50 dark:border-zinc-850 flex items-center justify-between gap-6 text-xs">
              <div>
                <span className="text-gray-400 block font-semibold uppercase">报销总笔数</span>
                <span className="text-base font-black text-gray-900 dark:text-white mt-0.5 font-mono">{entries.length} 笔</span>
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-zinc-800" />
              <div>
                <span className="text-gray-400 block font-semibold uppercase">凭证图片总计</span>
                <span className="text-base font-black text-gray-900 dark:text-white mt-0.5 font-mono">{totalSummaryAttachmentsCount} 张</span>
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-zinc-800" />
              <div>
                <span className="text-gray-400 block font-semibold uppercase">合并提报总金额</span>
                <span className="text-base font-black text-blue-500 dark:text-blue-400 mt-0.5 font-mono">
                  ¥{totalSummaryAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800 text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            支持追加多张发票与付款截图。点击提交将一键归档所有明细，且预留AI发票智能审核通道。
          </div>

          {/* Submit Button */}
          <button
            id="submit-expense-btn"
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-white tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
              isSubmitting
                ? "bg-blue-400 dark:bg-blue-600/70 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 active:scale-[0.99] hover:shadow-lg hover:shadow-blue-500/10"
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{submitProgress || "正在提报中..."}</span>
              </>
            ) : (
              <>
                <span>一键提交所有报销 ({entries.length} 笔)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" id="submission-success-modal">
          <div className="bg-white dark:bg-[#1c1c1e] max-w-sm w-full rounded-3xl p-6 md:p-8 text-center shadow-xl border border-gray-100 dark:border-zinc-800 scale-in transition-all">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 border border-emerald-100/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">提交成功</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              您提报的所有报销凭证已成功合并上传，管理员将在后台即刻对账。
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
              }}
              className="w-full py-3 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold text-sm transition-all shadow-sm cursor-pointer"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
