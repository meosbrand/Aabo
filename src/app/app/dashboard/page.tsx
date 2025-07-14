import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Bot, FileClock, History, User, AlertCircle } from "lucide-react";
import Link from 'next/link';

const recentActivity = [
    { icon: <User className="w-5 h-5 text-blue-500" />, text: "Profile updated successfully.", time: "2 min ago" },
    { icon: <FileClock className="w-5 h-5 text-green-500" />, text: "Weekly backup completed.", time: "1 hour ago" },
    { icon: <AlertCircle className="w-5 h-5 text-yellow-500" />, text: "Unusual sign-in attempt blocked.", time: "3 hours ago" },
    { icon: <Bot className="w-5 h-5 text-purple-500" />, text: "Asked Co-Pilot about phishing.", time: "1 day ago" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold">Good Morning!</h1>
            <p className="text-muted-foreground">Here's your security overview for today.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary"/> Protection Status</CardTitle>
                    <CardDescription>Your digital shield is 90% active.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Progress value={90} className="h-3" />
                    <p className="text-sm text-muted-foreground mt-2">Complete your profile to reach 100%.</p>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bot className="text-primary"/> Ààbò Co-Pilot</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center">
                    <p className="text-sm text-muted-foreground mb-4">Have a security question? Just ask.</p>
                    <Button asChild>
                        <Link href="/app/copilot">Start Chat</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="text-primary"/>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {recentActivity.map((activity, index) => (
                            <li key={index} className="flex items-center gap-4">
                                <div className="p-2 bg-secondary rounded-full">
                                    {activity.icon}
                                </div>
                                <div className="flex-grow">
                                    <p className="font-medium">{activity.text}</p>
                                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Get things done with one click.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 flex-col gap-1">
                        <FileClock />
                        <span>Start Backup</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-1">
                        <ShieldCheck />
                        <span>Run Security Scan</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-1">
                        <User />
                        <span>Update Profile</span>
                    </Button>
                    <Button variant="destructive" className="h-20 flex-col gap-1">
                        <AlertCircle />
                        <span>Panic Mode</span>
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
