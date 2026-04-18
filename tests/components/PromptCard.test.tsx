import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptCard } from '@/components/PromptCard';

const samplePrompt =
  'medium shot, front view, centered, direct gaze, luna_face, an adult woman, ' +
  'featuring a distinctive small mole on her right cheek, ' +
  'wearing striped button-up shirt, in cozy cafe interior, ' +
  'sitting on chair, gentle smile, warm side lighting, realistic photography, ' +
  'fully clothed, safe for work, no text, no watermark, ' +
  'correct human anatomy, no tattoo, no glasses, no short hair';

const baseProps = {
  orderCode: 'CAS-02_SCN-01_POS-04_EXP-01_COMP-03',
  tier: 'T0' as const,
  comboLabel: '條紋襯衫_咖啡廳_坐姿_微笑_半身正面',
  prompt: samplePrompt,
  isConfigured: true,
  onOptimize: vi.fn(),
};

describe('PromptCard', () => {
  it('renders only the 原始提示詞 section before optimization', () => {
    render(<PromptCard {...baseProps} />);
    expect(screen.getByText('原始提示詞')).toBeInTheDocument();
    expect(screen.queryByText('英文優化提示詞')).not.toBeInTheDocument();
    expect(screen.queryByText('中文優化提示詞')).not.toBeInTheDocument();
  });

  it('renders three sections when optimized result exists', () => {
    render(
      <PromptCard {...baseProps} optimized={{ en: 'EN', zh: 'ZH' }} />,
    );
    expect(screen.getByText('原始提示詞')).toBeInTheDocument();
    expect(screen.getByText('英文優化提示詞')).toBeInTheDocument();
    expect(screen.getByText('中文優化提示詞')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('ZH')).toBeInTheDocument();
  });

  it('disables the AI button and shows "AI 優化(未配置)" when !isConfigured', () => {
    render(<PromptCard {...baseProps} isConfigured={false} />);
    const btn = screen.getByRole('button', { name: /AI 優化\(未配置\)/ });
    expect(btn).toBeDisabled();
  });

  it('shows "優化中…" and disables button while optimizing', () => {
    render(<PromptCard {...baseProps} optimizing={true} />);
    const btn = screen.getByRole('button', { name: /優化中/ });
    expect(btn).toBeDisabled();
  });

  it('shows optimizeError in an inline alert', () => {
    render(<PromptCard {...baseProps} optimizeError="API key 無效" />);
    expect(screen.getByRole('alert')).toHaveTextContent('API key 無效');
  });

  it('copies the original prompt when the 原始提示詞 copy button is clicked', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<PromptCard {...baseProps} />);
    const copyButtons = screen.getAllByRole('button', { name: /複製/ });
    await user.click(copyButtons[0]);
    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(samplePrompt);
    });
  });

  it('copy button click does not toggle the section (stopPropagation)', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<PromptCard {...baseProps} />);
    expect(screen.getByText(samplePrompt)).toBeVisible();
    const copyButtons = screen.getAllByRole('button', { name: /複製/ });
    await user.click(copyButtons[0]);
    expect(screen.getByText(samplePrompt)).toBeVisible();
  });

  it('calls onOptimize directly when no previous result exists', async () => {
    const user = userEvent.setup();
    const onOptimize = vi.fn();
    render(<PromptCard {...baseProps} onOptimize={onOptimize} />);
    await user.click(screen.getByRole('button', { name: /^AI 優化$/ }));
    expect(onOptimize).toHaveBeenCalledTimes(1);
  });

  it('shows a confirm dialog and only calls onOptimize when confirmed', async () => {
    const user = userEvent.setup();
    const onOptimize = vi.fn();
    render(
      <PromptCard {...baseProps} optimized={{ en: 'EN', zh: 'ZH' }} onOptimize={onOptimize} />,
    );

    await user.click(screen.getByRole('button', { name: /^AI 優化$/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(onOptimize).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^AI 優化$/ }));
    await user.click(screen.getByRole('button', { name: '確認覆蓋' }));
    expect(onOptimize).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Enter key on the 原始提示詞 header toggles the section', async () => {
    const user = userEvent.setup();
    render(<PromptCard {...baseProps} />);
    expect(screen.getByText(samplePrompt)).toBeVisible();
    const header = screen.getByRole('button', { name: /原始提示詞/ });
    header.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByText(samplePrompt)).not.toBeInTheDocument();
  });

  it('auto-collapses original and expands EN/ZH when optimized arrives via rerender', async () => {
    const { rerender } = render(<PromptCard {...baseProps} />);
    expect(screen.getByText(samplePrompt)).toBeVisible();
    rerender(<PromptCard {...baseProps} optimized={{ en: 'NEW_EN', zh: 'NEW_ZH' }} />);
    await waitFor(() => {
      expect(screen.queryByText(samplePrompt)).not.toBeInTheDocument();
    });
    expect(screen.getByText('NEW_EN')).toBeVisible();
    expect(screen.getByText('NEW_ZH')).toBeVisible();
  });

  it('refresh icon on EN/ZH sections triggers confirm then calls onRefreshLanguage with the correct language', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(
      <PromptCard
        {...baseProps}
        optimized={{ en: 'EN', zh: 'ZH' }}
        onRefreshLanguage={onRefresh}
      />,
    );

    const refreshButtons = screen.getAllByRole('button', { name: '重新生成' });
    expect(refreshButtons).toHaveLength(2);

    await user.click(refreshButtons[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(refreshButtons[1]);
    await user.click(screen.getByRole('button', { name: '確認覆蓋' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith('zh');
  });

  it('refresh icon does not appear on the original section', () => {
    render(
      <PromptCard
        {...baseProps}
        optimized={{ en: 'EN', zh: 'ZH' }}
        onRefreshLanguage={vi.fn()}
      />,
    );
    // Only EN and ZH sections should have refresh buttons, not the original
    const refreshButtons = screen.getAllByRole('button', { name: '重新生成' });
    expect(refreshButtons).toHaveLength(2);
  });
});
