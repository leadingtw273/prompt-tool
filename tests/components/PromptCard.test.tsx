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

describe('PromptCard', () => {
  describe('Given a prompt of ~150 words', () => {
    describe('When rendered', () => {
      it('Then displays the prompt text and "ok" length status', () => {
        render(
          <PromptCard
            orderCode="CAS-02_SCN-01_POS-04_EXP-01_COMP-03"
            tier="T0"
            comboLabel="條紋襯衫_咖啡廳_坐姿_微笑_半身正面"
            prompt={samplePrompt}
          />,
        );
        expect(screen.getByText(/CAS-02_SCN-01_POS-04_EXP-01_COMP-03/)).toBeInTheDocument();
        const badge = screen.getByTestId('length-status');
        expect(badge.textContent).toMatch(/太短|合適|太長/);
      });
    });

    describe('When the copy button is clicked', () => {
      it('Then navigator.clipboard.writeText is called with the prompt', async () => {
        const user = userEvent.setup();
        const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
        render(
          <PromptCard
            orderCode="CAS-02_SCN-01_POS-04_EXP-01_COMP-03"
            tier="T0"
            comboLabel="條紋襯衫_咖啡廳_坐姿_微笑_半身正面"
            prompt={samplePrompt}
          />,
        );
        await user.click(screen.getByRole('button', { name: '複製' }));
        await waitFor(() => {
          expect(writeTextSpy).toHaveBeenCalledWith(samplePrompt);
        });
      });
    });
  });
});
