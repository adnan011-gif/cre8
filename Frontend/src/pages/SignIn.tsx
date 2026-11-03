import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useBackendAuth } from "@/hooks/useBackendAuth";
import { apiService } from "@/lib/api";

const ForgotPasswordDialog = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [code, setCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const codeRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);

  const sendCode = async () => {
    if (!email) return;
    setIsLoading(true);
    const result = await apiService.sendCode(email);
    setIsLoading(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    const returnedCode = (result.data as any)?.code;
    if (returnedCode) {
      toast({ 
        title: 'Verification Code', 
        description: `Your code is: ${returnedCode}`,
        duration: 20000 
      });
    } else {
      toast({ title: 'Code sent', description: 'Check your email for the 6-digit code' });
    }
    setStep('code');
    setTimeout(() => codeRefs.current[0]?.focus(), 100);
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setIsLoading(true);
    const result = await apiService.verifyCode(email, code);
    setIsLoading(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    const vt = (result.data as any)?.data?.verificationToken;
    if (vt) {
      setVerificationToken(vt);
      setStep('password');
    }
  };

  const resetPassword = async () => {
    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const result = await apiService.resetPassword(email, verificationToken, password);
    setIsLoading(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Password reset', description: 'Your password has been reset successfully' });
    setOpen(false);
    setStep('email');
    setCode('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newCode = code.split('');
      for (let i = 0; i < digits.length && i < 6; i++) {
        newCode[i] = digits[i];
      }
      setCode(newCode.join(''));
      if (digits.length === 6) {
        codeRefs.current[5]?.focus();
      } else {
        codeRefs.current[Math.min(digits.length, 5)]?.focus();
      }
      return;
    }
    const newCode = code.split('');
    newCode[index] = value;
    const joined = newCode.join('');
    setCode(joined);
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      verifyCode();
    }
  }, [code]);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setStep('email'); setCode(''); setPassword(''); setConfirmPassword(''); } }}>
      <DialogTrigger asChild>
        <button type="button" className="font-medium text-cre8-blue hover:text-cre8-purple">
          Forgot your password?
        </button>
      </DialogTrigger>
      <DialogContent className="bg-cre8-dark/95 border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === 'email' && 'Enter your email to receive a verification code.'}
            {step === 'code' && 'Enter the 6-digit code sent to your email.'}
            {step === 'password' && 'Choose a new password for your account.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' && (
          <div className="space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-cre8-dark/70 border-white/20 text-white"
            />
            <Button
              onClick={sendCode}
              disabled={!email || isLoading}
              className="w-full bg-gradient-to-r from-cre8-blue to-cre8-purple"
            >
              {isLoading ? 'Sending...' : 'Send Code'}
            </Button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code[i] || ''}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl bg-cre8-dark/70 border-white/20 text-white"
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              {isLoading ? 'Verifying...' : 'Code auto-verifies when all digits are entered'}
            </p>
            <Button
              onClick={() => { setStep('email'); setCode(''); }}
              variant="link"
              className="text-cre8-blue w-full"
            >
              Change email
            </Button>
          </div>
        )}

        {step === 'password' && (
          <div className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              className="bg-cre8-dark/70 border-white/20 text-white"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="bg-cre8-dark/70 border-white/20 text-white"
            />
            <Button
              onClick={resetPassword}
              disabled={!password || !confirmPassword || isLoading}
              className="w-full bg-gradient-to-r from-cre8-blue to-cre8-purple"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const SignIn = () => {
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, setAuthSession } = useBackendAuth();
  const codeRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null]);

  const sendCode = async () => {
    if (!email) return;
    setIsLoading(true);
    const result = await apiService.sendCode(email);
    setIsLoading(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    const returnedCode = (result.data as any)?.code;
    if (returnedCode) {
      toast({ 
        title: 'Verification Code', 
        description: `Your code is: ${returnedCode}`,
        duration: 20000 
      });
    } else {
      toast({ title: 'Code sent', description: 'Check your email for the 6-digit code' });
    }
    setStep('code');
    setTimeout(() => codeRefs.current[0]?.focus(), 100);
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setIsLoading(true);
    const result = await apiService.verifyCode(email, code);
    setIsLoading(false);

    if (result.error) {
      toast({ title: 'Verification failed', description: result.error, variant: 'destructive' });
      setCode('');
      return;
    }

    const vt = (result.data as any)?.data?.verificationToken;
    if (vt) {
      setVerificationToken(vt);
      setStep('password');
      toast({ title: 'Email verified', description: 'Now enter your password' });
    }
  };

  const handleSignIn = async () => {
    if (!password) return;
    setIsLoading(true);

    const result = await apiService.signInWithVerification(email, password, verificationToken);

    if (result.error) {
      toast({ title: 'Sign in failed', description: result.error, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const data = result.data as any;
    if (data?.success && data?.data?.token && data?.data?.user) {
      setAuthSession(data.data.user, data.data.token);
      toast({ title: 'Welcome back!', description: 'Successfully signed in' });
      navigate('/dashboard');
    } else {
      toast({ title: 'Sign in failed', description: 'Unexpected response', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newCode = code.split('');
      for (let i = 0; i < digits.length && i < 6; i++) {
        newCode[i] = digits[i];
      }
      setCode(newCode.join(''));
      if (digits.length === 6) {
        codeRefs.current[5]?.focus();
      } else {
        codeRefs.current[Math.min(digits.length, 5)]?.focus();
      }
      return;
    }
    const newCode = code.split('');
    newCode[index] = value;
    const joined = newCode.join('');
    setCode(joined);
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      verifyCode();
    }
  }, [code]);

  const steps = ['email', 'code', 'password'];
  const currentStep = steps.indexOf(step);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cre8-dark to-black px-4 sm:px-6 lg:px-8">
      <div className="fixed inset-0 z-0">
        <div className="absolute w-[500px] h-[500px] bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 -top-20 -left-20 animate-pulse"
             style={{ animation: 'blob 10s infinite' }} />
        <div className="absolute w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-35 -top-10 -right-10"
             style={{ animation: 'blob 8s infinite 2s' }} />
        <div className="absolute w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-xl opacity-50 top-1/4 right-1/4"
             style={{ animation: 'blob 12s infinite 1s' }} />
        <div className="absolute w-72 h-72 bg-pink-500 rounded-full mix-blend-screen filter blur-xl opacity-45 bottom-1/4 left-1/3"
             style={{ animation: 'blob 9s infinite 4s' }} />
        <div className="absolute w-48 h-48 bg-emerald-400 rounded-full mix-blend-screen filter blur-lg opacity-60 top-1/2 left-1/4"
             style={{ animation: 'blob 7s infinite 3s' }} />
        <div className="absolute w-56 h-56 bg-yellow-400 rounded-full mix-blend-screen filter blur-lg opacity-40 bottom-1/3 right-1/3"
             style={{ animation: 'blob 11s infinite 5s' }} />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <img src="/lovable-uploads/logomain.png" alt="CRE8HUB Logo" className="h-48 mx-auto -mb-10" />
          </Link>
          <h2 className="mt-2 text-3xl font-bold text-white">Welcome back</h2>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className={`h-2 rounded-full transition-all duration-300 ${
              i <= currentStep ? 'w-8 bg-gradient-to-r from-cre8-blue to-cre8-purple' : 'w-2 bg-gray-600'
            }`} />
          ))}
        </div>

        <Card className="bg-white/10 rounded-xl backdrop-blur-xl border-white/10 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-white text-xl">
              {step === 'email' && 'Enter your email'}
              {step === 'code' && 'Verify your email'}
              {step === 'password' && 'Enter your password'}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {step === 'email' && 'We will send a 6-digit verification code'}
              {step === 'code' && `Code sent to ${email}`}
              {step === 'password' && 'Enter your password to sign in'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Step 1: Email */}
            {step === 'email' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-cre8-dark/70 border-white/20 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                />
                <Button
                  onClick={sendCode}
                  disabled={!email || isLoading}
                  className="w-full rounded-full bg-gradient-to-r from-cre8-blue to-cre8-purple hover:opacity-90"
                >
                  {isLoading ? 'Sending...' : 'Send Code'}
                </Button>
              </div>
            )}

            {/* Step 2: Code */}
            {step === 'code' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <Input
                      key={i}
                      ref={(el) => { codeRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code[i] || ''}
                      onChange={(e) => handleCodeInput(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl bg-cre8-dark/70 border-white/20 text-white"
                    />
                  ))}
                </div>
                {isLoading && (
                  <p className="text-sm text-cre8-blue text-center">Verifying...</p>
                )}
                <div className="flex justify-between">
                  <Button
                    onClick={() => { setStep('email'); setCode(''); }}
                    variant="link"
                    className="text-gray-400 p-0"
                  >
                    Change email
                  </Button>
                  <Button
                    onClick={sendCode}
                    variant="link"
                    className="text-cre8-blue p-0"
                  >
                    Resend code
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Password */}
            {step === 'password' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-cre8-dark/70 border-white/20 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                />
                <Button
                  onClick={handleSignIn}
                  disabled={!password || isLoading}
                  className="w-full rounded-full bg-gradient-to-r from-cre8-blue to-cre8-purple hover:opacity-90"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t border-white/10 pt-4">
            {step !== 'email' && (
              <Button
                onClick={() => {
                  if (step === 'code') { setStep('email'); setCode(''); }
                  else if (step === 'password') { setStep('code'); setPassword(''); }
                }}
                variant="link"
                className="text-gray-400 p-0"
              >
                Back
              </Button>
            )}
            {step === 'email' && <div />}
            <div className="flex gap-4 text-sm">
              <ForgotPasswordDialog />
              <Link to="/signup" className="font-medium text-cre8-blue hover:text-cre8-purple">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SignIn;
