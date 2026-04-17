import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderInput } from '@/components/OrderInput';
import type { Order } from '@/types';

describe('OrderInput', () => {
  describe('Given default props', () => {
    describe('When valid codes are entered and blurred', () => {
      it('Then onOrderChange is called with a parsed Order', async () => {
        const user = userEvent.setup();
        const onOrderChange = vi.fn();
        render(<OrderInput value={null} onOrderChange={onOrderChange} />);

        const input = screen.getByLabelText('四項代碼組合');
        await user.click(input);
        await user.clear(input);
        await user.type(input, 'CAS-02_SCN-01_POS-04_EXP-01');
        await user.tab();

        expect(onOrderChange).toHaveBeenCalled();
        const lastCall = onOrderChange.mock.calls[onOrderChange.mock.calls.length - 1][0] as Order;
        expect(lastCall.outfit).toBe('CAS-02');
      });
    });

    describe('When invalid codes are entered', () => {
      it('Then an error message is displayed', async () => {
        const user = userEvent.setup();
        render(<OrderInput value={null} onOrderChange={vi.fn()} />);
        const input = screen.getByLabelText('四項代碼組合');
        await user.click(input);
        await user.clear(input);
        await user.type(input, 'invalid-format');
        await user.tab();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      it('keeps invalid input visible after blur so the user can correct it', async () => {
        const user = userEvent.setup();
        const onOrderChange = vi.fn();
        render(<OrderInput value={null} onOrderChange={onOrderChange} />);

        const input = screen.getByLabelText('四項代碼組合') as HTMLInputElement;
        await user.click(input);
        await user.clear(input);
        await user.type(input, 'XXX-99_SCN-01_POS-01_EXP-01');
        await user.tab(); // blur

        expect(input.value).toBe('XXX-99_SCN-01_POS-01_EXP-01');
        expect(screen.getByRole('alert').textContent).toMatch(/服裝/);
      });

      it('keeps the error visible when a select field is changed while the draft is still invalid', async () => {
        const user = userEvent.setup();
        const onOrderChange = vi.fn();
        render(<OrderInput value={null} onOrderChange={onOrderChange} />);

        const input = screen.getByLabelText('四項代碼組合') as HTMLInputElement;
        await user.click(input);
        await user.clear(input);
        await user.type(input, 'XXX-99_SCN-01_POS-01_EXP-01');
        await user.tab(); // failed blur — error appears

        expect(screen.getByRole('alert').textContent).toMatch(/服裝/);

        // change a select while draft is still invalid
        const sceneSelect = screen.getByLabelText('場景') as HTMLSelectElement;
        const otherScene = Array.from(sceneSelect.options).find((o) => o.value !== sceneSelect.value);
        if (!otherScene) throw new Error('need at least 2 scene options for this test');
        await user.selectOptions(sceneSelect, otherScene.value);

        // error must still be displayed; draft must still be displayed
        expect(screen.getByRole('alert').textContent).toMatch(/服裝/);
        expect(input.value).toBe('XXX-99_SCN-01_POS-01_EXP-01');
      });

      it('preserves invalid input on re-focus after a failed blur', async () => {
        const user = userEvent.setup();
        const onOrderChange = vi.fn();
        render(<OrderInput value={null} onOrderChange={onOrderChange} />);

        const input = screen.getByLabelText('四項代碼組合') as HTMLInputElement;
        await user.click(input);
        await user.clear(input);
        await user.type(input, 'XXX-99_SCN-01_POS-01_EXP-01');
        await user.tab(); // failed blur — error shows, draft preserved
        expect(input.value).toBe('XXX-99_SCN-01_POS-01_EXP-01');

        await user.click(input); // re-focus — must NOT overwrite draft
        expect(input.value).toBe('XXX-99_SCN-01_POS-01_EXP-01');
      });
    });

    describe('The unified view', () => {
      it('Then all select inputs and count input are rendered', () => {
        render(<OrderInput value={null} onOrderChange={vi.fn()} />);
        expect(screen.getByLabelText('服裝')).toBeInTheDocument();
        expect(screen.getByLabelText('場景')).toBeInTheDocument();
        expect(screen.getByLabelText('姿勢')).toBeInTheDocument();
        expect(screen.getByLabelText('表情')).toBeInTheDocument();
        expect(screen.getByLabelText('分級')).toBeInTheDocument();
        expect(screen.getByLabelText('數量')).toBeInTheDocument();
      });
    });
  });
});
