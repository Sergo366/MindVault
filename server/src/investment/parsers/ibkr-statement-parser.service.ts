import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { StatementRecord } from '../entities/statement-record.entity';
import { parseCsvLine } from '../utils/ibkr.util';

/**
 * Parses IBKR CSV statement files into generic {@link StatementRecord} rows.
 *
 * The IBKR export is section-based:
 *   - a "Header" row defines the column names for a section
 *   - "Data" rows carry the values
 * Sections are tracked per file, so the same section name can appear in
 * multiple files with different column layouts.
 *
 * This service holds no data-access dependencies: it only turns file buffers
 * into plain row objects, which the caller persists.
 */
@Injectable()
export class IbkrStatementParser {
  parseFiles(
    files: Express.Multer.File[],
    userId: string,
    portfolioId: string,
  ): { records: Partial<StatementRecord>[]; totalParsed: number } {
    const records: Partial<StatementRecord>[] = [];
    let totalParsed = 0;

    for (const file of files) {
      const content = file.buffer.toString('utf-8');
      const lines = content.split('\n');

      // A map to store the headers for each section.
      // E.g., headersMap['Trades'] = ['Trades', 'Header', 'DataDiscriminator', ...]
      const headersMap: Record<string, string[]> = {};

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const row = parseCsvLine(line);
        if (row.length < 2) continue;

        const sectionName = row[0]; // e.g., 'Trades', 'Dividends', 'Cash Report'
        const rowType = row[1]; // 'Header', 'Data', etc.

        if (rowType === 'Header') {
          // Store headers for this section
          headersMap[sectionName] = row.map((h) => h.trim());
          continue;
        }

        if (rowType === 'Data') {
          const sectionHeaders = headersMap[sectionName];
          if (!sectionHeaders || sectionHeaders.length === 0) continue;

          // Map row to a JSON object using the section's headers
          const rawData: Record<string, string> = {};
          for (let i = 0; i < sectionHeaders.length; i++) {
            // Avoid adding undefined values if row is shorter than headers
            const headerName = sectionHeaders[i];
            const cellValue = row[i]?.trim() || '';
            if (headerName) {
              rawData[headerName] = cellValue;
            }
          }

          // Compute a unique hash for this row to prevent duplicates if the
          // same statement is uploaded multiple times
          const hashString = `${userId}-${sectionName}-${JSON.stringify(rawData)}`;
          const hash = crypto
            .createHash('sha256')
            .update(hashString)
            .digest('hex');

          records.push({
            portfolioId,
            userId,
            section: sectionName,
            rawData,
            hash,
          });
          totalParsed++;
        }
      }
    }

    return { records, totalParsed };
  }
}
