import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, PlayCircle, FileText, Type, CheckCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Course = Tables<'courses'> & { profiles?: { first_name: string; last_name: string } | null };

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Tables<'lessons'>[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data: c } = await supabase.from('courses')
        .select('*, profiles!courses_instructor_id_fkey(first_name, last_name)')
        .eq('id', id).single();
      setCourse(c as Course);

      const { data: l } = await supabase.from('lessons')
        .select('*').eq('course_id', id).order('sort_order');
      setLessons(l || []);

      if (user) {
        const { data: e } = await supabase.from('enrollments')
          .select('id').eq('student_id', user.id).eq('course_id', id).maybeSingle();
        setEnrolled(!!e);
      }
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const handleEnroll = async () => {
    if (!user) { navigate('/login'); return; }
    if (!course) return;

    if (course.price > 0) {
      toast({ title: 'Payment required', description: 'Razorpay integration needs API keys. For now, enrolling for free.' });
    }

    const { data: enrollment, error } = await supabase.from('enrollments')
      .insert({ student_id: user.id, course_id: course.id }).select().single();
    if (error) {
      toast({ title: 'Enrollment failed', description: error.message, variant: 'destructive' });
      return;
    }
    setEnrolled(true);
    toast({ title: 'Enrolled successfully!' });
  };

  const contentIcon = (type: string) => {
    if (type === 'video') return <PlayCircle className="h-4 w-4" />;
    if (type === 'pdf') return <FileText className="h-4 w-4" />;
    return <Type className="h-4 w-4" />;
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></Layout>;
  if (!course) return <Layout><div className="container py-20 text-center">Course not found</div></Layout>;

  return (
    <Layout>
      <div className="gradient-primary py-16">
        <div className="container text-primary-foreground">
          <Badge variant="secondary" className="mb-4">{course.category || 'General'}</Badge>
          <h1 className="text-3xl lg:text-4xl font-bold font-display mb-4">{course.title}</h1>
          <p className="text-primary-foreground/80 max-w-2xl mb-4">{course.description}</p>
          {course.profiles && (
            <p className="text-sm text-primary-foreground/70">By {course.profiles.first_name} {course.profiles.last_name}</p>
          )}
          <div className="flex items-center gap-4 mt-6">
            <span className="text-3xl font-bold">₹{course.price}</span>
            {role === 'student' && !enrolled && (
              <Button size="lg" variant="secondary" onClick={handleEnroll}>Enroll Now</Button>
            )}
            {enrolled && (
              <Badge className="bg-success text-success-foreground gap-1">
                <CheckCircle className="h-3 w-3" /> Enrolled
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container py-10">
        <h2 className="text-2xl font-bold font-display mb-6">Lessons ({lessons.length})</h2>
        {lessons.length === 0 ? (
          <p className="text-muted-foreground">No lessons added yet.</p>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, i) => (
              <Card key={lesson.id} className="hover:shadow-card transition-shadow">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{lesson.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {contentIcon(lesson.content_type)}
                      <span className="capitalize">{lesson.content_type}</span>
                    </div>
                  </div>
                  {enrolled && (
                    <Button size="sm" variant="outline" onClick={() => navigate(`/lessons/${lesson.id}`)}>
                      View
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
