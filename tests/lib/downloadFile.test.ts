import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from '@/lib/downloadFile';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadFile', () => {
  it('creates a Blob with correct MIME, triggers click, revokes URL', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadFile({ content: 'hello', filename: 'test.csv', mimeType: 'text/csv;charset=utf-8' });

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('uses the provided filename on the download attribute', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let capturedAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedAnchor = this;
    });

    downloadFile({ content: '{}', filename: 'characters.json', mimeType: 'application/json' });

    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.download).toBe('characters.json');
  });
});
