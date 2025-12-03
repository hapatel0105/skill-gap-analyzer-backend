import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth';
import resumeRoutes from './routes/resume';
import jobDescriptionRoutes from './routes/jobDescription';
import skillAnalysisRoutes from './routes/skillAnalysis';
import learningPathRoutes from './routes/learningPath';
import learningResourceRoutes from './routes/learningResource';

// Import middleware
import { errorHandler, cleanupUploadedFile } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
// CORS configuration
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(url => url.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or is a Vercel preview deployment
    if (allowedOrigins.indexOf(origin) !== -1 ||
      (origin.endsWith('.vercel.app') && origin.includes('skill-gap-analyzer'))) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', authenticate, resumeRoutes);
app.use('/api/job-description', authenticate, jobDescriptionRoutes);
app.use('/api/skill-analysis', authenticate, skillAnalysisRoutes);
app.use('/api/learning-path', authenticate, learningPathRoutes);
app.use('/api/learning-resources', authenticate, learningResourceRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use(cleanupUploadedFile);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
