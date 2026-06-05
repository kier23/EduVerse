// quizzes/[id]/edit.tsx  –  /teacher/quizzes/:id/edit
// Google-Forms-style quiz editor: question list (left), active question editor (center), settings (right).

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  ChevronLeft,
  Check,
  Loader2,
  Settings2,
  Users,
  GripVertical,
  Image as ImageIcon,
  Music,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  fetchQuizById,
  upsertQuizQuestion,
  upsertQuizChoices,
  deleteQuizQuestion,
  uploadQuizMedia,
  type Quiz,
  type QuizQuestion,
  type QuizQuestionMedia,
  type QuestionType,
} from "@/lib/api/eduverse";
import {
  MultipleChoiceEditor,
  MultipleSelectEditor,
  TrueFalseEditor,
  ShortAnswerEditor,
  MatchingEditor,
  FillBlankEditor,
  OrderingEditor,
  FileUploadEditor,
  ImageChoiceEditor,
  AudioResponseEditor,
} from "@/components/quiz-components/question-editors";
import { MediaUploader } from "@/components/quiz-components/media-uploader";
import { QuizSettingsPanel } from "./settings";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderQuizQuestions } from "@/lib/api/eduverse";

// ─── Question type metadata ───────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ElementType; group: string }[] = [
  { value: "multiple_choice",  label: "Multiple choice",  icon: ChevronDown, group: "Standard" },
  { value: "multiple_select",  label: "Multiple select",  icon: ChevronDown, group: "Standard" },
  { value: "true_false",       label: "True / False",     icon: ChevronDown, group: "Standard" },
  { value: "short_answer",     label: "Short answer",     icon: FileText,    group: "Standard" },
  { value: "essay",            label: "Essay",            icon: FileText,    group: "Standard" },
  { value: "fill_blank",       label: "Fill in the blank",icon: FileText,    group: "Standard" },
  { value: "ordering",         label: "Ordering",         icon: GripVertical,group: "Interactive" },
  { value: "matching",         label: "Matching",         icon: GripVertical,group: "Interactive" },
  { value: "image_choice",     label: "Image choice",     icon: ImageIcon,   group: "Media" },
  { value: "audio_response",   label: "Audio response",   icon: Music,       group: "Media" },
  { value: "file_upload",      label: "File upload",      icon: FileText,    group: "Media" },
];

const TYPE_LABEL: Record<QuestionType, string> = Object.fromEntries(
  QUESTION_TYPES.map((t) => [t.value, t.label]),
) as Record<QuestionType, string>;

// ─── Local state shape ────────────────────────────────────────────────────────

type LocalChoice = { id?: string; choice_text: string; is_correct: boolean; image_url?: string };
type LocalQuestion = QuizQuestion & {
  choices: LocalChoice[];
  media: QuizQuestionMedia[];
  _dirty?: boolean;
};

function defaultContent(type: QuestionType): Record<string, unknown> {
  switch (type) {
    case "true_false":     return { correct_answer: null };
    case "short_answer":   return { sample_answer: "" };
    case "essay":          return { sample_answer: "" };
    case "fill_blank":     return { template: "", answers: [] };
    case "ordering":       return { items: ["", ""] };
    case "matching":       return { pairs: [{ left: "", right: "" }] };
    case "file_upload":    return { accepted_types: ["pdf", "docx"], max_size_mb: 10 };
    case "audio_response": return { max_duration_sec: 60, instructions: "" };
    default:               return {};
  }
}

function defaultChoices(type: QuestionType): LocalChoice[] {
  if (type === "multiple_choice" || type === "multiple_select") {
    return [
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
    ];
  }
  if (type === "image_choice") {
    return [
      { choice_text: "", is_correct: false },
      { choice_text: "", is_correct: false },
    ];
  }
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizEditorPage() {
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionsRef = useRef<LocalQuestion[]>([]);

  // Keep ref in sync so saveQuestion closure always reads latest list
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Load quiz data
  useEffect(() => {
    if (!quizId) return;
    fetchQuizById(quizId).then(({ quiz: q, questions: qs }) => {
      setQuiz(q);
      setQuestions(
        qs.map((q) => ({ ...q, choices: q.choices as LocalChoice[] })),
      );
    }).finally(() => setLoading(false));
  }, [quizId]);

  const active = questions[activeIndex] ?? null;

  // ── Debounced auto-save ───────────────────────────────────────────────────

  const scheduleSave = useCallback((q: LocalQuestion) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveQuestion(q), 1500);
  }, []);

  const saveQuestion = async (q: LocalQuestion) => {
    if (!quizId) return;
    setSaving(true);
    try {
      // Derive order_index from current position so new questions get the right index
      const currentIndex = questionsRef.current.findIndex((pq) => pq.id === q.id);
      const saved = await upsertQuizQuestion({
        ...q,
        quiz_id: quizId,
        order_index: currentIndex >= 0 ? currentIndex : (q.order_index ?? 0),
      });
      if (
        q.question_type === "multiple_choice" ||
        q.question_type === "multiple_select" ||
        q.question_type === "image_choice"
      ) {
        await upsertQuizChoices(saved.id, q.choices);
      }
      setQuestions((prev) =>
        prev.map((pq) => (pq.id === q.id ? { ...pq, id: saved.id, _dirty: false } : pq)),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Question mutations ────────────────────────────────────────────────────

  const updateActive = (patch: Partial<LocalQuestion>) => {
    setQuestions((prev) => {
      const next = prev.map((q, i) =>
        i === activeIndex ? { ...q, ...patch, _dirty: true } : q,
      );
      scheduleSave(next[activeIndex]);
      return next;
    });
  };

  const updateContent = (patch: Record<string, unknown>) => {
    updateActive({
      question_content: { ...(active?.question_content ?? {}), ...patch },
    });
  };

  const addQuestion = (type: QuestionType) => {
    const newQ: LocalQuestion = {
      id: `_new_${Date.now()}`,
      quiz_id: quizId!,
      question: "",
      question_type: type,
      points: 1,
      order_index: questions.length,
      question_content: defaultContent(type),
      choices: defaultChoices(type),
      media: [],
      _dirty: true,
    };
    setQuestions((prev) => [...prev, newQ]);
    setActiveIndex(questions.length);
  };

  const removeQuestion = async (index: number) => {
    const q = questions[index];
    if (q && !q.id.startsWith("_new_")) {
      await deleteQuizQuestion(q.id);
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setActiveIndex((prev) => Math.min(prev, questions.length - 2));
  };

  const handleReorder = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setQuestions((prev) => {
      const oldIndex = prev.findIndex((q) => q.id === active.id);
      const newIndex = prev.findIndex((q) => q.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex).map((q, i) => ({
        ...q,
        order_index: i,
      }));
      // Persist to Supabase (fire-and-forget, only for saved questions)
      const toSave = reordered
        .filter((q) => !q.id.startsWith("_new_"))
        .map((q) => ({ id: q.id, order_index: q.order_index ?? 0 }));
      if (toSave.length > 0) reorderQuizQuestions(toSave).catch(console.error);
      // Keep activeIndex pointing to the same question
      setActiveIndex(newIndex);
      return reordered;
    });
  };

  const handleImageUpload = async (_choiceIndex: number, file: File): Promise<string> => {
    if (!quizId || !active) return "";
    const media = await uploadQuizMedia(quizId, active.id, file);
    return media.file_url ?? "";
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50/80">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate("/teacher/quizzes")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-medium">Quiz Editor</p>
          <h1 className="text-sm font-semibold text-slate-900 truncate">
            {quiz ? "Editing quiz" : "—"}
          </h1>
        </div>

        {/* Save indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {saving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check className="h-3.5 w-3.5 text-emerald-500" /> Saved</>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/teacher/quizzes/${quizId}/responses`)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-muted-foreground hover:bg-slate-50 transition-colors"
        >
          <Users className="h-3.5 w-3.5" />
          Responses
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-muted-foreground hover:bg-slate-50 transition-colors"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Settings
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: question list ────────────────────────────────────────── */}
        <aside className="flex w-56 flex-col border-r border-slate-200 bg-white/60 backdrop-blur-sm">
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {questions.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No questions yet.
              </p>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleReorder}
            >
              <SortableContext
                items={questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                {questions.map((q, i) => (
                  <SortableQuestionRow
                    key={q.id}
                    question={q}
                    index={i}
                    isActive={i === activeIndex}
                    typeLabel={TYPE_LABEL[q.question_type ?? "short_answer"]}
                    onClick={() => setActiveIndex(i)}
                    onDelete={(e) => { e.stopPropagation(); removeQuestion(i); }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Add question */}
          <div className="border-t border-slate-200 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs justify-start">
                  <Plus className="h-3.5 w-3.5" /> Add question
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {["Standard", "Interactive", "Media"].map((group) => (
                  <div key={group}>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">
                      {group}
                    </DropdownMenuLabel>
                    {QUESTION_TYPES.filter((t) => t.group === group).map((t) => (
                      <DropdownMenuItem
                        key={t.value}
                        onClick={() => addQuestion(t.value)}
                        className="text-xs gap-2"
                      >
                        <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {t.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* ── Center: question editor ────────────────────────────────────── */}
        <main className="flex flex-1 flex-col overflow-y-auto p-6 gap-4">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                <Plus className="h-7 w-7 text-indigo-300" />
              </div>
              <p className="text-sm font-medium text-slate-700">No questions yet</p>
              <p className="text-xs text-muted-foreground">Add a question from the left panel to get started.</p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-2xl space-y-5">
              {/* Question text */}
              <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Q{activeIndex + 1}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                    {TYPE_LABEL[active.question_type ?? "short_answer"]}
                  </span>
                </div>

                <textarea
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
                  rows={2}
                  placeholder="Type your question here…"
                  value={active.question ?? ""}
                  onChange={(e) => updateActive({ question: e.target.value })}
                />

                {/* Media uploader for question attachment */}
                {quizId && !active.id.startsWith("_new_") && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Attach media (optional)
                    </p>
                    <MediaUploader
                      quizId={quizId}
                      questionId={active.id}
                      existingMedia={active.media}
                      accept="any"
                      label="Attach image, audio, video, or PDF"
                      onUploaded={(m) =>
                        updateActive({ media: [...active.media, m] })
                      }
                      onRemove={(mediaId) =>
                        updateActive({ media: active.media.filter((m) => m.id !== mediaId) })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Question-type-specific editor */}
              <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-md">
                <QuestionEditor
                  question={active}
                  onUpdate={updateActive}
                  onContentUpdate={updateContent}
                  onImageUpload={handleImageUpload}
                />
              </div>
            </div>
          )}
        </main>

        {/* ── Right: question settings ───────────────────────────────────── */}
        {active && (
          <aside className="flex w-52 flex-col border-l border-slate-200 bg-white/60 backdrop-blur-sm p-4 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Points
              </label>
              <Input
                type="number"
                min={0}
                value={active.points ?? 1}
                onChange={(e) => updateActive({ points: Number(e.target.value) })}
                className="bg-slate-50/80 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Question type
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between text-xs gap-1">
                    {TYPE_LABEL[active.question_type ?? "short_answer"]}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {QUESTION_TYPES.map((t) => (
                    <DropdownMenuItem
                      key={t.value}
                      onClick={() =>
                        updateActive({
                          question_type: t.value,
                          question_content: defaultContent(t.value),
                          choices: defaultChoices(t.value),
                        })
                      }
                      className={cn(
                        "text-xs",
                        active.question_type === t.value && "bg-indigo-50 text-indigo-700",
                      )}
                    >
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-slate-600">Tips</p>
              <TypeTip type={active.question_type} />
            </div>
          </aside>
        )}
      </div>

      {/* Settings panel */}
      {quizId && settingsOpen && (
        <QuizSettingsPanel
          quizId={quizId}
          quiz={quiz}
          onClose={() => setSettingsOpen(false)}
          onSaved={(updatedQuiz) => setQuiz(updatedQuiz)}
        />
      )}
    </div>
  );
}

// ─── Question editor dispatcher ───────────────────────────────────────────────

function QuestionEditor({
  question,
  onUpdate,
  onContentUpdate,
  onImageUpload,
}: {
  question: LocalQuestion;
  onUpdate: (patch: Partial<LocalQuestion>) => void;
  onContentUpdate: (patch: Record<string, unknown>) => void;
  onImageUpload: (choiceIndex: number, file: File) => Promise<string>;
}) {
  const content = (question.question_content ?? {}) as Record<string, unknown>;
  const type = question.question_type ?? "short_answer";

  switch (type) {
    case "multiple_choice":
      return (
        <MultipleChoiceEditor
          choices={question.choices}
          onChange={(choices) => onUpdate({ choices })}
        />
      );
    case "multiple_select":
      return (
        <MultipleSelectEditor
          choices={question.choices}
          onChange={(choices) => onUpdate({ choices })}
        />
      );
    case "true_false":
      return (
        <TrueFalseEditor
          correctAnswer={(content.correct_answer as "true" | "false") ?? null}
          onChange={(v) => onContentUpdate({ correct_answer: v })}
        />
      );
    case "short_answer":
      return (
        <ShortAnswerEditor
          sampleAnswer={(content.sample_answer as string) ?? ""}
          onChange={(v) => onContentUpdate({ sample_answer: v })}
        />
      );
    case "essay":
      return (
        <ShortAnswerEditor
          sampleAnswer={(content.sample_answer as string) ?? ""}
          onChange={(v) => onContentUpdate({ sample_answer: v })}
          multiline
        />
      );
    case "fill_blank":
      return (
        <FillBlankEditor
          template={(content.template as string) ?? ""}
          answers={(content.answers as string[]) ?? []}
          onTemplateChange={(v) => onContentUpdate({ template: v })}
          onAnswersChange={(v) => onContentUpdate({ answers: v })}
        />
      );
    case "ordering":
      return (
        <OrderingEditor
          items={(content.items as string[]) ?? [""]}
          onChange={(items) => onContentUpdate({ items })}
        />
      );
    case "matching":
      return (
        <MatchingEditor
          pairs={(content.pairs as { left: string; right: string }[]) ?? []}
          onChange={(pairs) => onContentUpdate({ pairs })}
        />
      );
    case "file_upload":
      return (
        <FileUploadEditor
          acceptedTypes={(content.accepted_types as string[]) ?? []}
          maxSizeMb={(content.max_size_mb as number) ?? 10}
          onAcceptedTypesChange={(v) => onContentUpdate({ accepted_types: v })}
          onMaxSizeChange={(v) => onContentUpdate({ max_size_mb: v })}
        />
      );
    case "image_choice":
      return (
        <ImageChoiceEditor
          choices={question.choices}
          onChange={(choices) => onUpdate({ choices })}
          onImageUpload={onImageUpload}
        />
      );
    case "audio_response":
      return (
        <AudioResponseEditor
          maxDurationSec={(content.max_duration_sec as number) ?? 60}
          instructions={(content.instructions as string) ?? ""}
          onMaxDurationChange={(v) => onContentUpdate({ max_duration_sec: v })}
          onInstructionsChange={(v) => onContentUpdate({ instructions: v })}
        />
      );
    default:
      return <p className="text-xs text-muted-foreground">Select a question type to begin editing.</p>;
  }
}

// ─── Type tip ────────────────────────────────────────────────────────────────

function TypeTip({ type }: { type: QuestionType | null }) {
  const tips: Partial<Record<QuestionType, string>> = {
    multiple_choice: "Only one answer is correct. Mark it with the green badge.",
    multiple_select: "Multiple answers can be correct. Toggle each correct one.",
    true_false: "Click True or False to set the correct answer.",
    short_answer: "Students type a short response. Auto-graded if you set an answer.",
    essay: "Long-form response. Manually graded.",
    fill_blank: "Use [blank] in the template to mark gaps.",
    ordering: "Enter items in the correct order. Students see them shuffled.",
    matching: "Students drag left items to match right items.",
    image_choice: "Upload images as options. Mark one as correct.",
    audio_response: "Students record audio in the browser.",
    file_upload: "Students upload a file as their answer.",
  };

  return <p>{type ? (tips[type] ?? "Configure this question using the editor.") : "Pick a type to see tips."}</p>;
}

// ─── Sortable question row (dnd-kit) ─────────────────────────────────────────

function SortableQuestionRow({
  question,
  index,
  isActive,
  typeLabel,
  onClick,
  onDelete,
}: {
  question: LocalQuestion;
  index: number;
  isActive: boolean;
  typeLabel: string;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group w-full rounded-lg px-3 py-2.5 text-left transition-all",
          isActive
            ? "bg-indigo-50 ring-1 ring-indigo-200"
            : "hover:bg-slate-50",
          isDragging && "shadow-lg",
        )}
      >
        <div className="flex items-start gap-1">
          {/* Drag handle */}
          <span
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-400 active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Q{index + 1} · {typeLabel}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-700">
              {question.question?.trim() || "Untitled question"}
            </p>
          </div>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </button>
    </div>
  );
}