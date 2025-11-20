'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  iconButton?: React.ReactNode;
  content?: React.ReactNode;
  href?: string;
  className?: string;
};

export const MatchCard = ({
  homeTeamName,
  awayTeamName,
  date,
  iconButton,
  content,
  href,
  className
}: Props) => {
  return (
    <Card className={cn(
      'relative p-2 transition-all duration-200',
      className
    )}>
      <CardHeader className="gap-4 p-5">
        <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>{date}</span>
          </div>

          <div className="relative z-10">
            {iconButton}
          </div>

        </div>
        <CardTitle className="text-foreground grid grid-cols-[1fr_auto_1fr] items-center gap-x-7 text-2xl font-semibold">
          <span className="text-right text-lg font-bold">{homeTeamName}</span>
          <span className="text-muted-foreground text-lg font-medium">vs</span>
          <span className="text-left text-lg font-bold">{awayTeamName}</span>
        </CardTitle>
      </CardHeader>

      {content}

      {href && (
        <Link
          href={href}
          className="absolute inset-0 z-0 rounded-xl focus:outline-none ..."
          aria-label="詳細へ移動"
        />
      )}
    </Card>
  );
};
