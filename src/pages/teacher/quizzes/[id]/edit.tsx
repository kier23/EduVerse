// quizzes/[id]/edit.tsx  –  /teacher/quizzes/:id/edit

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
  CalendarDays,
  Trophy,
  AlignLeft,
  Eye,
  X,
  ChevronRight,
  Clock,
  RotateCcw,
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
  uploadQuizChoiceImage,
  updateActivity,
  fetchQuizSettings,
  type Quiz,
  type QuizQuestion,
  type QuizQuestionMedia,
  type QuestionType,
  type QuizSettings,
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

const QUESTION_TYPES: {
  value: QuestionType;
  label: string;
  icon: React.ElementType;
  group: string;
}[] = [
  {
    value: "multiple_choice",
    label: "Multiple choice",
    icon: ChevronDown,
    group: "Standard",
  },
  {
    value: "multiple_select",
    label: "Multiple select",
    icon: ChevronDown,
    group: "Standard",
  },
  {
    value: "true_false",
    label: "True / False",
    icon: ChevronDown,
    group: "Standard",
  },
  {
    value: "short_answer",
    label: "Short answer",
    icon: FileText,
    group: "Standard",
  },
  { value: "essay", label: "Essay", icon: FileText, group: "Standard" },
  {
    value: "fill_blank",
    label: "Fill in the blank",
    icon: FileText,
    group: "Standard",
  },
  {
    value: "ordering",
    label: "Ordering",
    icon: GripVertical,
    group: "Interactive",
  },
  {
    value: "matching",
    label: "Matching",
    icon: GripVertical,
    group: "Interactive",
  },
  {
    value: "image_choice",
    label: "Image choice",
    icon: ImageIcon,
    group: "Media",
  },
  {
    value: "audio_response",
    label: "Audio response",
    icon: Music,
    group: "Media",
  },
  {
    value: "file_upload",
    label: "File upload",
    icon: FileText,
    group: "Media",
  },
];

const TYPE_LABEL: Record<QuestionType, string> = Object.fromEntries(
  QUESTION_TYPES.map((t) => [t.value, t.label]),
) as Record<QuestionType, string>;

// ─── Local types ──────────────────────────────────────────────────────────────

type LocalChoice = {
  id?: string;
  choice_text: string;
  is_correct: boolean;
  image_url?: string;
};
type LocalQuestion = QuizQuestion & {
  choices: LocalChoice[];
  media: QuizQuestionMedia[];
  _dirty?: boolean;
};

// Activity fields editable directly in the editor
type ActivityMeta = {
  activity_id: string;
  title: string;
  due_date: string;
  points: number;
  instructions: string;
};

function defaultContent(type: QuestionType): Record<string, unknown> {
  switch (type) {
    case "true_false":
      return { correct_answer: null };
    case "short_answer":
      return { sample_answer: "" };
    case "essay":
      return { sample_answer: "" };
    case "fill_blank":
      return { template: "", answers: [] };
    case "ordering":
      return { items: ["", ""] };
    case "matching":
      return { pairs: [{ left: "", right: "" }] };
    case "file_upload":
      return { accepted_types: ["pdf", "docx"], max_size_mb: 10 };
    case "audio_response":
      return { max_duration_sec: 60, instructions: "" };
    default:
      return {};
  }
}

function defaultChoices(type: QuestionType): LocalChoice[] {
  if (["multiple_choice", "multiple_select", "image_choice"].includes(type)) {
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
  const [activity, setActivity] = useState<ActivityMeta | null>(null);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Live theme preview — updated when settings are applied
  const [liveSettings, setLiveSettings] = useState<QuizSettings>({
    primaryColor: "#6366f1",
    showProgress: true,
    questionCard: true,
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activitySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionsRef = useRef<LocalQuestion[]>([]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!quizId) return;
    Promise.all([fetchQuizById(quizId), fetchQuizSettings(quizId)])
      .then(([{ quiz: q, questions: qs }, settings]) => {
        setQuiz(q);
        if (Object.keys(settings).length > 0) setLiveSettings(settings);
        setQuestions(
          qs.map((q) => ({ ...q, choices: q.choices as LocalChoice[] })),
        );
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  // When quiz loads we need to also fetch linked activity metadata
  // fetchQuizById returns the quiz; activity info comes via the QuizWithActivity
  // shape used in the list, so we read it from the quiz.activity_id join here
  useEffect(() => {
    if (!quiz?.activity_id) return;
    // Re-use the supabase client via quiz-api — we'll call the raw client
    // Actually we can read from the quiz list join; simplest is a direct query.
    // We import updateActivity from quiz-api which means supabase is available.
    // Fetch the activity row directly:
    import("@/lib/supabase").then(({ supabase }) => {
      supabase
        .from("activities")
        .select("id, title, due_date, points, instructions")
        .eq("id", quiz.activity_id!)
        .single()
        .then(({ data }) => {
          if (data) {
            setActivity({
              activity_id: data.id,
              title: data.title ?? "",
              due_date: data.due_date ?? "",
              points: data.points ?? 0,
              instructions: data.instructions ?? "",
            });
          }
        });
    });
  }, [quiz?.activity_id]);

  const active = questions[activeIndex] ?? null;

  // ── Derived theme color ───────────────────────────────────────────────────

  const themeColor = liveSettings.primaryColor ?? "#6366f1";

  // ── Activity meta save (debounced) ────────────────────────────────────────

  const scheduleActivitySave = (meta: ActivityMeta) => {
    if (activitySaveTimer.current) clearTimeout(activitySaveTimer.current);
    activitySaveTimer.current = setTimeout(async () => {
      try {
        await updateActivity(meta.activity_id, {
          title: meta.title,
          due_date: meta.due_date,
          points: meta.points,
          instructions: meta.instructions,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        console.error("Activity save failed", err);
      }
    }, 1200);
  };

  const updateActivityMeta = (
    patch: Partial<Omit<ActivityMeta, "activity_id">>,
  ) => {
    setActivity((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      scheduleActivitySave(next);
      return next;
    });
  };

  // ── Question save (debounced) ─────────────────────────────────────────────

  const scheduleSave = useCallback((q: LocalQuestion) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveQuestion(q), 1500);
  }, []);

  const saveQuestion = async (q: LocalQuestion) => {
    if (!quizId) return;
    setSaving(true);
    try {
      const currentIndex = questionsRef.current.findIndex(
        (pq) => pq.id === q.id,
      );
      const result = await upsertQuizQuestion({
        ...q,
        quiz_id: quizId,
        order_index: currentIndex >= 0 ? currentIndex : (q.order_index ?? 0),
      });
      if (
        ["multiple_choice", "multiple_select", "image_choice"].includes(
          q.question_type ?? "",
        )
      ) {
        await upsertQuizChoices(result.id, q.choices);
      }
      setQuestions((prev) =>
        prev.map((pq) =>
          pq.id === q.id ? { ...pq, id: result.id, _dirty: false } : pq,
        ),
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
    const { active: dragActive, over } = event;
    if (!over || dragActive.id === over.id) return;
    setQuestions((prev) => {
      const oldIndex = prev.findIndex((q) => q.id === dragActive.id);
      const newIndex = prev.findIndex((q) => q.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex).map((q, i) => ({
        ...q,
        order_index: i,
      }));
      const toSave = reordered
        .filter((q) => !q.id.startsWith("_new_"))
        .map((q) => ({ id: q.id, order_index: q.order_index ?? 0 }));
      if (toSave.length > 0) reorderQuizQuestions(toSave).catch(console.error);
      setActiveIndex(newIndex);
      return reordered;
    });
  };

  // Used by ImageChoiceEditor — stores to quiz-media/{quizId}/{questionId}/image-choices/
  const handleImageUpload = async (_: number, file: File): Promise<string> => {
    if (!quizId || !active) return "";
    return uploadQuizChoiceImage(quizId, active.id, file);
  };

  // ── Settings applied ──────────────────────────────────────────────────────

  const handleSettingsSaved = (
    updatedQuiz: Quiz,
    appliedSettings: QuizSettings,
  ) => {
    setQuiz(updatedQuiz);
    setLiveSettings(appliedSettings);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background/80">
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-2 border-b border-amber-500/15 bg-card/85 px-3 py-2.5 backdrop-blur-md sm:gap-3 sm:px-6 sm:py-3">
        <button
          type="button"
          onClick={() => navigate("/teacher/quizzes")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] uppercase tracking-widest font-medium"
            style={{ color: themeColor }}
          >
            Quiz Editor
          </p>
          <h1 className="text-sm font-semibold text-white truncate">
            {activity?.title || "Untitled Quiz"}
          </h1>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
              <span className="hidden sm:inline">Saving…</span>
            </>
          ) : saved ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />{" "}
              <span className="hidden sm:inline">Saved</span>
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/teacher/quizzes/${quizId}/responses`)}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-500/15 px-3 py-1.5 text-xs text-muted-foreground hover:bg-card/70 transition-colors"
        >
          <Users className="h-3.5 w-3.5" />
          Responses
        </button>

        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3"
          style={{
            borderColor: themeColor + "55",
            color: themeColor,
            background: themeColor + "10",
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3"
          style={{
            borderColor: themeColor + "55",
            color: themeColor,
            background: themeColor + "10",
          }}
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: question list — hidden on mobile, shown as overlay ──── */}
        <aside className="hidden md:flex w-56 flex-col border-r border-amber-500/15 bg-card/60 backdrop-blur-sm">
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
                    themeColor={themeColor}
                    onClick={() => setActiveIndex(i)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      removeQuestion(i);
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="border-t border-amber-500/15 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs justify-start"
                  style={{ borderColor: themeColor + "55", color: themeColor }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add question
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {["Standard", "Interactive", "Media"].map((group) => (
                  <div key={group}>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">
                      {group}
                    </DropdownMenuLabel>
                    {QUESTION_TYPES.filter((t) => t.group === group).map(
                      (t) => (
                        <DropdownMenuItem
                          key={t.value}
                          onClick={() => addQuestion(t.value)}
                          className="text-xs gap-2"
                        >
                          <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {t.label}
                        </DropdownMenuItem>
                      ),
                    )}
                    <DropdownMenuSeparator />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* ── Center: editor ───────────────────────────────────────────────── */}
        <main className="flex flex-1 flex-col overflow-y-auto">
          {/* Mobile: question selector strip */}
          <div className="flex items-center gap-2 border-b border-amber-500/15 bg-card/85 px-3 py-5 md:hidden overflow-x-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 text-xs"
                  style={{ borderColor: themeColor + "55", color: themeColor }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add question
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {["Standard", "Interactive", "Media"].map((group) => (
                  <div key={group}>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">
                      {group}
                    </DropdownMenuLabel>
                    {QUESTION_TYPES.filter((t) => t.group === group).map(
                      (t) => (
                        <DropdownMenuItem
                          key={t.value}
                          onClick={() => addQuestion(t.value)}
                          className="text-xs gap-2"
                        >
                          <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {t.label}
                        </DropdownMenuItem>
                      ),
                    )}
                    <DropdownMenuSeparator />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex gap-1.5 overflow-x-auto">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
                  style={
                    i === activeIndex
                      ? { background: themeColor, color: "white" }
                      : { background: "#f1f5f9", color: "#64748b" }
                  }
                >
                  Q{i + 1}
                </button>
              ))}
            </div>
          </div>
          {/* Banner preview */}
          {quiz?.banner_url && (
            <div className="relative h-36 w-full shrink-0 overflow-hidden">
              <img
                src={quiz.banner_url}
                alt="Quiz banner"
                className="h-full w-full object-cover"
              />
              {/* Gradient overlay so content below reads cleanly */}
              <div className="absolute inset-0 bg-linear-to-b from-black/10 to-black/40" />
              <div className="absolute bottom-3 left-6">
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-medium">
                  Quiz Banner
                </p>
                <p className="text-sm font-semibold text-white truncate max-w-xs">
                  {activity?.title || "Untitled Quiz"}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-1 flex-col p-6 gap-4">
            {/* ── Quiz meta editor card ─────────────────────────────────── */}
            <div className="mx-auto w-full max-w-2xl">
              <div
                className="rounded-2xl border bg-stone-950/75 shadow-sm backdrop-blur-md overflow-hidden"
                style={{ borderColor: themeColor + "30" }}
              >
                {/* Colored top stripe */}
                <div
                  className="h-1 w-full"
                  style={{ background: themeColor }}
                />

                <div className="p-5 space-y-4">
                  {/* Title */}
                  <div>
                    <input
                      type="text"
                      placeholder="Quiz title…"
                      value={activity?.title ?? ""}
                      onChange={(e) =>
                        updateActivityMeta({ title: e.target.value })
                      }
                      className="w-full bg-transparent text-xl font-bold text-white placeholder:text-slate-300 focus:outline-none border-b border-transparent focus:border-amber-500/15 pb-1 transition-colors"
                    />
                  </div>

                  {/* Instructions */}
                  <div className="flex gap-2">
                    <AlignLeft className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <textarea
                      placeholder="Instructions for students… (optional)"
                      value={activity?.instructions ?? ""}
                      onChange={(e) =>
                        updateActivityMeta({ instructions: e.target.value })
                      }
                      rows={2}
                      className="flex-1 resize-none bg-transparent text-sm text-slate-300 placeholder:text-slate-300 focus:outline-none"
                    />
                  </div>

                  {/* Due date + Points row */}
                  <div className="flex flex-wrap gap-4 pt-1 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">
                          Due date
                        </p>
                        <input
                          type="date"
                          value={activity?.due_date ?? ""}
                          onChange={(e) =>
                            updateActivityMeta({ due_date: e.target.value })
                          }
                          className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">
                          Total points
                        </p>
                        <input
                          type="number"
                          min={0}
                          value={activity?.points ?? 0}
                          onChange={(e) =>
                            updateActivityMeta({
                              points: Number(e.target.value),
                            })
                          }
                          className="w-20 bg-transparent text-sm text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Theme color swatch preview */}
                    <div className="ml-auto flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full border border-white shadow-sm"
                        style={{ background: themeColor }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {liveSettings.theme ?? "modern"} theme
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Question editor ───────────────────────────────────────── */}
            {!active ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: themeColor + "15" }}
                >
                  <Plus
                    className="h-7 w-7"
                    style={{ color: themeColor + "80" }}
                  />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  No questions yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Add a question from the left panel to get started.
                </p>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-2xl space-y-4">
                {/* Question card */}
                <div
                  className="rounded-2xl border bg-stone-950/75 shadow-sm backdrop-blur-md overflow-hidden"
                  style={{ borderColor: themeColor + "30" }}
                >
                  <div
                    className="h-0.5 w-full"
                    style={{ background: themeColor + "60" }}
                  />
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: themeColor }}
                      >
                        Q{activeIndex + 1}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          background: themeColor + "15",
                          color: themeColor,
                        }}
                      >
                        {TYPE_LABEL[active.question_type ?? "short_answer"]}
                      </span>
                    </div>

                    <textarea
                      className="w-full resize-none rounded-xl border border-amber-500/15 bg-slate-950/60 px-4 py-3 text-sm font-medium text-amber-50 placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all"
                      style={
                        {
                          "--tw-ring-color": themeColor + "50",
                        } as React.CSSProperties
                      }
                      rows={2}
                      placeholder="Type your question here…"
                      value={active.question ?? ""}
                      onChange={(e) =>
                        updateActive({ question: e.target.value })
                      }
                    />

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
                          color={themeColor}
                          onUploaded={(m) =>
                            updateActive({ media: [...active.media, m] })
                          }
                          onRemove={(mediaId) =>
                            updateActive({
                              media: active.media.filter(
                                (m) => m.id !== mediaId,
                              ),
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Answer editor card */}
                <div
                  className="rounded-2xl border bg-card/85 p-6 shadow-sm backdrop-blur-md"
                  style={{ borderColor: themeColor + "20" }}
                >
                  <QuestionEditor
                    question={active}
                    onUpdate={updateActive}
                    onContentUpdate={updateContent}
                    onImageUpload={handleImageUpload}
                    themeColor={themeColor}
                  />
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ── Right: per-question settings ─────────────────────────────────── */}
        {active && (
          <aside className="hidden lg:flex w-52 flex-col border-l border-amber-500/15 bg-card/60 backdrop-blur-sm p-4 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Points
              </label>
              <Input
                type="number"
                min={0}
                value={active.points ?? 1}
                onChange={(e) =>
                  updateActive({ points: Number(e.target.value) })
                }
                className="bg-card/70 h-9 text-sm"
                style={{ "--tw-ring-color": themeColor } as React.CSSProperties}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Question type
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs gap-1"
                  >
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
                        active.question_type === t.value && "font-medium",
                      )}
                      style={
                        active.question_type === t.value
                          ? { background: themeColor + "15", color: themeColor }
                          : {}
                      }
                    >
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="rounded-lg bg-card/70 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-slate-300">Tips</p>
              <TypeTip type={active.question_type} />
            </div>

            {/* Mini theme preview swatch */}
            <div className="mt-auto rounded-lg border border-border/60 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                Theme preview
              </p>
              <div className="flex gap-1.5">
                <div
                  className="h-5 flex-1 rounded"
                  style={{ background: themeColor }}
                />
                <div
                  className="h-5 flex-1 rounded"
                  style={{ background: themeColor + "40" }}
                />
                <div
                  className="h-5 flex-1 rounded"
                  style={{ background: themeColor + "15" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground capitalize">
                {liveSettings.theme ?? "modern"}
              </p>
            </div>
          </aside>
        )}
      </div>

      {/* Preview modal */}
      {previewOpen && (
        <QuizPreviewModal
          quiz={quiz}
          activity={activity}
          questions={questions}
          settings={liveSettings}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* Settings panel */}
      {quizId && settingsOpen && (
        <QuizSettingsPanel
          quizId={quizId}
          quiz={quiz}
          onClose={() => setSettingsOpen(false)}
          onSaved={handleSettingsSaved}
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
  themeColor,
}: {
  question: LocalQuestion;
  onUpdate: (patch: Partial<LocalQuestion>) => void;
  onContentUpdate: (patch: Record<string, unknown>) => void;
  onImageUpload: (i: number, file: File) => Promise<string>;
  themeColor: string;
}) {
  const content = (question.question_content ?? {}) as Record<string, unknown>;
  const type = question.question_type ?? "short_answer";

  switch (type) {
    case "multiple_choice":
      return (
        <MultipleChoiceEditor
          choices={question.choices}
          onChange={(c) => onUpdate({ choices: c })}
          color={themeColor}
        />
      );
    case "multiple_select":
      return (
        <MultipleSelectEditor
          choices={question.choices}
          onChange={(c) => onUpdate({ choices: c })}
          color={themeColor}
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
          color={themeColor}
        />
      );
    case "ordering":
      return (
        <OrderingEditor
          items={(content.items as string[]) ?? [""]}
          onChange={(items) => onContentUpdate({ items })}
          color={themeColor}
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
          color={themeColor}
        />
      );
    case "image_choice":
      return (
        <ImageChoiceEditor
          choices={question.choices}
          onChange={(c) => onUpdate({ choices: c })}
          onImageUpload={onImageUpload}
          color={themeColor}
        />
      );
    case "audio_response":
      return (
        <AudioResponseEditor
          maxDurationSec={(content.max_duration_sec as number) ?? 60}
          instructions={(content.instructions as string) ?? ""}
          onMaxDurationChange={(v) => onContentUpdate({ max_duration_sec: v })}
          onInstructionsChange={(v) => onContentUpdate({ instructions: v })}
          color={themeColor}
        />
      );
    default:
      return (
        <p className="text-xs text-muted-foreground">
          Select a question type to begin editing.
        </p>
      );
  }
}

// ─── Type tip ─────────────────────────────────────────────────────────────────

function TypeTip({ type }: { type: QuestionType | null }) {
  const tips: Partial<Record<QuestionType, string>> = {
    multiple_choice:
      "Only one answer is correct. Mark it with the green badge.",
    multiple_select:
      "Multiple answers can be correct. Toggle each correct one.",
    true_false: "Click True or False to set the correct answer.",
    short_answer:
      "Students type a short response. Auto-graded if you set an answer.",
    essay: "Long-form response. Manually graded.",
    fill_blank: "Use [blank] in the template to mark gaps.",
    ordering: "Enter items in the correct order. Students see them shuffled.",
    matching: "Students drag left items to match right items.",
    image_choice: "Upload images as options. Mark one as correct.",
    audio_response: "Students record audio in the browser.",
    file_upload: "Students upload a file as their answer.",
  };
  return (
    <p>
      {type
        ? (tips[type] ?? "Configure this question using the editor.")
        : "Pick a type to see tips."}
    </p>
  );
}

// ─── Sortable question row ────────────────────────────────────────────────────

function SortableQuestionRow({
  question,
  index,
  isActive,
  typeLabel,
  themeColor,
  onClick,
  onDelete,
}: {
  question: LocalQuestion;
  index: number;
  isActive: boolean;
  typeLabel: string;
  themeColor: string;
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
          isActive ? "ring-1" : "hover:bg-slate-950/70",
          isDragging && "shadow-lg",
        )}
        style={
          isActive
            ? {
                background: themeColor + "12",
                borderColor: themeColor,
              }
            : {}
        }
      >
        <div className="flex items-start gap-1">
          <span
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-400 active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-medium uppercase tracking-wide"
              style={{
                color: isActive ? themeColor : undefined,
                opacity: isActive ? 1 : 0.5,
              }}
            >
              Q{index + 1} · {typeLabel}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-200">
              {question.question?.trim() || "Untitled question"}
            </p>
          </div>
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

// ─── Quiz Preview Modal ───────────────────────────────────────────────────────

type PreviewAnswer =
  | string // short_answer, essay, true_false, fill_blank slot
  | string[] // multiple_select ordering
  | Record<string, string>; // matching: { left: right }

function QuizPreviewModal({
  quiz,
  activity,
  questions,
  settings,
  onClose,
}: {
  quiz: Quiz | null;
  activity: ActivityMeta | null;
  questions: LocalQuestion[];
  settings: QuizSettings;
  onClose: () => void;
}) {
  const color = settings.primaryColor ?? "#6366f1";
  const savedQuestions = questions.filter((q) => !q.id.startsWith("_new_"));

  // Current question index in preview
  const [currentIndex, setCurrentIndex] = useState(0);
  // Per-question answers keyed by question id
  const [answers, setAnswers] = useState<Record<string, PreviewAnswer>>({});
  // Whether the preview is showing the "submitted" result screen
  const [submitted, setSubmitted] = useState(false);

  const current = savedQuestions[currentIndex];
  const total = savedQuestions.length;
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  const setAnswer = (id: string, value: PreviewAnswer) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const handleSubmit = () => setSubmitted(true);
  const handleReset = () => {
    setSubmitted(false);
    setCurrentIndex(0);
    setAnswers({});
  };

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* ── Preview top bar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-6 py-3 border-b border-white/20 backdrop-blur-md"
        style={{ background: color }}
      >
        {/* Teacher-only badge */}
        <span className="rounded-full border border-white/30 bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
          Preview mode
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {activity?.title || "Untitled Quiz"}
          </p>
        </div>

        {/* Question counter */}
        {!submitted && total > 0 && (
          <span className="text-xs text-white/80">
            {currentIndex + 1} / {total}
          </span>
        )}

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      {settings.showProgress && !submitted && total > 0 && (
        <div className="h-1 w-full bg-slate-200">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: color }}
          />
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-y-auto justify-center px-4 py-8">
        <div className="w-full max-w-2xl space-y-6">
          {/* Welcome / banner card (first screen) */}
          {currentIndex === 0 &&
            !submitted &&
            (quiz?.banner_url || activity?.instructions) && (
              <div
                className="rounded-2xl overflow-hidden border border-amber-500/15 bg-card/95 shadow-sm"
                style={{ borderColor: color + "30" }}
              >
                {quiz?.banner_url && (
                  <div className="relative h-40 w-full">
                    <img
                      src={quiz.banner_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to bottom, transparent, ${color}66)`,
                      }}
                    />
                  </div>
                )}
                {activity?.instructions && (
                  <div className="bg-card/95 px-6 py-4">
                    <p
                      className="text-[10px] uppercase tracking-wider font-medium mb-1"
                      style={{ color }}
                    >
                      Instructions
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {activity.instructions}
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Empty state */}
          {total === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-amber-500/15 bg-card/90 py-20 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: color + "15" }}
              >
                <Eye className="h-7 w-7" style={{ color }} />
              </div>
              <p className="font-semibold text-slate-200">
                No saved questions yet
              </p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Save at least one question in the editor to see a preview.
              </p>
            </div>
          )}

          {/* Submitted screen */}
          {submitted && (
            <div
              className="flex flex-col items-center gap-5 rounded-2xl border border-amber-500/15 bg-card/95 p-10 shadow-sm text-center"
              style={{ borderColor: color + "30" }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: color + "15" }}
              >
                <Check className="h-8 w-8" style={{ color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">Quiz submitted!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This is how students will see the confirmation screen.
                </p>
              </div>

              {/* Answer summary */}
              <div className="w-full space-y-3 text-left mt-2">
                {savedQuestions.map((q, i) => {
                  const ans = answers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border border-border/60 bg-card/80 px-4 py-3"
                    >
                      <p
                        className="text-[10px] uppercase tracking-wide font-medium mb-1"
                        style={{ color }}
                      >
                        Q{i + 1}
                      </p>
                      <p className="text-xs font-medium text-slate-200 mb-1 line-clamp-1">
                        {q.question || "Untitled question"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ans ? (
                          Array.isArray(ans) ? (
                            ans.join(", ")
                          ) : typeof ans === "object" ? (
                            Object.entries(ans)
                              .map(([k, v]) => `${k} → ${v}`)
                              .join(", ")
                          ) : (
                            String(ans)
                          )
                        ) : (
                          <span className="italic">No answer</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: color }}
              >
                <RotateCcw className="h-4 w-4" />
                Retake preview
              </button>
            </div>
          )}

          {/* Active question */}
          {!submitted && current && (
            <PreviewQuestion
              question={current}
              index={currentIndex}
              total={total}
              color={color}
              answer={answers[current.id]}
              onAnswer={(v) => setAnswer(current.id, v)}
              showCard={settings.questionCard ?? true}
            />
          )}

          {/* Navigation */}
          {!submitted && total > 0 && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="rounded-xl border border-amber-500/15 bg-card/90 px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-card/70 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Back
              </button>

              {currentIndex < total - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: color }}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-xl px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: color }}
                >
                  Submit quiz →
                </button>
              )}
            </div>
          )}

          {/* Quiz meta info */}
          {!submitted && (quiz?.time_limit || activity?.due_date) && (
            <div className="flex gap-4 text-xs text-muted-foreground justify-center">
              {quiz?.time_limit && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {quiz.time_limit} min limit
                </span>
              )}
              {activity?.due_date && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Due{" "}
                  {new Date(activity.due_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Individual question preview renderer ─────────────────────────────────────

function PreviewQuestion({
  question,
  index,
  color,
  answer,
  onAnswer,
  showCard,
}: {
  question: LocalQuestion;
  index: number;
  total: number;
  color: string;
  answer: PreviewAnswer | undefined;
  onAnswer: (v: PreviewAnswer) => void;
  showCard: boolean;
}) {
  const content = (question.question_content ?? {}) as Record<string, unknown>;
  const type = question.question_type ?? "short_answer";

  const wrapper = (children: React.ReactNode) => (
    <div
      className={cn(
        "space-y-5",
        showCard &&
          "rounded-2xl border border-amber-500/15 bg-card/95 p-6 shadow-sm",
      )}
      style={showCard ? { borderColor: color + "25" } : {}}
    >
      {/* Question header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color }}
          >
            Question {index + 1}
          </span>
          <span className="text-[10px] text-muted-foreground">
            · {question.points ?? 1} pt{(question.points ?? 1) !== 1 ? "s" : ""}
          </span>
        </div>

        <p className="text-base font-semibold text-white leading-snug">
          {question.question || (
            <span className="italic text-slate-400">Untitled question</span>
          )}
        </p>

        {/* Attached media */}
        {question.media?.map((m) => (
          <PreviewMedia key={m.id} media={m} />
        ))}
      </div>

      {/* Answer area */}
      {children}
    </div>
  );

  // ── Multiple choice ───────────────────────────────────────────────────────
  if (type === "multiple_choice" || type === "image_choice") {
    return wrapper(
      <div className="space-y-2">
        {question.choices.map((c, i) => {
          const selected = answer === c.choice_text;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onAnswer(c.choice_text)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all",
                selected
                  ? "font-medium"
                  : "border-amber-500/15 bg-card/90 hover:border-amber-300/30 text-foreground",
              )}
              style={
                selected
                  ? { borderColor: color, background: color + "10", color }
                  : {}
              }
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all",
                )}
                style={
                  selected
                    ? { borderColor: color, background: color, color: "white" }
                    : { borderColor: "#cbd5e1" }
                }
              >
                {selected ? "✓" : String.fromCharCode(65 + i)}
              </span>
              {c.image_url && (
                <img
                  src={c.image_url}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              {c.choice_text || (
                <span className="italic text-slate-400">Empty option</span>
              )}
            </button>
          );
        })}
      </div>,
    );
  }

  // ── Multiple select ───────────────────────────────────────────────────────
  if (type === "multiple_select") {
    const selected: string[] = Array.isArray(answer)
      ? (answer as string[])
      : [];
    const toggle = (text: string) => {
      const next = selected.includes(text)
        ? selected.filter((x) => x !== text)
        : [...selected, text];
      onAnswer(next);
    };
    return wrapper(
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Select all that apply.</p>
        {question.choices.map((c, i) => {
          const checked = selected.includes(c.choice_text);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(c.choice_text)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all",
                checked
                  ? "font-medium"
                  : "border-amber-500/15 bg-card/90 hover:border-amber-300/30 text-foreground",
              )}
              style={
                checked
                  ? { borderColor: color, background: color + "10", color }
                  : {}
              }
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[10px] font-bold transition-all"
                style={
                  checked
                    ? { borderColor: color, background: color, color: "white" }
                    : { borderColor: "#cbd5e1" }
                }
              >
                {checked ? "✓" : ""}
              </span>
              {c.choice_text || (
                <span className="italic text-slate-400">Empty option</span>
              )}
            </button>
          );
        })}
      </div>,
    );
  }

  // ── True / False ──────────────────────────────────────────────────────────
  if (type === "true_false") {
    return wrapper(
      <div className="flex gap-3">
        {(["True", "False"] as const).map((val) => {
          const selected = answer === val.toLowerCase();
          return (
            <button
              key={val}
              type="button"
              onClick={() => onAnswer(val.toLowerCase())}
              className={cn(
                "flex-1 rounded-xl border-2 py-4 text-sm font-semibold transition-all",
                selected
                  ? "text-white"
                  : "border-amber-500/15 bg-card/90 text-muted-foreground hover:border-amber-300/30",
              )}
              style={selected ? { background: color, borderColor: color } : {}}
            >
              {val === "True" ? "✓ True" : "✗ False"}
            </button>
          );
        })}
      </div>,
    );
  }

  // ── Short answer ──────────────────────────────────────────────────────────
  if (type === "short_answer") {
    return wrapper(
      <input
        type="text"
        placeholder="Type your answer here…"
        value={(answer as string) ?? ""}
        onChange={(e) => onAnswer(e.target.value)}
        className="w-full rounded-xl border border-amber-500/15 bg-slate-950/70 px-4 py-3 text-sm text-amber-50 focus:outline-none focus:ring-2 transition-all"
        style={{ "--tw-ring-color": color + "50" } as React.CSSProperties}
      />,
    );
  }

  // ── Essay ─────────────────────────────────────────────────────────────────
  if (type === "essay") {
    return wrapper(
      <textarea
        placeholder="Write your response here…"
        value={(answer as string) ?? ""}
        onChange={(e) => onAnswer(e.target.value)}
        rows={5}
        className="w-full resize-none rounded-xl border border-amber-500/15 bg-slate-950/70 px-4 py-3 text-sm text-amber-50 focus:outline-none focus:ring-2 transition-all"
        style={{ "--tw-ring-color": color + "50" } as React.CSSProperties}
      />,
    );
  }

  // ── Fill in the blank ─────────────────────────────────────────────────────
  if (type === "fill_blank") {
    const template = (content.template as string) ?? "";
    const parts = template.split(/\[blank\]/i);
    const ansArr: string[] = Array.isArray(answer)
      ? (answer as string[])
      : Array(parts.length - 1).fill("");
    const updateBlank = (i: number, v: string) => {
      const next = [...ansArr];
      next[i] = v;
      onAnswer(next);
    };
    return wrapper(
      <div className="text-sm text-amber-50 leading-loose">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                type="text"
                value={ansArr[i] ?? ""}
                onChange={(e) => updateBlank(i, e.target.value)}
                className="inline-block w-32 mx-1 rounded-lg border-b-2 border-slate-300 bg-transparent px-2 py-0.5 text-sm text-center focus:outline-none focus:border-current transition-colors"
                style={{
                  borderColor: ansArr[i] ? color : undefined,
                  color: ansArr[i] ? color : undefined,
                }}
                placeholder="______"
              />
            )}
          </span>
        ))}
      </div>,
    );
  }

  // ── Ordering ──────────────────────────────────────────────────────────────
  if (type === "ordering") {
    const items = (content.items as string[]) ?? [];
    // Show shuffled order (stable shuffle for preview using item index)
    const shuffled: string[] = Array.isArray(answer)
      ? (answer as string[])
      : [...items].sort(() => 0.5 - Math.random());
    if (!answer) onAnswer(shuffled);
    const move = (from: number, to: number) => {
      const next = [
        ...(Array.isArray(answer) ? (answer as string[]) : shuffled),
      ];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onAnswer(next);
    };
    const current = Array.isArray(answer) ? (answer as string[]) : shuffled;
    return wrapper(
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Drag or use arrows to arrange in the correct order.
        </p>
        {current.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-card/90 px-4 py-3"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: color }}
            >
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-slate-200">{item}</span>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => i > 0 && move(i, i - 1)}
                disabled={i === 0}
                className="text-slate-300 hover:text-slate-400 disabled:opacity-20 text-xs leading-none"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => i < current.length - 1 && move(i, i + 1)}
                disabled={i === current.length - 1}
                className="text-slate-300 hover:text-slate-400 disabled:opacity-20 text-xs leading-none"
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>,
    );
  }

  // ── Matching ──────────────────────────────────────────────────────────────
  if (type === "matching") {
    const pairs = (content.pairs as { left: string; right: string }[]) ?? [];
    const matchAnswer = (
      typeof answer === "object" && !Array.isArray(answer) ? answer : {}
    ) as Record<string, string>;
    const rights = pairs.map((p) => p.right);
    return wrapper(
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Match each item on the left to its pair on the right.
        </p>
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-amber-500/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
              {pair.left}
            </div>
            <span className="text-slate-300 text-xs">→</span>
            <select
              value={matchAnswer[pair.left] ?? ""}
              onChange={(e) =>
                onAnswer({ ...matchAnswer, [pair.left]: e.target.value })
              }
              className="flex-1 rounded-xl border border-amber-500/15 bg-card/90 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": color + "50" } as React.CSSProperties}
            >
              <option value="">Select…</option>
              {rights.map((r, ri) => (
                <option key={ri} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>,
    );
  }

  // ── File upload ───────────────────────────────────────────────────────────
  if (type === "file_upload") {
    const accepted = (content.accepted_types as string[]) ?? [];
    const maxMb = (content.max_size_mb as number) ?? 10;
    return wrapper(
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-amber-500/15 bg-slate-950/70 py-10">
        <FileText className="h-8 w-8 text-slate-300" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300">
            Click to upload a file
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {accepted.length > 0
              ? accepted.map((t) => `.${t}`).join(", ")
              : "Any file"}{" "}
            · Max {maxMb}MB
          </p>
        </div>
        <span
          className="rounded-lg px-4 py-2 text-xs font-medium text-white"
          style={{ background: color }}
        >
          Choose file
        </span>
        <p className="text-[10px] text-muted-foreground italic">
          (Preview only — uploads disabled)
        </p>
      </div>,
    );
  }

  // ── Audio response ────────────────────────────────────────────────────────
  if (type === "audio_response") {
    const maxSec = (content.max_duration_sec as number) ?? 60;
    const instructions = (content.instructions as string) ?? "";
    return wrapper(
      <div className="space-y-3">
        {instructions && (
          <p className="text-sm text-slate-300 bg-slate-950/70 rounded-xl px-4 py-3">
            {instructions}
          </p>
        )}
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-amber-500/15 bg-slate-950/70 py-8">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: color + "15" }}
          >
            <Music className="h-7 w-7" style={{ color }} />
          </div>
          <p className="text-sm font-medium text-slate-300">
            Tap to record your response
          </p>
          <p className="text-xs text-muted-foreground">Max {maxSec}s</p>
          <p className="text-[10px] text-muted-foreground italic">
            (Preview only — recording disabled)
          </p>
        </div>
      </div>,
    );
  }

  return wrapper(
    <p className="text-sm text-muted-foreground italic">
      Preview not available for this question type.
    </p>,
  );
}

// ─── Media preview inside question ───────────────────────────────────────────

function PreviewMedia({
  media,
}: {
  media: { file_url: string | null; file_type: string | null };
}) {
  const url = media.file_url;
  const type = media.file_type ?? "";
  if (!url) return null;

  if (type.startsWith("image/")) {
    return (
      <img
        src={url}
        alt=""
        className="rounded-xl max-h-64 w-full object-cover border border-slate-100"
      />
    );
  }
  if (type.startsWith("audio/")) {
    return <audio controls src={url} className="w-full rounded-xl" />;
  }
  if (type.startsWith("video/")) {
    return <video controls src={url} className="w-full rounded-xl max-h-64" />;
  }
  if (type === "application/pdf") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-xl border border-amber-500/15 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
      >
        <FileText className="h-4 w-4" /> View attached PDF
      </a>
    );
  }
  return null;
}
