import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { z } from 'zod';
import { serializeError } from 'serialize-error';
import { ApiConfiguration } from './shared/api.js';
import { ClineApi } from './api/ClineApi.js';

dotenv.config();

const app = express();

// セキュリティ設定
app.use(helmet());
app.use(cors());
app.use(express.json());

// レート制限の設定
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // IPアドレスごとのリクエスト数
});
app.use(limiter);

// リクエストのバリデーションスキーマ
const TaskRequestSchema = z.object({
  task: z.string(),
  images: z.array(z.string()).optional(),
  customInstructions: z.string().optional(),
  apiConfiguration: z.object({
    provider: z.string(),
    apiKey: z.string(),
    model: z.string().optional()
  })
});

// APIレスポンスの型定義
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    details?: any;
  };
}

// タスク実行エンドポイント（ストリーミング）
app.post('/api/task/stream', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const validatedData = TaskRequestSchema.parse(req.body);
    
    // SSEヘッダーを設定
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const clineApi = new ClineApi(validatedData.apiConfiguration as ApiConfiguration);
    
    // イベントリスナーを設定
    clineApi.on('progress', (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    clineApi.on('error', (error) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`);
      res.end();
    });

    clineApi.on('completion', (result) => {
      res.write(`data: ${JSON.stringify({ type: 'completion', result })}\n\n`);
      res.end();
    });

    // タスクを実行
    await clineApi.executeTask(
      validatedData.task,
      validatedData.images,
      validatedData.customInstructions
    );

  } catch (error) {
    next(error);
  }
});

// 通常のエンドポイント（後方互換性のため）
app.post('/api/task', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const validatedData = TaskRequestSchema.parse(req.body);
    
    const clineApi = new ClineApi(validatedData.apiConfiguration as ApiConfiguration);
    const result = await clineApi.executeTask(
      validatedData.task,
      validatedData.images,
      validatedData.customInstructions
    );

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

// エラーハンドリング用のミドルウェア
const errorHandler = (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  const response: ApiResponse = {
    success: false,
    error: {
      message: err.message,
      details: serializeError(err)
    }
  };
  res.status(500).json(response);
};

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});