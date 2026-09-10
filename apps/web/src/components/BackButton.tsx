import { useNavigate } from 'react-router-dom';

export function BackButton({ fallback }: { fallback: string }) {
  const navigate = useNavigate();

  return (
    <button
      className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      type="button"
      onClick={() => {
        const index = window.history.state?.idx;
        if (typeof index === 'number' && index > 0) {
          navigate(-1);
          return;
        }
        navigate(fallback);
      }}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 4.5 7 10l5.5 5.5M7 10h9" />
      </svg>
      Back
    </button>
  );
}
