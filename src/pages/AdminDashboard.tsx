import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Users, BookOpen, Trash2, Shield, Edit, CreditCard } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type EnrollmentWithDetails = {
  id: string;
  enrollment_date: string;
  status: string;
  student_id: string;
  course_id: string;
  student_name: string;
  student_email: string;
  course_title: string;
  course_price: number;
  payment_status: string | null;
  payment_date: string | null;
  razorpay_payment_id: string | null;
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Tables<'profiles'>[]>([]);
  const [instructors, setInstructors] = useState<Tables<'profiles'>[]>([]);
  const [courses, setCourses] = useState<Tables<'courses'>[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
  const [editDialog, setEditDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Tables<'profiles'> | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '', qualification: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (profiles) {
      setStudents(profiles.filter(p => p.role === 'student'));
      setInstructors(profiles.filter(p => p.role === 'instructor'));
    }
    const { data: c } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    setCourses(c || []);

    // Fetch enrollments with student profiles and course info
    const { data: enrollData } = await supabase
      .from('enrollments')
      .select('id, enrollment_date, status, student_id, course_id')
      .order('enrollment_date', { ascending: false });

    if (enrollData && profiles && c) {
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));
      const courseMap = new Map((c || []).map(co => [co.id, co]));

      // Fetch all payments
      const { data: payments } = await supabase.from('payments').select('*');
      const paymentMap = new Map<string, Tables<'payments'>>();
      if (payments) {
        for (const p of payments) {
          const key = `${p.student_id}_${p.course_id}`;
          if (!paymentMap.has(key) || p.payment_status === 'paid') {
            paymentMap.set(key, p);
          }
        }
      }

      const enriched: EnrollmentWithDetails[] = enrollData.map(e => {
        const profile = profileMap.get(e.student_id);
        const course = courseMap.get(e.course_id);
        const payment = paymentMap.get(`${e.student_id}_${e.course_id}`);
        return {
          ...e,
          student_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
          student_email: profile?.email || '',
          course_title: course?.title || 'Unknown',
          course_price: course?.price || 0,
          payment_status: Number(course?.price) === 0 ? 'Free' : (payment?.payment_status || 'No payment'),
          payment_date: payment?.created_at || null,
          razorpay_payment_id: payment?.razorpay_payment_id || null,
        };
      });
      setEnrollments(enriched);
    }
  };

  const deleteProfile = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ user_id: userId }),
    });
    const result = await res.json();
    if (!res.ok) toast({ title: 'Error', description: result.error, variant: 'destructive' });
    else { toast({ title: 'User deleted successfully' }); fetchData(); }
  };

  const openEdit = (profile: Tables<'profiles'>) => {
    setEditingProfile(profile);
    setEditForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      phone: profile.phone || '',
      qualification: profile.qualification || '',
    });
    setEditDialog(true);
  };

  const saveEdit = async () => {
    if (!editingProfile) return;
    const { error } = await supabase.from('profiles').update({
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      phone: editForm.phone,
      qualification: editForm.qualification,
    }).eq('id', editingProfile.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Profile updated' }); setEditDialog(false); fetchData(); }
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Course deleted' }); fetchData(); }
  };

  const getPaymentBadgeVariant = (status: string | null) => {
    if (status === 'paid' || status === 'captured') return 'default';
    if (status === 'Free') return 'secondary';
    return 'destructive';
  };

  const renderUserCard = (p: Tables<'profiles'>, roleLabel: string, badgeVariant: 'default' | 'secondary' = 'default') => (
    <Card key={p.id}>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="font-medium">{p.first_name} {p.last_name}</p>
          <p className="text-sm text-muted-foreground">{p.email}</p>
          {p.phone && <p className="text-xs text-muted-foreground">📞 {p.phone}</p>}
          {p.qualification && <p className="text-xs text-muted-foreground">🎓 {p.qualification}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant}>{roleLabel}</Badge>
          <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => deleteProfile(p.user_id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold font-display">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div><p className="text-2xl font-bold">{students.length}</p><p className="text-sm text-muted-foreground">Students</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Users className="h-8 w-8 text-accent" />
              <div><p className="text-2xl font-bold">{instructors.length}</p><p className="text-sm text-muted-foreground">Instructors</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <BookOpen className="h-8 w-8 text-warning" />
              <div><p className="text-2xl font-bold">{courses.length}</p><p className="text-sm text-muted-foreground">Courses</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-success" />
              <div><p className="text-2xl font-bold">{enrollments.length}</p><p className="text-sm text-muted-foreground">Enrollments</p></div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="enrollments">
          <TabsList>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="instructors">Instructors</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="enrollments" className="mt-6">
            {enrollments.length === 0 ? (
              <p className="text-muted-foreground">No enrollments yet.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Enrollment Date</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Payment ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map(e => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{e.student_name}</p>
                            <p className="text-xs text-muted-foreground">{e.student_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{e.course_title}</p>
                          <p className="text-xs text-muted-foreground">₹{e.course_price}</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(e.enrollment_date).toLocaleDateString()}<br />
                          <span className="text-xs text-muted-foreground">{new Date(e.enrollment_date).toLocaleTimeString()}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentBadgeVariant(e.payment_status)} className="capitalize">
                            {e.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.payment_date ? (
                            <>
                              {new Date(e.payment_date).toLocaleDateString()}<br />
                              <span className="text-xs text-muted-foreground">{new Date(e.payment_date).toLocaleTimeString()}</span>
                            </>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {e.razorpay_payment_id || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="mt-6">
            <div className="space-y-3">
              {students.map(s => renderUserCard(s, 'Student'))}
              {students.length === 0 && <p className="text-muted-foreground">No students registered.</p>}
            </div>
          </TabsContent>
          <TabsContent value="instructors" className="mt-6">
            <div className="space-y-3">
              {instructors.map(i => renderUserCard(i, 'Instructor', 'secondary'))}
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

        {/* Edit Profile Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name</Label><Input value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Qualification</Label><Input value={editForm.qualification} onChange={e => setEditForm(f => ({ ...f, qualification: e.target.value }))} /></div>
              <Button onClick={saveEdit} className="w-full">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
