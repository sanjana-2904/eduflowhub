import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

export default function LessonView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<Tables<'lessons'> | null>(null);
  const [quiz, setQuiz] = useState<Tables<'quizzes'> | null>(null);
  const [questions, setQuestions] = useState<Tables<'quiz_questions'>[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [existingResult, setExistingResult] = useState<Tables<'results'> | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data: l } = await supabase.from('lessons').select('*').eq('id', id).single();
      setLesson(l);
      if (!l) return;

      const { data: q } = await supabase.from('quizzes').select('*').eq('lesson_id', id).maybeSingle();
      setQuiz(q);
      if (q) {
        const { data: qs } = await supabase.from('quiz_questions').select('*').eq('quiz_id', q.id).order('sort_order');
        setQuestions(qs || []);

        if (user) {
          const { data: r } = await supabase.from('results')
            .select('*').eq('quiz_id', q.id).eq('student_id', user.id).maybeSingle();
          if (r) {
            setExistingResult(r);
            setScore(r.score);
            setSubmitted(true);
          }
        }
      }
    };
    fetch();
  }, [id, user]);

  const handleSubmitQuiz = async () => {
    if (!quiz || !user) return;
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correct++;
    });
    const pct = questions.length > 0 ? (correct / questions.length) * 100 : 0;

    const { error } = await supabase.from('results').insert({
      quiz_id: quiz.id, student_id: user.id, score: pct,
      answers: Object.entries(answers).map(([qid, ans]) => ({ question_id: qid, answer: ans })),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setScore(pct);
    setSubmitted(true);
    toast({ title: `Quiz completed! Score: ${pct.toFixed(0)}%` });
  };

  if (!lesson) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></Layout>;

  return (
    <Layout>
      <div className="container py-10 max-w-4xl">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <h1 className="text-3xl font-bold font-display mb-6">{lesson.title}</h1>

        {/* Lesson content */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {lesson.content_type === 'video' && lesson.content_url && (
              <div className="aspect-video">
                <iframe src={lesson.content_url} className="w-full h-full rounded-lg" allowFullScreen />
              </div>
            )}
            {lesson.content_type === 'pdf' && lesson.content_url && (
              <iframe src={lesson.content_url} className="w-full h-[600px] rounded-lg" />
            )}
            {lesson.content_type === 'text' && (
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{lesson.content_text}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quiz */}
        {quiz && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                📝 {quiz.title}
                {submitted && score !== null && (
                  <span className={`ml-auto text-lg ${score >= 50 ? 'text-success' : 'text-destructive'}`}>
                    Score: {score.toFixed(0)}%
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((q, i) => {
                const opts = Array.isArray(q.options) ? q.options as string[] : [];
                return (
                  <div key={q.id} className="space-y-3">
                    <p className="font-medium">{i + 1}. {q.question}</p>
                    <RadioGroup
                      value={String(answers[q.id] ?? '')}
                      onValueChange={v => setAnswers(a => ({ ...a, [q.id]: Number(v) }))}
                      disabled={submitted}
                    >
                      {opts.map((opt, oi) => (
                        <div key={oi} className={`flex items-center space-x-2 p-2 rounded-lg ${
                          submitted
                            ? oi === q.correct_answer
                              ? 'bg-success/10'
                              : answers[q.id] === oi
                              ? 'bg-destructive/10'
                              : ''
                            : 'hover:bg-secondary'
                        }`}>
                          <RadioGroupItem value={String(oi)} id={`${q.id}-${oi}`} />
                          <Label htmlFor={`${q.id}-${oi}`} className="flex-1 cursor-pointer">{String(opt)}</Label>
                          {submitted && oi === q.correct_answer && <CheckCircle className="h-4 w-4 text-success" />}
                          {submitted && answers[q.id] === oi && oi !== q.correct_answer && <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                );
              })}
              {!submitted && questions.length > 0 && (
                <Button className="gradient-primary text-primary-foreground border-0" onClick={handleSubmitQuiz}
                  disabled={Object.keys(answers).length < questions.length}>
                  Submit Quiz
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
