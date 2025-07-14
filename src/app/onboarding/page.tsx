"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AaboLogo } from '@/components/aabo-logo';
import { ArrowLeft, Check, Mail, MessageCircle } from 'lucide-react';
import Link from 'next/link';

const steps = [
  {
    title: "Welcome to Ààbò!",
    description: "Let's get your digital shield set up. It'll only take a minute.",
  },
  {
    title: "Connect Your Accounts",
    description: "Connect your accounts to receive important security alerts.",
  },
  {
    title: "All Set!",
    description: "Your Ààbò Digital Shield is active. Let's go to your dashboard.",
  }
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const progress = ((currentStep + 1) / steps.length) * 100;

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
       <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
            <Link href="/" className="flex items-center gap-2 justify-center mb-4">
              <AaboLogo className="h-10 w-10 text-primary" />
              <span className="text-2xl font-bold text-foreground">Ààbò</span>
            </Link>
            <Progress value={progress} className="w-full h-2" />
        </div>
        
        <Card className="shadow-2xl">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">{steps[currentStep].title}</CardTitle>
                <CardDescription>{steps[currentStep].description}</CardDescription>
            </CardHeader>
            <CardContent>
                {currentStep === 0 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">What should we call you?</Label>
                            <Input 
                                id="name" 
                                placeholder="Enter your name" 
                                value={name}
                                onChange={(e) => setName(e.target.value)} 
                            />
                        </div>
                    </div>
                )}
                {currentStep === 1 && (
                    <div className="space-y-4">
                        <Button variant="outline" className="w-full justify-start h-14 text-left">
                            <MessageCircle className="mr-4 h-6 w-6 text-green-500" />
                            <div>
                                <p className="font-semibold">Connect WhatsApp</p>
                                <p className="text-sm text-muted-foreground">Receive alerts via messages.</p>
                            </div>
                        </Button>
                        <Button variant="outline" className="w-full justify-start h-14 text-left">
                            <Mail className="mr-4 h-6 w-6 text-blue-500" />
                            <div>
                                <p className="font-semibold">Connect Email</p>
                                <p className="text-sm text-muted-foreground">Receive alerts in your inbox.</p>
                            </div>
                        </Button>
                    </div>
                )}
                 {currentStep === 2 && (
                    <div className="text-center p-8">
                       <div className="flex justify-center items-center">
                         <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="w-12 h-12 text-green-600" />
                         </div>
                       </div>
                       <p className="mt-4 text-muted-foreground">You are now protected. Welcome aboard, {name || "friend"}!</p>
                    </div>
                )}
            </CardContent>
            <div className="flex items-center justify-between p-6">
                <Button variant="ghost" onClick={prevStep} disabled={currentStep === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                {currentStep < steps.length - 1 ? (
                    <Button onClick={nextStep} disabled={currentStep === 0 && !name}>
                        Continue
                    </Button>
                ) : (
                    <Button asChild>
                       <Link href="/app/dashboard">Go to Dashboard</Link>
                    </Button>
                )}
            </div>
        </Card>
        </div>
    </div>
  );
}
