import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'TEAM APK Election Command Centre',description:'TEAM APK campaign operations and readiness dashboard'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
