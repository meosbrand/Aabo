
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
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Configuration for the steps in the onboarding process.
 */
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

/**
 * Renders the multi-step onboarding page for new users.
 * It guides the user through setting up their name and connecting accounts.
 * Uses Framer Motion for smooth transitions between steps.
 * @returns {JSX.Element} The OnboardingPage component.
 */
export default function OnboardingPage() {
  // State for the current step in the onboarding flow.
  const [currentStep, setCurrentStep] = useState(0);
  // State for the user's name, collected in the first step.
  const [name, setName] = useState('');
  // State to control the animation direction (forward or backward).
  const [direction, setDirection] = useState(1);
  const progress = ((currentStep + 1) / steps.length) * 100;

  /**
   * Moves to the next step in the onboarding process.
   */
  const nextStep = () => {
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  }
  /**
   * Moves to the previous step in the onboarding process.
   */
  const prevStep = () => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }

  /**
   * Animation variants for the step content transitions.
   */
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 500 : -500,
      opacity: 0,
    }),
  };

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
        
        <Card className="shadow-2xl overflow-hidden">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">{steps[currentStep].title}</CardTitle>
                <CardDescription>{steps[currentStep].description}</CardDescription>
            </CardHeader>
            <CardContent className="relative h-64">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className="absolute inset-0 flex flex-col justify-center px-6"
                    >
                        {/* Step 0: Welcome and Name Input */}
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
                        {/* Step 1: Connect Accounts */}
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
                        {/* Step 2: Completion */}
                        {currentStep === 2 && (
                            <div className="text-center">
                            <div className="flex justify-center items-center">
                                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                                    <Check className="w-12 h-12 text-green-600" />
                                </div>
                            </div>
                            <p className="mt-4 text-muted-foreground">You are now protected. Welcome aboard, {name || "friend"}!</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </CardContent>
            {/* Navigation buttons */}
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
