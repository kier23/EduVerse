// quizzes/components/question-editors.tsx
// Individual editor UI for each of the 11 question types.

import { useRef } from "react";
import { Plus, Trash2, GripVertical, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Shared ───────────────────────────────────────────────────────────────────

type ChoiceRow = {
  id?: string;
  choice_text: string;
  is_correct: boolean;
  image_url?: string;
};
type PairRow = { left: string; right: string };

function OptionInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Option text…"}
      className="bg-stone-900/70 text-sm h-9"
    />
  );
}

function CorrectBadge({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-5 rounded-full px-2 text-[10px] font-semibold transition-all shrink-0",
        active
          ? "bg-amber-400/15 text-amber-100 ring-1 ring-amber-400/30"
          : "bg-card/70 text-muted-foreground hover:bg-amber-400/10",
      )}
    >
      {active ? "✓ Correct" : "Mark correct"}
    </button>
  );
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────

export function MultipleChoiceEditor({
  choices,
  onChange,
}: {
  choices: ChoiceRow[];
  onChange: (choices: ChoiceRow[]) => void;
}) {
  const update = (i: number, patch: Partial<ChoiceRow>) => {
    const next = choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    onChange(next);
  };
  const markCorrect = (i: number) =>
    onChange(choices.map((c, idx) => ({ ...c, is_correct: idx === i })));
  const remove = (i: number) => onChange(choices.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...choices, { choice_text: "", is_correct: false }]);

  return (
    <div className="space-y-2">
      {choices.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
          <div
            className={cn(
              "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
              c.is_correct
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-amber-500/15 bg-stone-900/50",
            )}
          >
            <OptionInput
              value={c.choice_text}
              onChange={(v) => update(i, { choice_text: v })}
              placeholder={`Option ${i + 1}`}
            />
            <CorrectBadge
              active={c.is_correct}
              onClick={() => markCorrect(i)}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-slate-300 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs mt-1"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" /> Add option
      </Button>
    </div>
  );
}

// ─── Multiple Select (same UI, but multiple correct answers allowed) ──────────

export function MultipleSelectEditor({
  choices,
  onChange,
}: {
  choices: ChoiceRow[];
  onChange: (choices: ChoiceRow[]) => void;
}) {
  const update = (i: number, patch: Partial<ChoiceRow>) =>
    onChange(choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const toggleCorrect = (i: number) =>
    update(i, { is_correct: !choices[i].is_correct });
  const remove = (i: number) => onChange(choices.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...choices, { choice_text: "", is_correct: false }]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-1">
        Multiple answers can be correct.
      </p>
      {choices.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
          <div
            className={cn(
              "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
              c.is_correct
                ? "border-amber-500/60 bg-amber-400/10"
                : "border-amber-500/15 bg-stone-900/50",
            )}
          >
            <OptionInput
              value={c.choice_text}
              onChange={(v) => update(i, { choice_text: v })}
              placeholder={`Option ${i + 1}`}
            />
            <CorrectBadge
              active={c.is_correct}
              onClick={() => toggleCorrect(i)}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-slate-300 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs mt-1"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" /> Add option
      </Button>
    </div>
  );
}

// ─── True / False ─────────────────────────────────────────────────────────────

export function TrueFalseEditor({
  correctAnswer,
  onChange,
}: {
  correctAnswer: "true" | "false" | null;
  onChange: (v: "true" | "false") => void;
}) {
  return (
    <div className="flex gap-3">
      {(["true", "false"] as const).map((val) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={cn(
            "flex-1 rounded-xl border-2 py-4 text-sm font-semibold capitalize transition-all",
            correctAnswer === val
              ? val === "true"
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                : "border-red-400/60 bg-red-400/10 text-red-100"
              : "border-amber-500/15 bg-card/70 text-muted-foreground hover:border-amber-300/30",
          )}
        >
          {val === "true" ? "✓ True" : "✗ False"}
        </button>
      ))}
    </div>
  );
}

// ─── Short Answer / Essay ─────────────────────────────────────────────────────

export function ShortAnswerEditor({
  sampleAnswer,
  onChange,
  multiline = false,
}: {
  sampleAnswer: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Sample / expected answer (optional)
      </label>
      {multiline ? (
        <textarea
          className="flex w-full rounded-md border border-input bg-card/70 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          rows={4}
          placeholder="Enter a sample answer for reference…"
          value={sampleAnswer}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          placeholder="Enter expected answer…"
          value={sampleAnswer}
          onChange={(e) => onChange(e.target.value)}
          className="bg-card/70"
        />
      )}
      <p className="text-xs text-muted-foreground">
        {multiline
          ? "Essay questions are manually graded."
          : "Answers are checked case-insensitively."}
      </p>
    </div>
  );
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export function MatchingEditor({
  pairs,
  onChange,
}: {
  pairs: PairRow[];
  onChange: (pairs: PairRow[]) => void;
}) {
  const update = (i: number, patch: Partial<PairRow>) =>
    onChange(pairs.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i: number) => onChange(pairs.filter((_, idx) => idx !== i));
  const add = () => onChange([...pairs, { left: "", right: "" }]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
        <span>Term / Question</span>
        <span>Match / Answer</span>
        <span />
      </div>
      {pairs.map((p, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
        >
          <Input
            placeholder={`Term ${i + 1}`}
            value={p.left}
            onChange={(e) => update(i, { left: e.target.value })}
            className="bg-stone-900/70 text-sm h-9"
          />
          <Input
            placeholder={`Match ${i + 1}`}
            value={p.right}
            onChange={(e) => update(i, { right: e.target.value })}
            className="bg-stone-900/70 text-sm h-9"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-slate-300 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs mt-1"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" /> Add pair
      </Button>
    </div>
  );
}

// ─── Fill in the Blank ────────────────────────────────────────────────────────

export function FillBlankEditor({
  template,
  answers,
  onTemplateChange,
  onAnswersChange,
}: {
  template: string;
  answers: string[];
  onTemplateChange: (v: string) => void;
  onAnswersChange: (v: string[]) => void;
}) {
  const blankCount = (template.match(/\[blank\]/gi) ?? []).length;
  const updateAnswer = (i: number, v: string) => {
    const next = [...answers];
    next[i] = v;
    onAnswersChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Sentence template
        </label>
        <textarea
          className="flex w-full rounded-md border border-input bg-card/70 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none font-mono"
          rows={3}
          placeholder="The capital of France is [blank] and its currency is [blank]."
          value={template}
          onChange={(e) => onTemplateChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Use{" "}
          <code className="rounded bg-stone-800 px-1 text-xs text-amber-200">
            [blank]
          </code>{" "}
          to mark each gap.{" "}
          {blankCount > 0 && (
            <span className="text-amber-400 font-medium">
              {blankCount} blank{blankCount !== 1 ? "s" : ""} detected.
            </span>
          )}
        </p>
      </div>

      {blankCount > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Correct answers
          </label>
          {Array.from({ length: blankCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0">
                Blank {i + 1}
              </span>
              <Input
                placeholder={`Answer for blank ${i + 1}`}
                value={answers[i] ?? ""}
                onChange={(e) => updateAnswer(i, e.target.value)}
                className="bg-card/70 text-sm h-9"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ordering ─────────────────────────────────────────────────────────────────

export function OrderingEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const update = (i: number, v: string) =>
    onChange(items.map((it, idx) => (idx === i ? v : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Enter items in the correct order. Students will see them shuffled.
      </p>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-xs font-semibold text-amber-200">
            {i + 1}
          </span>
          <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
          <Input
            placeholder={`Item ${i + 1}`}
            value={item}
            onChange={(e) => update(i, e.target.value)}
            className="flex-1 bg-card/70 text-sm h-9"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-slate-300 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs mt-1"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" /> Add item
      </Button>
    </div>
  );
}

// ─── File Upload ──────────────────────────────────────────────────────────────

export function FileUploadEditor({
  acceptedTypes,
  maxSizeMb,
  onAcceptedTypesChange,
  onMaxSizeChange,
}: {
  acceptedTypes: string[];
  maxSizeMb: number;
  onAcceptedTypesChange: (v: string[]) => void;
  onMaxSizeChange: (v: number) => void;
}) {
  const FILE_TYPES = ["pdf", "docx", "jpg", "png", "mp3", "mp4", "zip"];
  const toggle = (t: string) =>
    onAcceptedTypesChange(
      acceptedTypes.includes(t)
        ? acceptedTypes.filter((x) => x !== t)
        : [...acceptedTypes, t],
    );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Accepted file types
        </label>
        <div className="flex flex-wrap gap-2">
          {FILE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-all",
                acceptedTypes.includes(t)
                  ? "bg-amber-400/15 text-amber-100 border-amber-400/30"
                  : "bg-card/70 text-muted-foreground border-amber-500/15 hover:border-amber-300/30",
              )}
            >
              .{t}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Max file size (MB)
        </label>
        <Input
          type="number"
          min={1}
          max={100}
          value={maxSizeMb}
          onChange={(e) => onMaxSizeChange(Number(e.target.value))}
          className="w-32 bg-card/70"
        />
      </div>
    </div>
  );
}

// ─── Image Choice ─────────────────────────────────────────────────────────────

export function ImageChoiceEditor({
  choices,
  onChange,
  onImageUpload,
}: {
  choices: ChoiceRow[];
  onChange: (choices: ChoiceRow[]) => void;
  onImageUpload: (index: number, file: File) => Promise<string>;
}) {
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const update = (i: number, patch: Partial<ChoiceRow>) =>
    onChange(choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const markCorrect = (i: number) =>
    onChange(choices.map((c, idx) => ({ ...c, is_correct: idx === i })));
  const remove = (i: number) => onChange(choices.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...choices, { choice_text: "", is_correct: false }]);

  const handleFile = async (i: number, file: File) => {
    const url = await onImageUpload(i, file);
    update(i, { image_url: url });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {choices.map((c, i) => (
          <div
            key={i}
            className={cn(
              "relative flex flex-col rounded-xl border-2 overflow-hidden transition-all",
              c.is_correct ? "border-emerald-400/60" : "border-amber-500/15",
            )}
          >
            {/* Image area */}
            <button
              type="button"
              onClick={() => fileRefs.current[i]?.click()}
              className="relative flex h-28 w-full items-center justify-center bg-card/70 hover:bg-amber-400/10 transition-colors"
            >
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs">Click to upload</span>
                </div>
              )}
              <input
                ref={(el) => {
                  fileRefs.current[i] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(i, f);
                }}
              />
            </button>

            {/* Caption + controls */}
            <div className="flex items-center gap-2 p-2 bg-card/90">
              <Input
                placeholder={`Caption ${i + 1}`}
                value={c.choice_text}
                onChange={(e) => update(i, { choice_text: e.target.value })}
                className="flex-1 h-7 text-xs bg-transparent border-0 px-1 focus-visible:ring-0"
              />
              <CorrectBadge
                active={c.is_correct}
                onClick={() => markCorrect(i)}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-slate-300 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" /> Add image option
      </Button>
    </div>
  );
}

// ─── Audio Response ───────────────────────────────────────────────────────────

export function AudioResponseEditor({
  maxDurationSec,
  instructions,
  onMaxDurationChange,
  onInstructionsChange,
}: {
  maxDurationSec: number;
  instructions: string;
  onMaxDurationChange: (v: number) => void;
  onInstructionsChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-400/10 border border-amber-500/15 p-3 text-xs text-amber-100">
        Students will record audio directly in the browser (up to the max
        duration you set).
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Prompt / instructions
        </label>
        <textarea
          className="flex w-full rounded-md border border-input bg-card/70 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          rows={3}
          placeholder="e.g. Explain the concept of photosynthesis in 60 seconds."
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Max duration (seconds)
        </label>
        <Input
          type="number"
          min={10}
          max={600}
          value={maxDurationSec}
          onChange={(e) => onMaxDurationChange(Number(e.target.value))}
          className="w-36 bg-card/70"
        />
      </div>
    </div>
  );
}
