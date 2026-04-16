import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderInput } from '@/components/OrderInput';
import type { Order } from '@/types';

describe('OrderInput', () => {
  describe('Given default props (mode=text)', () => {
    describe('When valid text is entered and blurred', () => {
      it('Then onOrderChange is called with a parsed Order', async () => {
        const user = userEvent.setup();
        const onOrderChange = vi.fn();
        render(<OrderInput value={null} onOrderChange={onOrderChange} />);

        const textarea = screen.getByLabelText('工單文字');
        await user.type(textarea, 'CAS-02_SCN-01_POS-04_EXP-01 T0 x4');
        await user.tab();

        expect(onOrderChange).toHaveBeenCalled();
        const lastCall = onOrderChange.mock.calls[onOrderChange.mock.calls.length - 1][0] as Order;
        expect(lastCall.outfit).toBe('CAS-02');
        expect(lastCall.count).toBe(4);
      });
    });

    describe('When invalid text is entered', () => {
      it('Then an error message is displayed', async () => {
        const user = userEvent.setup();
        render(<OrderInput value={null} onOrderChange={vi.fn()} />);
        const textarea = screen.getByLabelText('工單文字');
        await user.type(textarea, 'invalid-format');
        await user.tab();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Given mode toggle button is clicked', () => {
    describe('When switching to form mode', () => {
      it('Then five select inputs and a count input are rendered', async () => {
        const user = userEvent.setup();
        render(<OrderInput value={null} onOrderChange={vi.fn()} />);
        const formBtn = screen.getByRole('button', { name: '表單' });
        await user.click(formBtn);
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
