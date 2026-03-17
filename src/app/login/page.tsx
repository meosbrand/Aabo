import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AaboLogo } from '@/components/aabo-logo';
import { Separator } from '@/components/ui/separator';

/**
 * A simple Google icon component.
 * @param {React.SVGProps<SVGSVGElement>} props - SVG properties.
 * @returns {JSX.Element} The Google icon SVG.
 */
function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5.03,16.25 5.03,12.55C5.03,8.85 8.36,5.83 12.19,5.83C13.96,5.83 15.63,6.47 16.93,7.55L19.05,5.44C17.15,3.81 14.83,3 12.19,3C7.03,3 3,7.54 3,12.55C3,17.56 7.03,22.1 12.19,22.1C17.64,22.1 21.5,18.33 21.5,12.89C21.5,12.21 21.45,11.66 21.35,11.1Z" />
      </svg>
    )
  }

/**
 * Renders the Login page for the application.
 * It includes a form for email/password login and an option for Google sign-in.
 * @returns {JSX.Element} The LoginPage component.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
               <Link href="/" className="flex items-center gap-2">
                <AaboLogo className="h-10 w-10 text-primary" />
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
            <CardDescription>Sign in to access your Digital Shield.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email and Password form */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" asChild>
                {/* Link to dashboard for demo purposes */}
                <Link href="/app/dashboard">Sign In</Link>
            </Button>
            <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-sm text-muted-foreground">OR</span>
            </div>
            {/* Google Sign-in button */}
            <Button variant="outline" className="w-full">
              <GoogleIcon className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
          </CardContent>
          <CardFooter className="justify-center text-sm">
            <p>Don't have an account?&nbsp;</p>
            <Link href="/onboarding" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
