import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from '@/components/SettingsModal';
import { DEFAULT_SYSTEM_PROMPT, loadSettings, saveSettings } from '@/lib/settingsStorage';

beforeEach(() => {
  localStorage.clear();
});

describe('SettingsModal', () => {
  it('loads current settings into the form when opened', () => {
    saveSettings({ apiKey: 'key-xyz', model: 'gemini-2.5-pro', systemPrompt: 'custom prompt' });
    render(<SettingsModal open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByLabelText('Gemini API Key') as HTMLInputElement).value).toBe('key-xyz');
    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('gemini-2.5-pro');
    expect((screen.getByLabelText('系統提示詞') as HTMLTextAreaElement).value).toBe('custom prompt');
  });

  it('saves form values and invokes onSaved + onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<SettingsModal open={true} onClose={onClose} onSaved={onSaved} />);

    await user.type(screen.getByLabelText('Gemini API Key'), 'new-key');
    await user.click(screen.getByRole('button', { name: '儲存' }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();
    expect(loadSettings().apiKey).toBe('new-key');
  });

  it('does not write localStorage when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText('Gemini API Key'), 'tmp');
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(loadSettings().apiKey).toBe('');
  });

  it('blocks saving with an empty system prompt and shows inline error', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<SettingsModal open={true} onClose={vi.fn()} onSaved={onSaved} />);

    const textarea = screen.getByLabelText('系統提示詞');
    await user.clear(textarea);
    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(screen.getByText('系統提示詞不可為空')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('restore-default button resets only the system prompt field', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={vi.fn()} onSaved={vi.fn()} />);

    const textarea = screen.getByLabelText('系統提示詞') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, 'temporary');
    await user.type(screen.getByLabelText('Gemini API Key'), 'k');

    await user.click(screen.getByRole('button', { name: '恢復預設' }));

    expect(textarea.value).toBe(DEFAULT_SYSTEM_PROMPT);
    expect((screen.getByLabelText('Gemini API Key') as HTMLInputElement).value).toBe('k');
  });
});
