// Pure helpers and IBKR column-name constants shared by the statement parser
// and the portfolio builder. Kept free of Nest DI so they can be unit-tested
// (and reused) without spinning up a testing module.

// IBKR labels these columns slightly differently between export versions, so we
// try a few candidate keys until one of them has a value.
//
// A real "Trades" row looks like this (only the fields we care about):
//   {
//     "Symbol": "VOO",
//     "Quantity": "0.0457",
//     "T. Price": "683.24",   <- fill price
//     "Basis": "31.255324295",<- cost incl. commission
//     "C. Price": "685.46",   <- day close price (NOT the fill price)
//     "Currency": "USD",
//     "Comm/Fee": "-0.031256295",
//     ...
//   }
export const SYMBOL_KEYS = ['Symbol', 'symbol'];
export const QUANTITY_KEYS = ['Quantity', 'quantity'];
// The fill price is stored under "T. Price" (not "Price"); "C. Price" is the
// close price and must NOT be used as the trade price.
export const TRADE_PRICE_KEYS = [
  'T. Price',
  'Trade Price',
  'Trades Price',
  'Price',
  'tradePrice',
];
// "Basis" is the per-trade acquisition cost *including* commissions.
export const BASIS_KEYS = ['Basis', 'basis'];

// The "Cash Report" section is stored under this header.
export const CASH_REPORT_SECTION = 'Cash Report';
export const CASH_SUMMARY_KEY = 'Currency Summary';
export const CASH_TOTAL_KEY = 'Total';
export const CASH_CURRENCY_KEY = 'Currency';

// IBKR uses symbols like "USD.PLN" / "EUR.USD" for currency pairs. These are
// not portfolio positions, so they are filtered out of the response.
export const CURRENCY_PAIR_PATTERN = /^[A-Z]{3}\.[A-Z]{3}$/;

/**
 * Returns the first non-empty value among the given candidate keys, or
 * undefined if none of them are present.
 */
export function readField(
  data: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

/**
 * Parses a numeric cell, tolerating thousands separators and empty values.
 */
export function parseNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// Quantities can be fractional (e.g. 0.0457 shares), so they need more
// precision than money values.
export function roundQuantity(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

// Simple CSV line parser that handles commas inside quotes
export function parseCsvLine(text: string): string[] {
  const ret: string[] = [];
  let inQuote = false;
  let value = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuote) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          value += '"'; // escaped quote
          i++;
        } else {
          inQuote = false;
        }
      } else {
        value += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === ',') {
        ret.push(value);
        value = '';
      } else {
        value += char;
      }
    }
  }
  ret.push(value);
  return ret;
}
