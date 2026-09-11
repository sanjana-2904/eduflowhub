import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { sendOTP, verifyOTP, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let interval: number;
    if (resendTimer > 0) {
      interval = window.setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendOTP(email);
      setStep('otp');
      setResendTimer(60);
      toast({ title: 'OTP Sent', description: 'Please check your email for the verification code.' });
    } catch (err: any) {
      const message = err.message === 'Signups not allowed for otp' || err.message?.includes('User not found') 
        ? 'Account not found. Please register first.' 
        : err.message;
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) return;
    
    setLoading(true);
    try {
      await verifyOTP(email, otp);
      toast({ title: 'Welcome back!' });
      // Redirect logic happens in a separate useEffect or right here if role is available
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  // Handle redirection after successful login and role load
  useEffect(() => {
    if (role) {
      if (role === 'admin') navigate('/admin');
      else if (role === 'instructor') navigate('/instructor');
      else if (role === 'student') navigate('/student');
      else navigate('/');
    }
  }, [role, navigate]);

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await sendOTP(email);
      setResendTimer(60);
      toast({ title: 'OTP Resent', description: 'A new code has been sent to your email.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center space-y-4">
          <Link to="/" className="flex items-center justify-center gap-2">
            <div className="gradient-primary rounded-lg p-2">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-display">EduFlow</span>
          </Link>
          <div>
            <CardTitle className="font-display text-2xl">
              {step === 'email' ? 'Welcome Back' : 'Verify Email'}
            </CardTitle>
            <CardDescription>
              {step === 'email' 
                ? 'Sign in to continue your learning journey' 
                : `We've sent a code to ${email}`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="you@example.com" 
                />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2 flex flex-col items-center">
                <Label htmlFor="otp" className="sr-only">One-Time Password</Label>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={() => handleVerifyOTP()}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => handleVerifyOTP()} 
                  className="w-full gradient-primary text-primary-foreground border-0" 
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify & Sign In'}
                </Button>
                
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading || resendTimer > 0}
                    className="text-sm text-primary font-medium hover:underline disabled:text-muted-foreground disabled:no-underline"
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Change email
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-center items-center text-sm text-muted-foreground mt-8 border-t pt-6">
            <span>
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-medium hover:underline">Register</Link>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
