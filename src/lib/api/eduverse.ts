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

export type AccountRecord = UserProfile;

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
  console.log("fetchUserProfile result", { data, error });
  if (error) throw error;
  if (!data) throw new Error("User profile not found.");
  return data as UserProfile;
}

export async function fetchAllAccounts() {
  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AccountRecord[];
}

export async function updateAccountRole(userId: string, role: UserRole) {
  const { error } = await supabase.from("users").update({ role }).eq("id", userId);
  if (error) throw error;
}

export async function upsertUserProfile(payload: {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
}) {
  const { error } = await supabase.from("users").upsert(payload, { onConflict: "id" });
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
  const { data, error } = await supabase.from("subjects").insert(payload).select().single();
  if (error) throw error;
  return data as Subject;
}

export async function enrollStudentInSubject(studentId: string, classCode: string) {
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

export async function createActivity(payload: {
  subject_id: string;
  teacher_id: string;
  title: string;
  instructions: string;
  type: string;
  due_date: string;
  points: number;
}) {
  const { error } = await supabase.from("activities").insert(payload);
  if (error) throw error;
}

export async function uploadMaterial(payload: {
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string;
  file_url: string;
}) {
  const { error } = await supabase.from("materials").insert(payload);
  if (error) throw error;
}

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
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId);

  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File) {
  const fileExt = file.name.split(".").pop();
  const filePath =
  `${userId}/avatar-${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("avatar")
    .upload(filePath, file, {
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("avatar")
    .getPublicUrl(filePath);

  return data.publicUrl;
}