import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import * as vite from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());

// Increase JSON limit to handle base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure data directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(EXPENSES_FILE)) {
  fs.writeFileSync(EXPENSES_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(FEEDBACK_FILE)) {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// 1. Static Route to Serve Uploaded Images
app.use('/api/uploads', express.static(UPLOADS_DIR));

// 2. Base64 Image Upload Route
app.post('/api/upload', (req, res) => {
  try {
    const { name, base64 } = req.body;
    if (!name || !base64) {
      res.status(400).json({ success: false, error: '缺少图片名称或图片内容数据' });
      return;
    }

    // Clean up base64 prefix if exists
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Create unique file name
    const timestamp = Date.now();
    const cleanName = name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const finalFileName = `${timestamp}______${cleanName}`;
    const filePath = path.join(UPLOADS_DIR, finalFileName);

    // Save file
    fs.writeFileSync(filePath, buffer);

    res.json({
      success: true,
      url: `/api/uploads/${finalFileName}`
    });
    return;
  } catch (err: any) {
    console.error('Upload Error:', err);
    res.status(500).json({ success: false, error: err.message || '上传处理异常' });
    return;
  }
});

// 3. Save Expense Claims
app.post('/api/expenses', (req, res) => {
  try {
    const newEntries = req.body;
    if (!Array.isArray(newEntries)) {
      res.status(400).json({ success: false, error: '无效的数据格式，应该为报销列表' });
      return;
    }

    // Read existing
    let current: any[] = [];
    if (fs.existsSync(EXPENSES_FILE)) {
      const content = fs.readFileSync(EXPENSES_FILE, 'utf-8');
      try {
        current = JSON.parse(content);
      } catch (e) {
        current = [];
      }
    }

    // Auto inject submit timestamp for excel & database
    const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
    const finalEntries = newEntries.map((entry: any) => ({
      ...entry,
      submit_time: entry.submit_time || timestamp
    }));

    // Combine
    const updated = [...finalEntries, ...current]; // put new ones first
    fs.writeFileSync(EXPENSES_FILE, JSON.stringify(updated, null, 2), 'utf-8');

    res.json({ success: true });
    return;
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message || '保存报销失败' });
    return;
  }
});

// 4. Save Problem Feedback Route
app.post('/api/feedback', (req, res) => {
  try {
    const { content, contact } = req.body;
    if (!content) {
      res.status(400).json({ success: false, error: '反馈内容不能为空' });
      return;
    }

    let currentFeedbacks: any[] = [];
    if (fs.existsSync(FEEDBACK_FILE)) {
      const fileContent = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
      try {
        currentFeedbacks = JSON.parse(fileContent);
      } catch (e) {
        currentFeedbacks = [];
      }
    }

    const newFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      content,
      contact: contact || '',
      createdAt: new Date().toISOString()
    };

    currentFeedbacks.unshift(newFeedback); // Store new feedbacks first
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(currentFeedbacks, null, 2), 'utf-8');

    res.json({ success: true });
    return;
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message || '保存反馈失败' });
    return;
  }
});

// 5. Admin Login Route
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (password === adminPassword) {
    res.json({ success: true, token: 'session_token_ai_reimbursement_2026' });
  } else {
    res.status(401).json({ success: false, error: '密码错误，拒绝访问' });
  }
});

// Token Verification Middleware
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader === 'Bearer session_token_ai_reimbursement_2026') {
    next();
  } else {
    res.status(403).json({ success: false, error: '未授权访问，请重新登录' });
  }
};

// 6. Admin GET expenses list
app.get('/api/admin/expenses', requireAdmin, (_req, res) => {
  try {
    let data = [];
    if (fs.existsSync(EXPENSES_FILE)) {
      data = JSON.parse(fs.readFileSync(EXPENSES_FILE, 'utf-8'));
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: '获取数据失败' });
  }
});

// 7. Admin GET feedbacks list
app.get('/api/admin/feedbacks', requireAdmin, (_req, res) => {
  try {
    let data = [];
    if (fs.existsSync(FEEDBACK_FILE)) {
      data = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: '获取反馈失败' });
  }
});

// 8. Admin DELETE / Resolve feedback
app.delete('/api/admin/feedback/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    let data = [];
    if (fs.existsSync(FEEDBACK_FILE)) {
      data = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
    }

    const filtered = data.filter((fb: any) => fb.id !== id);
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(filtered, null, 2), 'utf-8');

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: '删除反馈失败' });
  }
});

// Vite Dev Server / Static Middleware configuration
const startServer = async () => {
  if (process.env.NODE_ENV === 'production' || process.env.DISABLE_HMR) {
    // In production built mode, serve the static dist folder
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      // Dev mode fallback if dist is missing
      console.warn('Production static path missing, starting Vite middleware...');
      await setupViteDevMiddleware();
    }
  } else {
    await setupViteDevMiddleware();
  }

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Admin panel default credentials: password = admin123`);
  });
};

const setupViteDevMiddleware = async () => {
  const viteServer = await vite.createServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(viteServer.middlewares);
};

startServer().catch(console.error);
