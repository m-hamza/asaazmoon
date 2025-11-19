import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { UserCog, ShieldCheck } from 'lucide-react';

export default function RoleSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasRole, setHasRole] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;

    try {
      // Check if user has a role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleData) {
        setHasRole(true);
        navigate('/');
        return;
      }

      // Check if any admin exists
      const { data: adminData } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      setIsFirstUser(!adminData || adminData.length === 0);
    } catch (error) {
      console.error('Error checking role:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (role: 'admin' | 'teacher') => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role });

      if (error) throw error;

      toast.success(`نقش ${role === 'admin' ? 'مدیر' : 'معلم'} با موفقیت تخصیص داده شد`);
      navigate('/');
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error('خطا در تخصیص نقش: ' + (error.message || 'خطای ناشناخته'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <UserCog className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">تخصیص نقش کاربری</CardTitle>
          <CardDescription>
            {isFirstUser 
              ? 'شما اولین کاربر سیستم هستید. لطفاً نقش خود را انتخاب کنید.'
              : 'برای استفاده از سیستم، نیاز به تخصیص نقش دارید.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFirstUser ? (
            <>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">شما اولین کاربر هستید!</p>
                    <p className="text-xs">می‌توانید خود را به عنوان مدیر یا معلم تخصیص دهید.</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => assignRole('admin')}
                disabled={loading}
                className="w-full"
                variant="default"
              >
                ثبت به عنوان مدیر
              </Button>

              <Button
                onClick={() => assignRole('teacher')}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                ثبت به عنوان معلم
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                لطفاً از مدیر سیستم بخواهید نقش شما را تخصیص دهد.
              </p>
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className="w-full"
              >
                بازگشت به صفحه ورود
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
