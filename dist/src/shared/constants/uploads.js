"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILE_UPLOAD = void 0;
exports.FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
    ],
    ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.txt'],
};
//# sourceMappingURL=uploads.js.map