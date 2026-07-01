import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Increase request size limit to support Base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const EXPENSES_FILE = path.join(DATA_DIR, "expenses.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded static files with database Base64 fallback
app.get("/api/uploads/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOADS_DIR, filename);

  // If file exists physically on disk, serve it immediately
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // Fallback: Check if we have the Base64 data inside the expenses.json database
  try {
    const expenses = loadExpenses();
    for (const exp of expenses) {
      if (exp.attachments) {
        for (const att of exp.attachments) {
          // If the image_url ends with this filename or matches it
          if (att.image_url && (att.image_url.endsWith("/" + filename) || att.image_url === filename) && att.base64) {
            const base64Str = att.base64;
            const matches = base64Str.match(/^data:(image\/\w+);base64,(.+)$/);
            if (matches) {
              const contentType = matches[1];
              const base64Data = matches[2];
              const buffer = Buffer.from(base64Data, "base64");
              res.setHeader("Content-Type", contentType);
              return res.send(buffer);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Image fallback serving failed:", err);
  }

  // If we couldn't find it anywhere, return 404
  res.status(404).send("Image not found");
});

// Helper functions for loading and saving data
function loadExpenses() {
  if (!fs.existsSync(EXPENSES_FILE)) {
    // Return some beautiful default mock records so the layout looks incredible on first open!
    const mockData = [
      {
        id: "mock-1",
        name: "张三",
        expense_date: "2026-07-01",
        amount: 230,
        remark: "研发团队上海技术沙龙聚餐 & 的士报销",
        attachments: [
          { id: "att-1", image_url: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&q=80", category: "invoice", fileName: "fapiao_dinner.jpg" },
          { id: "att-2", image_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&q=80", category: "payment", fileName: "screenshot_wechat.png" },
          { id: "att-3", image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&q=80", category: "itinerary", fileName: "itinerary_taxi.jpg" }
        ],
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "mock-2",
        name: "李四",
        expense_date: "2026-06-30",
        amount: 89,
        remark: "广州出差客户拜访地铁与工作午餐",
        attachments: [
          { id: "att-4", image_url: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=500&q=80", category: "invoice", fileName: "fapiao_subway.jpg" },
          { id: "att-5", image_url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500&q=80", category: "payment", fileName: "screenshot_alipay.png" }
        ],
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: "mock-3",
        name: "王五",
        expense_date: "2026-06-25",
        amount: 1450,
        remark: "北京研发会议往返高铁票",
        attachments: [
          { id: "att-6", image_url: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=500&q=80", category: "invoice", fileName: "fapiao_train_go.jpg" },
          { id: "att-7", image_url: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=500&q=80", category: "itinerary", fileName: "itinerary_train_back.jpg" }
        ],
        created_at: new Date(Date.now() - 86400000 * 5).toISOString()
      }
    ];
    fs.writeFileSync(EXPENSES_FILE, JSON.stringify(mockData, null, 2), "utf-8");
    return mockData;
  }
  try {
    const raw = fs.readFileSync(EXPENSES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveExpenses(expenses: any) {
  fs.writeFileSync(EXPENSES_FILE, JSON.stringify(expenses, null, 2), "utf-8");
}

function loadConfig() {
  const defaultConfig = { adminPassword: "123456" };
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), "utf-8");
    return defaultConfig;
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch (err) {
    return defaultConfig;
  }
}

function saveConfig(config: any) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

// API Routes

// Image proxy to bypass CORS when packaging external mock images in ZIP archives
app.get("/api/proxy-image", async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("Missing url parameter");
    }
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error: any) {
    console.error("Proxy image error:", error);
    res.status(500).send(error.message);
  }
});

// 1. Get all expenses
app.get("/api/expenses", (req, res) => {
  try {
    const expenses = loadExpenses();
    res.json({ success: true, data: expenses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Add a new expense
app.post("/api/expenses", (req, res) => {
  try {
    const { name, expense_date, amount, remark, attachments } = req.body;
    if (!name || !expense_date || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: "必填字段缺失：姓名、日期、金额" });
    }

    const expenses = loadExpenses();
    const newExpense = {
      id: "exp-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
      name,
      expense_date,
      amount: Number(amount),
      remark: remark || "",
      attachments: attachments || [],
      created_at: new Date().toISOString()
    };

    expenses.unshift(newExpense); // Insert at the beginning
    saveExpenses(expenses);

    res.json({ success: true, data: newExpense });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2b. Bulk Sync Expenses to heal the database from server restarts / container resets
app.post("/api/expenses/sync", (req, res) => {
  try {
    const { expenses: clientExpenses } = req.body;
    if (!Array.isArray(clientExpenses)) {
      return res.status(400).json({ success: false, error: "提交的同步数据格式不正确" });
    }

    const serverExpenses = loadExpenses();
    const serverMap = new Map(serverExpenses.map((e: any) => [e.id, e]));

    let addedCount = 0;
    for (const clientExp of clientExpenses) {
      if (clientExp && clientExp.id && !serverMap.has(clientExp.id)) {
        serverExpenses.push(clientExp);
        serverMap.set(clientExp.id, clientExp);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      // Sort expenses descending by creation date or date
      serverExpenses.sort((a: any, b: any) => {
        const timeA = new Date(a.created_at || a.expense_date).getTime();
        const timeB = new Date(b.created_at || b.expense_date).getTime();
        return timeB - timeA;
      });
      saveExpenses(serverExpenses);
    }

    res.json({ success: true, addedCount, total: serverExpenses.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Upload raw Base64 image
app.post("/api/upload", (req, res) => {
  try {
    const { name, type, base64 } = req.body;
    if (!name || !base64) {
      return res.status(400).json({ success: false, error: "无效的上传数据" });
    }

    // Clean up base64 prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique file name
    const timestamp = Date.now();
    const cleanName = name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${timestamp}_${cleanName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);

    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/api/uploads/${uniqueFileName}`;
    res.json({ success: true, url: relativeUrl, fileName: name });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Admin login
app.post("/api/admin/login", (req, res) => {
  try {
    const { username } = req.body;

    if (username === "admin") {
      res.json({ success: true, token: "admin-session-token-9982" });
    } else {
      res.status(401).json({ success: false, error: "管理员账号不正确" });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Change Admin Password
app.post("/api/admin/change-password", (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const config = loadConfig();

    if (currentPassword !== config.adminPassword) {
      return res.status(400).json({ success: false, error: "原密码输入错误" });
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, error: "新密码长度不能少于4位" });
    }

    config.adminPassword = newPassword;
    saveConfig(config);

    res.json({ success: true, message: "密码修改成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Get stats (totals, today, this month)
app.get("/api/stats", (req, res) => {
  try {
    const expenses = loadExpenses();
    const uniquePeople = new Set(expenses.map((e: any) => e.name));
    const totalAmount = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD in UTC
    const localTodayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0]; // Local YYYY-MM-DD

    const thisMonthPrefix = localTodayStr.substring(0, 7); // YYYY-MM

    let todayCount = 0;
    let thisMonthCount = 0;

    expenses.forEach((e: any) => {
      // Check submit date (either expense_date or created_at)
      // Usually "今日提交数量" refers to submission date (created_at) or the expense_date.
      // Let's check both or use created_at for submission stats
      const createdAtLocal = new Date(new Date(e.created_at).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];

      if (createdAtLocal === localTodayStr) {
        todayCount++;
      }
      if (createdAtLocal.startsWith(thisMonthPrefix)) {
        thisMonthCount++;
      }
    });

    res.json({
      success: true,
      data: {
        totalPeople: uniquePeople.size,
        totalAmount,
        todayCount,
        thisMonthCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Export to Excel-compatible CSV format
app.get("/api/export", (req, res) => {
  try {
    const expenses = loadExpenses();
    
    // CSV Header matching Excel export requirements
    const headers = [
      "姓名",
      "报销日期",
      "报销金额",
      "备注",
      "发票数量",
      "付款截图数量",
      "行程单数量",
      "其它数量",
      "创建时间",
      "图片链接"
    ];

    const reqHost = req.get("host") || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    let appUrl = `${protocol}://${reqHost}`;
    if (appUrl.includes("ais-dev-")) {
      appUrl = appUrl.replace("ais-dev-", "ais-pre-");
    }

    // Build Rows
    const rows = expenses.map((e: any) => {
      const invoiceCount = e.attachments.filter((a: any) => a.category === "invoice").length;
      const paymentCount = e.attachments.filter((a: any) => a.category === "payment").length;
      const itineraryCount = e.attachments.filter((a: any) => a.category === "itinerary").length;
      const otherCount = e.attachments.filter((a: any) => a.category === "other").length;
      
      // Generate clean absolute links for attachments
      const links = e.attachments.map((a: any) => {
        if (a.image_url.startsWith("http")) return a.image_url;
        return `${appUrl}${a.image_url}`;
      }).join("; ");

      return [
        e.name,
        e.expense_date,
        e.amount,
        (e.remark || "").replace(/[\r\n,]/g, " "), // strip commas and newlines
        invoiceCount,
        paymentCount,
        itineraryCount,
        otherCount,
        new Date(e.created_at).toLocaleString("zh-CN"),
        links
      ];
    });

    // Generate CSV string with comma separators
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => {
        // Enclose values in quotes to prevent breakages due to commas or spaces
        const strVal = String(cell);
        if (strVal.includes(",") || strVal.includes("\"") || strVal.includes("\n") || strVal.includes("\r")) {
          return `"${strVal.replace(/"/g, "\"\"")}"`;
        }
        return strVal;
      }).join(","))
    ].join("\n");

    // Add UTF-8 BOM to make it open perfectly in Excel with Chinese characters
    const bom = "\uFEFF";
    const buffer = Buffer.from(bom + csvContent, "utf-8");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=AI_Expense_Report.csv");
    res.send(buffer);
  } catch (error: any) {
    res.status(500).send("导出失败: " + error.message);
  }
});

// 8. Export to Real Excel (.xlsx) file with embedded images
app.get("/api/export-xlsx", async (req, res) => {
  try {
    const expenses = loadExpenses();
    const { searchTerm, dateFilter, categoryFilter, amountSort } = req.query;

    let processedExpenses = [...expenses];

    // Search by Name (case-insensitive)
    if (searchTerm && typeof searchTerm === "string" && searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      processedExpenses = processedExpenses.filter((e: any) => e.name.toLowerCase().includes(term));
    }

    // Filter by Date
    if (dateFilter && typeof dateFilter === "string") {
      processedExpenses = processedExpenses.filter((e: any) => e.expense_date === dateFilter);
    }

    // Filter by Receipt Category
    if (categoryFilter && typeof categoryFilter === "string") {
      processedExpenses = processedExpenses.filter((e: any) => e.attachments.some((a: any) => a.category === categoryFilter));
    }

    // Sort by Amount or Date
    if (amountSort && typeof amountSort === "string") {
      processedExpenses.sort((a: any, b: any) => {
        return amountSort === "desc" ? b.amount - a.amount : a.amount - b.amount;
      });
    } else {
      processedExpenses.sort((a: any, b: any) => {
        const dateA = new Date(a.expense_date).getTime();
        const dateB = new Date(b.expense_date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    const ExcelJS = await import("exceljs").then((m) => m.default || m);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("报销明细图文报告");

    // Define columns
    worksheet.columns = [
      { header: "报销人", key: "name", width: 15 },
      { header: "消费日期", key: "expense_date", width: 15 },
      { header: "提交时间", key: "created_at", width: 22 },
      { header: "报销金额", key: "amount", width: 15 },
      { header: "凭证汇总", key: "details", width: 25 },
      { header: "备注说明", key: "remark", width: 35 },
      { header: "凭证截图 1", key: "img1", width: 24 },
      { header: "凭证截图 2", key: "img2", width: 24 },
      { header: "凭证截图 3", key: "img3", width: 24 },
      { header: "凭证截图 4", key: "img4", width: 24 }
    ];

    // Format header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF3B82F6" } // Blue-500
      };
      cell.font = {
        name: "Microsoft YaHei",
        bold: true,
        color: { argb: "FFFFFFFF" },
        size: 11
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add rows and images
    for (let i = 0; i < processedExpenses.length; i++) {
      const e = processedExpenses[i];
      const rowIndex = i + 2; // Data rows start at index 2 (row 1 is header)

      const invoiceCount = e.attachments.filter((a: any) => a.category === "invoice").length;
      const paymentCount = e.attachments.filter((a: any) => a.category === "payment").length;
      const itineraryCount = e.attachments.filter((a: any) => a.category === "itinerary").length;
      const otherCount = e.attachments.filter((a: any) => a.category === "other").length;

      const detailParts = [];
      if (invoiceCount > 0) detailParts.push(`发票 x${invoiceCount}`);
      if (paymentCount > 0) detailParts.push(`付款 x${paymentCount}`);
      if (itineraryCount > 0) detailParts.push(`行程单 x${itineraryCount}`);
      if (otherCount > 0) detailParts.push(`其它 x${otherCount}`);
      const detailsStr = detailParts.join(" | ") || "无凭证";

      const submitTimeStr = new Date(e.created_at).toLocaleString("zh-CN");

      const row = worksheet.addRow({
        name: e.name,
        expense_date: e.expense_date,
        created_at: submitTimeStr,
        amount: e.amount,
        details: detailsStr,
        remark: e.remark || ""
      });

      // Set standard height for data rows to fit images nicely
      row.height = 95;

      // Style standard cell alignments
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Microsoft YaHei", size: 10 };
        cell.alignment = { vertical: "middle" };
        
        if (colNumber === 1 || colNumber === 2 || colNumber === 3) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (colNumber === 4) {
          cell.alignment = { vertical: "middle", horizontal: "right" };
          cell.numFmt = "¥#,##0.00";
          cell.font = { name: "Microsoft YaHei", size: 10, bold: true, color: { argb: "FF10B981" } };
        }
      });

      // Embed images
      if (e.attachments && e.attachments.length > 0) {
        const limitAttachments = e.attachments.slice(0, 4);
        for (let j = 0; j < limitAttachments.length; j++) {
          const a = limitAttachments[j];
          let imgBuffer: Buffer | null = null;
          let extension: "png" | "jpeg" = "png";

          try {
            if (a.base64) {
              const base64Str = a.base64;
              const matches = base64Str.match(/^data:image\/(\w+);base64,(.+)$/);
              if (matches) {
                const ext = matches[1].toLowerCase();
                extension = (ext === "jpg" || ext === "jpeg") ? "jpeg" : "png";
                imgBuffer = Buffer.from(matches[2], "base64");
              }
            } else if (a.image_url && a.image_url.startsWith("/api/uploads/")) {
              const filename = path.basename(a.image_url);
              const filePath = path.join(UPLOADS_DIR, filename);
              if (fs.existsSync(filePath)) {
                imgBuffer = fs.readFileSync(filePath);
                extension = (filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")) ? "jpeg" : "png";
              }
            } else if (a.image_url && a.image_url.startsWith("http")) {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 4000);
              try {
                const imgRes = await fetch(a.image_url, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (imgRes.ok) {
                  const arrayBuffer = await imgRes.arrayBuffer();
                  imgBuffer = Buffer.from(arrayBuffer);
                  extension = (a.image_url.toLowerCase().endsWith(".jpg") || a.image_url.toLowerCase().endsWith(".jpeg")) ? "jpeg" : "png";
                }
              } catch (fetchErr) {
                console.warn(`Failed to fetch image for excel: ${a.image_url}`, fetchErr);
              }
            }

            if (imgBuffer) {
              const imageId = workbook.addImage({
                buffer: imgBuffer,
                extension: extension
              });
              
              worksheet.addImage(imageId, {
                tl: { col: 6 + j, row: rowIndex - 1 } as any, // 0-indexed column and row
                br: { col: 7 + j, row: rowIndex } as any,
                editAs: "oneCell"
              });
            }
          } catch (imgErr) {
            console.error(`Error embedding image for row ${rowIndex}:`, imgErr);
          }
        }
      }
    }

    // Border and line grid styling
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="AI_Expense_Visual_Report_${new Date().toISOString().split("T")[0]}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("XLSX export failed:", error);
    res.status(500).send("导出 Excel 失败: " + error.message);
  }
});

// Vite Middleware & SPA serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
