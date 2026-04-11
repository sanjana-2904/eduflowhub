import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { quiz_id, answers } = body;

    if (!quiz_id || typeof quiz_id !== "string") {
      return new Response(JSON.stringify({ error: "quiz_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!answers || typeof answers !== "object") {
      return new Response(JSON.stringify({ error: "answers object is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if already submitted
    const { data: existing } = await serviceClient
      .from("results")
      .select("id")
      .eq("quiz_id", quiz_id)
      .eq("student_id", userId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Quiz already submitted" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get quiz and verify it exists
    const { data: quiz } = await serviceClient
      .from("quizzes")
      .select("id, lesson_id")
      .eq("id", quiz_id)
      .single();

    if (!quiz) {
      return new Response(JSON.stringify({ error: "Quiz not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify student is enrolled in the course
    const { data: lesson } = await serviceClient
      .from("lessons")
      .select("course_id")
      .eq("id", quiz.lesson_id)
      .single();

    if (!lesson) {
      return new Response(JSON.stringify({ error: "Lesson not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: enrollment } = await serviceClient
      .from("enrollments")
      .select("id")
      .eq("student_id", userId)
      .eq("course_id", lesson.course_id)
      .eq("status", "active")
      .maybeSingle();

    if (!enrollment) {
      return new Response(JSON.stringify({ error: "Not enrolled in this course" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch correct answers server-side
    const { data: questions } = await serviceClient
      .from("quiz_questions")
      .select("id, correct_answer")
      .eq("quiz_id", quiz_id);

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ error: "No questions found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate score server-side
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) correct++;
    });
    const score = questions.length > 0 ? (correct / questions.length) * 100 : 0;

    // Build answers array for storage
    const answersArray = Object.entries(answers).map(([qid, ans]) => ({
      question_id: qid,
      answer: ans,
    }));

    // Insert result
    const { data: result, error: insertErr } = await serviceClient
      .from("results")
      .insert({
        quiz_id,
        student_id: userId,
        score,
        answers: answersArray,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save result" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, score, result_id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
