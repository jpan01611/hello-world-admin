'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';

export default function ClickableTableRow({ href, children }: { href: Route; children: ReactNode }) {
    const router = useRouter();

    const prefetch = () => router.prefetch(href);

    const navigate = (event: MouseEvent<HTMLTableRowElement>) => {
        const target = event.target as HTMLElement;
        if (target.closest('a, button, input, select, textarea')) return;
        router.push(href);
    };

    const navigateWithKeyboard = (event: KeyboardEvent<HTMLTableRowElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const target = event.target as HTMLElement;
        if (target.closest('a, button, input, select, textarea')) return;
        event.preventDefault();
        router.push(href);
    };

    return <tr className="clickable-row" role="link" tabIndex={0} onMouseEnter={prefetch} onFocus={prefetch} onClick={navigate} onKeyDown={navigateWithKeyboard}>{children}</tr>;
}
