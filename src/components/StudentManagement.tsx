import { useState } from "react";
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
import { School, Upload, UserPlus, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
}

interface ClassGrade {
  id: string;
  name: string;
  students: Student[];
}

interface SchoolInfo {
  name: string;
  address: string;
  principal: string;
}

export const StudentManagement = () => {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [classes, setClasses] = useState<ClassGrade[]>([]);
  const [isSchoolDialogOpen, setIsSchoolDialogOpen] = useState(false);
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [isManualEntryDialogOpen, setIsManualEntryDialogOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  
  // School info form
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolPrincipal, setSchoolPrincipal] = useState("");
  
  // Class form
  const [className, setClassName] = useState("");
  
  // Manual entry form
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualFirstName, setManualFirstName] = useState("");
  const [manualLastName, setManualLastName] = useState("");

  const handleSchoolInfoSubmit = () => {
    if (!schoolName.trim()) {
      toast.error("نام مدرسه را وارد کنید");
      return;
    }

    setSchoolInfo({
      name: schoolName,
      address: schoolAddress,
      principal: schoolPrincipal,
    });
    setIsSchoolDialogOpen(false);
    toast.success("اطلاعات مدرسه ثبت شد");
  };

  const handleAddClass = () => {
    if (!className.trim()) {
      toast.error("نام پایه را وارد کنید");
      return;
    }

    const newClass: ClassGrade = {
      id: Date.now().toString(),
      name: className,
      students: [],
    };

    setClasses([...classes, newClass]);
    setClassName("");
    setIsAddClassDialogOpen(false);
    toast.success(`پایه ${className} اضافه شد`);
  };

  const handleDeleteClass = (classId: string) => {
    setClasses(classes.filter((c) => c.id !== classId));
    toast.success("پایه حذف شد");
  };

  const handleExcelUpload = (classId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const students: Student[] = jsonData.map((row: any, index: number) => ({
          id: `${classId}-${Date.now()}-${index}`,
          studentId: row["کد داوطلبی"] || row["studentId"] || "",
          firstName: row["نام"] || row["firstName"] || "",
          lastName: row["نام خانوادگی"] || row["lastName"] || "",
        }));

        setClasses(
          classes.map((c) =>
            c.id === classId ? { ...c, students: [...c.students, ...students] } : c
          )
        );

        toast.success(`${students.length} دانش‌آموز به پایه اضافه شد`);
      } catch (error) {
        console.error("Error reading Excel file:", error);
        toast.error("خطا در خواندن فایل اکسل");
      }
    };
    reader.readAsBinaryString(file);
    event.target.value = "";
  };

  const handleManualEntry = () => {
    if (!selectedClassId) {
      toast.error("ابتدا یک پایه انتخاب کنید");
      return;
    }

    if (!manualStudentId.trim() || !manualFirstName.trim() || !manualLastName.trim()) {
      toast.error("تمام فیلدها را پر کنید");
      return;
    }

    const newStudent: Student = {
      id: `${selectedClassId}-${Date.now()}`,
      studentId: manualStudentId,
      firstName: manualFirstName,
      lastName: manualLastName,
    };

    setClasses(
      classes.map((c) =>
        c.id === selectedClassId ? { ...c, students: [...c.students, newStudent] } : c
      )
    );

    setManualStudentId("");
    setManualFirstName("");
    setManualLastName("");
    setIsManualEntryDialogOpen(false);
    toast.success("دانش‌آموز اضافه شد");
  };

  const handleDeleteStudent = (classId: string, studentId: string) => {
    setClasses(
      classes.map((c) =>
        c.id === classId
          ? { ...c, students: c.students.filter((s) => s.id !== studentId) }
          : c
      )
    );
    toast.success("دانش‌آموز حذف شد");
  };

  const exportToExcel = (classId?: string) => {
    let dataToExport: any[] = [];

    if (classId) {
      // Export specific class
      const selectedClass = classes.find((c) => c.id === classId);
      if (selectedClass) {
        dataToExport = selectedClass.students.map((s) => ({
          "کد داوطلبی": s.studentId,
          نام: s.firstName,
          "نام خانوادگی": s.lastName,
          پایه: selectedClass.name,
        }));
      }
    } else {
      // Export all classes
      classes.forEach((cls) => {
        cls.students.forEach((s) => {
          dataToExport.push({
            "کد داوطلبی": s.studentId,
            نام: s.firstName,
            "نام خانوادگی": s.lastName,
            پایه: cls.name,
          });
        });
      });
    }

    if (dataToExport.length === 0) {
      toast.error("داده‌ای برای خروجی وجود ندارد");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const fileName = classId
      ? `${classes.find((c) => c.id === classId)?.name || "class"}_students.xlsx`
      : "all_students.xlsx";

    XLSX.writeFile(workbook, fileName);
    toast.success("فایل اکسل ذخیره شد");
  };

  return (
    <div className="space-y-6">
      {/* School Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            اطلاعات مدرسه
          </CardTitle>
          <CardDescription>
            ابتدا اطلاعات مدرسه را وارد کنید
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schoolInfo ? (
            <div className="space-y-2">
              <p><strong>نام مدرسه:</strong> {schoolInfo.name}</p>
              <p><strong>آدرس:</strong> {schoolInfo.address || "ندارد"}</p>
              <p><strong>مدیر:</strong> {schoolInfo.principal || "ندارد"}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">هنوز اطلاعاتی ثبت نشده است</p>
          )}
        </CardContent>
        <CardFooter>
          <Dialog open={isSchoolDialogOpen} onOpenChange={setIsSchoolDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                {schoolInfo ? "ویرایش اطلاعات" : "ثبت اطلاعات مدرسه"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>اطلاعات مدرسه</DialogTitle>
                <DialogDescription>
                  اطلاعات مدرسه را وارد کنید
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="school-name">نام مدرسه *</Label>
                  <Input
                    id="school-name"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="مثال: دبیرستان شهید بهشتی"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-address">آدرس</Label>
                  <Input
                    id="school-address"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="آدرس مدرسه"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-principal">نام مدیر</Label>
                  <Input
                    id="school-principal"
                    value={schoolPrincipal}
                    onChange={(e) => setSchoolPrincipal(e.target.value)}
                    placeholder="نام مدیر مدرسه"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSchoolInfoSubmit}>ثبت اطلاعات</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>

      {/* Classes Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>مدیریت پایه‌ها</CardTitle>
              <CardDescription>
                پایه‌های تحصیلی را اضافه و مدیریت کنید
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddClassDialogOpen} onOpenChange={setIsAddClassDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    افزودن پایه
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>افزودن پایه جدید</DialogTitle>
                    <DialogDescription>
                      نام پایه تحصیلی را وارد کنید
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="class-name">نام پایه *</Label>
                      <Input
                        id="class-name"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="مثال: پایه هفتم"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddClass}>افزودن پایه</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {classes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToExcel()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  خروجی کلی
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              هنوز پایه‌ای اضافه نشده است
            </p>
          ) : (
            <div className="space-y-6">
              {classes.map((cls) => (
                <Card key={cls.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{cls.name}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportToExcel(cls.id)}
                          disabled={cls.students.length === 0}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          خروجی
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClassId(cls.id);
                            setIsManualEntryDialogOpen(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          ثبت دستی
                        </Button>
                        <label htmlFor={`upload-${cls.id}`}>
                          <Button variant="outline" size="sm" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              آپلود اکسل
                            </span>
                          </Button>
                          <input
                            id={`upload-${cls.id}`}
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={(e) => handleExcelUpload(cls.id, e)}
                          />
                        </label>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClass(cls.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      تعداد دانش‌آموزان: {cls.students.length}
                    </CardDescription>
                  </CardHeader>
                  {cls.students.length > 0 && (
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>کد داوطلبی</TableHead>
                            <TableHead>نام</TableHead>
                            <TableHead>نام خانوادگی</TableHead>
                            <TableHead className="text-left">عملیات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cls.students.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell>{student.studentId}</TableCell>
                              <TableCell>{student.firstName}</TableCell>
                              <TableCell>{student.lastName}</TableCell>
                              <TableCell className="text-left">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteStudent(cls.id, student.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      <Dialog open={isManualEntryDialogOpen} onOpenChange={setIsManualEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ثبت دستی دانش‌آموز</DialogTitle>
            <DialogDescription>
              اطلاعات دانش‌آموز را وارد کنید
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manual-student-id">کد داوطلبی *</Label>
              <Input
                id="manual-student-id"
                value={manualStudentId}
                onChange={(e) => setManualStudentId(e.target.value)}
                placeholder="کد داوطلبی"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-first-name">نام *</Label>
              <Input
                id="manual-first-name"
                value={manualFirstName}
                onChange={(e) => setManualFirstName(e.target.value)}
                placeholder="نام"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-last-name">نام خانوادگی *</Label>
              <Input
                id="manual-last-name"
                value={manualLastName}
                onChange={(e) => setManualLastName(e.target.value)}
                placeholder="نام خانوادگی"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleManualEntry}>افزودن دانش‌آموز</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
