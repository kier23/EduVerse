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

export type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
};

export type AccountRecord = UserProfile;

export async function fetchUserProfile(userId: string) {
  console.log("fetchUserProfile start", { userId });
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

export async function fetchStudentSubjects() {
  const { data, error } = await supabase.from("subjects").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as Subject[];
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
