// Type declarations for document parsing libraries

declare module 'pdf-parse' {
  function pdfParse(buffer: Buffer): Promise<{
    numpages: number;
    numrender: number;
    version: string;
    text: string;
    info: any;
  }>;
  export default pdfParse;
}

declare module 'mammoth' {
  function extractRawText(options: { buffer: Buffer }): Promise<{ value: string; messages: any[] }>;
  export default { extractRawText };
}
