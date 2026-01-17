import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  // Admin-only system - redirect to dashboard if logged in, otherwise to login
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  
  if (token) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
  
  return null;
}
