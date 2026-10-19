type CaptionCandidate = {
    id: string;
    created_at: string | null;
    score: number;
};

export function selectFeedCaption(captions: CaptionCandidate[], selectedCaptionId: string | null) {
    if (selectedCaptionId && captions.some((caption) => caption.id === selectedCaptionId)) {
        return selectedCaptionId;
    }

    return [...captions]
        .sort((a, b) =>
            b.score - a.score ||
            (b.created_at ?? '').localeCompare(a.created_at ?? '') ||
            b.id.localeCompare(a.id),
        )[0]?.id ?? null;
}
