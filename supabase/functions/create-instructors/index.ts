import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const instructors = [
  { email: "rahuls@eduflow.com", password: "rahul#123", first_name: "Rahul", last_name: "Sharma", qualification: "M.Tech Computer Science" },
  { email: "priyap@eduflow.com", password: "priya#123", first_name: "Priya", last_name: "Patel", qualification: "Ph.D. Data Science" },
  { email: "amitv@eduflow.com", password: "amit#123", first_name: "Amit", last_name: "Verma", qualification: "M.Sc. Mathematics" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Delete old seeded profile records that have no real auth user
    const { data: oldProfiles } = await supabase
      .from("profiles")
      .select("user_id, email")
      .eq("role", "instructor");

    if (oldProfiles) {
      for (const p of oldProfiles) {
        const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id);
        if (!authUser?.user) {
          // Orphan profile - delete it
          await supabase.from("user_roles").delete().eq("user_id", p.user_id);
          await supabase.from("profiles").delete().eq("user_id", p.user_id);
        }
      }
    }

    const results = [];

    for (const inst of instructors) {
      // Check if already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === inst.email);

      if (existing) {
        results.push({ email: inst.email, status: "already exists" });
        continue;
      }

      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: inst.email,
        password: inst.password,
        email_confirm: true,
        user_metadata: {
          first_name: inst.first_name,
          last_name: inst.last_name,
          qualification: inst.qualification,
          role: "instructor",
        },
      });

      if (error) {
        results.push({ email: inst.email, status: "error", message: error.message });
      } else {
        // Reassign courses from old orphan instructor to new user
        // Update courses that have no valid instructor
        results.push({ email: inst.email, status: "created", user_id: newUser.user.id });
      }
    }

    return new Response(JSON.stringify({ message: "Instructors processed", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
