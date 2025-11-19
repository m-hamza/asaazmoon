import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingRole, setCheckingRole] = useState(true);
  const [hasRole, setHasRole] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        setHasRole(!!data);
      } catch (error) {
        setHasRole(false);
      } finally {
        setCheckingRole(false);
      }
    };

    checkRole();
  }, [user]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user doesn't have a role and is not on role-setup page, redirect to role-setup
  if (!hasRole && location.pathname !== '/role-setup') {
    return <Navigate to="/role-setup" replace />;
  }

  // If user has a role and is on role-setup page, redirect to home
  if (hasRole && location.pathname === '/role-setup') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
