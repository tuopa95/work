import { useState, useEffect } from 'react';
import {
  Download,
  Search,
  Calendar,
  Layers,
  Users,
  MessageSquare,
  DollarSign,
  TrendingUp,
  PieChart as PieIcon,
  HelpCircle,
  Clock,
  Eye,
  LogOut,
  RefreshCw,
  CheckCircle,
  Loader2,
  X,
  Trash2
} from 'lucide-react';
import { ExpenseEntry, Feedback, Attachment } from '../types';

const categories = [
  { value: 'invoice', label: '🧾 发票', color: 'bg-blue-500' },
  { value: 'payment_screenshot', label: '📱 付款截图', color: 'bg-indigo-500' },
  { value: 'itinerary', label: '🎫 行程单', color: 'bg-cyan-500' },
  { value: 'travel_request', label: '📝 出差申请', color: 'bg-teal-500' },
  { value: 'other', label: '📦 其他', color: 'bg-gray-500' }
];

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

export default function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'expenses' | 'feedbacks'>('expenses');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'employee' | 'category'>('none');

  // Preview image state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleUpdateCategory = async (attachmentId: string, newCategory: string) => {
    setUpdatingCategory(true);
    try {
      const res = await fetch(`/api/admin/attachment/${attachmentId}/category`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category: newCategory })
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setExpenses(prev => prev.map(entry => {
          if (entry.attachments) {
            const updatedAtts = entry.attachments.map(att => {
              if (att.id === attachmentId) {
                return { ...att, category: newCategory };
              }
              return att;
            });
            return { ...entry, attachments: updatedAtts };
          }
          return entry;
        }));
        
        // Update selected attachment preview
        if (selectedAttachment && selectedAttachment.id === attachmentId) {
          setSelectedAttachment({ ...selectedAttachment, category: newCategory });
        }
      } else {
        alert(data.error || '更新分类失败');
      }
    } catch (err) {
      console.error(err);
      alert('更新分类失败，网络异常');
    } finally {
      setUpdatingCategory(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('确认要删除这条报销明细记录吗？此操作不可恢复。')) return;

    try {
      const res = await fetch(`/api/admin/expense/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(prev => prev.filter(entry => entry.id !== id));
      } else {
        alert(data.error || '删除记录失败');
      }
    } catch (err) {
      console.error(err);
      alert('删除记录失败，网络异常');
    }
  };

  const handleClearAllExpenses = async () => {
    if (!window.confirm('⚠️ 警告：确认要清除所有的报销记录吗？此操作将彻底清空所有已保存的报销数据，且不可恢复！')) return;

    try {
      const res = await fetch('/api/admin/expenses/clear', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExpenses([]);
        alert('已成功清除所有报销记录！');
      } else {
        alert(data.error || '清除记录失败');
      }
    } catch (err) {
      console.error(err);
      alert('清除记录失败，网络异常');
    }
  };

  // Fetch data
  const fetchData = async () => {
    setLoadingExpenses(true);
    setLoadingFeedbacks(true);
    try {
      // Fetch Expenses
      const expRes = await fetch('/api/admin/expenses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const expData = await expRes.json();
      if (expData.success) {
        setExpenses(expData.data);
      }

      // Fetch Feedbacks
      const fbRes = await fetch('/api/admin/feedbacks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const fbData = await fbRes.json();
      if (fbData.success) {
        setFeedbacks(fbData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExpenses(false);
      setLoadingFeedbacks(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle Feedback Deletion / Resolve
  const handleResolveFeedback = async (id: string) => {
    if (!window.confirm('确认已解决此问题反馈并将其归档吗？')) return;

    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFeedbacks(prev => prev.filter(fb => fb.id !== id));
      } else {
        alert('操作失败');
      }
    } catch (err) {
      console.error(err);
      alert('网络连接错误');
    }
  };

  // Filter Logic
  const filteredExpenses = expenses.filter(entry => {
    const matchesName = entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        entry.remark.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check if any attachment matches selected categories (multi-select)
    const matchesCategory = selectedCategories.length === 0 || 
      entry.attachments.some(att => selectedCategories.includes(att.category));

    const matchesDate = !filterDate || entry.expense_date === filterDate;

    return matchesName && matchesCategory && matchesDate;
  });

  // Calculate Statistics
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalEntriesCount = filteredExpenses.length;
  
  // Calculate category aggregates
  const categoryStats = filteredExpenses.reduce((acc, entry) => {
    entry.attachments.forEach(att => {
      acc[att.category] = (acc[att.category] || 0) + (entry.amount / entry.attachments.length);
    });
    return acc;
  }, {} as { [key: string]: number });

  // Grouping structures
  let groupedData: { [key: string]: ExpenseEntry[] } = {};
  if (groupBy === 'employee') {
    groupedData = filteredExpenses.reduce((acc, entry) => {
      acc[entry.name] = acc[entry.name] || [];
      acc[entry.name].push(entry);
      return acc;
    }, {} as { [key: string]: ExpenseEntry[] });
  } else if (groupBy === 'category') {
    filteredExpenses.forEach(entry => {
      entry.attachments.forEach(att => {
        const cat = att.category;
        groupedData[cat] = groupedData[cat] || [];
        if (!groupedData[cat].some(e => e.id === entry.id)) {
          groupedData[cat].push(entry);
        }
      });
    });
  }

  // Export to Excel with inline images via MHTML format
  const handleExportExcel = async () => {
    if (filteredExpenses.length === 0) {
      alert('当前筛选条件下没有可导出的数据');
      return;
    }

    setIsExporting(true);

    try {
      // 1. Gather all unique attachments
      const allAttachments: any[] = [];
      filteredExpenses.forEach(entry => {
        entry.attachments.forEach(att => {
          if (!allAttachments.some(a => a.id === att.id)) {
            allAttachments.push(att);
          }
        });
      });

      // 2. Fetch and convert all to raw base64 data
      const base64Map = new Map<string, { rawBase64: string; mimeType: string }>();
      
      const getMimeType = (url: string, fileName?: string): string => {
        const name = (fileName || url || '').toLowerCase();
        if (name.endsWith('.png')) return 'image/png';
        if (name.endsWith('.gif')) return 'image/gif';
        if (name.endsWith('.bmp')) return 'image/bmp';
        if (name.endsWith('.webp')) return 'image/webp';
        return 'image/jpeg';
      };

      await Promise.all(
        allAttachments.map(async att => {
          let rawBase64 = '';
          const mimeType = getMimeType(att.image_url, att.fileName);

          if (att.base64) {
            rawBase64 = att.base64.replace(/^data:image\/\w+;base64,/, '');
          } else {
            try {
              // Fetch from the server on the fly
              const res = await fetch(att.image_url);
              if (res.ok) {
                const blob = await res.blob();
                rawBase64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result.replace(/^data:image\/\w+;base64,/, ''));
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              }
            } catch (err) {
              console.error(`Failed to fetch attachment ${att.id} image:`, err);
            }
          }

          base64Map.set(att.id, { rawBase64, mimeType });
        })
      );

      // 3. Build HTML table rows
      let tableRows = '';
      
      const categoryLabelMap: { [key: string]: string } = {
        invoice: '发票',
        payment_screenshot: '付款截图',
        itinerary: '行程单',
        travel_request: '出差申请',
        other: '其他'
      };

      const activeCategories = selectedCategories.length === 0
        ? categories
        : categories.filter(c => selectedCategories.includes(c.value));

      filteredExpenses.forEach((entry, idx) => {
        // Group attachments by category for active categories only
        const activeCategoryGroups = activeCategories.map(cat => ({
          category: cat.value,
          atts: entry.attachments.filter(a => a.category === cat.value)
        }));

        // The number of rows for this entry is the max attachments in any of the active categories, or at least 1
        const maxRows = Math.max(
          ...activeCategoryGroups.map(g => g.atts.length),
          1
        );

        for (let r = 0; r < maxRows; r++) {
          const isFirstRow = r === 0;
          const submitTimeDisplay = entry.submit_time || '未知时间';

          let rowHtml = `<tr style="height: 150px;">`;

          if (isFirstRow) {
            rowHtml += `
              <td rowspan="${maxRows}" style="border: 1px solid #cbd5e1; text-align: center; vertical-align: middle; font-weight: bold; font-family: sans-serif;">${idx + 1}</td>
              <td rowspan="${maxRows}" style="border: 1px solid #cbd5e1; text-align: center; vertical-align: middle; font-weight: bold; font-size: 13px; color: #1e293b; font-family: sans-serif;">${entry.name}</td>
              <td rowspan="${maxRows}" style="border: 1px solid #cbd5e1; text-align: center; vertical-align: middle; color: #475569; font-family: sans-serif;">${entry.expense_date}</td>
              <td rowspan="${maxRows}" style="border: 1px solid #cbd5e1; text-align: center; vertical-align: middle; color: #475569; font-family: sans-serif;">${submitTimeDisplay}</td>
              <td rowspan="${maxRows}" style="border: 1px solid #cbd5e1; text-align: center; vertical-align: middle; font-weight: bold; color: #059669; font-size: 13px; font-family: sans-serif;">¥${entry.amount.toFixed(2)}</td>
            `;
          }

          // Image cells for each active category
          activeCategoryGroups.forEach(group => {
            const att = group.atts[r];
            if (!att) {
              rowHtml += '<td style="border: 1px solid #cbd5e1;"></td>';
              return;
            }

            const imageCid = `att_${att.id}`;
            const imgInfo = base64Map.get(att.id);

            if (!imgInfo || !imgInfo.rawBase64) {
              rowHtml += `
                <td style="width: 140px; height: 140px; text-align: center; vertical-align: middle; border: 1px solid #cbd5e1; padding: 6px; background-color: #f8fafc; color: #94a3b8; font-size: 10px;">
                  图片未能加载
                </td>
              `;
            } else {
              rowHtml += `
                <td style="width: 140px; height: 140px; text-align: center; vertical-align: middle; border: 1px solid #cbd5e1; padding: 6px;">
                  <div style="width: 130px; height: 130px; display: flex; align-items: center; justify-content: center; margin: 0 auto; overflow: hidden;">
                    <img src="${imageCid}" width="120" height="120" style="max-width: 120px; max-height: 120px; border-radius: 4px; border: 1px solid #e2e8f0; display: block; object-fit: contain; margin: 0 auto;" />
                  </div>
                </td>
              `;
            }
          });

          if (isFirstRow) {
            rowHtml += `
              <td rowspan="${maxRows}" style="border: 1px solid #cbd5e1; text-align: left; vertical-align: middle; padding: 12px; color: #334155; font-size: 12px; line-height: 1.5; max-width: 240px; word-wrap: break-word; font-family: sans-serif;">${entry.remark || '<span style="color:#94a3b8; font-style:italic;">无备注说明</span>'}</td>
            `;
          }

          rowHtml += '</tr>';
          tableRows += rowHtml;
        }
      });

      // 4. Build MHTML Template
      const htmlTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>报销明细图文报告</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body {
              font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
              margin: 0;
              padding: 20px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th {
              background-color: #3b82f6;
              color: #ffffff;
              font-weight: bold;
              font-size: 13px;
              border: 1px solid #cbd5e1;
              padding: 12px 10px;
              text-align: center;
            }
            td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              font-size: 12px;
              text-align: center;
              vertical-align: middle;
              color: #334155;
            }
          </style>
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>
                <th style="width: 60px; background-color: #3b82f6; color: #ffffff;">序号</th>
                <th style="width: 110px; background-color: #3b82f6; color: #ffffff;">报销人</th>
                <th style="width: 110px; background-color: #3b82f6; color: #ffffff;">消费日期</th>
                <th style="width: 160px; background-color: #3b82f6; color: #ffffff;">提交时间</th>
                <th style="width: 110px; background-color: #3b82f6; color: #ffffff;">报销金额</th>
                ${activeCategories.map(cat => `
                <th style="width: 150px; background-color: #3b82f6; color: #ffffff;">${categoryLabelMap[cat.value]}</th>
                `).join('')}
                <th style="width: 240px; background-color: #3b82f6; color: #ffffff;">备注说明</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
        </html>
      `;

      // Define MIME boundary
      const boundary = '----=_NextPart_AI_REIMBURSEMENT';
      const joinLines = (lines: string[]) => lines.join('\r\n');

      const parts: string[] = [];

      // MHTML Header
      parts.push('MIME-Version: 1.0');
      parts.push(`Content-Type: multipart/related; boundary="${boundary}"`);
      parts.push(''); // blank line after outer headers

      // HTML text part
      parts.push(`--${boundary}`);
      parts.push('Content-Type: text/html; charset="utf-8"');
      parts.push('Content-Location: main.html');
      parts.push(''); // blank line before HTML body
      parts.push(htmlTemplate);
      parts.push('');

      // Add each attachment as a base64 MIME part
      allAttachments.forEach(att => {
        const imgInfo = base64Map.get(att.id);
        if (imgInfo && imgInfo.rawBase64) {
          parts.push(`--${boundary}`);
          parts.push(`Content-Type: ${imgInfo.mimeType}`);
          parts.push('Content-Transfer-Encoding: base64');
          parts.push(`Content-Location: att_${att.id}`);
          parts.push(''); // blank line before base64 body
          parts.push(imgInfo.rawBase64);
          parts.push('');
        }
      });

      // Closing boundary
      parts.push(`--${boundary}--`);

      const mhtmlString = joinLines(parts);

      const blob = new Blob([mhtmlString], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', `团队报销导出汇总_${new Date().toISOString().split('T')[0]}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error during excel export:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (filteredExpenses.length === 0) {
      alert('当前筛选条件下没有可导出的数据');
      return;
    }

    // 1. Gather all unique attachments
    const allAttachments: Attachment[] = [];
    filteredExpenses.forEach(entry => {
      entry.attachments.forEach(att => {
        if (!allAttachments.some(a => a.id === att.id)) {
          allAttachments.push(att);
        }
      });
    });

    if (allAttachments.length === 0) {
      alert('当前筛选条件下的账单没有图片/发票附件可供导出！');
      return;
    }

    setIsExportingPdf(true);

    try {
      // 2. Fetch and convert all to raw base64 data
      const base64Map = new Map<string, { rawBase64: string; mimeType: string }>();
      
      const getMimeType = (url: string, fileName?: string): string => {
        const name = (fileName || url || '').toLowerCase();
        if (name.endsWith('.png')) return 'image/png';
        if (name.endsWith('.gif')) return 'image/gif';
        if (name.endsWith('.bmp')) return 'image/bmp';
        if (name.endsWith('.webp')) return 'image/webp';
        return 'image/jpeg';
      };

      await Promise.all(
        allAttachments.map(async att => {
          let rawBase64 = '';
          const mimeType = getMimeType(att.image_url, att.fileName);

          if (att.base64) {
            rawBase64 = att.base64.replace(/^data:image\/\w+;base64,/, '');
          } else {
            try {
              const res = await fetch(att.image_url);
              if (res.ok) {
                const blob = await res.blob();
                rawBase64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result.replace(/^data:image\/\w+;base64,/, ''));
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              }
            } catch (err) {
              console.error(`Failed to fetch attachment ${att.id} image:`, err);
            }
          }

          base64Map.set(att.id, { rawBase64, mimeType });
        })
      );

      // 3. Load jsPDF dynamically
      const { jsPDF } = await import('jspdf');

      let doc: any = null;
      let addedPageCount = 0;

      for (let i = 0; i < allAttachments.length; i++) {
        const att = allAttachments[i];
        const data = base64Map.get(att.id);
        if (!data || !data.rawBase64) continue;

        const dataUrl = `data:${data.mimeType};base64,${data.rawBase64}`;

        // Get actual dimensions to preserve aspect ratio
        const dims = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
          };
          img.onerror = () => {
            resolve({ width: 800, height: 600 });
          };
          img.src = dataUrl;
        });

        const naturalWidth = dims.width;
        const naturalHeight = dims.height;

        const orientation = naturalWidth > naturalHeight ? 'landscape' : 'portrait';
        const isLandscape = orientation === 'landscape';

        // Page sizes in mm (A4)
        const pageWidth = isLandscape ? 297 : 210;
        const pageHeight = isLandscape ? 210 : 297;

        // Determine scaling keeping aspect ratio inside the page with margins (10mm)
        const margin = 12;
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;

        const ratio = Math.min(maxW / naturalWidth, maxH / naturalHeight);
        const w = naturalWidth * ratio;
        const h = naturalHeight * ratio;

        // Centering coordinates
        const x = (pageWidth - w) / 2;
        const y = (pageHeight - h) / 2;

        if (addedPageCount === 0) {
          doc = new jsPDF({
            orientation: orientation === 'landscape' ? 'l' : 'p',
            unit: 'mm',
            format: 'a4'
          });
        } else {
          doc.addPage('a4', orientation === 'landscape' ? 'l' : 'p');
        }

        // Add the image
        doc.addImage(dataUrl, data.mimeType.split('/')[1].toUpperCase(), x, y, w, h);
        
        // Add minimal elegant header/footer details
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        
        const categoryMap: { [key: string]: string } = {
          invoice: '发票 🧾',
          payment_screenshot: '付款截图 📱',
          itinerary: '行程单 🎫',
          travel_request: '出差申请 📝',
          other: '其他附件 📦'
        };
        const catLabel = categoryMap[att.category] || att.category || '附件';
        
        // Print header
        doc.text(`AI 报销助手 | 附件类型: ${catLabel}`, margin, 8);
        
        // Print footer
        const footerText = `第 ${addedPageCount + 1} 页`;
        doc.text(footerText, pageWidth - margin - doc.getTextWidth(footerText), pageHeight - 6);

        addedPageCount++;
      }

      if (doc) {
        doc.save(`reimbursement_attachments_${Date.now()}.pdf`);
      } else {
        alert('没有可以导出的有效图片！');
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('生成 PDF 失败，请重试');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Navbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 dark:from-white dark:via-blue-400 dark:to-white bg-clip-text text-transparent">
              财务票据智能收纳管理后台
            </span>
            <span className="text-xs bg-blue-600 dark:bg-blue-600 text-white font-extrabold px-2.5 py-1 rounded-xl shadow-lg shadow-blue-500/10">
              PRO
            </span>
          </h1>
          <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-zinc-400 mt-2">
            审核团队报销数据，实时监控提交质量，并处理或答复团队问题反馈。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-xl border border-gray-150 dark:border-zinc-850 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors text-slate-600 dark:text-zinc-400"
            title="刷新数据"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all border border-rose-100 dark:border-rose-900/30"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-1.5 p-1 bg-gray-100/80 dark:bg-zinc-900 rounded-xl border border-gray-150 dark:border-zinc-850 max-w-sm mb-6">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'expenses'
              ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>报销列表</span>
        </button>
        <button
          onClick={() => setActiveTab('feedbacks')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative ${
            activeTab === 'feedbacks'
              ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>问题反馈</span>
          {feedbacks.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center animate-bounce">
              {feedbacks.length}
            </span>
          )}
        </button>
      </div>

      {/* EXPENSES VIEW */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-zinc-900 border-t-2 border-t-emerald-500 border-x border-b border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500">报销总额</span>
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black font-mono mt-2.5 text-slate-900 dark:text-white">
                ¥{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">当前筛选条件下的汇总额</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border-t-2 border-t-blue-500 border-x border-b border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500">笔数合计</span>
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black mt-2.5 text-slate-900 dark:text-white">{totalEntriesCount} 笔</h3>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">已成功收纳并分类的笔数</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border-t-2 border-t-purple-500 border-x border-b border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500">人均报销</span>
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black font-mono mt-2.5 text-slate-900 dark:text-white">
                ¥{(totalEntriesCount > 0 ? totalAmount / totalEntriesCount : 0).toFixed(2)}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">单笔明细的平均算术值</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border-t-2 border-t-rose-500 border-x border-b border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500">发票联总比</span>
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400">
                  <PieIcon className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black mt-2.5 text-slate-900 dark:text-white">
                {Math.round(((categoryStats['invoice'] || 0) / (totalAmount || 1)) * 100)}%
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">增值税/普通发票所占比重</p>
            </div>
          </div>

          {/* Filtering and Actions Panel */}
          <div className="bg-slate-50/50 dark:bg-zinc-900/40 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 p-6 rounded-2xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_15px_-3px_rgba(0,0,0,0.02)] space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-zinc-800/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-blue-600 dark:bg-blue-500 rounded-full" />
                <h3 className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">数据检索与控制中心</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
                <button
                  onClick={handleClearAllExpenses}
                  className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl shadow-sm hover:shadow active:scale-[0.98] border border-rose-200 dark:border-rose-900/30 transition-all duration-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清除所有记录</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={isExporting || isExportingPdf}
                  className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-50 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all border border-slate-900 dark:border-white duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在生成图文报表...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>导出至 Excel</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={isExporting || isExportingPdf}
                  className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all border border-blue-600 duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>正在导出 PDF 图片...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>仅导出图片 PDF (一图一页)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="姓名或用途关键字"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/85 shadow-sm transition-all h-[36px]"
                />
              </div>

              {/* Category selector (Multi-select dropdown) */}
              <div className="relative">
                {isCategoryDropdownOpen && (
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsCategoryDropdownOpen(false)} 
                  />
                )}
                
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/85 font-semibold flex items-center justify-between min-h-[36px] cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all z-20 relative shadow-sm"
                >
                  <span className="truncate">
                    {selectedCategories.length === 0
                      ? '所有凭证类型'
                      : selectedCategories.length === categories.length
                      ? '所有凭证类型'
                      : `已选 ${selectedCategories.length} 项凭证类型`}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    {isCategoryDropdownOpen ? '▲' : '▼'}
                  </span>
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 p-2 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-xl shadow-lg z-25 space-y-1 max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCategories.length === categories.length) {
                          setSelectedCategories([]);
                        } else {
                          setSelectedCategories(categories.map(c => c.value));
                        }
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>全选 / 全不选</span>
                      {selectedCategories.length === categories.length && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                    </button>
                    <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />
                    {categories.map(cat => {
                      const isSelected = selectedCategories.includes(cat.value);
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCategories(prev => prev.filter(c => c !== cat.value));
                            } else {
                              setSelectedCategories(prev => [...prev, cat.value]);
                            }
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-semibold'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Controlled via onClick on parent button
                            className="rounded text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 border-slate-300 dark:border-zinc-700 bg-transparent cursor-pointer"
                          />
                          <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Single Date Selector */}
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/85 cursor-pointer shadow-sm transition-all h-[36px]"
                />
                {filterDate && (
                  <button
                    type="button"
                    onClick={() => setFilterDate('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer z-10"
                    title="清除日期"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Group By selector (Styled as a luxury segmented toggle control) */}
              <div className="flex bg-slate-100/70 dark:bg-zinc-950 p-0.5 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 min-h-[36px] shadow-inner items-center">
                <button
                  type="button"
                  onClick={() => setGroupBy('none')}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                    groupBy === 'none'
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_1.5px_3px_rgba(0,0,0,0.06)]'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  明细视图
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('employee')}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                    groupBy === 'employee'
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_1.5px_3px_rgba(0,0,0,0.06)]'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  按人分组
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('category')}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                    groupBy === 'category'
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_1.5px_3px_rgba(0,0,0,0.06)]'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  按类分组
                </button>
              </div>
            </div>
          </div>

          {/* Table or Grouped Content */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-2xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04),0_10px_15px_-3px_rgba(0,0,0,0.01)] overflow-hidden">
            {loadingExpenses ? (
              <div className="p-12 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                <span>正在拉取团队报销数据...</span>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-zinc-400">
                <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-sm">无相关报销明细</p>
                <p className="text-xs mt-1 text-slate-400 dark:text-zinc-500">没有找到符合当前筛选条件的凭证条目</p>
              </div>
            ) : groupBy === 'none' ? (
              /* Regular Flat List */
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-100 font-black border-b border-slate-200 dark:border-zinc-700 tracking-wider uppercase text-xs shadow-sm">
                    <tr>
                      <th className="px-6 py-4 text-slate-950 dark:text-slate-100 font-black text-sm">报销人</th>
                      <th className="px-6 py-4 text-slate-950 dark:text-slate-100 font-black text-sm">消费日期</th>
                      <th className="px-6 py-4 text-right text-slate-950 dark:text-slate-100 font-black text-sm">金额</th>
                      <th className="px-6 py-4 text-slate-950 dark:text-slate-100 font-black text-sm">备注/用途</th>
                      <th className="px-6 py-4 text-slate-950 dark:text-slate-100 font-black text-sm">凭证与分类 (可点击修改分类)</th>
                      <th className="px-6 py-4 text-center text-slate-950 dark:text-slate-100 font-black text-sm">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium text-slate-700 dark:text-zinc-350">
                    {filteredExpenses.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50/25 dark:hover:bg-zinc-850/15 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shadow-inner flex-shrink-0">
                              {entry.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {entry.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">
                          {entry.expense_date}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white text-[13px]">
                          ¥{entry.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-zinc-300 max-w-xs truncate font-normal" title={entry.remark}>
                          {entry.remark || <span className="text-slate-400 dark:text-zinc-650 italic font-light">无备注说明</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {entry.attachments.map(att => {
                              const labels: { [key: string]: string } = {
                                invoice: '发票',
                                payment_screenshot: '付款截图',
                                itinerary: '行程单',
                                travel_request: '出差申请',
                                other: '其他'
                              };
                              const bgColors: { [key: string]: string } = {
                                invoice: 'bg-blue-50/60 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30 hover:bg-blue-100/50',
                                payment_screenshot: 'bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100/50',
                                itinerary: 'bg-cyan-50/60 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/30 hover:bg-cyan-100/50',
                                travel_request: 'bg-teal-50/60 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/30 hover:bg-teal-100/50',
                                other: 'bg-slate-100/70 dark:bg-zinc-800/40 text-slate-600 dark:text-zinc-300 border-slate-200/60 dark:border-zinc-800 hover:bg-slate-200/60'
                              };

                              return (
                                <button
                                  key={att.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAttachment(att);
                                    setPreviewImage(att.image_url);
                                  }}
                                  className={`pl-1.5 pr-3 py-1 rounded-full font-bold text-[10px] flex items-center gap-1.5 border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                                    bgColors[att.category] || 'bg-slate-100 text-slate-700 border-transparent'
                                  }`}
                                  title="点击查看并管理此凭证分类"
                                >
                                  <div className="w-4 h-4 rounded-full overflow-hidden border border-black/10 dark:border-white/10 flex-shrink-0 bg-slate-50 flex items-center justify-center">
                                    <img src={att.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                  <span>{labels[att.category] || att.category}</span>
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(entry.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-all border border-rose-100 dark:border-rose-900/10 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                            title="删除此记录"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grouped View (By Employee or By Category) */
              <div className="p-6 space-y-6">
                {Object.keys(groupedData).map(groupName => {
                  const items = groupedData[groupName];
                  const sum = items.reduce((s, i) => s + i.amount, 0);
                  
                  // Label display matching
                  let displayHeader = groupName;
                  let groupColor = 'bg-blue-500';
                  if (groupBy === 'category') {
                    const labels: { [key: string]: string } = {
                      invoice: '🧾 发票 汇总',
                      payment_screenshot: '📱 付款截图 汇总',
                      itinerary: '🎫 行程单 汇总',
                      travel_request: '📝 出差申请 汇总',
                      other: '📦 其他 汇总'
                    };
                    const colors: { [key: string]: string } = {
                      invoice: 'bg-blue-500',
                      payment_screenshot: 'bg-indigo-500',
                      itinerary: 'bg-cyan-500',
                      travel_request: 'bg-teal-500',
                      other: 'bg-gray-500'
                    };
                    displayHeader = labels[groupName] || groupName;
                    groupColor = colors[groupName] || 'bg-blue-500';
                  }

                  return (
                    <div key={groupName} className="border border-slate-100 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-[0_2px_8px_-3px_rgba(0,0,0,0.03)] bg-white dark:bg-zinc-900/40">
                      <div className="bg-slate-50/50 dark:bg-zinc-900/50 px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80">
                        <span className="text-xs font-bold text-slate-800 dark:text-white uppercase flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${groupColor}`} />
                          {displayHeader} ({items.length} 笔)
                        </span>
                        <span className="text-xs font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 px-2.5 py-1 rounded-full border border-blue-100/50 dark:border-blue-900/20">
                          累计: ¥{sum.toFixed(2)}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                        {items.map(item => (
                          <div key={item.id} className="p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/20 dark:hover:bg-zinc-850/10 transition-colors">
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</span>
                                <span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px]">{item.expense_date}</span>
                              </div>
                              <p className="text-slate-500 dark:text-zinc-400 mt-1 font-normal text-[11px]">{item.remark || <span className="italic text-slate-350 dark:text-zinc-600">无备注说明</span>}</p>
                            </div>
                            
                            <div className="flex items-center gap-4 self-end sm:self-auto">
                              <div className="flex gap-1.5">
                                {item.attachments.map(att => (
                                  <button
                                    key={att.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedAttachment(att);
                                      setPreviewImage(att.image_url);
                                    }}
                                    className="p-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700/60 rounded-xl hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-950/30 dark:hover:text-blue-450 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-center cursor-pointer hover:scale-105"
                                    title="查看及修改凭证分类"
                                  >
                                    <div className="w-5 h-5 rounded-md overflow-hidden border border-black/5 flex-shrink-0 mr-1.5 bg-white">
                                      <img src={att.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                    <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500" />
                                  </button>
                                ))}
                              </div>
                              <span className="font-mono font-bold text-slate-900 dark:text-white text-[15px]">
                                ¥{item.amount.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(item.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 shadow-sm"
                                title="删除此记录"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FEEDBACKS VIEW */}
      {activeTab === 'feedbacks' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-5 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-pulse" />
              用户提交的问题及体验反馈 ({feedbacks.length} 个)
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              这里汇总了员工在使用系统（特别是手机设备）进行报销时提交的错误报告、意见及联系方式。
            </p>
          </div>

          {loadingFeedbacks ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
              <span>正在拉取反馈内容...</span>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 rounded-2xl p-12 text-center text-gray-500">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-sm">暂无待处理的用户问题反馈</p>
              <p className="text-xs mt-1">系统运转一切正常，体验十分完美！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedbacks.map(fb => (
                <div
                  key={fb.id}
                  className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-2 mb-3">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleString('zh-CN') : '未知时间'}
                      </span>
                      <button
                        onClick={() => handleResolveFeedback(fb.id)}
                        className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded hover:bg-emerald-100 transition-all flex items-center gap-1"
                        title="标记为已解决并归档"
                      >
                        <CheckCircle className="w-3 h-3" />
                        已解决
                      </button>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-zinc-200 leading-relaxed font-semibold">
                      {fb.content}
                    </p>
                  </div>

                  {fb.contact && (
                    <div className="mt-4 bg-slate-50 dark:bg-zinc-950 px-3 py-2 rounded-xl border border-gray-150 dark:border-zinc-900 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">联系方式:</span>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 select-all">
                        {fb.contact}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Screen Image Overlay Preview with Category Modifying Controls */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => {
            setPreviewImage(null);
            setSelectedAttachment(null);
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col md:flex-row max-w-5xl w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the panel
          >
            {/* Left: Image Preview Container */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 relative min-h-[300px] md:min-h-0">
              <img
                src={previewImage}
                alt="Receipt receipt preview fully zoomed"
                className="object-contain max-w-full max-h-[50vh] md:max-h-[80vh] rounded-lg shadow-inner"
              />
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setSelectedAttachment(null);
                }}
                className="absolute top-4 left-4 md:hidden bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors border border-white/10"
                title="关闭预览"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Right: Controls Panel */}
            <div className="w-full md:w-80 bg-slate-50 dark:bg-zinc-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-zinc-800 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-blue-600 rounded-full" />
                    凭证大图与分类管理
                  </h3>
                  <button
                    onClick={() => {
                      setPreviewImage(null);
                      setSelectedAttachment(null);
                    }}
                    className="hidden md:flex bg-slate-200 hover:bg-slate-300 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-full p-1.5 transition-colors cursor-pointer"
                    title="关闭"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedAttachment ? (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border border-slate-150 dark:border-zinc-850">
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider mb-1">文件名</p>
                      <p className="text-xs text-slate-800 dark:text-zinc-200 font-mono break-all font-semibold leading-relaxed">
                        {selectedAttachment.fileName || '未知文件'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                        更改凭证分类类别
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {categories.map(cat => {
                          const isCurrent = selectedAttachment.category === cat.value;
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              disabled={updatingCategory}
                              onClick={() => handleUpdateCategory(selectedAttachment.id, cat.value)}
                              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-between cursor-pointer disabled:opacity-50 ${
                                isCurrent
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/15'
                                  : 'bg-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-850 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-white' : cat.color}`} />
                                <span>{cat.label}</span>
                              </div>
                              {isCurrent && (
                                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-black uppercase">
                                  当前
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    请点击具体的凭证标签以进行类别编辑。
                  </p>
                )}
              </div>

              {updatingCategory && (
                <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在同步修改至服务器...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
