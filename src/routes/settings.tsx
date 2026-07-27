import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Building2,
  Phone,
  MapPin,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { LogoUpload } from "@/components/settings/LogoUpload";
import { useBusinessSettings, defaultSettings } from "@/lib/business-settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Business Settings · ReceiptAI" },
      {
        name: "description",
        content: "Configure your business identity, defaults, logo, and preferences for receipts.",
      },
      { property: "og:title", content: "Business Settings · ReceiptAI" },
      {
        property: "og:description",
        content: "Configure your business identity and defaults.",
      },
    ],
  }),
  component: SettingsPage,
});

const schema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(120, "Keep it under 120 characters"),
  ownerName: z.string().trim().max(120).optional().or(z.literal("")),
  gstNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^[0-9A-Z]{6,20}$/.test(val),
      "GST number format is invalid",
    ),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^[+()\-\d\s]{7,20}$/u, "Invalid phone number"),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Invalid email address",
    ),
  website: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(val),
      "Invalid website URL",
    ),
  addressLine: z.string().trim().min(1, "Address is required").max(200),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  currency: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

const currencies = [
  { code: "INR", label: "₹ INR — Indian Rupee" },
  { code: "USD", label: "$ USD — US Dollar" },
  { code: "EUR", label: "€ EUR — Euro" },
  { code: "GBP", label: "£ GBP — British Pound" },
  { code: "AED", label: "د.إ AED — UAE Dirham" },
  { code: "SAR", label: "﷼ SAR — Saudi Riyal" },
];

function SettingsPage() {
  const { settings, saveSettings, updateLogo, hydrated } = useBusinessSettings();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: settings,
  });

  const currencyValue = watch("currency");

  useEffect(() => {
    if (hydrated) reset(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const onSubmit = (values: FormValues) => {
    saveSettings({ ...settings, ...values });
    toast.success("Settings saved", { description: "Your business info will appear on every receipt." });
    reset(values);
  };

  const onReset = () => {
    saveSettings({ ...defaultSettings });
    reset(defaultSettings);
    toast("Settings cleared");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuration"
        title="Business settings"
        description="Set your business identity once. It will appear on every receipt, PDF, and shared link."
        actions={
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
        {/* Left column: forms */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Business identity</CardTitle>
                  <CardDescription>Shown on the receipt header.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Company name" required error={errors.companyName?.message}>
                <Input placeholder="Acme Retail Pvt. Ltd." {...register("companyName")} />
              </Field>
              <Field label="Owner name" error={errors.ownerName?.message}>
                <Input placeholder="Optional" {...register("ownerName")} />
              </Field>
              <Field label="GST number" error={errors.gstNumber?.message}>
                <Input placeholder="e.g. 29ABCDE1234F1Z5" {...register("gstNumber")} />
              </Field>
              <Field label="Currency" error={errors.currency?.message}>
                <Select
                  value={currencyValue}
                  onValueChange={(v) => setValue("currency", v, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" {...register("currency")} />
              </Field>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Contact</CardTitle>
                  <CardDescription>How customers reach you.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Phone number" required error={errors.phone?.message}>
                <Input placeholder="+91 98xxxxxxx" {...register("phone")} />
              </Field>
              <Field label="Email address" error={errors.email?.message}>
                <Input type="email" placeholder="hello@acme.com" {...register("email")} />
              </Field>
              <Field label="Website" error={errors.website?.message} className="sm:col-span-2">
                <Input placeholder="https://acme.com" {...register("website")} />
              </Field>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Address</CardTitle>
                  <CardDescription>Displayed under the business name.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Address" required error={errors.addressLine?.message} className="sm:col-span-2">
                <Textarea rows={2} placeholder="Street, area, landmark" {...register("addressLine")} />
              </Field>
              <Field label="City" error={errors.city?.message}>
                <Input placeholder="Bengaluru" {...register("city")} />
              </Field>
              <Field label="State" error={errors.state?.message}>
                <Input placeholder="Karnataka" {...register("state")} />
              </Field>
              <Field label="Country" error={errors.country?.message}>
                <Input placeholder="India" {...register("country")} />
              </Field>
              <Field label="Postal code" error={errors.postalCode?.message}>
                <Input placeholder="560001" {...register("postalCode")} />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Right column: logo + actions */}
        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Brand</CardTitle>
                  <CardDescription>Your logo, everywhere it matters.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LogoUpload value={settings.logoDataUrl} onChange={updateLogo} />
            </CardContent>
          </Card>

          <Card className="shadow-soft sticky top-20">
            <CardContent className="space-y-3 p-5">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gradient-primary w-full rounded-full text-primary-foreground shadow-elegant"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving…" : isDirty ? "Save changes" : "Saved"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onReset}
                className="w-full rounded-full text-muted-foreground"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to defaults
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Settings sync locally now — cloud sync arrives with backend.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
