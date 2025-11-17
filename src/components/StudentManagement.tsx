import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { School, Upload, UserPlus, Download, Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useSchool } from "@/hooks/useSchool";
import { useStudents } from "@/hooks/useStudents";
import { AnswerSheetGenerator, downloadPDF } from "@/lib/answerSheetGenerator";

export const StudentManagement = () => {
  const { school, classes, loading: schoolLoading, saveSchool, addClass, deleteClass } = useSchool();
  const { students, loading: studentsLoading, addStudent, addMultipleStudents, deleteStudent, refreshStudents, getAllStudents } = useStudents();
  
  const [isSchoolDialogOpen, setIsSchoolDialogOpen] = useState(false);
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [isManualEntryDialogOpen, setIsManualEntryDialogOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolPrincipal, setSchoolPrincipal] = useState("");
  const [className, setClassName] = useState("");
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualFirstName, setManualFirstName] = useState("");
  const [manualLastName, setManualLastName] = useState("");

  useEffect(() => {
    if (school) {
      setSchoolName(school.name);
      setSchoolAddress(school.address || "");
      setSchoolPrincipal(school.principal || "");
    }
  }, [school]);

  useEffect(() => {
    if (selectedClassId) {
      refreshStudents(selectedClassId);
    }
  }, [selectedClassId]);

  const handleSchoolInfoSubmit = async () => {
    if (!schoolName.trim()) {
      toast.error("نام مدرسه را وارد کنید");
      return;
    }

    try {
      await saveSchool({
        name: schoolName,
        address: schoolAddress || undefined,
        principal: schoolPrincipal || undefined
      });
      setIsSchoolDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleAddClass = async () => {
    if (!className.trim()) {
      toast.error("نام کلاس را وارد کنید");
      return;
    }

    if (!school) {
      toast.error("ابتدا اطلاعات مدرسه را ثبت کنید");
      return;
    }

    try {
      await addClass({
        school_id: school.id,
        name: className,
        grade: className
      });
      setClassName("");
      setIsAddClassDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (confirm("آیا از حذف این کلاس اطمینان دارید؟ تمام دانش‌آموزان این کلاس نیز حذف خواهند شد.")) {
      try {
        await deleteClass(classId);
        if (selectedClassId === classId) {
          setSelectedClassId("");
        }
      } catch (error) {
        // Error handled in hook
      }
    }
  };

  const handleManualEntry = async () => {
    if (!manualStudentId.trim() || !manualFirstName.trim() || !manualLastName.trim()) {
      toast.error("تمام فیلدها را پر کنید");
      return;
    }

    if (!selectedClassId) {
      toast.error("ابتدا یک کلاس انتخاب کنید");
      return;
    }

    try {
      await addStudent({
        class_id: selectedClassId,
        student_id: manualStudentId,
        first_name: manualFirstName,
        last_name: manualLastName
      });
      
      setManualStudentId("");
      setManualFirstName("");
      setManualLastName("");
      setIsManualEntryDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedClassId) {
      toast.error("ابتدا یک کلاس انتخاب کنید");
      event.target.value = "";
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const studentsData = jsonData.map((row) => ({
        class_id: selectedClassId,
        student_id: String(row["کد داوطلبی"] || row["student_id"] || ""),
        first_name: String(row["نام"] || row["first_name"] || ""),
        last_name: String(row["نام خانوادگی"] || row["last_name"] || "")
      })).filter(s => s.student_id && s.first_name && s.last_name);

      if (studentsData.length === 0) {
        toast.error("هیچ داده معتبری یافت نشد");
        event.target.value = "";
        return;
      }

      await addMultipleStudents(studentsData);
      event.target.value = "";
    } catch (error) {
      console.error("Error processing Excel:", error);
      toast.error("خطا در پردازش فایل اکسل");
      event.target.value = "";
    }
  };

  const handleExportClass = async () => {
    if (!selectedClassId) {
      toast.error("ابتدا یک کلاس انتخاب کنید");
      return;
    }

    const classData = classes.find(c => c.id === selectedClassId);
    if (!classData) return;
    
    const ws = XLSX.utils.json_to_sheet(
      students.map(s => ({
        "کد داوطلبی": s.student_id,
        "نام": s.first_name,
        "نام خانوادگی": s.last_name,
        "کلاس": classData.name
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `${classData.name}_students.xlsx`);
    toast.success("فایل با موفقیت دانلود شد");
  };

  const handleExportAll = async () => {
    const allStudents = await getAllStudents();
    
    const studentsWithClass = allStudents.map(s => {
      const studentClass = classes.find(c => c.id === s.class_id);
      return {
        "کد داوطلبی": s.student_id,
        "نام": s.first_name,
        "نام خانوادگی": s.last_name,
        "کلاس": studentClass?.name || "نامشخص"
      };
    });

    const ws = XLSX.utils.json_to_sheet(studentsWithClass);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Students");
    XLSX.writeFile(wb, `${school?.name || "school"}_all_students.xlsx`);
    toast.success("فایل با موفقیت دانلود شد");
  };

  const handleGenerateAnswerSheet = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    setIsGeneratingPDF(true);
    try {
      const generator = new AnswerSheetGenerator({
        schoolName: school?.name,
        examTitle: "پاسخنامه آزمون"
      });

      const pdfBlob = await generator.generateForStudent({
        id: student.id,
        studentId: student.student_id,
        firstName: student.first_name,
        lastName: student.last_name,
        className: classes.find(c => c.id === student.class_id)?.name || ""
      });

      downloadPDF(pdfBlob, `answer-sheet-${student.student_id}.pdf`);
      toast.success("پاسخبرگ با موفقیت دانلود شد");
    } catch (error) {
      console.error("Error generating answer sheet:", error);
      toast.error("خطا در تولید پاسخبرگ");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateAllAnswerSheets = async () => {
    if (!selectedClassId) {
      toast.error("ابتدا یک کلاس انتخاب کنید");
      return;
    }

    const classData = classes.find(c => c.id === selectedClassId);
    if (!classData || students.length === 0) {
      toast.error("دانش‌آموزی برای این کلاس وجود ندارد");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const generator = new AnswerSheetGenerator({
        schoolName: school?.name,
        examTitle: "پاسخنامه آزمون"
      });

      const studentsData = students.map(s => ({
        id: s.id,
        studentId: s.student_id,
        firstName: s.first_name,
        lastName: s.last_name,
        className: classData.name
      }));

      const pdfBlob = await generator.generateForMultipleStudents(studentsData);
      downloadPDF(pdfBlob, `answer-sheets-${classData.name}.pdf`);
      toast.success(`${students.length} پاسخبرگ با موفقیت دانلود شد`);
    } catch (error) {
      console.error("Error generating answer sheets:", error);
      toast.error("خطا در تولید پاسخبرگ‌ها");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (schoolLoading) {
    return <div className="flex justify-center p-8">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            اطلاعات مدرسه
          </CardTitle>
          <CardDescription>
            {school ? "اطلاعات مدرسه ثبت شده است" : "ابتدا اطلاعات مدرسه را وارد کنید"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {school ? (
            <div className="space-y-2">
              <p><strong>نام مدرسه:</strong> {school.name}</p>
              {school.address && <p><strong>آدرس:</strong> {school.address}</p>}
              {school.principal && <p><strong>مدیر:</strong> {school.principal}</p>}
            </div>
          ) : (
            <p className="text-muted-foreground">هنوز اطلاعاتی ثبت نشده است</p>
          )}
        </CardContent>
        <CardFooter>
          <Dialog open={isSchoolDialogOpen} onOpenChange={setIsSchoolDialogOpen}>
            <DialogTrigger asChild>
              <Button>{school ? "ویرایش اطلاعات" : "ثبت اطلاعات مدرسه"}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>اطلاعات مدرسه</DialogTitle>
                <DialogDescription>اطلاعات مدرسه را وارد کنید</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="schoolName">نام مدرسه *</Label>
                  <Input
                    id="schoolName"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="مثال: دبیرستان علامه طباطبایی"
                  />
                </div>
                <div>
                  <Label htmlFor="schoolAddress">آدرس</Label>
                  <Input
                    id="schoolAddress"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="آدرس مدرسه"
                  />
                </div>
                <div>
                  <Label htmlFor="schoolPrincipal">نام مدیر</Label>
                  <Input
                    id="schoolPrincipal"
                    value={schoolPrincipal}
                    onChange={(e) => setSchoolPrincipal(e.target.value)}
                    placeholder="نام مدیر مدرسه"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSchoolInfoSubmit}>ذخیره</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مدیریت کلاس‌ها</CardTitle>
          <CardDescription>کلاس‌های مدرسه را اضافه و مدیریت کنید</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog open={isAddClassDialogOpen} onOpenChange={setIsAddClassDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!school}>
                <Plus className="h-4 w-4 mr-2" />
                افزودن کلاس
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>افزودن کلاس جدید</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="className">نام کلاس *</Label>
                  <Input
                    id="className"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="مثال: پایه هفتم"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddClass}>افزودن</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {classes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <Card key={cls.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{cls.name}</CardTitle>
                  </CardHeader>
                  <CardFooter className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedClassId === cls.id ? "default" : "outline"}
                      onClick={() => setSelectedClassId(cls.id)}
                    >
                      انتخاب
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClass(cls.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClassId && (
        <Card>
          <CardHeader>
            <CardTitle>
              دانش‌آموزان کلاس {classes.find(c => c.id === selectedClassId)?.name}
            </CardTitle>
            <CardDescription>مدیریت دانش‌آموزان این کلاس</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Dialog open={isManualEntryDialogOpen} onOpenChange={setIsManualEntryDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    ثبت دستی
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ثبت دانش‌آموز</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="studentId">کد داوطلبی *</Label>
                      <Input
                        id="studentId"
                        value={manualStudentId}
                        onChange={(e) => setManualStudentId(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="firstName">نام *</Label>
                      <Input
                        id="firstName"
                        value={manualFirstName}
                        onChange={(e) => setManualFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">نام خانوادگی *</Label>
                      <Input
                        id="lastName"
                        value={manualLastName}
                        onChange={(e) => setManualLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleManualEntry}>ثبت</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  آپلود اکسل
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                </label>
              </Button>

              <Button variant="outline" onClick={handleExportClass}>
                <Download className="h-4 w-4 mr-2" />
                خروجی اکسل
              </Button>

              <Button 
                variant="outline" 
                onClick={handleGenerateAllAnswerSheets}
                disabled={isGeneratingPDF || students.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? "در حال تولید..." : "تولید پاسخبرگ همه"}
              </Button>
            </div>

            {studentsLoading ? (
              <div className="text-center p-4">در حال بارگذاری...</div>
            ) : students.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>کد داوطلبی</TableHead>
                    <TableHead>نام</TableHead>
                    <TableHead>نام خانوادگی</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{student.first_name}</TableCell>
                      <TableCell>{student.last_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateAnswerSheet(student.id)}
                            disabled={isGeneratingPDF}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteStudent(student.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground p-4">
                هنوز دانش‌آموزی ثبت نشده است
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>خروجی کلی</CardTitle>
            <CardDescription>دریافت لیست تمام دانش‌آموزان مدرسه</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleExportAll}>
              <Download className="h-4 w-4 mr-2" />
              خروجی اکسل کل مدرسه
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};
