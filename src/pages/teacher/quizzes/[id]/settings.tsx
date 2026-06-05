// quizzes/[id]/settings.tsx
// Slide-over settings panel for quiz configuration.
// Imported and used directly inside the editor page.

import { useEffect, useRef, useState } from "react";
import { X, Upload, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchQuizSettings,
  updateQuiz,
  upsertQuizSettings,
  uploadQuizBanner,
  type Quiz,
  type QuizSettings,
} from "@/lib/api/eduverse";

const THEMES = [
  { value: "modern", label: "Modern", color: "#2563eb" },
  { value: "classic", label: "Classic", color: "#7c3aed" },
  { value: "minimal", label: "Minimal", color: "#374151" },
  { value: "nature", label: "Nature", color: "#059669" },
  { value: "sunset", label: "Sunset", color: "#dc2626" },
];

const PRESET_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#374151",
];

interface QuizSettingsPanelProps {
  quizId: string;
  quiz: Quiz | null;
  onClose: () => void;
  onSaved: (quiz: Quiz) => void;
}

export function QuizSettingsPanel({
  quizId,
  quiz,
  onClose,
  onSaved,
}: QuizSettingsPanelProps) {
  const bannerRef = useRef<HTMLInputElement>(null);

  const [timeLimit, setTimeLimit] = useState(String(quiz?.time_limit ?? ""));
  const [attemptsAllowed, setAttemptsAllowed] = useState(
    String(quiz?.attempts_allowed ?? ""),
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    quiz?.welcome_message ?? "",
  );
  const [bannerUrl, setBannerUrl] = useState(quiz?.banner_url ?? "");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Sync bannerUrl when the quiz prop updates after save propagates back
  useEffect(() => {
    if (quiz?.banner_url && !bannerFile) {
      setBannerUrl(quiz.banner_url);
    }
  }, [quiz?.banner_url]);

  // Revoke blob URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const [settings, setSettings] = useState<QuizSettings>({
    theme: "modern",
    primaryColor: "#2563eb",
    showProgress: true,
    questionCard: true,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchQuizSettings(quizId).then((s) => {
      if (Object.keys(s).length > 0) setSettings(s);
    });
  }, [quizId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalBannerUrl = bannerUrl;
      if (bannerFile) {
        finalBannerUrl = await uploadQuizBanner(quizId, bannerFile);
        // Revoke the local blob URL and replace with the real Supabase URL
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setBannerFile(null);
        setBannerUrl(finalBannerUrl);
      }

      await updateQuiz(quizId, {
        time_limit: timeLimit ? Number(timeLimit) : null,
        attempts_allowed: attemptsAllowed ? Number(attemptsAllowed) : null,
        welcome_message: welcomeMessage || null,
        banner_url: finalBannerUrl || null,
      });

      await upsertQuizSettings(quizId, settings);

      setSaved(true);
      onSaved({
        ...quiz!,
        time_limit: timeLimit ? Number(timeLimit) : null,
        attempts_allowed: attemptsAllowed ? Number(attemptsAllowed) : null,
        welcome_message: welcomeMessage || null,
        banner_url: finalBannerUrl || null,
      });

      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Settings save failed", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Quiz Settings
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure how this quiz behaves
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Behaviour */}
          <Section title="Behaviour">
            <Field label="Time limit (minutes)" hint="Leave empty for no limit">
              <Input
                type="number"
                min={0}
                placeholder="e.g. 30"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                className="bg-slate-50/80"
              />
            </Field>
            <Field label="Attempts allowed" hint="Leave empty for unlimited">
              <Input
                type="number"
                min={0}
                placeholder="e.g. 1"
                value={attemptsAllowed}
                onChange={(e) => setAttemptsAllowed(e.target.value)}
                className="bg-slate-50/80"
              />
            </Field>
            <Field
              label="Welcome message"
              hint="Shown to students before they start"
            >
              <textarea
                className="flex w-full rounded-md border border-input bg-slate-50/80 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                rows={3}
                placeholder="Welcome! Please read all questions carefully…"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
              />
            </Field>
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            {/* Theme picker */}
            <Field label="Theme">
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        theme: t.value,
                        primaryColor: t.color,
                      })
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      settings.theme === t.value
                        ? "border-transparent text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300",
                    )}
                    style={
                      settings.theme === t.value ? { background: t.color } : {}
                    }
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        background:
                          settings.theme === t.value
                            ? "rgba(255,255,255,0.6)"
                            : t.color,
                      }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* Primary color */}
            <Field label="Primary color">
              <div className="flex flex-wrap gap-2 items-center">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setSettings({ ...settings, primaryColor: c })
                    }
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      settings.primaryColor === c
                        ? "border-slate-800 scale-110"
                        : "border-transparent",
                    )}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={settings.primaryColor ?? "#2563eb"}
                  onChange={(e) =>
                    setSettings({ ...settings, primaryColor: e.target.value })
                  }
                  className="h-7 w-7 cursor-pointer rounded-full border border-slate-200 bg-transparent p-0.5"
                  title="Custom color"
                />
              </div>
            </Field>

            {/* Toggles */}
            <div className="space-y-2">
              <Toggle
                label="Show progress bar"
                hint="Display question progress at the top"
                checked={settings.showProgress ?? true}
                onChange={(v) => setSettings({ ...settings, showProgress: v })}
              />
              <Toggle
                label="Question cards"
                hint="Show each question in a card layout"
                checked={settings.questionCard ?? true}
                onChange={(v) => setSettings({ ...settings, questionCard: v })}
              />
            </div>
          </Section>

          {/* Branding */}
          <Section title="Branding">
            {/* Banner */}
            <Field label="Banner image">
              <div
                className="relative flex h-28 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                onClick={() => bannerRef.current?.click()}
              >
                {bannerUrl ? (
                  <img
                    src={bannerUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Upload className="h-6 w-6" />
                    <span className="text-xs">Upload banner</span>
                  </div>
                )}
                <input
                  ref={bannerRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      // Revoke previous blob URL if any
                      if (blobUrlRef.current)
                        URL.revokeObjectURL(blobUrlRef.current);
                      const objectUrl = URL.createObjectURL(f);
                      blobUrlRef.current = objectUrl;
                      setBannerFile(f);
                      setBannerUrl(objectUrl);
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                {bannerFile && (
                  <p className="text-xs text-indigo-600 font-medium">
                    {bannerFile.name} — will upload on save
                  </p>
                )}
                {bannerUrl && !bannerFile && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Banner saved ✓
                  </p>
                )}
                {bannerUrl && (
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:text-red-600 transition-colors ml-auto"
                    onClick={() => {
                      if (blobUrlRef.current) {
                        URL.revokeObjectURL(blobUrlRef.current);
                        blobUrlRef.current = null;
                      }
                      setBannerUrl("");
                      setBannerFile(null);
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </Field>
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || saved}
            className={cn(
              "min-w-27.5 transition-all",
              saved
                ? "bg-emerald-500 hover:bg-emerald-500 text-white"
                : "bg-indigo-500 hover:bg-indigo-600 text-white",
            )}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Saved!
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <div>
        <p className="text-xs font-medium text-slate-700">{label}</p>
        {hint && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
          checked ? "bg-indigo-500" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
