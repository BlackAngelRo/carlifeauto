// ============================================================
// SUPABASE CONFIGURATION
// ============================================================
// Fill these in with your own project's values, found in:
// Supabase dashboard -> Project Settings -> API
//
// SUPABASE_URL     -> "Project URL"
// SUPABASE_ANON_KEY -> "anon public" key
//
// It's safe to expose the anon key in front-end code like this --
// it only has the permissions you grant it via Row Level Security
// (RLS) policies on the database. Do NOT use the "service_role" key
// here, that one bypasses RLS and must never be public.
// ============================================================

const SUPABASE_URL = "https://lbrrhqpiaiblwgvrxkri.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_toLfnrZO7DNogxKVJ6m39Q_47eqFqZ5";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
