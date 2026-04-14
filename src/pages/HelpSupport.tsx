import { Layout } from '@/components/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { HelpCircle, BookOpen, CreditCard, UserCog, Mail } from 'lucide-react';

const faqs = [
  { q: 'How do I enroll in a course?', a: 'Browse the Courses page, select a course, and click "Enroll Now". Complete the payment to get instant access.' },
  { q: 'Can I access courses on mobile?', a: 'Yes! EduFlow is fully responsive and works on all devices — phone, tablet, or desktop.' },
  { q: 'How do quizzes work?', a: 'Each lesson may have a quiz at the end. Submit your answers and get instant results with your score.' },
  { q: 'What payment methods are accepted?', a: 'We accept all major payment methods through Razorpay, including UPI, cards, and net banking.' },
  { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page, enter your email, and follow the reset link sent to your inbox.' },
  { q: 'Can I get a refund?', a: 'Please contact our support team within 7 days of enrollment for refund requests.' },
];

const categories = [
  { icon: BookOpen, title: 'Courses & Lessons', desc: 'Enrollment, content access, and progress tracking.' },
  { icon: CreditCard, title: 'Payments & Billing', desc: 'Payment issues, refunds, and invoices.' },
  { icon: UserCog, title: 'Account & Profile', desc: 'Account settings, password, and profile management.' },
];

export default function HelpSupport() {
  return (
    <Layout>
      <section className="py-16">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold font-display mb-4">Help & Support</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions or get in touch with our support team.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {categories.map((cat) => (
              <Card key={cat.title} className="text-center hover:shadow-elevated transition-shadow">
                <CardContent className="pt-6">
                  <cat.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold mb-1">{cat.title}</h3>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-12">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                    <AccordionContent>{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <div className="text-center rounded-2xl bg-secondary p-8">
            <Mail className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h2 className="text-xl font-bold font-display mb-2">Still need help?</h2>
            <p className="text-muted-foreground mb-4">Our support team is here for you.</p>
            <Link to="/contact">
              <Button className="gradient-primary text-primary-foreground border-0">Contact Support</Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
