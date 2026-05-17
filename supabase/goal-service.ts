import { Goal } from "@/lib/types";
import { supabase } from "@/supabase/client";

export async function saveGoals(goals: Goal[]) {
  if (!supabase) {
    return { success: false, message: "Supabase is not configured. Goals are running in local demo mode." };
  }

  const { error } = await supabase.from("goals").upsert(goals);
  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Goals synced with Supabase." };
}
