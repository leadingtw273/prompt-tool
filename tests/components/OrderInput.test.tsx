import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderInput } from '@/components/OrderInput';
import { useDataStore } from '@/store/useDataStore';
import type { Order, Outfit, Scene, Pose, Expression, Composition } from '@/types';

const MOCK_OUTFITS: Outfit[] = [
  { code: 'CAS-01', name: 'Casual 01', prompt: 'casual outfit 01' },
  { code: 'CAS-02', name: 'Casual 02', prompt: 'casual outfit 02' },
  { code: 'GRL-02', name: 'Girl 02', prompt: 'girl outfit 02' },
];
const MOCK_SCENES: Scene[] = [
  { code: 'SCN-01', name: 'Scene 01', prompt: 'scene 01' },
  { code: 'SCN-02', name: 'Scene 02', prompt: 'scene 02' },
  { code: 'SCN-03', name: 'Scene 03', prompt: 'scene 03' },
];
const MOCK_POSES: Pose[] = [
  { code: 'POS-01', name: 'Pose 01', prompt: 'pose 01', compatible_comps: [] },
  { code: 'POS-04', name: 'Pose 04', prompt: 'pose 04', compatible_comps: [] },
];
const MOCK_EXPRESSIONS: Expression[] = [
  { code: 'EXP-01', name: 'Expr 01', prompt: 'expr 01' },
  { code: 'EXP-05', name: 'Expr 05', prompt: 'expr 05' },
];
const MOCK_COMPOSITIONS: Composition[] = [
  {
    code: 'COMP-01',
    name: '特寫正面',
    prompt: 'close-up headshot, front view',
    shot: 'close_up',
    angle: 'front',
  },
  {
    code: 'COMP-04',
    name: '全身 3/4',
    prompt: 'full-body shot, 3/4 angle',
    shot: 'full_body',
    angle: 'three_quarter',
  },
];

const DEFAULT_COMP_PROPS = {
  compositions: MOCK_COMPOSITIONS,
  recommendedCompCodes: [] as string[],
};

describe('OrderInput', () => {
  beforeEach(() => {
    useDataStore.setState({
      outfits: MOCK_OUTFITS,
      scenes: MOCK_SCENES,
      poses: MOCK_POSES,
      expressions: MOCK_EXPRESSIONS,
    });
  });

  afterEach(() => {
    useDataStore.setState({
      outfits: [],
      scenes: [],
      poses: [],
      expressions: [],
    });
  });

  describe('Given default props', () => {
    describe('When valid codes are entered and blurred', () => {
      it('Then onOrderChange is called with a parsed Order', async () => {
        const user = userEvent.setup();
        const onOrderChange = vi.fn();
        render(<OrderInput value={null} onOrderChange={onOrderChange} {...DEFAULT_COMP_PROPS} />);

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
        render(<OrderInput value={null} onOrderChange={vi.fn()} {...DEFAULT_COMP_PROPS} />);
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
        render(<OrderInput value={null} onOrderChange={onOrderChange} {...DEFAULT_COMP_PROPS} />);

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
        render(<OrderInput value={null} onOrderChange={onOrderChange} {...DEFAULT_COMP_PROPS} />);

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
        render(<OrderInput value={null} onOrderChange={onOrderChange} {...DEFAULT_COMP_PROPS} />);

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

    describe('When the codes input is cleared and blurred', () => {
      it('silently reverts to the derived codes when the input is cleared and blurred', async () => {
        const user = userEvent.setup();
        const onOrderChange = vi.fn();
        render(<OrderInput value={null} onOrderChange={onOrderChange} {...DEFAULT_COMP_PROPS} />);

        const input = screen.getByLabelText('四項代碼組合') as HTMLInputElement;
        const initialValue = input.value;
        await user.click(input);
        await user.clear(input);
        await user.tab();

        expect(screen.queryByRole('alert')).toBeNull();
        expect(input.value).toBe(initialValue);
        expect(onOrderChange).not.toHaveBeenCalled();
      });
    });

    describe('When the codes input is cleared (before blur)', () => {
      it('shows the current selects as the placeholder when the input is cleared', async () => {
        const user = userEvent.setup();
        const onOrderChange = vi.fn();
        const value = {
          outfit: 'GRL-02',
          scene: 'SCN-03',
          pose: 'POS-04',
          expr: 'EXP-05',
          tier: 'T0' as const,
          selectedCompCodes: [] as string[],
        };
        render(<OrderInput value={value} onOrderChange={onOrderChange} {...DEFAULT_COMP_PROPS} />);

        const input = screen.getByLabelText('四項代碼組合') as HTMLInputElement;
        await user.click(input);
        await user.clear(input);

        expect(input.placeholder).toBe('GRL-02_SCN-03_POS-04_EXP-05');
      });
    });

    describe('The unified view', () => {
      it('Then all select inputs are rendered', () => {
        render(<OrderInput value={null} onOrderChange={vi.fn()} {...DEFAULT_COMP_PROPS} />);
        expect(screen.getByLabelText('服裝')).toBeInTheDocument();
        expect(screen.getByLabelText('場景')).toBeInTheDocument();
        expect(screen.getByLabelText('姿勢')).toBeInTheDocument();
        expect(screen.getByLabelText('表情')).toBeInTheDocument();
        expect(screen.getByLabelText('分級')).toBeInTheDocument();
      });
    });

    describe('Composition picker integration', () => {
      it('renders the CompPicker with the provided compositions', () => {
        render(
          <OrderInput
            value={null}
            onOrderChange={vi.fn()}
            compositions={MOCK_COMPOSITIONS}
            recommendedCompCodes={[]}
          />,
        );
        expect(screen.getByLabelText('構圖挑選')).toBeInTheDocument();
      });

      it('fires onOrderChange with updated selectedCompCodes when a comp is picked', async () => {
        const user = userEvent.setup();
        const onOrderChange = vi.fn();
        const value = {
          outfit: 'CAS-02',
          scene: 'SCN-01',
          pose: 'POS-04',
          expr: 'EXP-01',
          tier: 'T0' as const,
          selectedCompCodes: [] as string[],
        };
        render(
          <OrderInput
            value={value}
            onOrderChange={onOrderChange}
            compositions={MOCK_COMPOSITIONS}
            recommendedCompCodes={['COMP-04']}
          />,
        );

        await user.click(screen.getByLabelText('構圖挑選'));
        await user.click(await screen.findByText('特寫正面'));

        expect(onOrderChange).toHaveBeenCalled();
        const lastArg = onOrderChange.mock.calls.at(-1)?.[0] as Order;
        expect(lastArg.selectedCompCodes).toEqual(['COMP-01']);
        expect(lastArg.outfit).toBe('CAS-02');
        expect(lastArg.tier).toBe('T0');
      });
    });
  });
});
