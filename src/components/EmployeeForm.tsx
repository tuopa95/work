import { useState, useEffect } from 'react';
import { Upload, Plus, Trash2, Send, MessageSquare, Check, Loader2, DollarSign, Calendar, FileText, CheckCircle, X } from 'lucide-react';
import { Attachment, ExpenseEntry } from '../types';

const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<{ base64: string; fileName: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ base64: event.target?.result as string, fileName: file.name });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG to significantly reduce size
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: compressedBase64, fileName: file.name.replace(/\.[^/.]+$/, "") + ".jpg" });
      };
      img.onerror = () => {
        resolve({ base64: event.target?.result as string, fileName: file.name });
      };
    };
    reader.onerror = () => {
      resolve({ base64: '', fileName: file.name });
    };
  });
};

interface EmployeeFormProps {
  onSuccess: () => void;
}

export default function EmployeeForm({ onSuccess }: EmployeeFormProps) {
  const [name, setName] = useState(() => localStorage.getItem('reporter_name') || '');
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string>('');
  const [uploadingStates, setUploadingStates] = useState<{ [entryId: string]: boolean }>({});
  const [dragActiveStates, setDragActiveStates] = useState<{ [entryId: string]: boolean }>({});

  // Submit Success state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSubmittedSummary, setLastSubmittedSummary] = useState<{
    count: number;
    totalAmount: number;
    name: string;
    entries: ExpenseEntry[];
  } | null>(null);

  // Feedback State
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load draft or initialize with one empty entry
  useEffect(() => {
    const savedEntries = localStorage.getItem('draft_entries');
    if (savedEntries) {
      try {
        const parsed = JSON.parse(savedEntries) as ExpenseEntry[];
        if (parsed.length > 0) {
          setEntries(parsed);
          setActiveEntryId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }
    // Default empty entry
    const defaultId = `entry-${Date.now()}`;
    setEntries([
      {
        id: defaultId,
        name: '',
        expense_date: new Date().toISOString().split('T')[0],
        amount: 0,
        remark: '',
        attachments: []
      }
    ]);
    setActiveEntryId(defaultId);
  }, []);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('reporter_name', name);
  }, [name]);

  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('draft_entries', JSON.stringify(entries));
    }
  }, [entries]);

  // Handle Global Paste (Ctrl+V)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          const targetId = activeEntryId || (entries.length > 0 ? entries[0].id : null);
          if (targetId) {
            e.preventDefault();
            processFiles(targetId, imageFiles);
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [activeEntryId, entries]);

  // Helper to guess category based on file name or simple heuristics
  const guessCategory = (fileName: string): string => {
    const lower = fileName.toLowerCase();
    if (lower.includes('截图') || lower.includes('付款') || lower.includes('支付') || lower.includes('微信') || lower.includes('支付宝') || lower.includes('pay') || lower.includes('screenshot')) {
      return 'payment_screenshot';
    }
    if (lower.includes('行程') || lower.includes('打车') || lower.includes('出租') || lower.includes('滴滴') || lower.includes('车票') || lower.includes('高铁') || lower.includes('机票') || lower.includes('itinerary') || lower.includes('ticket') || lower.includes('taxi') || lower.includes('didi')) {
      return 'itinerary';
    }
    if (lower.includes('出差') || lower.includes('申请') || lower.includes('审批') || lower.includes('trip') || lower.includes('request') || lower.includes('apply')) {
      return 'travel_request';
    }
    return 'invoice';
  };

  // Process selected or pasted files
  const processFiles = async (entryId: string, files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploadingStates(prev => ({ ...prev, [entryId]: true }));
    const newAttachments: Attachment[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          alert('目前仅支持上传图片格式（如发票、付款截图等）');
          continue;
        }

        let fileName = file.name;
        if (fileName === 'image.png' || !fileName) {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const date = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          fileName = `粘贴凭证_${year}${month}${date}_${hours}${minutes}${seconds}.png`;
        }

        // 1. Compress Image client-side to significantly reduce size (typically to 100kb-300kb)
        const { base64: compressedBase64, fileName: compressedName } = await compressImage(file);
        if (!compressedBase64) {
          continue;
        }

        // 2. Upload to server
        let uploadedUrl = '';
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: compressedName, type: 'image/jpeg', base64: compressedBase64 })
          });
          const result = await res.json();
          if (result.success) {
            uploadedUrl = result.url;
          } else {
            console.warn('Server upload failed, using local base64 fallback:', result.error);
          }
        } catch (error) {
          console.warn('Server upload network error, using local base64 fallback:', error);
        }

        // 3. Add attachment (fallback to compressedBase64 if uploadedUrl is empty)
        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          image_url: uploadedUrl || compressedBase64,
          category: guessCategory(compressedName),
          fileName: compressedName,
          base64: compressedBase64
        });
      }

      if (newAttachments.length > 0) {
        setEntries(prev =>
          prev.map(item =>
            item.id === entryId
              ? { ...item, attachments: [...item.attachments, ...newAttachments] }
              : item
          )
        );
      }
    } finally {
      setUploadingStates(prev => ({ ...prev, [entryId]: false }));
    }
  };

  // Drag and Drop Handlers
  const handleDrag = (entryId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveStates(prev => ({ ...prev, [entryId]: true }));
    } else if (e.type === 'dragleave') {
      setDragActiveStates(prev => ({ ...prev, [entryId]: false }));
    }
  };

  const handleDropFiles = (entryId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveStates(prev => ({ ...prev, [entryId]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(entryId, e.dataTransfer.files);
    }
  };

  // Handle normal file input change
  const handleFileChange = (entryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(entryId, e.target.files);
    }
  };

  // Add a new empty entry row
  const addEntry = () => {
    const newId = `entry-${Date.now()}`;
    const newEntry: ExpenseEntry = {
      id: newId,
      name: '',
      expense_date: new Date().toISOString().split('T')[0],
      amount: 0,
      remark: '',
      attachments: []
    };
    setEntries(prev => [...prev, newEntry]);
    setActiveEntryId(newId);
  };

  // Remove an entry
  const removeEntry = (entryId: string) => {
    if (entries.length <= 1) return;
    setEntries(prev => prev.filter(item => item.id !== entryId));
    if (activeEntryId === entryId) {
      const remaining = entries.filter(item => item.id !== entryId);
      setActiveEntryId(remaining[0]?.id || '');
    }
  };

  // Update specific field in an entry
  const updateEntryField = (entryId: string, field: keyof ExpenseEntry, value: any) => {
    setEntries(prev =>
      prev.map(item => (item.id === entryId ? { ...item, [field]: value } : item))
    );
  };

  // Update category of an attachment
  const updateAttachmentCategory = (entryId: string, attachmentId: string, category: string) => {
    setEntries(prev =>
      prev.map(item => {
        if (item.id !== entryId) return item;
        return {
          ...item,
          attachments: item.attachments.map(att =>
            att.id === attachmentId ? { ...att, category } : att
          )
        };
      })
    );
  };

  // Delete an attachment
  const deleteAttachment = (entryId: string, attachmentId: string) => {
    setEntries(prev =>
      prev.map(item => {
        if (item.id !== entryId) return item;
        return {
          ...item,
          attachments: item.attachments.filter(att => att.id !== attachmentId)
        };
      })
    );
  };

  // Clear current draft
  const handleClearDraft = () => {
    if (window.confirm('确定要清空当前编辑的所有内容吗？')) {
      const defaultId = `entry-${Date.now()}`;
      setEntries([
        {
          id: defaultId,
          name: '',
          expense_date: new Date().toISOString().split('T')[0],
          amount: 0,
          remark: '',
          attachments: []
        }
      ]);
      setActiveEntryId(defaultId);
      localStorage.removeItem('draft_entries');
    }
  };

  // Submit reimbursement list to server
  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!name.trim()) {
      alert('请填写报销人姓名');
      return;
    }

    // Validate entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.amount <= 0) {
        alert(`明细 #${i + 1} 的报销金额必须大于 ¥0`);
        return;
      }
      if (entry.attachments.length === 0) {
        alert(`明细 #${i + 1} 必须至少上传一张凭证图片`);
        return;
      }
    }

    // Build final data
    const finalData = entries.map(item => ({
      ...item,
      name: name.trim()
    }));

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });
      const data = await res.json();
      if (data.success) {
        // Prepare success summary to show in custom modal
        const total = finalData.reduce((acc, curr) => acc + curr.amount, 0);
        setLastSubmittedSummary({
          count: finalData.length,
          totalAmount: total,
          name: name.trim(),
          entries: [...entries]
        });
        setShowSuccessModal(true);

        // Clear draft
        localStorage.removeItem('draft_entries');
        const defaultId = `entry-${Date.now()}`;
        setEntries([
          {
            id: defaultId,
            name: '',
            expense_date: new Date().toISOString().split('T')[0],
            amount: 0,
            remark: '',
            attachments: []
          }
        ]);
        setActiveEntryId(defaultId);
        onSuccess();
      } else {
        alert(`提交失败: ${data.error || '未知错误'}`);
      }
    } catch (err) {
      console.error(err);
      alert('网络提交异常，请检查网络后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Feedback submit handler
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) return;

    setSubmittingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: feedbackContent.trim(),
          contact: feedbackContact.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackSuccess(true);
        setFeedbackContent('');
        setFeedbackContact('');
        setTimeout(() => setFeedbackSuccess(false), 5000);
      } else {
        alert('反馈提交失败，请稍后重试');
      }
    } catch (err) {
      console.error(err);
      alert('网络连接错误，反馈未提交');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full mb-3.5 tracking-wide uppercase border border-blue-100/40 dark:border-blue-900/20">
          ✨ 智能账目收纳助手
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          报销凭证提交中心
        </h1>
        <p className="mt-2.5 text-xs md:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          极速、智能的凭据汇总通道。支持图片拖拽、微信截图快捷粘贴及智能自动归类。
        </p>
      </div>

      <form onSubmit={handleSubmitAll} className="space-y-6">
        {/* Step 1: Reporter Info */}
        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.02)]">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            01 / 报销人基本信息
          </h2>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              您的真实姓名 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="请输入您的姓名"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-[#121214] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Step 2: Reimbursement Entries */}
        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.02)] space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/60">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              02 / 填写报销明细 ({entries.length} 笔)
            </h2>
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline px-2.5 py-1 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-950/40 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              添加一条明细
            </button>
          </div>

          <div className="space-y-6">
            {entries.map((item, index) => {
              const entryId = item.id;
              const isDragActive = !!dragActiveStates[entryId];
              const isActive = activeEntryId === entryId || (!activeEntryId && index === 0);

              return (
                <div
                  key={entryId}
                  onClick={() => {
                    if (activeEntryId !== entryId) {
                      setActiveEntryId(entryId);
                    }
                  }}
                  className={`p-6 rounded-xl border transition-all relative group ${
                    isActive
                      ? 'border-blue-500/60 dark:border-blue-500/40 bg-[#f8faff] dark:bg-blue-950/5 shadow-sm'
                      : 'border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/10 hover:border-blue-300 hover:bg-[#fafbff]/40 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Card Title & Delete */}
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-zinc-800/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-[10px] tracking-wider uppercase">
                        Detail Item #{index + 1}
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[10px] flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          支持快捷粘贴 (Ctrl+V)
                        </span>
                      )}
                    </div>

                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEntry(entryId);
                        }}
                        className="text-gray-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        title="删除此项明细"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Input Rows */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Expense Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        消费日期 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={item.expense_date}
                        onChange={e => updateEntryField(entryId, 'expense_date', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-[#121214] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-medium"
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-gray-400" />
                        报销金额 (¥) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">
                          ¥
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.amount || ''}
                          onChange={e => updateEntryField(entryId, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full pl-6 pr-4 py-2 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-[#121214] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-gray-400" />
                      备注/用途说明
                    </label>
                    <textarea
                      value={item.remark}
                      onChange={e => updateEntryField(entryId, 'remark', e.target.value)}
                      placeholder="例如：工作日加班打车、技术部研发团建聚餐等 (可选)"
                      rows={2}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-[#121214] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs resize-none"
                    />
                  </div>

                  {/* Attachment uploads */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-bold text-gray-500 dark:text-gray-400">
                        凭证图片 ({item.attachments.length}张) <span className="text-rose-500">*</span>
                      </span>
                      {uploadingStates[entryId] && (
                        <span className="text-[10px] text-blue-500 font-semibold flex items-center gap-1.5 animate-pulse bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                          <span>正在智能处理凭证...</span>
                        </span>
                      )}
                    </div>

                    {/* Entry Specific native label Dropzone */}
                    <div
                      onDragEnter={e => handleDrag(entryId, e)}
                      onDragOver={e => handleDrag(entryId, e)}
                      onDragLeave={e => handleDrag(entryId, e)}
                      onDrop={e => handleDropFiles(entryId, e)}
                      className={`border border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center min-h-[90px] relative overflow-hidden ${
                        isDragActive
                          ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 scale-[0.99]'
                          : uploadingStates[entryId]
                            ? 'border-blue-400/60 bg-blue-50/10 dark:bg-blue-950/10 cursor-not-allowed'
                            : isActive
                              ? 'border-blue-300 dark:border-blue-900/60 bg-white dark:bg-[#121214]/50 hover:border-blue-400 hover:bg-blue-50/10'
                              : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-[#121214]/50'
                      }`}
                    >
                      <input
                        id={`file-input-${entryId}`}
                        type="file"
                        multiple
                        accept="image/*"
                        disabled={uploadingStates[entryId]}
                        onChange={e => handleFileChange(entryId, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveEntryId(entryId);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                      />
                      
                      {uploadingStates[entryId] ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 animate-pulse">
                            正在读取并保存发票凭据，请稍候...
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-gray-400 mb-1.5" />
                          <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            拖拽凭证图片、<span className="text-blue-500 hover:underline">点击上传</span> 或直接 <span className="text-blue-500">粘贴 (Ctrl+V)</span>
                          </p>
                          <p className="text-[9px] text-gray-400 dark:text-zinc-500 mt-1">
                            支持发票、车票、餐饮付款单等图片文件
                          </p>
                        </>
                      )}
                    </div>

                    {/* Image thumb preview list */}
                    {item.attachments.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                        {item.attachments.map(att => (
                          <div
                            key={att.id}
                            className="group/att relative border border-gray-150 dark:border-zinc-850 rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121214] p-1.5 flex flex-col justify-between"
                          >
                            {/* Thumbnail view */}
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-white border border-gray-100 dark:border-zinc-800 flex items-center justify-center relative">
                              <img
                                src={att.image_url}
                                alt="attachment preview"
                                className="object-contain w-full h-full"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAttachment(entryId, att.id);
                                }}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover/att:opacity-100 transition-opacity shadow-md"
                              >
                                <XIcon className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Label & Categories Selector */}
                            <div className="mt-2 space-y-1.5">
                              <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate px-1 font-mono" title={att.fileName}>
                                {att.fileName}
                              </p>
                              <div className="grid grid-cols-2 gap-1 px-0.5">
                                {[
                                  { value: 'invoice', label: '发票', emoji: '🧾' },
                                  { value: 'payment_screenshot', label: '付款截图', emoji: '📱' },
                                  { value: 'itinerary', label: '行程单', emoji: '🎫' },
                                  { value: 'travel_request', label: '出差申请', emoji: '📝' },
                                  { value: 'other', label: '其他', emoji: '📦', colSpan: true }
                                ].map(cat => (
                                  <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => updateAttachmentCategory(entryId, att.id, cat.value)}
                                    className={`text-[9px] font-bold py-1.5 px-0.5 border rounded-lg transition-all flex items-center justify-center gap-0.5 cursor-pointer select-none active:scale-95 ${
                                      cat.colSpan ? 'col-span-2' : ''
                                    } ${
                                      att.category === cat.value
                                        ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500 shadow-sm scale-[0.98]'
                                        : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200'
                                    }`}
                                  >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pt-3 pb-1">
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-2 px-7 py-3 border-2 border-dashed border-gray-200 hover:border-blue-500/80 dark:border-zinc-800 dark:hover:border-blue-400 rounded-full text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>添加一笔新的报销明细</span>
            </button>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-150 dark:border-zinc-850 shadow-sm">
          <button
            type="button"
            onClick={handleClearDraft}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
          >
            重置并清空草稿
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在提交报销明细...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>提交上述报销明细</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Problem Feedback Section */}
      <div className="mt-12 border-t border-gray-200/80 dark:border-zinc-800 pt-8">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-[#141416] dark:to-[#18181b] p-5 md:p-6 rounded-2xl border border-gray-150 dark:border-zinc-850">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                问题反馈 & 改进建议
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                如果您在手机或电脑使用中遇到上传失败、粘贴异常、样式错乱等任何问题，请告诉我们，以便我们第一时间协助您改进！
              </p>

              <form onSubmit={handleFeedbackSubmit} className="mt-4 space-y-3">
                <div>
                  <textarea
                    required
                    value={feedbackContent}
                    onChange={e => setFeedbackContent(e.target.value)}
                    placeholder="请详细描述您遇到的问题或您的建议...（例：在安卓微信内置浏览器上传大图没反应）"
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={feedbackContact}
                      onChange={e => setFeedbackContact(e.target.value)}
                      placeholder="您的联系方式：微信/电话（可选）"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={submittingFeedback || !feedbackContent.trim()}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingFeedback ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>发送反馈</span>
                    </button>
                  </div>
                </div>

                {feedbackSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                    <Check className="w-4 h-4" />
                    <span>感谢您的宝贵建议！我们已经收到并会尽快排查问题！</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Success Modal/Card Overlay */}
      {showSuccessModal && lastSubmittedSummary && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setLastSubmittedSummary(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-zinc-850/80 mb-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3.5 shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                🎉 报销明细提交成功！
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-semibold">
                您的报销申请已成功保存，财务管理员可立即在后台进行核对与修改。
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-150 dark:border-zinc-850/80 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 dark:text-zinc-500 font-bold">报销人</span>
                  <span className="font-bold text-slate-800 dark:text-white">{lastSubmittedSummary.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 dark:text-zinc-500 font-bold">明细笔数</span>
                  <span className="font-bold text-slate-800 dark:text-white">{lastSubmittedSummary.count} 笔</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 dark:text-zinc-500 font-bold">总金额</span>
                  <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    ¥{lastSubmittedSummary.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] text-slate-450 dark:text-zinc-500 font-bold uppercase tracking-wider mb-2">
                  已提交明细
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {lastSubmittedSummary.entries.map((entry, idx) => (
                    <div
                      key={entry.id || idx}
                      className="p-3 bg-white dark:bg-zinc-900/40 border border-slate-150 dark:border-zinc-800/80 rounded-xl flex justify-between items-center text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 dark:text-white">
                          明细 #{idx + 1}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                          {entry.expense_date} &bull; {entry.remark || '无备注'}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                        ¥{entry.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setLastSubmittedSummary(null);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer text-center"
              >
                好的，我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline simple XIcon
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
