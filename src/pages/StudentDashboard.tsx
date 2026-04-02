import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Award, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';
import jsPDF from 'jspdf';

type EnrollmentWithCourse = Tables<'enrollments'> & { courses: Tables<'courses'> | null };

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [results, setResults] = useState<(Tables<'results'> & { quizzes: Tables<'quizzes'> | null })[]>([]);
  const [courseProgress, setCourseProgress] = useState<Record<string, { completed: number; total: number }>>({});

  const generateCertificate = (courseName: string) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const studentName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Student';

    // Border
    doc.setDrawColor(44, 62, 80);
    doc.setLineWidth(3);
    doc.rect(10, 10, w - 20, h - 20);
    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(1);
    doc.rect(15, 15, w - 30, h - 30);

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(52, 152, 219);
    doc.text('EDUFLOW', w / 2, 35, { align: 'center' });

    // Title
    doc.setFontSize(36);
    doc.setTextColor(44, 62, 80);
    doc.text('Certificate of Completion', w / 2, 55, { align: 'center' });

    // Decorative line
    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(0.5);
    doc.line(w / 2 - 60, 60, w / 2 + 60, 60);

    // Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('This is to certify that', w / 2, 78, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(44, 62, 80);
    doc.text(studentName, w / 2, 95, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('has successfully completed the course', w / 2, 112, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(52, 152, 219);
    doc.text(courseName, w / 2, 128, { align: 'center' });

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, w / 2, 148, { align: 'center' });

    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.line(w / 2 - 40, 165, w / 2 + 40, 165);
    doc.setFontSize(10);
    doc.text('EduFlow E-Learning Platform', w / 2, 172, { align: 'center' });

    doc.save(`EduFlow_Certificate_${courseName.replace(/\s+/g, '_')}.pdf`);
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: e } = await supabase.from('enrollments')
        .select('*, courses(*)').eq('student_id', user.id);
      const enrolls = (e as any) || [];
      setEnrollments(enrolls);

      const { data: r } = await supabase.from('results')
        .select('*, quizzes(*)').eq('student_id', user.id).order('created_at', { ascending: false });
      setResults((r as any) || []);

      // Fetch progress for each course
      const progress: Record<string, { completed: number; total: number }> = {};
      for (const en of enrolls) {
        const { data: lessons } = await supabase.from('lessons').select('id').eq('course_id', en.course_id);
        const total = lessons?.length || 0;
        if (total === 0) {
          progress[en.course_id] = { completed: 0, total: 0 };
          continue;
        }
        const lessonIds = lessons!.map(l => l.id);
        const { count } = await supabase.from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', user.id)
          .in('lesson_id', lessonIds)
          .eq('completed', true);
        progress[en.course_id] = { completed: count || 0, total };
      }
      setCourseProgress(progress);
    };
    fetchData();
  }, [user]);

  return (
    <Layout>
      <div className="container py-10">
        <h1 className="text-3xl font-bold font-display mb-8">Student Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{enrollments.length}</p>
                <p className="text-sm text-muted-foreground">Enrolled Courses</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg gradient-accent flex items-center justify-center">
                <Award className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{results.length}</p>
                <p className="text-sm text-muted-foreground">Quizzes Taken</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {results.length > 0 ? (results.reduce((a, r) => a + r.score, 0) / results.length).toFixed(0) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Avg. Score</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-bold font-display mb-4">My Courses</h2>
        {enrollments.length === 0 ? (
          <p className="text-muted-foreground">No enrollments yet. <Link to="/courses" className="text-primary hover:underline">Browse courses</Link></p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map(e => e.courses && (
              <Link to={`/courses/${e.course_id}`} key={e.id}>
                <Card className="hover:shadow-elevated transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-display">{e.courses.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {courseProgress[e.course_id] && (() => {
                      const { completed, total } = courseProgress[e.course_id];
                      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                      const isComplete = total > 0 && completed === total;
                      return (
                        <>
                          <Badge variant={isComplete ? 'default' : 'secondary'}>
                            {isComplete ? 'Completed' : percent > 0 ? 'In Progress' : 'Not Started'}
                          </Badge>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{completed}/{total} lessons ({percent}%)</span>
                            </div>
                            <Progress value={percent} />
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <>
            <h2 className="text-xl font-bold font-display mb-4 mt-10">Recent Results</h2>
            <div className="space-y-3">
              {results.slice(0, 5).map(r => (
                <Card key={r.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{r.quizzes?.title || 'Quiz'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-lg font-bold ${r.score >= 50 ? 'text-success' : 'text-destructive'}`}>
                      {r.score.toFixed(0)}%
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
