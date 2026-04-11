import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlayCircle, FileText, Type, CheckCircle, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Course = Tables<'courses'> & { profiles?: { first_name: string; last_name: string } | null };

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Tables<'lessons'>[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: c } = await supabase.from('courses').select('*').eq('id', id).single();
      if (c) {
        const { data: p } = await supabase.from('profiles').select('first_name, last_name').eq('user_id', c.instructor_id).single();
        setCourse({ ...c, profiles: p } as Course);
      }
      const { data: l } = await supabase.from('lessons').select('*').eq('course_id', id).order('sort_order');
      setLessons(l || []);
      if (user) {
        const { data: e } = await supabase.from('enrollments').select('id').eq('student_id', user.id).eq('course_id', id).maybeSingle();
        setEnrolled(!!e);
      }
      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleEnroll = async () => {
    if (!user) { navigate('/login'); return; }
    if (!course) return;

    // Free course — enroll directly
    if (Number(course.price) === 0) {
      const { data, error } = await supabase.functions.invoke('enroll-course', {
        body: { course_id: course.id },
      });
      if (error || !data?.success) {
        toast({ title: 'Enrollment failed', description: data?.error || error?.message || 'Failed to enroll', variant: 'destructive' });
        return;
      }
      setEnrolled(true);
      toast({ title: 'Enrolled successfully!' });
      return;
    }

    // Paid course — Razorpay flow
    setPaying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast({ title: 'Error', description: 'Failed to load payment gateway', variant: 'destructive' });
        setPaying(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data: orderData, error: orderErr } = await supabase.functions.invoke('razorpay-create-order', {
        body: { course_id: course.id },
      });

      if (orderErr || !orderData?.order_id) {
        toast({ title: 'Error', description: 'Failed to create payment order', variant: 'destructive' });
        setPaying(false);
        return;
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'EduFlow',
        description: course.title,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          // Verify payment
          const { data: verifyData, error: verifyErr } = await supabase.functions.invoke('razorpay-verify', {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              course_id: course.id,
            },
          });

          if (verifyErr || !verifyData?.success) {
            toast({ title: 'Payment verification failed', description: 'Please contact support.', variant: 'destructive' });
          } else {
            setEnrolled(true);
            toast({ title: 'Payment successful!', description: 'You are now enrolled in this course.' });
          }
          setPaying(false);
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#6366f1',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast({ title: 'Payment failed', description: response.error?.description || 'Please try again.', variant: 'destructive' });
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      toast({ title: 'Error', description: 'Something went wrong with payment', variant: 'destructive' });
      setPaying(false);
    }
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
            <span className="text-3xl font-bold">
              {Number(course.price) === 0 ? 'Free' : `₹${course.price}`}
            </span>
            {role === 'student' && !enrolled && (
              <Button size="lg" variant="secondary" onClick={handleEnroll} disabled={paying}>
                {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> :
                  Number(course.price) === 0 ? 'Enroll Free' : 'Buy & Enroll'}
              </Button>
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
