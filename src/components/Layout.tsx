import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, LogOut, User, LayoutDashboard } from 'lucide-react';

export function Layout({ children }: { children: ReactNode }) {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const dashboardPath = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor' : '/student';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="gradient-primary rounded-lg p-2">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-display">EduFlow</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link to="/courses" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Courses
            </Link>
            {user ? (
              <>
                <Link to={dashboardPath}>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
                    <User className="h-3.5 w-3.5" />
                    <span className="font-medium">{profile?.first_name || 'User'}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full gradient-primary text-primary-foreground capitalize">{role}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <Link to="/login">
                <Button size="sm" className="gradient-primary text-primary-foreground border-0">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-8 bg-card">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} EduFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
