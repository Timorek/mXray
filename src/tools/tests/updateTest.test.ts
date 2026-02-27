import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import { updateTest } from './updateTest.js';

const mockJiraClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as AxiosInstance;

describe('updateTest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates summary', async () => {
    (mockJiraClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await updateTest(mockJiraClient, {
      test_key: 'PROJ-1',
      summary: 'Updated title',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.updated_fields).toContain('summary');
    expect(mockJiraClient.put).toHaveBeenCalledWith('/issue/PROJ-1', expect.any(Object));
  });

  it('updates multiple fields', async () => {
    (mockJiraClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await updateTest(mockJiraClient, {
      test_key: 'PROJ-1',
      summary: 'New',
      labels: ['a'],
      components: ['B'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.updated_fields).toContain('summary');
    expect(parsed.updated_fields).toContain('labels');
    expect(parsed.updated_fields).toContain('components');
  });

  it('converts description to ADF format', async () => {
    (mockJiraClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await updateTest(mockJiraClient, {
      test_key: 'PROJ-1',
      description: 'New desc',
    });

    const fields = (mockJiraClient.put as ReturnType<typeof vi.fn>).mock.calls[0][1].fields;
    expect(fields.description.type).toBe('doc');
  });
});
