import { useState } from "react";
import { Flag } from "lucide-react";
import { useCreateReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const REPORT_REASONS = [
  "spam",
  "harassment",
  "impersonation",
  "adult content",
  "hate / abuse",
  "misinformation",
  "other",
];

export function ReportDialog({
  targetType,
  targetId,
  label = "Report",
  variant = "ghost",
  size = "sm",
}: {
  targetType: string;
  targetId: number;
  label?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "default";
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const createReport = useCreateReport({
    mutation: {
      onSuccess: () => {
        setOpen(false);
        setDetails("");
        setReason("spam");
        toast({ title: "Report submitted", description: "The moderation team can now review it." });
      },
      onError: () => {
        toast({ title: "Could not submit report", variant: "destructive" });
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Flag className="mr-2 h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetType}</DialogTitle>
          <DialogDescription>Send this to the moderation queue with a reason and optional note.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Details</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add context for moderators if needed." />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => createReport.mutate({ data: { targetType, targetId, reason, details: details || undefined } })}
            disabled={createReport.isPending}
          >
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
