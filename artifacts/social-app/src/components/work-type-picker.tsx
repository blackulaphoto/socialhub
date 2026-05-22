import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWorkTypeOptions } from "@/lib/work-type-options";

type WorkTypePickerProps = {
  category: string;
  value: string;
  onChange: (next: string) => void;
  label?: string;
  helper?: string;
};

function parseValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function WorkTypePicker({
  category,
  value,
  onChange,
  label = "Work types",
  helper = "Pick the kind of work you do so people can actually find you.",
}: WorkTypePickerProps) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const selectedValues = useMemo(() => parseValues(value), [value]);
  const options = useMemo(() => getWorkTypeOptions(category), [category]);

  const writeValues = (items: string[]) => {
    const unique = Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
    onChange(unique.join(", "));
  };

  const toggleValue = (item: string, checked: boolean) => {
    if (checked) {
      writeValues([...selectedValues, item]);
      return;
    }
    writeValues(selectedValues.filter((valueItem) => valueItem !== item));
  };

  const addCustomValue = () => {
    if (!customValue.trim()) return;
    writeValues([...selectedValues, customValue.trim()]);
    setCustomValue("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              Choose Work Types
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Choose Work Types</DialogTitle>
              <DialogDescription>
                Start with the common options for your role, then add anything custom if you need it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((item) => {
                  const checked = selectedValues.includes(item);
                  return (
                    <label
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/30 px-4 py-3"
                    >
                      <Checkbox checked={checked} onCheckedChange={(next) => toggleValue(item, Boolean(next))} />
                      <span className="text-sm">{item}</span>
                    </label>
                  );
                })}
              </div>
              <div className="space-y-3 rounded-2xl border border-border/50 bg-background/20 p-4">
                <div className="text-sm font-medium">Add custom work types</div>
                <div className="flex gap-2">
                  <Input
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="Alternative fashion, latex styling, creature FX..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomValue();
                      }
                    }}
                  />
                  <Button type="button" onClick={addCustomValue} disabled={!customValue.trim()}>
                    Add
                  </Button>
                </div>
              </div>
              {selectedValues.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Selected</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedValues.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => writeValues(selectedValues.filter((valueItem) => valueItem !== item))}
                        className="rounded-full"
                      >
                        <Badge variant="secondary">{item}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-2xl border border-border/50 bg-background/25 p-3">
        {selectedValues.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedValues.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => writeValues(selectedValues.filter((valueItem) => valueItem !== item))}
                className="rounded-full"
              >
                <Badge variant="secondary">{item}</Badge>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{helper}</div>
        )}
      </div>
    </div>
  );
}
