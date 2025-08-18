import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import express from 'express';
export declare const upload: multer.Multer;
export declare const uploadResume: express.RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const handleUploadError: (error: any, req: Request, res: Response, next: NextFunction) => void;
export declare const validateUploadedFile: (req: Request, res: Response, next: NextFunction) => void;
export declare const cleanupUploadedFile: (req: Request, res: Response, next: NextFunction) => void;
export declare const manualCleanup: (filePath: string) => void;
export declare const handleMixedUpload: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=upload.d.ts.map