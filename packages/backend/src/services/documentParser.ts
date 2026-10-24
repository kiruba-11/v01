import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('documentParser');

interface ParsedDocument {
  text: string;
  metadata: Record<string, any>;
}

export async function parseDocument(filePath: string, mimeType: string): Promise<ParsedDocument> {
  try {
    switch (mimeType) {
      case 'application/pdf':
        return await parsePDF(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await parseDOCX(filePath);
      case 'text/plain':
      case 'text/markdown':
        return await parseText(filePath);
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'text/csv':
        return await parseSpreadsheet(filePath);
      case 'image/jpeg':
      case 'image/png':
      case 'image/webp':
        return await parseImage(filePath);
      default:
        throw new Error(`Unsupported mime type: ${mimeType}`);
    }
  } catch (error: any) {
    logger.error('Document parsing error', { filePath, mimeType, error: error.message });
    throw error;
  }
}

async function parsePDF(filePath: string): Promise<ParsedDocument> {
  // Dynamic import to handle optional dependencies
  const pdfParse = (await import('pdf-parse')).default;
  const fileBuffer = await fs.readFile(filePath);

  const pdf = await pdfParse(fileBuffer);
  const text = pdf.text;

  return {
    text,
    metadata: {
      pages: pdf.numpages,
      title: pdf.info?.Title || 'Untitled',
      author: pdf.info?.Author || 'Unknown',
      creationDate: pdf.info?.CreationDate,
    },
  };
}

async function parseDOCX(filePath: string): Promise<ParsedDocument> {
  // Dynamic import to handle optional dependencies
  const mammoth = (await import('mammoth')).default;
  const fileBuffer = await fs.readFile(filePath);

  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  const text = result.value;

  return {
    text,
    metadata: {
      format: 'docx',
    },
  };
}

async function parseText(filePath: string): Promise<ParsedDocument> {
  const text = await fs.readFile(filePath, 'utf-8');

  return {
    text,
    metadata: {
      format: path.extname(filePath) === '.md' ? 'markdown' : 'text',
    },
  };
}

async function parseSpreadsheet(filePath: string): Promise<ParsedDocument> {
  // Dynamic import to handle optional dependencies
  const xlsx = (await import('xlsx')).default;
  const workbook = xlsx.readFile(filePath);

  let text = '';
  const sheets: Record<string, any> = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const csvText = xlsx.utils.sheet_to_csv(worksheet);
    text += `Sheet: ${sheetName}\n${csvText}\n\n`;
    sheets[sheetName] = xlsx.utils.sheet_to_json(worksheet);
  }

  return {
    text,
    metadata: {
      format: 'spreadsheet',
      sheets: workbook.SheetNames,
      sheetData: sheets,
    },
  };
}

async function parseImage(filePath: string): Promise<ParsedDocument> {
  // For now, return basic metadata. OCR would require additional setup
  logger.warn('Image parsing: OCR not yet implemented, returning filename only');

  return {
    text: path.basename(filePath),
    metadata: {
      format: 'image',
      note: 'Full OCR support coming in Phase 2.5',
    },
  };
}
