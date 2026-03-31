import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Register() {
  const [form, setForm] = useState({
    first_name: '', middle_name: '', last_name: '',
    email: '', password: '', phone: '', qualification: '',
    role: 'student' as 'student' | 'instructor',
  });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signUp(form.email, form.password, {
        first_name: form.first_name,
        last_name: form.last_name,
        middle_name: form.middle_name,
        phone: form.phone,
        qualification: form.qualification,
        role: form.role,
      });
      toast({ title: 'Account created!', description: 'Please check your email to verify.' });
      navigate('/login');
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-elevated">
        <CardHeader className="text-center space-y-4">
          <Link to="/" className="flex items-center justify-center gap-2">
            <div className="gradient-primary rounded-lg p-2">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-display">EduFlow</span>
          </Link>
          <div>
            <CardTitle className="font-display text-2xl">Create Account</CardTitle>
            <CardDescription>Join as a student or instructor</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input required value={form.first_name} onChange={e => update('first_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input required value={form.last_name} onChange={e => update('last_name', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input value={form.middle_name} onChange={e => update('middle_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" required value={form.email} onChange={e => update('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" required value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => update('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => update('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                </SelectContent>
                <p className="text-xs text-muted-foreground">Admin access is restricted and cannot be self-registered.</p>
              </Select>
            </div>
            {form.role === 'instructor' && (
              <div className="space-y-2">
                <Label>Qualification</Label>
                <Input value={form.qualification} onChange={e => update('qualification', e.target.value)} placeholder="e.g. M.Sc. Computer Science" />
              </div>
            )}
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
