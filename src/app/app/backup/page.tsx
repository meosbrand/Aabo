
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileClock, HardDrive, PlusCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Represents the structure of a single backup history entry.
 */
const backupHistory = [
  { date: "2023-10-26", type: "Full System", size: "5.2 GB", status: "Completed", statusPidgin: "Done Wella" },
  { date: "2023-10-19", type: "Full System", size: "5.1 GB", status: "Completed", statusPidgin: "Done Wella" },
  { date: "2023-10-12", type: "Contacts", size: "128 MB", status: "Completed", statusPidgin: "Done Wella" },
  { date: "2023-10-10", type: "Photos", size: "1.5 GB", status: "Failed", statusPidgin: "E Fail" },
  { date: "2023-10-05", type: "Full System", size: "4.8 GB", status: "Completed", statusPidgin: "Done Wella" },
];

/**
 * Renders the Backup Center page.
 * This page displays the current backup status, storage usage, and a history of past backups.
 * It supports both English and Pidgin languages.
 * @returns {JSX.Element} The BackupPage component.
 */
export default function BackupPage() {
    // Retrieves language context for translations.
    const { language, t } = useLanguage();
    // Gets the translated strings for the current language.
    const T = t.backup[language];

  return (
    <div className="space-y-8">
      {/* Header section with page title and New Backup button */}
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">{T.title}</h1>
            <p className="text-muted-foreground">{T.description}</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4"/>
            {T.newBackup}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backup Status Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileClock className="text-primary"/>{T.statusTitle}</CardTitle>
            <CardDescription>{T.statusDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{T.lastBackup} <span className="font-normal">October 26, 2023</span></p>
            <p className="font-semibold mt-2">{T.nextBackup} <span className="font-normal">November 2, 2023</span></p>
            <Button variant="outline" className="mt-4">{T.manualBackup}</Button>
          </CardContent>
        </Card>
        {/* Storage Usage Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HardDrive className="text-primary"/>{T.storageTitle}</CardTitle>
            <CardDescription>{T.storageDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={45} className="h-3"/>
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>{T.storageUsed} 6.8 GB</span>
                <span>{T.storageTotal} 15 GB</span>
            </div>
            <Button variant="secondary" className="mt-4">{T.manageStorage}</Button>
          </CardContent>
        </Card>
      </div>

      {/* Backup History Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{T.historyTitle}</CardTitle>
          <CardDescription>{T.historyDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{T.date}</TableHead>
                <TableHead>{T.type}</TableHead>
                <TableHead>{T.size}</TableHead>
                <TableHead>{T.status}</TableHead>
                <TableHead className="text-right">{T.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupHistory.map((backup, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{backup.date}</TableCell>
                  <TableCell>{backup.type}</TableCell>
                  <TableCell>{backup.size}</TableCell>
                  <TableCell>
                    {/* Badge color and text changes based on status and language */}
                    <Badge variant={backup.status === "Completed" ? "default" : "destructive"} className={backup.status === "Completed" ? "bg-green-600" : ""}>
                      {language === 'pidgin' ? backup.statusPidgin : backup.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">{T.details}</Button>
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
