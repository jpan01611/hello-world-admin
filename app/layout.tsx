import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'FunFunFunSahur Admin',
    description: 'Administration for the FunFunFunSahur AI media application',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
