'use client';

import { classNames } from '@/lib/styles/classNames';

export interface Position {
  ticker: string;
  name: string;
  quantity: number;
  price: number;
  changePercent: number;
  dailyPnl: number;
  avgPrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlAllocation: number;
}

// NOTE: There is no market-data API yet, so every price / P&L value below is a
// hardcoded mock number ($$$). Replace `MOCK_POSITIONS` with real data once the
// API is available. Nothing here is fetched.
const MOCK_POSITIONS: Position[] = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    quantity: 25,
    price: 227.52,
    changePercent: 1.24,
    dailyPnl: 69.85,
    avgPrice: 189.34,
    costBasis: 4733.5,
    marketValue: 5688.0,
    unrealizedPnl: 954.5,
    unrealizedPnlAllocation: 32.4,
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    quantity: 12,
    price: 412.18,
    changePercent: -0.68,
    dailyPnl: -33.74,
    avgPrice: 358.9,
    costBasis: 4306.8,
    marketValue: 4946.16,
    unrealizedPnl: 639.36,
    unrealizedPnlAllocation: 21.7,
  },
  {
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    quantity: 18,
    price: 248.5,
    changePercent: 3.12,
    dailyPnl: 135.3,
    avgPrice: 265.7,
    costBasis: 4782.6,
    marketValue: 4473.0,
    unrealizedPnl: -309.6,
    unrealizedPnlAllocation: -10.5,
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    quantity: 8,
    price: 121.44,
    changePercent: 2.05,
    dailyPnl: 19.52,
    avgPrice: 98.2,
    costBasis: 785.6,
    marketValue: 971.52,
    unrealizedPnl: 185.92,
    unrealizedPnlAllocation: 6.3,
  },
  {
    ticker: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    quantity: 10,
    price: 512.36,
    changePercent: 0.42,
    dailyPnl: 21.4,
    avgPrice: 470.15,
    costBasis: 4701.5,
    marketValue: 5123.6,
    unrealizedPnl: 422.1,
    unrealizedPnlAllocation: 14.3,
  },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('en-US');

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatQuantity(value: number): string {
  return quantityFormatter.format(value);
}

function formatChange(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function pnlTextClass(value: number): string {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';
  return 'text-stone-400';
}

interface ColumnDef {
  key: string;
  label: string;
  align: 'left' | 'right';
}

// Columns, left to right, exactly as specified. Names are in Ukrainian except
// for the P&L ones which mix $ / % to keep them short.
const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Назва', align: 'left' },
  { key: 'quantity', label: 'Кількість', align: 'right' },
  { key: 'price', label: 'Ціна', align: 'right' },
  { key: 'changePercent', label: '% Зміна', align: 'right' },
  { key: 'dailyPnl', label: 'Денний P&L', align: 'right' },
  { key: 'avgPrice', label: 'Сер. ціна', align: 'right' },
  { key: 'costBasis', label: 'Собівартість', align: 'right' },
  { key: 'marketValue', label: 'Ринкова вартість', align: 'right' },
  { key: 'unrealizedPnl', label: 'Нереалізований P&L', align: 'right' },
  { key: 'unrealizedPnlAllocation', label: 'Нереалізований P&L, %', align: 'right' },
];

function SortChevron() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-3 w-3 shrink-0 text-stone-500"
    >
      <path
        fillRule="evenodd"
        d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3Zm-3.76 9.2a.75.75 0 0 1 1.06.04l2.7 2.908 2.7-2.908a.75.75 0 1 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5a.75.75 0 0 1 .04-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface PositionsTableProps {
  positions?: Position[];
}

export default function PositionsTable({ positions }: PositionsTableProps) {
  const rows = positions ?? MOCK_POSITIONS;

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs font-medium uppercase tracking-wider text-stone-400">
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={classNames(
                  'whitespace-nowrap px-4 py-3',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                <span
                  className={classNames(
                    'inline-flex items-center gap-1',
                    column.align === 'right' && 'flex-row-reverse',
                  )}
                >
                  {column.label}
                  <SortChevron />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((position) => (
            <tr
              key={position.ticker}
              className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              {/* Name + ticker */}
              <td className="px-4 py-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white">
                    {position.ticker.slice(0, 4)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">
                      {position.ticker}
                    </div>
                    <div className="truncate text-xs text-stone-400">
                      {position.name}
                    </div>
                  </div>
                </div>
              </td>

              {/* Quantity */}
              <td className="whitespace-nowrap px-4 py-3 text-right text-stone-200">
                {formatQuantity(position.quantity)}
              </td>

              {/* Current market price (hardcoded — no API yet) */}
              <td className="whitespace-nowrap px-4 py-3 text-right text-stone-200">
                {formatCurrency(position.price)}
              </td>

              {/* % change */}
              <td
                className={classNames(
                  'whitespace-nowrap px-4 py-3 text-right font-medium',
                  pnlTextClass(position.changePercent),
                )}
              >
                {formatChange(position.changePercent)}
              </td>

              {/* Daily P&L */}
              <td
                className={classNames(
                  'whitespace-nowrap px-4 py-3 text-right font-medium',
                  pnlTextClass(position.dailyPnl),
                )}
              >
                {formatCurrency(position.dailyPnl)}
              </td>

              {/* Avg price */}
              <td className="whitespace-nowrap px-4 py-3 text-right text-stone-200">
                {formatCurrency(position.avgPrice)}
              </td>

              {/* Cost basis */}
              <td className="whitespace-nowrap px-4 py-3 text-right text-stone-200">
                {formatCurrency(position.costBasis)}
              </td>

              {/* Market value */}
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-white">
                {formatCurrency(position.marketValue)}
              </td>

              {/* Unrealized P&L */}
              <td
                className={classNames(
                  'whitespace-nowrap px-4 py-3 text-right font-medium',
                  pnlTextClass(position.unrealizedPnl),
                )}
              >
                {formatCurrency(position.unrealizedPnl)}
              </td>

              {/* Unrealized P&L allocation (%) */}
              <td
                className={classNames(
                  'whitespace-nowrap px-4 py-3 text-right font-medium',
                  pnlTextClass(position.unrealizedPnlAllocation),
                )}
              >
                {formatChange(position.unrealizedPnlAllocation)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
