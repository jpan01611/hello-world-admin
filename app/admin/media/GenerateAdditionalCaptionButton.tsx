'use client';

import { useFormStatus } from 'react-dom';
import { generateAdditionalCaption } from '@/lib/admin-actions';

function SubmitButton() {
    const { pending } = useFormStatus();
    return <button className="button" type="submit" disabled={pending}>
        {pending ? 'Generating caption...' : 'Generate another caption'}
    </button>;
}

export default function GenerateAdditionalCaptionButton({ captionId }: { captionId: string }) {
    return <form action={generateAdditionalCaption.bind(null, captionId)} className="inline-form">
        <SubmitButton />
    </form>;
}
