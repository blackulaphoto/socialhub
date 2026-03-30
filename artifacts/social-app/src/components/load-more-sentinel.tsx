import { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";

export function LoadMoreSentinel({
  enabled,
  isLoading,
  onVisible,
}: {
  enabled: boolean;
  isLoading?: boolean;
  onVisible: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        onVisible();
      }
    }, { rootMargin: "240px 0px" });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [enabled, onVisible]);

  if (!enabled && !isLoading) return null;

  return (
    <div ref={ref} className="flex justify-center py-4">
      {isLoading ? <Spinner /> : <div className="h-4 w-full" />}
    </div>
  );
}
