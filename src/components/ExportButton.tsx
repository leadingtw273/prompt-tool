import type { AssembledPrompt } from '@/types';

interface Props {
  prompts: AssembledPrompt[];
  filename?: string;
}

export function ExportButton({ prompts, filename = 'prompts.txt' }: Props) {
  function handleClick() {
    const content = prompts
      .map((p) => `# ${p.orderId} × ${p.compCode} (${p.estimatedWords} words)\n${p.prompt}`)
      .join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={prompts.length === 0}
      className="rounded border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
    >
      Download all prompts.txt
    </button>
  );
}
