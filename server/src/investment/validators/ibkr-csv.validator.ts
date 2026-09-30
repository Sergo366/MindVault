import { FileValidator } from '@nestjs/common';

export class IBKRCsvValidator extends FileValidator {
  constructor() {
    super({});
  }

  isValid(files: Express.Multer.File[] | Express.Multer.File): boolean {
    const fileList = Array.isArray(files) ? files : [files];
    if (!fileList.length) return false;

    const allowedMimes = [
      'text/csv',
      'application/csv',
      'text/plain',
      'application/vnd.ms-excel',
    ];

    const ibkrSignatures = [
      'Statement',
      'Account Information',
      'Interactive Brokers',
      'Trades',
      'Financial Instrument Information',
      'ClientInfo',
    ];

    return fileList.every((file) => {
      // 1. Extension
      const isCsvExtension = file.originalname.toLowerCase().endsWith('.csv');
      // 2. MIME-type
      const isCsvMime = allowedMimes.includes(file.mimetype);

      // 3. IBKR CSV signature
      const sampleChunk = file.buffer.toString('utf-8', 0, 20480);
      const hasIbkrSignature = ibkrSignatures.some((sig) =>
        sampleChunk.includes(sig),
      );

      return isCsvExtension && isCsvMime && hasIbkrSignature;
    });
  }

  buildErrorMessage(): string {
    return 'Files must be CSV files with IBKR CSV signature';
  }
}
