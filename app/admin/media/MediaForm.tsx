import type { ReactNode } from 'react';

type MediaFormProps = {
    action: (formData: FormData) => void | Promise<void>;
    media?: { image_url: string; description: string; caption: string; vision_prompt: string | null; caption_prompt: string | null };
    children?: ReactNode;
};

export default function MediaForm({ action, media, children }: MediaFormProps) {
    return <form action={action} className="form-grid">
        <label>Image URL<input name="image_url" type="url" required defaultValue={media?.image_url} placeholder="https://..." /></label>
        <label>Caption<textarea name="caption" required defaultValue={media?.caption} /></label>
        <label>Description<textarea name="description" required defaultValue={media?.description} /></label>
        <label>Vision prompt<textarea name="vision_prompt" defaultValue={media?.vision_prompt ?? ''} /></label>
        <label>Caption prompt<textarea name="caption_prompt" defaultValue={media?.caption_prompt ?? ''} /></label>
        <div>{children}<button className="button" type="submit">Save media</button></div>
    </form>;
}
