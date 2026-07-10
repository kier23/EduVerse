import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/auth";

export type Subject = {
  id: string;
  subject_name: string | null;
  subject_code: string | null;
  description: string | null;
  teacher_id: string | null;
};

export type Activity = {
  id: string;
  title: string | null;
  instructions: string | null;
  due_date: string | null;
  points: number | null;
  type: string | null;
  subject_id: string;
  file_url: string | null;
};

export type Material = {
  id: string;
  title: string | null;
  description: string | null;
  file_url: string | null;
  subject_id: string | null;
};

export type EventItem = {
  id: string;
  title: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  event_type: string | null;
  subject_id: string | null;
};

type EnrollmentSubjectRow = {
  subject_id: Subject | Subject[] | null;
};

export type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
};

export type ActivityType = "quiz" | "exam" | "assignment" | "project";

export type QuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "short_answer"
  | "essay"
  | "matching"
  | "fill_blank"
  | "ordering"
  | "file_upload"
  | "image_choice"
  | "audio_response";

export type Quiz = {
  id: string;
  activity_id: string | null;
  time_limit: number | null;
  attempts_allowed: number | null;
  welcome_message: string | null;
  banner_url: string | null;
  created_at: string;
};

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  question: string | null;
  question_type: QuestionType | null;
  points: number | null;
  question_content: Record<string, unknown> | null;
  order_index?: number;
};

export type QuizChoice = {
  id: string;
  question_id: string;
  choice_text: string | null;
  is_correct: boolean | null;
  image_url?: string | null;
  order_index?: number;
};

export type QuizQuestionMedia = {
  id: string;
  question_id: string;
  file_url: string | null;
  file_type: string | null;
  uploaded_at: string | null;
};

export type QuizSettings = {
  theme?: string;
  primaryColor?: string;
  font?: string;
  showProgress?: boolean;
  questionCard?: boolean;
  logo?: string;
};

export type QuizAttempt = {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number | null;
  started_at: string | null;
  submitted_at: string;
  student?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
};

export type QuizAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text: string | null;
  uploaded_file_url: string | null;
};

export type QuizWithActivity = Quiz & {
  activity: {
    id: string;
    title: string | null;
    due_date: string | null;
    points: number | null;
    subject_id: string;
    type: string | null;
    subject?: { subject_name: string | null };
  } | null;
  question_count?: number;
  attempt_count?: number;
};

export type AccountRecord = UserProfile;

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  console.log("fetchUserProfile result", { data, error });
  if (error) throw error;
  if (!data) throw new Error("User profile not found.");
  return data as UserProfile;
}

export async function fetchAllAccounts() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AccountRecord[];
}

export async function updateAccountRole(userId: string, role: UserRole) {
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);
  if (error) throw error;
}

export async function upsertUserProfile(payload: {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
}) {
  const { error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function fetchTeacherSubjects(teacherId: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Subject[];
}

export async function fetchStudentSubjects(studentId?: string) {
  if (!studentId) {
    return [];
  }

  const { data, error } = await supabase
    .from("enrollments")
    .select("subject_id(*)")
    .eq("student_id", studentId)
    .order("enrolled_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as EnrollmentSubjectRow[])
    .flatMap((row) => row.subject_id ?? [])
    .filter((subject): subject is Subject => Boolean(subject));
}

export async function createSubject(payload: {
  teacher_id: string;
  subject_code: string;
  subject_name: string;
  description: string;
}) {
  const { data, error } = await supabase
    .from("subjects")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Subject;
}

export async function enrollStudentInSubject(
  studentId: string,
  classCode: string,
) {
  const normalizedCode = classCode.trim().toUpperCase();

  const { data: subjectData, error: subjectError } = await supabase
    .from("subjects")
    .select("id, subject_name")
    .eq("subject_code", normalizedCode)
    .single();

  if (subjectError || !subjectData) {
    throw new Error("Subject not found with that class code.");
  }

  const { data: existingEnrollment, error: existingError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("subject_id", subjectData.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingEnrollment) {
    throw new Error("You are already enrolled in this subject.");
  }

  const { error } = await supabase.from("enrollments").insert({
    student_id: studentId,
    subject_id: subjectData.id,
  });

  if (error) throw error;

  return subjectData as Pick<Subject, "id" | "subject_name">;
}

export async function fetchSubjectActivities(subjectId: string) {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("subject_id", subjectId)
    .order("due_date");
  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function fetchSubjectMaterials(subjectId: string) {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Material[];
}

export async function fetchCalendarEvents(userId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("created_by", userId)
    .order("start_date");
  if (error) throw error;
  return (data ?? []) as EventItem[];
}
// ─── Material CRUD ────────────────────────────────────────────────────────────

// Uploads the file to subject-files bucket under {subject_id}/materials/
// and inserts a row into the materials table.
export async function uploadMaterial(payload: {
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string;
  file: File;
}) {
  const ext = payload.file.name.split(".").pop();
  const filePath = `${payload.subject_id}/materials/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("subject-files")
    .upload(filePath, payload.file, { upsert: true });
  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage
    .from("subject-files")
    .getPublicUrl(filePath);

  const { error } = await supabase.from("materials").insert({
    subject_id: payload.subject_id,
    teacher_id: payload.teacher_id,
    title: payload.title,
    description: payload.description,
    file_url: urlData.publicUrl,
  });
  if (error) throw error;
}

export async function updateMaterial(
  materialId: string,
  payload: {
    title: string;
    description: string;
    file?: File;
    subject_id: string;
    old_file_url?: string | null;
    remove_file?: boolean;
  },
) {
  let file_url: string | undefined = undefined;

  if (payload.file) {
    // Delete old file from storage first
    if (payload.old_file_url) {
      const oldPath = extractStoragePath(payload.old_file_url, "subject-files");
      if (oldPath)
        await supabase.storage.from("subject-files").remove([oldPath]);
    }
    const ext = payload.file.name.split(".").pop();
    const filePath = `${payload.subject_id}/materials/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("subject-files")
      .upload(filePath, payload.file, { upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage
      .from("subject-files")
      .getPublicUrl(filePath);
    file_url = urlData.publicUrl;
  }

  const { error } = await supabase
    .from("materials")
    .update({
      title: payload.title,
      description: payload.description,
      ...(file_url !== undefined && { file_url }),
    })
    .eq("id", materialId);
  if (error) throw error;
}

export async function deleteMaterial(materialId: string) {
  // Fetch the file_url before deleting the row
  const { data } = await supabase
    .from("materials")
    .select("file_url")
    .eq("id", materialId)
    .single();

  if (data?.file_url) {
    const path = extractStoragePath(data.file_url, "subject-files");
    if (path) await supabase.storage.from("subject-files").remove([path]);
  }

  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId);
  if (error) throw error;
}

export async function createActivity(payload: {
  subject_id: string;
  teacher_id: string;
  title: string;
  instructions: string;
  type: string;
  due_date: string;
  points: number;
  file?: File;
}) {
  let file_url: string | null = null;

  if (payload.file) {
    const ext = payload.file.name.split(".").pop();
    const filePath = `${payload.subject_id}/activity/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("subject-files")
      .upload(filePath, payload.file, { upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage
      .from("subject-files")
      .getPublicUrl(filePath);
    file_url = urlData.publicUrl;
  }

  const { error } = await supabase.from("activities").insert({
    subject_id: payload.subject_id,
    teacher_id: payload.teacher_id,
    title: payload.title,
    instructions: payload.instructions,
    type: payload.type,
    due_date: payload.due_date,
    points: payload.points,
    file_url,
  });
  if (error) throw error;
}

export async function updateActivityRecord(
  activityId: string,
  payload: {
    title: string;
    instructions: string;
    due_date: string;
    points: number;
    file?: File;
    subject_id: string;
    old_file_url?: string | null;
    remove_file?: boolean;
  },
) {
  let file_url: string | undefined = undefined;

  if (payload.file) {
    if (payload.old_file_url) {
      const oldPath = extractStoragePath(payload.old_file_url, "subject-files");
      if (oldPath)
        await supabase.storage.from("subject-files").remove([oldPath]);
    }
    const ext = payload.file.name.split(".").pop();
    const filePath = `${payload.subject_id}/activity/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("subject-files")
      .upload(filePath, payload.file, { upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage
      .from("subject-files")
      .getPublicUrl(filePath);
    file_url = urlData.publicUrl;
  }

  const { error } = await supabase
    .from("activities")
    .update({
      title: payload.title,
      instructions: payload.instructions,
      due_date: payload.due_date,
      points: payload.points,
      ...(file_url !== undefined && { file_url }),
    })
    .eq("id", activityId);
  if (error) throw error;
}

export async function deleteActivity(activityId: string) {
  const { data } = await supabase
    .from("activities")
    .select("file_url")
    .eq("id", activityId)
    .single();

  if (data?.file_url) {
    const path = extractStoragePath(data.file_url, "subject-files");
    if (path) await supabase.storage.from("subject-files").remove([path]);
  }

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", activityId);
  if (error) throw error;
}

// Extracts the storage object path from a Supabase public URL.
// e.g. "https://.../storage/v1/object/public/subject-files/abc/materials/1.pdf"
//   → "abc/materials/1.pdf"
function extractStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const marker = `/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(publicUrl.slice(idx + marker.length));
  } catch {
    return null;
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function createEvent(payload: {
  created_by: string;
  subject_id: string | null;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  event_type: string;
}) {
  const { error } = await supabase.from("events").insert(payload);
  if (error) throw error;
}

export async function deleteEvent(eventId: string) {
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File) {
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("avatar")
    .upload(filePath, file, { upsert: true });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("avatar").getPublicUrl(filePath);

  return data.publicUrl;
}

export async function fetchTeacherQuizzes(
  teacherId: string,
): Promise<QuizWithActivity[]> {
  const { data, error } = await supabase
    .from("quizzes")
    .select(
      `
      *,
      activity:activities(
        id, title, due_date, points, subject_id, type,
        subject:subjects(subject_name)
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = ((data ?? []) as QuizWithActivity[]).filter(
    (q) => q.activity !== null,
  );

  const enriched = await Promise.all(
    rows.map(async (q) => {
      const [{ count: qCount }, { count: aCount }] = await Promise.all([
        supabase
          .from("quiz_questions")
          .select("*", { count: "exact", head: true })
          .eq("quiz_id", q.id),
        supabase
          .from("quiz_attempts")
          .select("*", { count: "exact", head: true })
          .eq("quiz_id", q.id),
      ]);
      return { ...q, question_count: qCount ?? 0, attempt_count: aCount ?? 0 };
    }),
  );

  const teacherActivityIds = await supabase
    .from("activities")
    .select("id")
    .eq("teacher_id", teacherId);

  if (teacherActivityIds.error) throw teacherActivityIds.error;
  const allowedIds = new Set((teacherActivityIds.data ?? []).map((a) => a.id));

  return enriched.filter((q) => q.activity && allowedIds.has(q.activity.id));
}

export async function fetchTeacherQuizzesByType(
  teacherId: string,
  activityType: ActivityType,
): Promise<QuizWithActivity[]> {
  const all = await fetchTeacherQuizzes(teacherId);
  return all.filter((q) => q.activity?.type === activityType);
}

export async function fetchQuizById(quizId: string): Promise<{
  quiz: Quiz;
  questions: (QuizQuestion & {
    choices: QuizChoice[];
    media: QuizQuestionMedia[];
  })[];
}> {
  const { data: quiz, error: qErr } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (qErr) throw qErr;

  const { data: questions, error: qqErr } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index");

  if (qqErr) throw qqErr;

  const enrichedQuestions = await Promise.all(
    (questions ?? []).map(async (q) => {
      const [{ data: choices }, { data: media }] = await Promise.all([
        supabase.from("quiz_choices").select("*").eq("question_id", q.id),
        supabase
          .from("quiz_question_media")
          .select("*")
          .eq("question_id", q.id),
      ]);
      return {
        ...q,
        choices: (choices ?? []) as QuizChoice[],
        media: (media ?? []) as QuizQuestionMedia[],
      };
    }),
  );

  return { quiz: quiz as Quiz, questions: enrichedQuestions };
}

export async function fetchQuizSettings(quizId: string): Promise<QuizSettings> {
  const { data, error } = await supabase
    .from("quiz_settings")
    .select("settings")
    .eq("quiz_id", quizId)
    .maybeSingle();

  if (error) throw error;
  return (data?.settings ?? {}) as QuizSettings;
}

export async function fetchQuizAttempts(
  quizId: string,
): Promise<QuizAttempt[]> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(
      `
      *,
      student:users(full_name, email, avatar_url)
    `,
    )
    .eq("quiz_id", quizId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as QuizAttempt[];
}

export async function fetchAttemptAnswers(
  attemptId: string,
): Promise<QuizAnswer[]> {
  const { data, error } = await supabase
    .from("quiz_answers")
    .select("*")
    .eq("attempt_id", attemptId);

  if (error) throw error;
  return (data ?? []) as QuizAnswer[];
}

// ─── Quiz Create / Update ─────────────────────────────────────────────────────

export async function createActivityAndQuiz(payload: {
  teacher_id: string;
  subject_id: string;
  title: string;
  instructions: string;
  due_date: string;
  points: number;
  activityType?: ActivityType;
}): Promise<{ activity_id: string; quiz_id: string }> {
  const { data: activity, error: actErr } = await supabase
    .from("activities")
    .insert({
      teacher_id: payload.teacher_id,
      subject_id: payload.subject_id,
      title: payload.title,
      instructions: payload.instructions,
      type: payload.activityType ?? "quiz",
      due_date: payload.due_date,
      points: payload.points,
    })
    .select()
    .single();

  if (actErr) throw actErr;

  const { data: quiz, error: qErr } = await supabase
    .from("quizzes")
    .insert({ activity_id: activity.id })
    .select()
    .single();

  if (qErr) throw qErr;

  return { activity_id: activity.id, quiz_id: quiz.id };
}

export async function updateActivity(
  activityId: string,
  payload: Partial<{
    title: string;
    instructions: string;
    due_date: string;
    points: number;
  }>,
) {
  const { error } = await supabase
    .from("activities")
    .update(payload)
    .eq("id", activityId);
  if (error) throw error;
}

export async function updateQuiz(
  quizId: string,
  payload: Partial<
    Pick<
      Quiz,
      "time_limit" | "attempts_allowed" | "welcome_message" | "banner_url"
    >
  >,
) {
  const { error } = await supabase
    .from("quizzes")
    .update(payload)
    .eq("id", quizId);
  if (error) throw error;
}

export async function upsertQuizSettings(
  quizId: string,
  settings: QuizSettings,
) {
  const { data: existing } = await supabase
    .from("quiz_settings")
    .select("id")
    .eq("quiz_id", quizId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("quiz_settings")
      .update({ settings })
      .eq("quiz_id", quizId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("quiz_settings")
      .insert({ quiz_id: quizId, settings });
    if (error) throw error;
  }
}

export async function upsertQuizQuestion(
  question: Omit<QuizQuestion, "id"> & { id?: string },
): Promise<QuizQuestion> {
  const isRealId = question.id && !question.id.startsWith("_new_");
  if (isRealId) {
    const { data, error } = await supabase
      .from("quiz_questions")
      .update({
        question: question.question,
        question_type: question.question_type,
        points: question.points,
        question_content: question.question_content,
        order_index: question.order_index ?? 0,
      })
      .eq("id", question.id)
      .select()
      .single();
    if (error) throw error;
    return data as QuizQuestion;
  } else {
    const { data, error } = await supabase
      .from("quiz_questions")
      .insert({
        quiz_id: question.quiz_id,
        question: question.question,
        question_type: question.question_type,
        points: question.points,
        question_content: question.question_content,
        order_index: question.order_index ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data as QuizQuestion;
  }
}

export async function reorderQuizQuestions(
  questions: Array<{ id: string; order_index: number }>,
): Promise<void> {
  await Promise.all(
    questions.map(({ id, order_index }) =>
      supabase.from("quiz_questions").update({ order_index }).eq("id", id),
    ),
  );
}

export async function upsertQuizChoices(
  questionId: string,
  choices: Array<{
    id?: string;
    choice_text: string;
    is_correct: boolean;
    image_url?: string;
  }>,
): Promise<QuizChoice[]> {
  await supabase.from("quiz_choices").delete().eq("question_id", questionId);

  if (choices.length === 0) return [];

  const { data, error } = await supabase
    .from("quiz_choices")
    .insert(choices.map((c) => ({ question_id: questionId, ...c })))
    .select();

  if (error) throw error;
  return (data ?? []) as QuizChoice[];
}

export async function deleteQuizQuestion(questionId: string) {
  await supabase
    .from("quiz_question_media")
    .delete()
    .eq("question_id", questionId);
  await supabase.from("quiz_choices").delete().eq("question_id", questionId);
  const { error } = await supabase
    .from("quiz_questions")
    .delete()
    .eq("id", questionId);
  if (error) throw error;
}

export async function deleteQuizWithActivity(quizId: string) {
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("activity_id")
    .eq("id", quizId)
    .single();

  if (quiz?.activity_id) {
    await supabase.from("activities").delete().eq("id", quiz.activity_id);
  }
}

// ─── Manual Grading ───────────────────────────────────────────────────────────

// Shape stored inside quiz_settings.settings.manualGrades
// { [attemptId]: { [questionId]: { points: number; feedback: string } } }
export type QuizManualGrades = Record<
  string, // attemptId
  Record<string, { points: number; feedback: string }> // questionId → grade
>;

/**
 * Reads all saved manual grades for a quiz from quiz_settings.settings.manualGrades.
 * Returns an empty object if none exist yet.
 */
export async function fetchManualGrades(
  quizId: string,
): Promise<QuizManualGrades> {
  const { data, error } = await supabase
    .from("quiz_settings")
    .select("settings")
    .eq("quiz_id", quizId)
    .maybeSingle();

  if (error) throw error;
  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  return (settings.manualGrades ?? {}) as QuizManualGrades;
}

/**
 * Saves a single manual grade for one question in one attempt.
 * Merges into the existing manualGrades blob in quiz_settings.settings,
 * then recalculates and writes the new total score to quiz_attempts.score.
 *
 * Score calculation:
 *   total = auto-graded pts (re-derived from answers vs correct choices/content)
 *           + sum of all saved manual pts for this attempt
 */
export async function saveManualGrade(payload: {
  quizId: string;
  attemptId: string;
  questionId: string;
  points: number; // points awarded (already clamped by caller)
  feedback: string;
  /** All questions for this quiz — needed to recalculate the full score */
  allQuestions: QuizQuestion[];
}): Promise<{ newTotalScore: number }> {
  const { quizId, attemptId, questionId, points, feedback, allQuestions } =
    payload;

  // 1. Load existing settings blob
  const { data: settingsRow, error: sErr } = await supabase
    .from("quiz_settings")
    .select("id, settings")
    .eq("quiz_id", quizId)
    .maybeSingle();

  if (sErr) throw sErr;

  const existingSettings = (settingsRow?.settings ?? {}) as Record<
    string,
    unknown
  >;
  const existingManualGrades = (existingSettings.manualGrades ??
    {}) as QuizManualGrades;

  // 2. Merge this grade in
  const updatedManualGrades: QuizManualGrades = {
    ...existingManualGrades,
    [attemptId]: {
      ...(existingManualGrades[attemptId] ?? {}),
      [questionId]: { points, feedback },
    },
  };

  const updatedSettings = {
    ...existingSettings,
    manualGrades: updatedManualGrades,
  };

  // 3. Upsert settings
  if (settingsRow?.id) {
    const { error } = await supabase
      .from("quiz_settings")
      .update({ settings: updatedSettings })
      .eq("quiz_id", quizId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("quiz_settings")
      .insert({ quiz_id: quizId, settings: updatedSettings });
    if (error) throw error;
  }

  // 4. Re-derive auto-graded score for this attempt
  //    Fetch all answers for the attempt + all choices for auto-gradable questions
  const MANUAL_TYPES = new Set(["essay", "file_upload", "audio_response"]);

  const { data: answers, error: aErr } = await supabase
    .from("quiz_answers")
    .select("question_id, answer_text")
    .eq("attempt_id", attemptId);

  if (aErr) throw aErr;

  const answerMap = Object.fromEntries(
    (answers ?? []).map((a) => [a.question_id, a.answer_text ?? ""]),
  );

  let autoScore = 0;

  for (const q of allQuestions) {
    if (MANUAL_TYPES.has(q.question_type ?? "")) continue;
    const ans = answerMap[q.id] ?? "";
    const pts = q.points ?? 0;
    const content = (q.question_content ?? {}) as Record<string, unknown>;

    if (
      q.question_type === "multiple_choice" ||
      q.question_type === "image_choice"
    ) {
      // Fetch correct choice for this question
      const { data: choices } = await supabase
        .from("quiz_choices")
        .select("choice_text, is_correct")
        .eq("question_id", q.id);
      const correct =
        (choices ?? []).find((c) => c.is_correct)?.choice_text ?? "";
      if (ans === correct) autoScore += pts;
    } else if (q.question_type === "multiple_select") {
      const { data: choices } = await supabase
        .from("quiz_choices")
        .select("choice_text, is_correct")
        .eq("question_id", q.id);
      const correctSet = new Set(
        (choices ?? []).filter((c) => c.is_correct).map((c) => c.choice_text),
      );
      // answer_text is stored as comma-joined; split to compare
      const selected = ans.split(", ").filter(Boolean);
      const isCorrect =
        selected.length === correctSet.size &&
        selected.every((s: any) => correctSet.has(s));
      if (isCorrect) autoScore += pts;
    } else if (q.question_type === "true_false") {
      const correct = String(content.correct_answer ?? "");
      if (ans === correct) autoScore += pts;
    } else if (q.question_type === "short_answer") {
      const sample = String(content.sample_answer ?? "")
        .toLowerCase()
        .trim();
      if (sample && ans.toLowerCase().trim() === sample) autoScore += pts;
    } else if (
      q.question_type === "ordering" ||
      q.question_type === "matching" ||
      q.question_type === "fill_blank"
    ) {
      // These require full comparison — skip for now; teacher can manually adjust
    }
  }

  // 5. Sum all saved manual points for this attempt (including the one just saved)
  const attemptManualGrades = updatedManualGrades[attemptId] ?? {};
  const manualScore = Object.values(attemptManualGrades).reduce(
    (sum, g) => sum + (g.points ?? 0),
    0,
  );

  const newTotalScore = autoScore + manualScore;

  // 6. Write new total to quiz_attempts.score
  const { error: uErr } = await supabase
    .from("quiz_attempts")
    .update({ score: newTotalScore })
    .eq("id", attemptId);

  if (uErr) throw uErr;

  return { newTotalScore };
}

// ─── Media Upload ─────────────────────────────────────────────────────────────

export async function uploadQuizMedia(
  quizId: string,
  questionId: string,
  file: File,
): Promise<QuizQuestionMedia> {
  const ext = file.name.split(".").pop();
  const filePath = `${quizId}/${questionId}/attachment-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("quiz-media")
    .upload(filePath, file, { upsert: true });

  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage
    .from("quiz-media")
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from("quiz_question_media")
    .insert({
      question_id: questionId,
      file_url: urlData.publicUrl,
      file_type: file.type,
    })
    .select()
    .single();

  if (error) throw error;
  return data as QuizQuestionMedia;
}

export async function uploadQuizChoiceImage(
  quizId: string,
  questionId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop();
  const filePath = `${quizId}/${questionId}/image-choices/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("quiz-media")
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("quiz-media").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadQuizBanner(
  quizId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop();
  const filePath = `${quizId}/banner.${ext}`;

  const { error } = await supabase.storage
    .from("quiz-media")
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("quiz-media").getPublicUrl(filePath);
  return data.publicUrl;
}

// ─── Enrollment types & functions ────────────────────────────────────────────
// Add these to eduverse.ts

export type EnrolledStudent = {
  enrollment_id: string;
  enrolled_at: string | null;
  student: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
};

/**
 * Fetches all students enrolled in a subject, joined with their user profile.
 */
export async function fetchEnrolledStudents(
  subjectId: string,
): Promise<EnrolledStudent[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `
      id,
      enrolled_at,
      student_id (
        id,
        full_name,
        email,
        avatar_url
      )
    `,
    )
    .eq("subject_id", subjectId)
    .order("enrolled_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => ({
    enrollment_id: row.id,
    enrolled_at: row.enrolled_at,
    student: row.student_id,
  }));
}

/**
 * Removes a student's enrollment from a subject by enrollment row id.
 */
export async function unenrollStudent(enrollmentId: string): Promise<void> {
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("id", enrollmentId);
  if (error) throw error;
}

export async function deleteAccount(userId: string): Promise<void> {
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) throw error;
}
