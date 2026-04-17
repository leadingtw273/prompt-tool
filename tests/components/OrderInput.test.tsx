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
