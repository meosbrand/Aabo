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
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.42 9.88V15.5H8v-3h2.42v-2.34c0-2.4 1.4-3.79 3.61-3.79 1.05 0 2.16.2 2.16.2v2.53h-1.26c-1.19 0-1.57.71-1.57 1.5v1.9h2.8l-.45 3H13v6.38A10.02 10.02 0 0 0 22 12z" />
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