import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { 
  Users, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Search, 
  Download, 
  Settings, 
  LogOut, 
  ChevronRight, 
  ArrowUpDown, 
  X, 
  Eye, 
  CheckCircle, 
  Clock, 
  Lock, 
  Maximize2,
  FileText,
  CreditCard,
  Plane,
  FolderOpen,
  Loader2,
  Check,
  AlertTriangle
} from "lucide-react";
import { Expense, DashboardStats, AttachmentCategory, Attachment } from "../types";
import { syncExpensesWithServer } from "../lib/syncEngine";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  // Data States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPeople: 0,
    totalAmount: 0,
    todayCount: 0,
    thisMonthCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"" | "invoice" | "payment" | "itinerary" | "other">("");
  const [amountSort, setAmountSort] = useState<"" | "asc" | "desc">("");

  // Export Wizard States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "markdown" | "images" | "html" | "xlsx">("xlsx");
  const [exportNameFilter, setExportNameFilter] = useState("");

  const CATEGORIES = [
    { value: "invoice", label: "发票", icon: "📄" },
    { value: "payment", label: "付款截图", icon: "💳" },
    { value: "itinerary", label: "行程单", icon: "🚄" },
    { value: "other", label: "其它凭证", icon: "📁" }
  ] as const;

  // UI Detail States
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // Change Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Batch Image Download & Zipping States
  const [downloadProgressModal, setDownloadProgressModal] = useState(false);
  const [downloadZipName, setDownloadZipName] = useState("");
  const [isZipping, setIsZipping] = useState(false);
  const [downloadItems, setDownloadItems] = useState<{
    id: number;
    fileName: string;
    employeeName: string;
    date: string;
    categoryLabel: string;
    url: string;
    status: "waiting" | "fetching" | "success" | "error";
    errorMsg?: string;
  }[]>([]);

  // Load expenses and stats from backend APIs
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch expenses
      const expResponse = await fetch("/api/expenses");
      const expResult = await expResponse.json();
      if (expResult.success) {
        const syncedExpenses = await syncExpensesWithServer(expResult.data);
        setExpenses(syncedExpenses);
      }

      // Fetch stats
      const statsResponse = await fetch("/api/stats");
      const statsResult = await statsResponse.json();
      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error("加载数据错误:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter and sort the loaded expenses
  const getProcessedExpenses = () => {
    let result = [...expenses];

    // Search by Name (case-insensitive)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(term));
    }

    // Filter by Date
    if (dateFilter) {
      result = result.filter((e) => e.expense_date === dateFilter);
    }

    // Filter by Receipt Category
    if (categoryFilter) {
      result = result.filter((e) => e.attachments.some((a) => a.category === categoryFilter));
    }

    // Sort by Amount or Date
    if (amountSort) {
      result.sort((a, b) => {
        return amountSort === "desc" ? b.amount - a.amount : a.amount - b.amount;
      });
    } else {
      // Default sort: latest expense date first, then latest creation time
      result.sort((a, b) => {
        const dateA = new Date(a.expense_date).getTime();
        const dateB = new Date(b.expense_date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return result;
  };

  const processedExpenses = getProcessedExpenses();

  const getExportFilteredExpenses = () => {
    let result = [...expenses];

    // Search by Name (case-insensitive) for Export Modal specifically
    if (exportNameFilter.trim()) {
      const term = exportNameFilter.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(term));
    }

    // Filter by Date
    if (dateFilter) {
      result = result.filter((e) => e.expense_date === dateFilter);
    }

    // Filter by Receipt Category
    if (categoryFilter) {
      result = result.filter((e) => e.attachments.some((a) => a.category === categoryFilter));
    }

    // Sort by Amount or Date
    if (amountSort) {
      result.sort((a, b) => {
        return amountSort === "desc" ? b.amount - a.amount : a.amount - b.amount;
      });
    } else {
      result.sort((a, b) => {
        const dateA = new Date(a.expense_date).getTime();
        const dateB = new Date(b.expense_date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    return result;
  };

  const exportFilteredExpenses = getExportFilteredExpenses();

  const uniqueNames = Array.from(new Set(expenses.map((e) => e.name).filter(Boolean)));

  // Group expenses by Date. Returns an array of { date: string, items: Expense[] }
  const getGroupedExpenses = () => {
    const groups: { [key: string]: Expense[] } = {};
    
    processedExpenses.forEach((exp) => {
      const date = exp.expense_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(exp);
    });

    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((date) => ({
        date,
        items: groups[date]
      }));
  };

  const groupedExpenses = getGroupedExpenses();

  const filteredImagesCount = processedExpenses.reduce((sum, exp) => {
    return sum + exp.attachments.filter(a => !categoryFilter || a.category === categoryFilter).length;
  }, 0);

  // Batch download filtered images sequentially and package into a ZIP
  const handleDownloadFilteredImages = async () => {
    // Get all matching attachments from all processed expenses
    const matchingImages: { url: string; fileName: string; employeeName: string; date: string; categoryLabel: string }[] = [];
    
    processedExpenses.forEach((exp) => {
      exp.attachments.forEach((att) => {
        if (!categoryFilter || att.category === categoryFilter) {
          const categoryLabel = CATEGORIES.find(c => c.value === att.category)?.label || "凭证";
          matchingImages.push({
            url: att.image_url,
            fileName: att.fileName,
            employeeName: exp.name,
            date: exp.expense_date,
            categoryLabel
          });
        }
      });
    });

    if (matchingImages.length === 0) {
      alert("当前筛选条件下，没有找到任何符合的凭证图片");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const categoryText = categoryFilter 
      ? CATEGORIES.find(c => c.value === categoryFilter)?.label 
      : "全部";
    const dateText = dateFilter ? `_${dateFilter}` : "";
    const zipFileName = `财务报销凭证_${categoryText}${dateText}_${todayStr}.zip`;

    setDownloadZipName(zipFileName);
    
    // Set initial progress states
    const items = matchingImages.map((img, i) => ({
      id: i,
      fileName: img.fileName,
      employeeName: img.employeeName,
      date: img.date,
      categoryLabel: img.categoryLabel,
      url: img.url,
      status: "waiting" as const
    }));

    setDownloadItems(items);
    setDownloadProgressModal(true);
    setIsZipping(false);

    const zip = new JSZip();
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Update status to fetching
      setDownloadItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "fetching" } : it))
      );

      const originalExt = item.fileName.split(".").pop() || "jpg";
      // Construct a clean, highly descriptive file name inside zip
      const cleanFileName = `${item.employeeName}_${item.date}_${item.categoryLabel}_${i + 1}.${originalExt}`;

      try {
        // Resolve URL (use local proxy if external image to avoid CORS)
        let finalUrl = item.url;
        if (item.url.startsWith("http")) {
          finalUrl = `/api/proxy-image?url=${encodeURIComponent(item.url)}`;
        }

        const response = await fetch(finalUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        
        // Add to zip
        zip.file(cleanFileName, blob);
        successCount++;

        // Update status to success
        setDownloadItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: "success" } : it))
        );
      } catch (error: any) {
        console.error(`Failed to package image ${cleanFileName}:`, error);
        
        // Update status to error
        setDownloadItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: "error", errorMsg: error.message || "请求失败" } : it))
        );
      }

      // Small throttle delay
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    if (successCount > 0) {
      setIsZipping(true);
      try {
        const content = await zip.generateAsync({ type: "blob" });
        const blobUrl = window.URL.createObjectURL(content);
        
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = zipFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (e) {
        alert("打包 ZIP 文件失败，请重试");
        console.error(e);
      } finally {
        setIsZipping(false);
      }
    } else {
      alert("所有凭证图片获取失败，无法生成压缩包，请检查网络或图片是否损坏");
    }
  };

  // Multi-format browser-side filtered downloader
  const handleExportFilteredData = () => {
    if (exportFilteredExpenses.length === 0) {
      alert("当前筛选条件下无任何报销记录可供导出");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    if (exportFormat === "images") {
      handleDownloadFilteredImages();
      setShowExportModal(false);
      return;
    }

    if (exportFormat === "csv") {
      // 1. Excel Compatible UTF-8 BOM CSV
      const headers = [
        "报销单ID",
        "报销人姓名",
        "消费日期",
        "提交时间",
        "报销金额(元)",
        "备注用途说明",
        "付款截图",
        "发票",
        "行程单",
        "其它凭证",
        "凭证总张数"
      ];

      const rows = exportFilteredExpenses.map((exp) => {
        const getAbsoluteUrl = (url: string) => {
          if (url.startsWith("http")) return url;
          let origin = window.location.origin;
          if (origin.includes("ais-dev-")) {
            origin = origin.replace("ais-dev-", "ais-pre-");
          }
          return origin + url;
        };

        const paymentUrls = exp.attachments
          .filter((a) => a.category === "payment")
          .map((a) => getAbsoluteUrl(a.image_url))
          .join(" ; ");

        const invoiceUrls = exp.attachments
          .filter((a) => a.category === "invoice")
          .map((a) => getAbsoluteUrl(a.image_url))
          .join(" ; ");

        const itineraryUrls = exp.attachments
          .filter((a) => a.category === "itinerary")
          .map((a) => getAbsoluteUrl(a.image_url))
          .join(" ; ");

        const otherUrls = exp.attachments
          .filter((a) => a.category === "other")
          .map((a) => getAbsoluteUrl(a.image_url))
          .join(" ; ");

        // Double quote escaping for CSV fields
        const escapedName = exp.name.replace(/"/g, '""');
        const escapedRemark = (exp.remark || "").replace(/"/g, '""');
        const submitTimeStr = new Date(exp.created_at).toLocaleString("zh-CN");
        return [
          exp.id,
          `"${escapedName}"`,
          exp.expense_date,
          `"${submitTimeStr}"`,
          exp.amount.toFixed(2),
          `"${escapedRemark}"`,
          `"${paymentUrls.replace(/"/g, '""')}"`,
          `"${invoiceUrls.replace(/"/g, '""')}"`,
          `"${itineraryUrls.replace(/"/g, '""')}"`,
          `"${otherUrls.replace(/"/g, '""')}"`,
          exp.attachments.length
        ];
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `财务报销明细表_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } else if (exportFormat === "json") {
      // 2. Structured JSON Data Backup
      const dataStr = JSON.stringify(exportFilteredExpenses, null, 2);
      const blob = new Blob([dataStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `财务报销备份_${todayStr}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } else if (exportFormat === "markdown") {
      // 3. Elegant Markdown Report
      let md = `# 财务报销明细审计报告\n\n`;
      md += `* **导出日期**: ${new Date().toLocaleString("zh-CN")}\n`;
      md += `* **当前筛选**: 姓名搜索: "${exportNameFilter || "全部"}" | 消费日期筛选: "${dateFilter || "所有日期"}" | 凭证类型: "${categoryFilter ? CATEGORIES.find(c => c.value === categoryFilter)?.label : "不限"}"\n`;
      md += `* **财务汇总**: 共 **${exportFilteredExpenses.length}** 笔报销明细，合计总金额 **¥${exportFilteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}** 元\n\n`;
      
      md += `| 报销人 | 消费日期 | 提交时间 | 报销金额 | 凭证详情 | 备注说明 | 凭证图片截图 |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
      
      exportFilteredExpenses.forEach((exp) => {
        const counts = getAttachmentCounts(exp.attachments);
        const detailStr = `发票x${counts.invoice}, 付款x${counts.payment}, 行程x${counts.itinerary}, 其它x${counts.other}`;
        const links = exp.attachments.map((a, i) => {
          let url = a.image_url;
          if (!url.startsWith("http")) {
            let origin = window.location.origin;
            if (origin.includes("ais-dev-")) {
              origin = origin.replace("ais-dev-", "ais-pre-");
            }
            url = origin + url;
          }
          const imgSrc = a.base64 || url;
          return `<img src="${imgSrc}" width="80" height="80" style="object-fit:cover; border-radius:4px; border:1px solid #ddd; margin:2px;" alt="凭证${i+1}" />`;
        }).join(" ");
        const submitTimeStr = new Date(exp.created_at).toLocaleString("zh-CN");
        md += `| ${exp.name} | ${exp.expense_date} | ${submitTimeStr} | ¥${exp.amount.toFixed(2)} | ${detailStr} | ${exp.remark || "无"} | ${links || "无图片"} |\n`;
      });
      
      md += `\n\n---\n*报告由财务报销智能归档系统导出，仅供审计留存。*`;

      const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `财务报销审计报告_${todayStr}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } else if (exportFormat === "html") {
      // 4. Standalone HTML Report with inline images
      const getAbsoluteUrl = (url: string) => {
        if (url.startsWith("http")) return url;
        let origin = window.location.origin;
        if (origin.includes("ais-dev-")) {
          origin = origin.replace("ais-dev-", "ais-pre-");
        }
        return origin + url;
      };

      const totalSum = exportFilteredExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalCount = exportFilteredExpenses.length;

      let htmlRows = "";
      exportFilteredExpenses.forEach((exp) => {
        const counts = getAttachmentCounts(exp.attachments);
        const submitTimeStr = new Date(exp.created_at).toLocaleString("zh-CN");
        
        // Generate actual <img> tags for images
        let imagesHtml = '<div class="img-container">';
        if (exp.attachments && exp.attachments.length > 0) {
          exp.attachments.forEach((a, i) => {
            const absUrl = getAbsoluteUrl(a.image_url);
            let categoryLabel = "凭证";
            if (a.category === "invoice") categoryLabel = "发票";
            else if (a.category === "payment") categoryLabel = "付款";
            else if (a.category === "itinerary") categoryLabel = "行程单";
            else if (a.category === "other") categoryLabel = "其它";

            const imgSrc = a.base64 || absUrl;

            imagesHtml += `
              <div style="text-align: center; display: inline-block; margin-right: 8px; margin-bottom: 8px;">
                <a href="${absUrl}" target="_blank" title="点击在新标签页查看原图">
                  <img class="thumb" src="${imgSrc}" alt="${categoryLabel}" onerror="this.src='${absUrl}'" />
                </a>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-weight: 600;">${categoryLabel}</div>
              </div>
            `;
          });
        } else {
          imagesHtml += '<span style="color: #94a3b8; font-size: 12px; font-style: italic;">无图片凭证</span>';
        }
        imagesHtml += '</div>';

        const detailBadges = `
          ${counts.invoice > 0 ? `<span class="badge badge-invoice">发票 x${counts.invoice}</span>` : ""}
          ${counts.payment > 0 ? `<span class="badge badge-payment">付款截图 x${counts.payment}</span>` : ""}
          ${counts.itinerary > 0 ? `<span class="badge badge-itinerary">行程单 x${counts.itinerary}</span>` : ""}
          ${counts.other > 0 ? `<span class="badge badge-other">其它 x${counts.other}</span>` : ""}
        `;

        htmlRows += `
          <tr>
            <td style="font-weight: 700; color: #0f172a; font-size: 13.5px;">${exp.name}</td>
            <td style="font-weight: 500;">${exp.expense_date}</td>
            <td style="color: #64748b; font-size: 12px;">${submitTimeStr}</td>
            <td class="amount-cell">¥${exp.amount.toFixed(2)}</td>
            <td>
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">${detailBadges || '<span style="color: #cbd5e1; font-size: 11px;">无凭证</span>'}</div>
            </td>
            <td style="color: #334155; font-size: 12.5px; max-width: 220px; word-break: break-all; line-height: 1.5;">${exp.remark || '<span style="color: #cbd5e1; font-style: italic;">无说明</span>'}</td>
            <td>${imagesHtml}</td>
          </tr>
        `;
      });

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>财务报销明细图文审计报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #334155;
      padding: 30px;
      background-color: #f8fafc;
      margin: 0;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: #ffffff;
      padding: 35px;
      border-radius: 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 24px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .title-area h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
      letter-spacing: -0.025em;
    }
    .title-area p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .card {
      background: #f8fafc;
      padding: 18px;
      border-radius: 16px;
      border: 1px solid #f1f5f9;
    }
    .card-label {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .card-value {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 6px;
    }
    .card-value.amount {
      color: #10b981;
    }
    .table-container {
      width: 100%;
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th, td {
      padding: 14px 18px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
      vertical-align: middle;
    }
    th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover {
      background-color: #f8fafc;
    }
    .amount-cell {
      font-weight: 800;
      color: #10b981;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
      margin-right: 4px;
      margin-bottom: 4px;
      white-space: nowrap;
    }
    .badge-invoice { background: #e0f2fe; color: #0369a1; }
    .badge-payment { background: #dcfce7; color: #15803d; }
    .badge-itinerary { background: #fef9c3; color: #a16207; }
    .badge-other { background: #f1f5f9; color: #475569; }
    .img-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .thumb {
      height: 90px;
      width: 120px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #f1f5f9;
      padding: 2px;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
    }
    .thumb:hover {
      transform: scale(1.05);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
      border-color: #94a3b8;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 24px;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 0; border: none; }
      .thumb { height: 80px; width: 110px; page-break-inside: avoid; }
      .card { border: 1px solid #e2e8f0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-area">
        <h1>财务报销明细图文审计报告</h1>
        <p>系统自动生成于 ${new Date().toLocaleString("zh-CN")} · 供财务对账、凭证核实和报销审批留存</p>
      </div>
      <div style="background: #3b82f6; color: white; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 10px;">
        图文完备版
      </div>
    </div>

    <div class="summary-cards">
      <div class="card">
        <div class="card-label">总笔数汇总</div>
        <div class="card-value">${totalCount} 笔</div>
      </div>
      <div class="card">
        <div class="card-label">总报销金额</div>
        <div class="card-value amount">¥${totalSum.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="card">
        <div class="card-label">筛选条件</div>
        <div class="card-value" style="font-size: 13px; color: #475569; font-weight: 500; margin-top: 10px; line-height: 1.4;">
          姓名: ${exportNameFilter || "全部"}<br>
          日期: ${dateFilter || "全部"}<br>
          类型: ${categoryFilter ? CATEGORIES.find(c => c.value === categoryFilter)?.label : "不限"}
        </div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 100px;">报销人</th>
            <th style="width: 100px;">消费日期</th>
            <th style="width: 140px;">提交时间</th>
            <th style="width: 110px;">报销金额</th>
            <th style="width: 150px;">凭证汇总</th>
            <th>备注说明</th>
            <th style="width: 420px;">凭证图片截图 (点击在新标签页查看)</th>
          </tr>
        </thead>
        <tbody>
          ${htmlRows}
        </tbody>
      </table>
    </div>

    <div class="footer">
      报告由 <strong>财务报销智能归档系统</strong> 导出生成。图片由云端安全托管，全员可随时免密查看，保障报销流程的高效与透明。
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `财务报销图文报告_${todayStr}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (exportFormat === "xlsx") {
      // 5. Real Excel Spreadsheet (.xlsx) with embedded images generated server-side
      const params = new URLSearchParams();
      if (exportNameFilter.trim()) params.append("searchTerm", exportNameFilter);
      if (dateFilter) params.append("dateFilter", dateFilter);
      if (categoryFilter) params.append("categoryFilter", categoryFilter);
      if (amountSort) params.append("amountSort", amountSort);

      const link = document.createElement("a");
      link.setAttribute("href", `/api/export-xlsx?${params.toString()}`);
      link.setAttribute("download", `财务报销图文报告_${todayStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setShowExportModal(false);
  };

  // Change Admin Password API
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("请填写所有字段");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError("新密码长度不能小于4个字符");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const result = await response.json();
      if (result.success) {
        setPasswordSuccess("密码修改成功！请牢记新密码。");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess("");
        }, 1500);
      } else {
        setPasswordError(result.error || "修改失败，请重试");
      }
    } catch (err) {
      setPasswordError("网络错误，修改失败");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Helper counters for categories
  const getAttachmentCounts = (attachments: Attachment[]) => {
    return {
      invoice: attachments.filter((a) => a.category === "invoice").length,
      payment: attachments.filter((a) => a.category === "payment").length,
      itinerary: attachments.filter((a) => a.category === "itinerary").length,
      other: attachments.filter((a) => a.category === "other").length
    };
  };

  return (
    <div className="w-full space-y-8" id="admin-dashboard-container">
      {/* Dashboard Top Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">报销收集后台</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            审核团队报销数据、按需统计筛选、并支持一键导出 Excel 凭证汇总表
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          {categoryFilter && filteredImagesCount > 0 && (
            <button
              id="export-filtered-images-btn"
              onClick={handleDownloadFilteredImages}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-95 animate-pulse-subtle"
            >
              <Download className="w-3.5 h-3.5" /> 仅下载【{CATEGORIES.find(c => c.value === categoryFilter)?.label}】图片 ({filteredImagesCount}张)
            </button>
          )}

          <button
            id="export-excel-btn"
            onClick={() => {
              setExportNameFilter(searchTerm);
              setShowExportModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-95"
          >
            <Download className="w-3.5 h-3.5" /> 导出报销数据 ({processedExpenses.length}笔)
          </button>

          <button
            id="change-pwd-btn"
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-zinc-850 hover:bg-gray-50 dark:hover:bg-[#151517] font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Settings className="w-3.5 h-3.5" /> 修改密码
          </button>

          <button
            id="admin-logout-btn"
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/50 dark:hover:bg-rose-950/40 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" /> 退出登录
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-dashboard-grid">
        {/* Total People Card */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 md:p-5 border border-gray-150 dark:border-zinc-850 shadow-xs flex items-center gap-4 transition-all">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400 flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">总报销人数</p>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1 font-mono">
              {stats.totalPeople} <span className="text-xs font-normal text-gray-400">人</span>
            </h3>
          </div>
        </div>

        {/* Total Amount Card */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 md:p-5 border border-gray-150 dark:border-zinc-850 shadow-xs flex items-center gap-4 transition-all">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">总报销金额</p>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1 font-mono truncate" title={`¥${stats.totalAmount}`}>
              ¥{stats.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Today Counts Card */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 md:p-5 border border-gray-150 dark:border-zinc-850 shadow-xs flex items-center gap-4 transition-all">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">今日提交数量</p>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1 font-mono">
              {stats.todayCount} <span className="text-xs font-normal text-gray-400">笔</span>
            </h3>
          </div>
        </div>

        {/* Month Counts Card */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 md:p-5 border border-gray-150 dark:border-zinc-850 shadow-xs flex items-center gap-4 transition-all">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-500 dark:text-purple-400 flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">本月提交数量</p>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1 font-mono">
              {stats.thisMonthCount} <span className="text-xs font-normal text-gray-400">笔</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-150 dark:border-zinc-850 shadow-xs space-y-4" id="filters-panel">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">高级数据检索与筛选</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search by Name */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="admin-search-name-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索报销人姓名..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#121214] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
            />
          </div>

          {/* Filter by Date */}
          <div className="relative">
            <input
              id="admin-filter-date-input"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#121214] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
            />
            {!dateFilter && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                按消费日期筛选
              </span>
            )}
          </div>

          {/* Filter by Receipt Category */}
          <div className="relative">
            <select
              id="admin-filter-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#121214] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs appearance-none cursor-pointer"
            >
              <option value="">按凭证类型过滤 (全部)</option>
              <option value="invoice">📄 发票 (Invoice)</option>
              <option value="payment">💳 付款截图 (Payment)</option>
              <option value="itinerary">🚄 行程单 (Itinerary)</option>
              <option value="other">📁 其它凭证 (Other)</option>
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <FolderOpen className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Sort by Amount */}
          <div className="relative">
            <select
              id="admin-sort-amount-select"
              value={amountSort}
              onChange={(e) => setAmountSort(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#121214] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs appearance-none cursor-pointer"
            >
              <option value="">按报销金额排序 (默认最新)</option>
              <option value="desc">金额从大到小 ↓</option>
              <option value="asc">金额从小到大 ↑</option>
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Clear filters trigger */}
        {(searchTerm || dateFilter || categoryFilter || amountSort) && (
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-zinc-850">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              已找到 <span className="font-semibold text-blue-500">{processedExpenses.length}</span> 条符合条件的报销记录
            </span>
            <button
              onClick={() => {
                setSearchTerm("");
                setDateFilter("");
                setCategoryFilter("");
                setAmountSort("");
              }}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-all flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> 清除所有筛选
            </button>
          </div>
        )}
      </div>

      {/* Main Expense list section */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-150 dark:border-zinc-850">
          <svg className="animate-spin h-8 w-8 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">正在读取最新报销数据...</span>
        </div>
      ) : processedExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-150 dark:border-zinc-850 text-center px-4">
          <div className="p-4 rounded-full bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-400 dark:text-gray-500 mb-3.5">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">暂无报销记录</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm mx-auto">
            没有查找到符合当前筛选条件的报销单。请修改搜索关键字或等待员工提交。
          </p>
        </div>
      ) : (
        /* Render Grouped by Date (when not sorted by amount) or Flat List (when sorted by amount) */
        <div className="space-y-6" id="expenses-listings-section">
          {amountSort ? (
            /* FLAT LIST FOR AMOUNT SORTING */
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                排序结果 (已按金额排序，不按日期分组)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processedExpenses.map((exp) => (
                  <ExpenseCard
                    key={exp.id}
                    expense={exp}
                    onClick={() => setSelectedExpense(exp)}
                    counters={getAttachmentCounts(exp.attachments)}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* GROUPED BY DATE LIST (DEFAULT) */
            groupedExpenses.map((group) => (
              <div key={group.date} className="space-y-3">
                {/* Date Header Badge */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 text-gray-700 dark:text-gray-300 shadow-xs">
                    📅 {group.date}
                  </span>
                  <div className="h-px bg-gray-200/70 dark:bg-zinc-800/60 flex-1" />
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                    共 {group.items.length} 笔提交
                  </span>
                </div>

                {/* Date Group Cards Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.items.map((exp) => (
                    <ExpenseCard
                      key={exp.id}
                      expense={exp}
                      onClick={() => setSelectedExpense(exp)}
                      counters={getAttachmentCounts(exp.attachments)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Record Details Modal Slider Drawer */}
      {selectedExpense && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex justify-end" id="expense-details-drawer">
          <div className="w-full max-w-2xl bg-[#f5f5f7] dark:bg-black h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in relative border-l border-gray-200 dark:border-zinc-850">
            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md border-b border-gray-200/50 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>报销单详细信息</span>
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  ID: {selectedExpense.id} · 提交时间: {new Date(selectedExpense.created_at).toLocaleString("zh-CN")}
                </p>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Profile Card */}
              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 border border-gray-150 dark:border-zinc-850/80 shadow-xs space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">报销人</span>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mt-1">{selectedExpense.name}</h4>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">消费日期</span>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mt-1 font-mono">
                      {selectedExpense.expense_date}
                    </h4>
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-zinc-850" />

                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">报销总金额</span>
                  <div className="text-2xl font-black text-blue-500 dark:text-blue-400 mt-1 font-mono">
                    ¥{selectedExpense.amount.toFixed(2)}
                  </div>
                </div>

                {selectedExpense.remark && (
                  <>
                    <div className="h-px bg-gray-100 dark:bg-zinc-850" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">备注说明</span>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-gray-100/50 dark:border-zinc-800">
                        {selectedExpense.remark}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Categorized Receipt Images */}
              <div className="space-y-5">
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  已归档报销凭证
                </h4>

                {selectedExpense.attachments.length === 0 ? (
                  <div className="text-center py-8 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-xs text-gray-400">
                    没有上传任何发票或截图凭证
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 📄 Invoice Group */}
                    <ReceiptGroup
                      title="📄 发票 (Invoice)"
                      items={selectedExpense.attachments.filter((a) => a.category === "invoice")}
                      onPreviewImage={setActiveLightboxImage}
                    />

                    {/* 💳 Payment Group */}
                    <ReceiptGroup
                      title="💳 付款截图 (Payment)"
                      items={selectedExpense.attachments.filter((a) => a.category === "payment")}
                      onPreviewImage={setActiveLightboxImage}
                    />

                    {/* 🚄 Itinerary Group */}
                    <ReceiptGroup
                      title="🚄 行程单 (Itinerary)"
                      items={selectedExpense.attachments.filter((a) => a.category === "itinerary")}
                      onPreviewImage={setActiveLightboxImage}
                    />

                    {/* 📁 Other Group */}
                    <ReceiptGroup
                      title="📁 其它 (Other)"
                      items={selectedExpense.attachments.filter((a) => a.category === "other")}
                      onPreviewImage={setActiveLightboxImage}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal Overlay */}
      {activeLightboxImage && (
        <div
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          id="image-lightbox-overlay"
        >
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
            <img
              src={activeLightboxImage}
              alt="Zoomed Receipt Preview"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10 select-none animate-zoom"
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
            提示：点击任意空白区域或右上角关闭按钮可返回
          </p>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" id="change-password-modal">
          <div className="bg-white dark:bg-[#1c1c1e] max-w-md w-full rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 dark:border-zinc-800 relative">
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordError("");
                setPasswordSuccess("");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">修改管理员密码</h3>
                <p className="text-xs text-gray-400 mt-0.5">定期更换密码以保障团队数据安全</p>
              </div>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
                ⚠️ {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold">
                🎉 {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  当前原密码
                </label>
                <input
                  id="pwd-current-input"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#121214] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  设置新密码
                </label>
                <input
                  id="pwd-new-input"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#121214] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  确认新密码
                </label>
                <input
                  id="pwd-confirm-input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#121214] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
              </div>

              <button
                id="submit-pwd-change-btn"
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isChangingPassword ? "正在更改..." : "确认修改"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Export Format Wizard Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" id="export-wizard-modal">
          <div className="bg-white dark:bg-[#1c1c1e] max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 dark:border-zinc-800 relative">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">导出筛选报销数据</h3>
                <p className="text-xs text-gray-400 mt-0.5">选择您需要的格式导出当前筛选结果</p>
              </div>
            </div>

            {/* Current Filter Preview Status */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-gray-150/50 dark:border-zinc-850/60 mb-5 space-y-2">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">当前筛选范围</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">过滤姓名:</span> <strong className="text-gray-700 dark:text-gray-200 truncate inline-block max-w-[120px] align-bottom">{exportNameFilter || "全部人"}</strong>
                </div>
                <div>
                  <span className="text-gray-400">过滤日期:</span> <strong className="text-gray-700 dark:text-gray-200">{dateFilter || "所有日期"}</strong>
                </div>
                <div>
                  <span className="text-gray-400">凭证类型:</span> <strong className="text-gray-700 dark:text-gray-200">{categoryFilter ? CATEGORIES.find(c => c.value === categoryFilter)?.label : "不限"}</strong>
                </div>
                <div>
                  <span className="text-gray-400">符合笔数:</span> <strong className="text-blue-500 font-bold font-mono">{exportFilteredExpenses.length} 笔</strong>
                </div>
              </div>
              <div className="h-px bg-gray-200/50 dark:bg-zinc-800/50 my-2" />
              <div className="text-xs">
                <span className="text-gray-400">预估合计金额:</span> <strong className="text-emerald-500 font-mono text-sm ml-1">¥{exportFilteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>

            {/* Custom Name Filter for Export (Free Name Selection) */}
            <div className="mb-5 space-y-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
                👤 自由选择报销人姓名进行过滤 (可输入或点击快速选择)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={exportNameFilter}
                  onChange={(e) => setExportNameFilter(e.target.value)}
                  placeholder="输入或搜索员工姓名..."
                  className="w-full px-3.5 py-2 text-xs border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50 dark:bg-zinc-900/40 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
                />
                {exportNameFilter && (
                  <button
                    onClick={() => setExportNameFilter("")}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs font-semibold"
                  >
                    清除
                  </button>
                )}
              </div>
              {uniqueNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-[75px] overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => setExportNameFilter("")}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-all border ${
                      !exportNameFilter
                        ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-400"
                        : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:border-zinc-800 dark:text-gray-400"
                    }`}
                  >
                    全部所有人
                  </button>
                  {uniqueNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setExportNameFilter(name)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-all border ${
                        exportNameFilter === name
                          ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-400"
                          : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 dark:border-zinc-800 dark:text-gray-400"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Format Selector Cards */}
            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                选择导出文件格式
              </label>

              {/* XLSX Format Option */}
              <label 
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  exportFormat === "xlsx" 
                    ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20" 
                    : "border-gray-150 dark:border-zinc-850 hover:bg-gray-50 dark:hover:bg-zinc-900/40"
                }`}
              >
                <input 
                  type="radio" 
                  name="exportFormat" 
                  value="xlsx" 
                  checked={exportFormat === "xlsx"} 
                  onChange={() => setExportFormat("xlsx")} 
                  className="mt-1 accent-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">📈 Excel 图文电子表格 (.xlsx) —【推荐·直接看图】</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-0.5">
                    <strong>图片直接嵌入在表格单元格中！</strong> 自动将所有发票和付款截图作为真实缩略图嵌入单元格（可离线在 Excel 中查看，免去打开网页链接）
                  </span>
                </div>
              </label>

              {/* CSV Format Option */}
              <label 
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  exportFormat === "csv" 
                    ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/20" 
                    : "border-gray-150 dark:border-zinc-850 hover:bg-gray-50 dark:hover:bg-zinc-900/40"
                }`}
              >
                <input 
                  type="radio" 
                  name="exportFormat" 
                  value="csv" 
                  checked={exportFormat === "csv"} 
                  onChange={() => setExportFormat("csv")} 
                  className="mt-1 accent-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">📊 Excel 兼容 CSV 表格</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-0.5">
                    采用 UTF-8 BOM 编码，完美兼容微软 Excel，包含姓名、日期、金额、备注及所有图片凭证链接
                  </span>
                </div>
              </label>

              {/* Markdown Format Option */}
              <label 
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  exportFormat === "markdown" 
                    ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/20" 
                    : "border-gray-150 dark:border-zinc-850 hover:bg-gray-50 dark:hover:bg-zinc-900/40"
                }`}
              >
                <input 
                  type="radio" 
                  name="exportFormat" 
                  value="markdown" 
                  checked={exportFormat === "markdown"} 
                  onChange={() => setExportFormat("markdown")} 
                  className="mt-1 accent-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">📋 Markdown 格式审计报告</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-0.5">
                    排版精美，适合用做团队报销汇总文档，可以直接粘贴到邮件、钉钉、企业微信、或直接打印
                  </span>
                </div>
              </label>

              {/* JSON Format Option */}
              <label 
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  exportFormat === "json" 
                    ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/20" 
                    : "border-gray-150 dark:border-zinc-850 hover:bg-gray-50 dark:hover:bg-zinc-900/40"
                }`}
              >
                <input 
                  type="radio" 
                  name="exportFormat" 
                  value="json" 
                  checked={exportFormat === "json"} 
                  onChange={() => setExportFormat("json")} 
                  className="mt-1 accent-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">🗄️ JSON 纯文本数据备份</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-0.5">
                    包含完整的嵌套多维字段，适合程序员在其它系统或数据库中进行二次导入与自动化报销对账
                  </span>
                </div>
              </label>

              {/* Images Format Option */}
              <label 
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  exportFormat === "images" 
                    ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/20" 
                    : "border-gray-150 dark:border-zinc-850 hover:bg-gray-50 dark:hover:bg-zinc-900/40"
                }`}
              >
                <input 
                  type="radio" 
                  name="exportFormat" 
                  value="images" 
                  checked={exportFormat === "images"} 
                  onChange={() => setExportFormat("images")} 
                  className="mt-1 accent-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">🖼️ 批量下载筛选凭证图片 (原图)</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-0.5">
                    一键提取当前筛选结果下的所有凭证图片，自动按规范重命名（员工名_日期_类型），并触发浏览器下载
                  </span>
                </div>
              </label>
            </div>

            {/* Actions Buttons */}
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="py-2.5 px-4 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl border border-gray-200 dark:border-zinc-800 transition-all cursor-pointer text-center"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExportFilteredData}
                className="py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer text-center"
              >
                确认导出并下载
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Image Download & Zipping Progress Modal */}
      {downloadProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in" id="download-progress-modal">
          <div className="bg-white dark:bg-[#1c1c1e] max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-150 dark:border-zinc-800 relative flex flex-col max-h-[85vh]">
            <button
              onClick={() => setDownloadProgressModal(false)}
              disabled={downloadItems.some(it => it.status === "fetching") || isZipping}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5 flex-shrink-0">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 animate-pulse">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">一键打包凭证图片</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[320px]" title={downloadZipName}>
                  文件存档：{downloadZipName}
                </p>
              </div>
            </div>

            {/* Quick Informative Banner */}
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-gray-150/40 dark:border-zinc-850/60 mb-5 flex-shrink-0">
              💡 <strong>技术优势</strong>：系统正通过高并发通道拉取当前筛选结果下的所有凭证原图，并使用客户侧算力将其在浏览器中打包为一笔 <strong>ZIP 压缩包</strong>。这能够完美绕过浏览器对于多文件下载的拦截限制，100% 确保图片完整。
            </p>

            {/* Overall Progress Stats Bar */}
            <div className="mb-4 flex-shrink-0 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {isZipping ? (
                    <span className="flex items-center gap-1.5 text-blue-500 font-bold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      正在生成 ZIP 压缩包...
                    </span>
                  ) : downloadItems.every(it => it.status === "success") ? (
                    <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 font-black" />
                      所有凭证图片拉取成功
                    </span>
                  ) : downloadItems.some(it => it.status === "fetching") ? (
                    <span className="text-blue-500 font-bold flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      正在极速拉取中...
                    </span>
                  ) : (
                    <span className="text-gray-500 font-bold">
                      处理完成 (含有失败项)
                    </span>
                  )}
                </span>
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                  {downloadItems.filter(it => it.status === "success" || it.status === "error").length} / {downloadItems.length}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ 
                    width: `${(downloadItems.filter(it => it.status === "success" || it.status === "error").length / downloadItems.length) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Images List Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-[180px] border border-gray-150/60 dark:border-zinc-850 rounded-2xl p-3 bg-gray-50/30 dark:bg-zinc-950/10 space-y-2">
              {downloadItems.map((item, idx) => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    item.status === "fetching" 
                      ? "bg-blue-50/30 dark:bg-blue-950/10 border-blue-200/50 dark:border-blue-900/40" 
                      : item.status === "success"
                      ? "bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-100/10 dark:border-emerald-900/20"
                      : item.status === "error"
                      ? "bg-rose-50/30 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/40"
                      : "bg-white dark:bg-zinc-900 border-gray-150 dark:border-zinc-850"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 w-5 flex-shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[120px]">
                          {item.employeeName}
                        </span>
                        <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 px-1 py-0.25 rounded">
                          {item.categoryLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate font-mono max-w-[200px]" title={item.fileName}>
                        {item.fileName} ({item.date})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                    {item.status === "waiting" && (
                      <span className="text-gray-400 flex items-center gap-1 text-[10px]">
                        <Clock className="w-3.5 h-3.5" /> 等待中
                      </span>
                    )}
                    {item.status === "fetching" && (
                      <span className="text-blue-500 font-medium flex items-center gap-1 text-[10px]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> 获取中
                      </span>
                    )}
                    {item.status === "success" && (
                      <span className="text-emerald-500 font-bold flex items-center gap-1 text-[10px]">
                        <Check className="w-3.5 h-3.5 stroke-[3px]" /> 已入包
                      </span>
                    )}
                    {item.status === "error" && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-rose-500 font-bold flex items-center gap-1 text-[10px]" title={item.errorMsg}>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> 失败
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              let finalUrl = item.url;
                              if (item.url.startsWith("http")) {
                                finalUrl = `/api/proxy-image?url=${encodeURIComponent(item.url)}`;
                              }
                              window.open(finalUrl, "_blank");
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="text-[9px] bg-rose-500 hover:bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded cursor-pointer animate-pulse"
                          title="在新标签页中打开原图并手动下载"
                        >
                          原图
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions Footer */}
            <div className="mt-5 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setDownloadProgressModal(false)}
                disabled={downloadItems.some(it => it.status === "fetching") || isZipping}
                className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadItems.some(it => it.status === "fetching") || isZipping ? "打包下载中..." : "完成并关闭"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* SUBCOMPONENT: Individual Expense Card */
interface ExpenseCardProps {
  key?: string;
  expense: Expense;
  onClick: () => void;
  counters: { invoice: number; payment: number; itinerary: number; other: number };
}

function ExpenseCard({ expense, onClick, counters }: ExpenseCardProps) {
  const totalReceipts = expense.attachments.length;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 md:p-5 border border-gray-150 dark:border-zinc-850 hover:border-blue-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between h-full"
    >
      <div className="space-y-3.5">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-bold text-gray-950 dark:text-white group-hover:text-blue-500 transition-colors">
              {expense.name}
            </h4>
            <div className="flex flex-col gap-0.5 mt-1 font-mono">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                📅 消费日期: {expense.expense_date}
              </span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500">
                🕒 提交时间: {new Date(expense.created_at).toLocaleString("zh-CN", { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 block">报销金额</span>
            <span className="text-base font-black text-gray-900 dark:text-white font-mono block mt-0.5">
              ¥{expense.amount.toFixed(2)}
            </span>
          </div>
        </div>

        {expense.remark && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 bg-gray-50 dark:bg-[#151517] p-2 rounded-lg border border-gray-100/50 dark:border-zinc-900">
            {expense.remark}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-zinc-850/80 flex items-center justify-between">
        {/* Badges list */}
        <div className="flex flex-wrap gap-1.5">
          {counters.invoice > 0 && (
            <span className="px-2 py-0.5 text-[10px] rounded-md font-medium bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100/30">
              📄 发票 {counters.invoice}张
            </span>
          )}
          {counters.payment > 0 && (
            <span className="px-2 py-0.5 text-[10px] rounded-md font-medium bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/30">
              💳 付款 {counters.payment}张
            </span>
          )}
          {counters.itinerary > 0 && (
            <span className="px-2 py-0.5 text-[10px] rounded-md font-medium bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30">
              🚄 行程 {counters.itinerary}张
            </span>
          )}
          {counters.other > 0 && (
            <span className="px-2 py-0.5 text-[10px] rounded-md font-medium bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
              📁 其它 {counters.other}张
            </span>
          )}
          {totalReceipts === 0 && (
            <span className="px-2 py-0.5 text-[10px] rounded-md bg-gray-50 dark:bg-zinc-900 text-gray-400">
              无凭证图片
            </span>
          )}
        </div>

        <div className="text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300 flex items-center text-xs font-semibold gap-0.5">
          <span>详情</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

/* SUBCOMPONENT: Receipt Group for category details */
interface ReceiptGroupProps {
  title: string;
  items: Attachment[];
  onPreviewImage: (url: string) => void;
}

function ReceiptGroup({ title, items, onPreviewImage }: ReceiptGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 border border-gray-150 dark:border-zinc-850/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-850 pb-2">
        <h5 className="text-xs font-bold text-gray-800 dark:text-gray-200">{title}</h5>
        <span className="text-[10px] font-semibold text-gray-400">{items.length}张图片</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((img) => (
          <div
            key={img.id}
            onClick={() => onPreviewImage(img.image_url)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 cursor-zoom-in hover:shadow-md transition-all"
            title="点击放大查看图片"
          >
            <img
              src={img.image_url}
              alt="Receipt"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
            />
            {/* Hover overlay with button */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
              <span className="p-2 rounded-full bg-white/20 text-white backdrop-blur-md">
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
