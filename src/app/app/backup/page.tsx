import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileClock, HardDrive, PlusCircle } from "lucide-react";

const backupHistory = [
  { date: "2023-10-26", type: "Full System", size: "5.2 GB", status: "Completed" },
  { date: "2023-10-19", type: "Full System", size: "5.1 GB", status: "Completed" },
  { date: "2023-10-12", type: "Contacts", size: "128 MB", status: "Completed" },
  { date: "2023-10-10", type: "Photos", size: "1.5 GB", status: "Failed" },
  { date: "2023-10-05", type: "Full System", size: "4.8 GB", status: "Completed" },
];

export default function BackupPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Backup Center</h1>
            <p className="text-muted-foreground">Manage and monitor your data backups.</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4"/>
            New Backup
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileClock className="text-primary"/>Backup Status</CardTitle>
            <CardDescription>Your last backup was successful.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">Last Backup: <span className="font-normal">October 26, 2023</span></p>
            <p className="font-semibold mt-2">Next Scheduled Backup: <span className="font-normal">November 2, 2023</span></p>
            <Button variant="outline" className="mt-4">Run Manual Backup</Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HardDrive className="text-primary"/>Storage Usage</CardTitle>
            <CardDescription>You are using 6.8 GB of 15 GB.</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={45} className="h-3"/>
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>Used: 6.8 GB</span>
                <span>Total: 15 GB</span>
            </div>
            <Button variant="secondary" className="mt-4">Manage Storage</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>View your past backup activities and statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupHistory.map((backup, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{backup.date}</TableCell>
                  <TableCell>{backup.type}</TableCell>
                  <TableCell>{backup.size}</TableCell>
                  <TableCell>
                    <Badge variant={backup.status === "Completed" ? "default" : "destructive"} className={backup.status === "Completed" ? "bg-green-600" : ""}>
                      {backup.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
