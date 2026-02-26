import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trading Terminal | Onde',
  description: 'Kalshi & Polymarket Betting Dashboard',
};

export default function BettingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
