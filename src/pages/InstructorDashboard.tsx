import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Users, Trash2, Edit, FileText, Download, Eye } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Tables } from '@/integrations/supabase/types';
import jsPDF from 'jspdf';

type StudentQuizResult = { quiz_title: string; score: number; date: string };
type EnrolledStudent = { student_id: string; enrollment_date: string; profiles: { first_name: string; last_name: string; email: string } | null; payment_status: string | null; payment_date: string | null; razorpay_payment_id: string | null; course_price: number; completion_percent: number; completed_lessons: number; total_lessons: number; quiz_results: StudentQuizResult[] };
type QuizResult = { score: number; created_at: string; student_id: string; profiles: { first_name: string; last_name: string; email: string } | null };

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Tables<'courses'>[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Tables<'lessons'>[]>([]);
  const [quizzes, setQuizzes] = useState<Tables<'quizzes'>[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});

  // Enrolled students
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [studentsDialog, setStudentsDialog] = useState(false);

  // Quiz results
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [resultsDialog, setResultsDialog] = useState(false);
  const [resultsQuizTitle, setResultsQuizTitle] = useState('');

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

  useEffect(() => { if (user) fetchCourses(); }, [user]);

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

  const viewEnrolledStudents = async (courseId: string) => {
    const { data: enrollments } = await supabase.from('enrollments').select('student_id, enrollment_date').eq('course_id', courseId);
    const studentIds = (enrollments || []).map(e => e.student_id);

    // Fetch profiles for enrolled students
    let profilesMap = new Map<string, { first_name: string; last_name: string; email: string }>();
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, first_name, last_name, email').in('user_id', studentIds);
      if (profiles) {
        for (const p of profiles) {
          profilesMap.set(p.user_id, { first_name: p.first_name, last_name: p.last_name, email: p.email });
        }
      }
    }
    const data = (enrollments || []).map(e => ({ ...e, profiles: profilesMap.get(e.student_id) || null }));
    const course = courses.find(c => c.id === courseId);
    const coursePrice = Number(course?.price || 0);

    // Fetch payments for this course
    const { data: payments } = await supabase.from('payments').select('*').eq('course_id', courseId);
    const paymentMap = new Map<string, { payment_status: string; created_at: string; razorpay_payment_id: string | null }>();
    if (payments) {
      for (const p of payments) {
        if (!paymentMap.has(p.student_id) || p.payment_status === 'paid' || p.payment_status === 'captured') {
          paymentMap.set(p.student_id, { payment_status: p.payment_status, created_at: p.created_at, razorpay_payment_id: p.razorpay_payment_id });
        }
      }
    }

    // Fetch lessons for this course
    const { data: courseLessons } = await supabase.from('lessons').select('id').eq('course_id', courseId);
    const lessonIds = (courseLessons || []).map(l => l.id);
    const totalLessons = lessonIds.length;

    // Fetch lesson progress for all students in this course
    let progressData: any[] = [];
    if (lessonIds.length > 0) {
      const { data: lp } = await supabase.from('lesson_progress').select('student_id, lesson_id, completed').in('lesson_id', lessonIds);
      progressData = lp || [];
    }

    // Fetch quizzes for this course
    let courseQuizzes: { id: string; title: string }[] = [];
    if (lessonIds.length > 0) {
      const { data: qz } = await supabase.from('quizzes').select('id, title').in('lesson_id', lessonIds);
      courseQuizzes = qz || [];
    }

    // Fetch quiz results for all students
    let allResults: any[] = [];
    if (courseQuizzes.length > 0) {
      const { data: res } = await supabase.from('results').select('student_id, quiz_id, score, created_at').in('quiz_id', courseQuizzes.map(q => q.id));
      allResults = res || [];
    }
    const quizMap = new Map(courseQuizzes.map(q => [q.id, q.title]));

    const enriched = (data || []).map((s: any) => {
      const payment = paymentMap.get(s.student_id);
      const completedLessons = progressData.filter(p => p.student_id === s.student_id && p.completed).length;
      const completionPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const studentQuizResults: StudentQuizResult[] = allResults
        .filter(r => r.student_id === s.student_id)
        .map(r => ({ quiz_title: quizMap.get(r.quiz_id) || 'Quiz', score: r.score, date: r.created_at }));

      return {
        ...s,
        course_price: coursePrice,
        payment_status: coursePrice === 0 ? 'Free' : (payment?.payment_status === 'paid' || payment?.payment_status === 'captured' ? 'Paid' : 'Pending'),
        payment_date: payment?.created_at || null,
        razorpay_payment_id: payment?.razorpay_payment_id || null,
        completion_percent: completionPercent,
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        quiz_results: studentQuizResults,
      };
    });
    setEnrolledStudents(enriched);
    setStudentsDialog(true);
  };

  const viewQuizResults = async (quizId: string, quizTitle: string) => {
    const { data: rawResults } = await supabase.from('results').select('score, created_at, student_id').eq('quiz_id', quizId).order('created_at', { ascending: false });
    const resultStudentIds = [...new Set((rawResults || []).map(r => r.student_id))];
    let resultProfilesMap = new Map<string, { first_name: string; last_name: string; email: string }>();
    if (resultStudentIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('user_id, first_name, last_name, email').in('user_id', resultStudentIds);
      if (profs) profs.forEach(p => resultProfilesMap.set(p.user_id, { first_name: p.first_name, last_name: p.last_name, email: p.email }));
    }
    const data = (rawResults || []).map(r => ({ ...r, profiles: resultProfilesMap.get(r.student_id) || null }));
    setQuizResults(data || []);
    setResultsQuizTitle(quizTitle);
    setResultsDialog(true);
  };

  const exportResults = () => {
    const csv = ['Student Name,Email,Score,Date',
      ...quizResults.map(r => `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''},${r.profiles?.email || ''},${r.score}%,${new Date(r.created_at).toLocaleDateString()}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${resultsQuizTitle}-results.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const issueCertificate = (studentName: string, courseName: string) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(44, 62, 80); doc.setLineWidth(3); doc.rect(10, 10, w - 20, h - 20);
    doc.setDrawColor(52, 152, 219); doc.setLineWidth(1); doc.rect(15, 15, w - 30, h - 30);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(52, 152, 219);
    doc.text('EDUFLOW', w / 2, 35, { align: 'center' });
    doc.setFontSize(36); doc.setTextColor(44, 62, 80);
    doc.text('Certificate of Completion', w / 2, 55, { align: 'center' });
    doc.setDrawColor(52, 152, 219); doc.setLineWidth(0.5); doc.line(w / 2 - 60, 60, w / 2 + 60, 60);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(100, 100, 100);
    doc.text('This is to certify that', w / 2, 78, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.setTextColor(44, 62, 80);
    doc.text(studentName || 'Student', w / 2, 95, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(100, 100, 100);
    doc.text('has successfully completed the course', w / 2, 112, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(52, 152, 219);
    doc.text(courseName, w / 2, 128, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, w / 2, 148, { align: 'center' });
    doc.setDrawColor(200, 200, 200); doc.line(w / 2 - 40, 165, w / 2 + 40, 165);
    doc.setFontSize(10); doc.text('EduFlow E-Learning Platform', w / 2, 172, { align: 'center' });
    doc.save(`Certificate_${(studentName || 'student').replace(/\s+/g, '_')}_${courseName.replace(/\s+/g, '_')}.pdf`);
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
      quiz_id: editingQuiz, question: questionForm.question,
      options: questionForm.options, correct_answer: questionForm.correct_answer, sort_order: quizQuestions.length,
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
                      <button className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); viewEnrolledStudents(c.id); }}>
                        <Users className="inline h-3 w-3" /> {enrollmentCounts[c.id] || 0} enrolled — View
                      </button>
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
                      <CardContent className="flex items-center justify-between py-3">
                        <p className="font-medium text-sm">{q.title}</p>
                        <Button size="sm" variant="outline" className="gap-1" onClick={(e) => { e.stopPropagation(); viewQuizResults(q.id, q.title); }}>
                          <Eye className="h-3 w-3" /> Results
                        </Button>
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

        {/* Enrolled Students Dialog */}
        <Dialog open={studentsDialog} onOpenChange={setStudentsDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Enrolled Students</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {enrolledStudents.map((s, i) => (
                <Card key={i}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{s.profiles?.first_name} {s.profiles?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{s.profiles?.email}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <Badge variant={s.payment_status === 'Paid' ? 'default' : s.payment_status === 'Free' ? 'secondary' : 'destructive'} className="capitalize text-xs">
                            {s.payment_status}
                          </Badge>
                          {s.payment_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(s.payment_date).toLocaleDateString()} {new Date(s.payment_date).toLocaleTimeString()}
                            </p>
                          )}
                          {s.razorpay_payment_id && (
                            <p className="text-xs text-muted-foreground font-mono">
                              ID: {s.razorpay_payment_id}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">{new Date(s.enrollment_date).toLocaleDateString()}</Badge>
                      </div>
                    </div>

                    {/* Course Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Course Progress</span>
                        <span className="font-medium">{s.completed_lessons}/{s.total_lessons} lessons · {s.completion_percent}%</span>
                      </div>
                      <Progress value={s.completion_percent} className="h-2" />
                    </div>

                    {/* Quiz Results */}
                    {s.quiz_results.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Quiz Results</p>
                        <div className="flex flex-wrap gap-2">
                          {s.quiz_results.map((qr, qi) => (
                            <Badge key={qi} variant={qr.score >= 50 ? 'default' : 'destructive'} className="text-xs">
                              {qr.quiz_title}: {qr.score}%
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.quiz_results.length === 0 && s.total_lessons > 0 && (
                      <p className="text-xs text-muted-foreground italic">No quiz attempts yet</p>
                    )}
                    {s.completion_percent === 100 && s.total_lessons > 0 && (
                      <Button size="sm" variant="outline" className="gap-1 w-full"
                        onClick={() => {
                          const course = courses.find(c => c.id === selectedCourse);
                          issueCertificate(`${s.profiles?.first_name || ''} ${s.profiles?.last_name || ''}`.trim(), course?.title || 'Course');
                        }}>
                        <Download className="h-3 w-3" /> Issue Certificate
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {enrolledStudents.length === 0 && <p className="text-muted-foreground text-sm">No students enrolled yet.</p>}
            </div>
          </DialogContent>
        </Dialog>

        {/* Quiz Results Dialog */}
        <Dialog open={resultsDialog} onOpenChange={setResultsDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Results: {resultsQuizTitle}</DialogTitle>
                {quizResults.length > 0 && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={exportResults}>
                    <Download className="h-3 w-3" /> Export CSV
                  </Button>
                )}
              </div>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {quizResults.map((r, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-sm">{r.profiles?.first_name} {r.profiles?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${r.score >= 50 ? 'text-success' : 'text-destructive'}`}>{r.score}%</span>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {quizResults.length === 0 && <p className="text-muted-foreground text-sm">No results yet.</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
