import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dashboardPathForRole, loginCodeErrorMessage } from '@/lib/auth-login';
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
  const { requestLoginCode, verifyLoginCode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timeout = window.setTimeout(() => setResendTimer((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [resendTimer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestLoginCode(email);
      setStep('otp');
      setOtp('');
      setResendTimer(60);
      toast({ title: 'Verification code sent', description: 'Check your email for the six-digit code.' });
    } catch (err: unknown) {
      toast({ title: 'Unable to send code', description: loginCodeErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) return;
    
    setLoading(true);
    try {
      const verifiedRole = await verifyLoginCode(email, otp);
      toast({ title: 'Welcome back!' });
      navigate(dashboardPathForRole(verifiedRole), { replace: true });
    } catch (err: unknown) {
      toast({ title: 'Verification failed', description: loginCodeErrorMessage(err), variant: 'destructive' });
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await requestLoginCode(email);
      setOtp('');
      setResendTimer(60);
      toast({ title: 'New code sent', description: 'The previous code can no longer be used.' });
    } catch (err: unknown) {
      toast({ title: 'Unable to resend code', description: loginCodeErrorMessage(err), variant: 'destructive' });
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
              {step === 'email' ? 'Welcome Back' : 'Enter Verification Code'}
            </CardTitle>
            <CardDescription>
              {step === 'email' 
                ? 'Enter your registered email to continue' 
                : `We sent a six-digit code to ${email}`}
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
                   {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : 'Send Verification Code'}
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
                  disabled={loading}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
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
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify & Login'}
                </Button>
                
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleResend}
                    disabled={loading || resendTimer > 0}
                    className="h-auto p-0 text-sm"
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setStep('email'); setOtp(''); setResendTimer(0); }}
                    className="h-auto px-2 py-1 text-sm text-muted-foreground"
                  >
                    <ArrowLeft className="h-3 w-3" /> Change email
                  </Button>
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
