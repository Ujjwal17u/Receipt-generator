import { useCallback, useRef, useState } from "react";
import { Upload, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LogoUploadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export function LogoUpload({ value, onChange }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        toast.error("Unsupported format", { description: "Use PNG, JPG, JPEG or SVG." });
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("File too large", { description: "Max size is 2MB." });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
        toast.success("Logo uploaded");
      };
      reader.onerror = () => toast.error("Could not read file");
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Company logo</label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-all",
          dragOver && "border-primary bg-primary/5",
        )}
      >
        {value ? (
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                <img
                  src={value}
                  alt="Company logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-medium">Logo uploaded</p>
                <p className="text-xs text-muted-foreground">Shown on receipts, PDF & dashboard.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Change
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(null);
                  toast("Logo removed");
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Drop your logo here</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, JPEG or SVG · Max 2MB</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload logo
            </Button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
