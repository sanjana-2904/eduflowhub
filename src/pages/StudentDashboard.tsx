import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Award, TrendingUp } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<(Tables<'enrollments'> & { courses: Tables<'courses'> | null })[]>([]);
  const [results, setResults] = useState<(Tables<'results'> & { quizzes: Tables<'quizzes'> | null })[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: e } = await supabase.from('enrollments')
        .select('*, courses(*)').eq('student_id', user.id);
      setEnrollments((e as any) || []);

      const { data: r } = await supabase.from('results')
        .select('*, quizzes(*)').eq('student_id', user.id).order('created_at', { ascending: false });
      setResults((r as any) || []);
    };
    fetch();
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
                  <CardContent>
                    <Badge variant={e.status === 'active' ? 'default' : 'secondary'}>{e.status}</Badge>
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
