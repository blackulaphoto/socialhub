import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function QueryErrorState({
  title = "Could not load this page",
  description = "The API may be unavailable or the request failed.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="bg-card/40 border-dashed border-border/50">
      <CardContent className="p-12 text-center text-muted-foreground">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 opacity-40" />
        <div className="text-foreground font-medium">{title}</div>
        <div className="mt-2 text-sm">{description}</div>
        {onRetry && <Button variant="outline" className="mt-4" onClick={onRetry}>Retry</Button>}
      </CardContent>
    </Card>
  );
}
