import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, BookOpen, Trash2, Shield } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

export default function AdminDashboard() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Tables<'profiles'>[]>([]);
  const [instructors, setInstructors] = useState<Tables<'profiles'>[]>([]);
  const [courses, setCourses] = useState<Tables<'courses'>[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (profiles) {
      setStudents(profiles.filter(p => p.role === 'student'));
      setInstructors(profiles.filter(p => p.role === 'instructor'));
    }
    const { data: c } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    setCourses(c || []);
  };

  const deleteProfile = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });
    const result = await res.json();
    if (!res.ok) toast({ title: 'Error', description: result.error, variant: 'destructive' });
    else { toast({ title: 'User deleted successfully' }); fetchData(); }
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Course deleted' }); fetchData(); }
  };

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold font-display">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Users className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{instructors.length}</p>
                <p className="text-sm text-muted-foreground">Instructors</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <BookOpen className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-sm text-muted-foreground">Courses</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="instructors">Instructors</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <div className="space-y-3">
              {students.map(s => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-sm text-muted-foreground">{s.email}</p>
                      {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>Student</Badge>
                      <Button size="icon" variant="ghost" onClick={() => deleteProfile(s.user_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {students.length === 0 && <p className="text-muted-foreground">No students registered.</p>}
            </div>
          </TabsContent>

          <TabsContent value="instructors" className="mt-6">
            <div className="space-y-3">
              {instructors.map(i => (
                <Card key={i.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{i.first_name} {i.last_name}</p>
                      <p className="text-sm text-muted-foreground">{i.email}</p>
                      {i.qualification && <p className="text-xs text-muted-foreground">Qualification: {i.qualification}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Instructor</Badge>
                      <Button size="icon" variant="ghost" onClick={() => deleteProfile(i.user_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {instructors.length === 0 && <p className="text-muted-foreground">No instructors registered.</p>}
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            <div className="space-y-3">
              {courses.map(c => (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-sm text-muted-foreground">{c.category} · ₹{c.price}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteCourse(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {courses.length === 0 && <p className="text-muted-foreground">No courses created.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
