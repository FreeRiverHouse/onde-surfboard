import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trading History | Onde Trading Terminal',
  description: 'View and analyze your complete trading history with filters and export options.',
  robots: 'noindex, nofollow', // Private trading data
};

export default function TradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
