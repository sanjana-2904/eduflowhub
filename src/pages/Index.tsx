import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Award, PlayCircle, ArrowRight } from 'lucide-react';

const features = [
  { icon: BookOpen, title: 'Rich Course Content', desc: 'Video, PDF, and text-based lessons organized by course.' },
  { icon: Users, title: 'Expert Instructors', desc: 'Learn from qualified professionals in every field.' },
  { icon: Award, title: 'Quizzes & Certificates', desc: 'Test knowledge with quizzes and track your progress.' },
  { icon: PlayCircle, title: 'Learn at Your Pace', desc: 'Access content anytime, anywhere, on any device.' },
];

export default function Index() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight">
              Unlock Your Potential with{' '}
              <span className="gradient-text">EduFlow</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A modern e-learning platform where students enroll in courses, access lessons,
              attempt quizzes — and instructors build the future of education.
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link to="/register">
                <Button size="lg" className="gradient-primary text-primary-foreground border-0 gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/courses">
                <Button size="lg" variant="outline">Browse Courses</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card">
        <div className="container">
          <h2 className="text-3xl font-bold font-display text-center mb-12">Why Choose EduFlow?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-xl bg-background border shadow-card hover:shadow-elevated transition-shadow group">
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold font-display text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-2xl gradient-primary p-12 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold font-display mb-4">Ready to Start Learning?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
              Join thousands of students and instructors on EduFlow today.
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="font-semibold">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
