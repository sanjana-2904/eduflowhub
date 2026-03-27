import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Users, Trash2, Edit, FileText } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Tables<'courses'>[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Tables<'lessons'>[]>([]);
  const [quizzes, setQuizzes] = useState<Tables<'quizzes'>[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});

  // Course form
  const [courseDialog, setCourseDialog] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', price: '0', category: '' });
  const [editingCourse, setEditingCourse] = useState<string | null>(null);

  // Lesson form
  const [lessonDialog, setLessonDialog] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', content_type: 'text', content_url: '', content_text: '' });

  // Quiz form
  const [quizDialog, setQuizDialog] = useState(false);
  const [quizForm, setQuizForm] = useState({ title: '', lesson_id: '' });
  const [questionForm, setQuestionForm] = useState({ question: '', options: ['', '', '', ''], correct_answer: 0 });
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Tables<'quiz_questions'>[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchCourses();
  }, [user]);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons(selectedCourse);
      fetchQuizzes(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').eq('instructor_id', user!.id).order('created_at', { ascending: false });
    setCourses(data || []);
    if (data) {
      const counts: Record<string, number> = {};
      for (const c of data) {
        const { count } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', c.id);
        counts[c.id] = count || 0;
      }
      setEnrollmentCounts(counts);
    }
  };

  const fetchLessons = async (courseId: string) => {
    const { data } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('sort_order');
    setLessons(data || []);
  };

  const fetchQuizzes = async (courseId: string) => {
    const { data: lsns } = await supabase.from('lessons').select('id').eq('course_id', courseId);
    if (lsns && lsns.length > 0) {
      const { data } = await supabase.from('quizzes').select('*').in('lesson_id', lsns.map(l => l.id));
      setQuizzes(data || []);
    } else {
      setQuizzes([]);
    }
  };

  const saveCourse = async () => {
    if (!user) return;
    const payload = { title: courseForm.title, description: courseForm.description, price: Number(courseForm.price), category: courseForm.category, instructor_id: user.id };
    if (editingCourse) {
      await supabase.from('courses').update(payload).eq('id', editingCourse);
    } else {
      await supabase.from('courses').insert(payload);
    }
    toast({ title: editingCourse ? 'Course updated' : 'Course created' });
    setCourseDialog(false);
    setCourseForm({ title: '', description: '', price: '0', category: '' });
    setEditingCourse(null);
    fetchCourses();
  };

  const deleteCourse = async (id: string) => {
    await supabase.from('courses').delete().eq('id', id);
    toast({ title: 'Course deleted' });
    if (selectedCourse === id) setSelectedCourse(null);
    fetchCourses();
  };

  const saveLesson = async () => {
    if (!selectedCourse) return;
    const payload = { ...lessonForm, course_id: selectedCourse, sort_order: lessons.length };
    await supabase.from('lessons').insert(payload);
    toast({ title: 'Lesson added' });
    setLessonDialog(false);
    setLessonForm({ title: '', content_type: 'text', content_url: '', content_text: '' });
    fetchLessons(selectedCourse);
  };

  const deleteLesson = async (id: string) => {
    await supabase.from('lessons').delete().eq('id', id);
    toast({ title: 'Lesson deleted' });
    if (selectedCourse) fetchLessons(selectedCourse);
  };

  const saveQuiz = async () => {
    if (!quizForm.lesson_id) return;
    const { data } = await supabase.from('quizzes').insert({ title: quizForm.title, lesson_id: quizForm.lesson_id }).select().single();
    if (data) {
      setEditingQuiz(data.id);
      toast({ title: 'Quiz created. Now add questions.' });
      setQuizDialog(false);
      if (selectedCourse) fetchQuizzes(selectedCourse);
    }
  };

  const addQuestion = async () => {
    if (!editingQuiz) return;
    await supabase.from('quiz_questions').insert({
      quiz_id: editingQuiz,
      question: questionForm.question,
      options: questionForm.options,
      correct_answer: questionForm.correct_answer,
      sort_order: quizQuestions.length,
    });
    setQuestionForm({ question: '', options: ['', '', '', ''], correct_answer: 0 });
    const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', editingQuiz).order('sort_order');
    setQuizQuestions(data || []);
    toast({ title: 'Question added' });
  };

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold font-display">Instructor Dashboard</h1>
          <Dialog open={courseDialog} onOpenChange={setCourseDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground border-0 gap-2" onClick={() => { setEditingCourse(null); setCourseForm({ title: '', description: '', price: '0', category: '' }); }}>
                <Plus className="h-4 w-4" /> New Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingCourse ? 'Edit Course' : 'Create Course'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Title</Label><Input value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Price (₹)</Label><Input type="number" value={courseForm.price} onChange={e => setCourseForm(f => ({ ...f, price: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Category</Label><Input value={courseForm.category} onChange={e => setCourseForm(f => ({ ...f, category: e.target.value }))} /></div>
                </div>
                <Button onClick={saveCourse} className="w-full">{editingCourse ? 'Update' : 'Create'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Course list */}
          <div className="space-y-4">
            <h2 className="font-semibold font-display text-lg">My Courses</h2>
            {courses.map(c => (
              <Card key={c.id} className={`cursor-pointer transition-all ${selectedCourse === c.id ? 'ring-2 ring-primary' : 'hover:shadow-card'}`}
                onClick={() => setSelectedCourse(c.id)}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.category} · ₹{c.price}</p>
                      <p className="text-xs text-muted-foreground mt-1"><Users className="inline h-3 w-3" /> {enrollmentCounts[c.id] || 0} enrolled</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingCourse(c.id); setCourseForm({ title: c.title, description: c.description || '', price: String(c.price), category: c.category || '' }); setCourseDialog(true); }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteCourse(c.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {courses.length === 0 && <p className="text-muted-foreground text-sm">No courses yet.</p>}
          </div>

          {/* Course detail */}
          {selectedCourse && (
            <div className="lg:col-span-2 space-y-6">
              {/* Lessons */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-display text-lg">Lessons</h2>
                  <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1"><Plus className="h-3 w-3" /> Add Lesson</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2"><Label>Title</Label><Input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} /></div>
                        <div className="space-y-2">
                          <Label>Content Type</Label>
                          <Select value={lessonForm.content_type} onValueChange={v => setLessonForm(f => ({ ...f, content_type: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="pdf">PDF</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {lessonForm.content_type !== 'text' && (
                          <div className="space-y-2"><Label>Content URL</Label><Input value={lessonForm.content_url} onChange={e => setLessonForm(f => ({ ...f, content_url: e.target.value }))} /></div>
                        )}
                        {lessonForm.content_type === 'text' && (
                          <div className="space-y-2"><Label>Content</Label><Textarea rows={6} value={lessonForm.content_text} onChange={e => setLessonForm(f => ({ ...f, content_text: e.target.value }))} /></div>
                        )}
                        <Button onClick={saveLesson} className="w-full">Add Lesson</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-2">
                  {lessons.map((l, i) => (
                    <Card key={l.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">{i + 1}.</span>
                          <div>
                            <p className="font-medium text-sm">{l.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{l.content_type}</p>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => deleteLesson(l.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {lessons.length === 0 && <p className="text-sm text-muted-foreground">No lessons yet.</p>}
                </div>
              </div>

              {/* Quizzes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-display text-lg">Quizzes</h2>
                  <Dialog open={quizDialog} onOpenChange={setQuizDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1" disabled={lessons.length === 0}>
                        <Plus className="h-3 w-3" /> Add Quiz
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Create Quiz</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2"><Label>Title</Label><Input value={quizForm.title} onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))} /></div>
                        <div className="space-y-2">
                          <Label>Lesson</Label>
                          <Select value={quizForm.lesson_id} onValueChange={v => setQuizForm(f => ({ ...f, lesson_id: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select lesson" /></SelectTrigger>
                            <SelectContent>
                              {lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={saveQuiz} className="w-full">Create Quiz</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {quizzes.map(q => (
                    <Card key={q.id} className={`cursor-pointer ${editingQuiz === q.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => {
                        setEditingQuiz(q.id);
                        supabase.from('quiz_questions').select('*').eq('quiz_id', q.id).order('sort_order').then(({ data }) => setQuizQuestions(data || []));
                      }}>
                      <CardContent className="py-3">
                        <p className="font-medium text-sm">{q.title}</p>
                      </CardContent>
                    </Card>
                  ))}
                  {quizzes.length === 0 && <p className="text-sm text-muted-foreground">No quizzes yet.</p>}
                </div>

                {/* Question editor */}
                {editingQuiz && (
                  <Card className="mt-4">
                    <CardHeader><CardTitle className="text-base">Quiz Questions</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {quizQuestions.map((q, i) => (
                        <div key={q.id} className="p-3 bg-secondary rounded-lg">
                          <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {(q.options as string[]).map((o, oi) => (
                              <span key={oi} className={oi === q.correct_answer ? 'text-success font-medium' : ''}>
                                {String(o)}{oi < (q.options as string[]).length - 1 ? ' · ' : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-4 space-y-3">
                        <Input placeholder="Question" value={questionForm.question} onChange={e => setQuestionForm(f => ({ ...f, question: e.target.value }))} />
                        {questionForm.options.map((o, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input placeholder={`Option ${i + 1}`} value={o} onChange={e => {
                              const opts = [...questionForm.options];
                              opts[i] = e.target.value;
                              setQuestionForm(f => ({ ...f, options: opts }));
                            }} />
                            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                              <input type="radio" name="correct" checked={questionForm.correct_answer === i}
                                onChange={() => setQuestionForm(f => ({ ...f, correct_answer: i }))} />
                              Correct
                            </label>
                          </div>
                        ))}
                        <Button size="sm" onClick={addQuestion} disabled={!questionForm.question}>Add Question</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
