import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`border-border shadow-sm ${className ?? ""}`}>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-semibold">
          {title}
          {subtitle && (
            <span className="ml-1.5 font-normal text-muted-foreground">
              {subtitle}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
