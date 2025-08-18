"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const resume_1 = __importDefault(require("./routes/resume"));
const jobDescription_1 = __importDefault(require("./routes/jobDescription"));
const skillAnalysis_1 = __importDefault(require("./routes/skillAnalysis"));
const learningPath_1 = __importDefault(require("./routes/learningPath"));
const learningResource_1 = __importDefault(require("./routes/learningResource"));
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
const auth_2 = require("./middleware/auth");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = 3001;
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
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
app.use('/api/auth', auth_1.default);
app.use('/api/resume', auth_2.authenticate, resume_1.default);
app.use('/api/job-description', auth_2.authenticate, jobDescription_1.default);
app.use('/api/skill-analysis', auth_2.authenticate, skillAnalysis_1.default);
app.use('/api/learning-path', auth_2.authenticate, learningPath_1.default);
app.use('/api/learning-resources', auth_2.authenticate, learningResource_1.default);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});
// Error handling middleware
app.use(errorHandler_1.cleanupUploadedFile);
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
//# sourceMappingURL=server.js.map