import { describe, it, expect } from 'vitest';
import axios, { AxiosError } from 'axios';
import { formatApiError } from './errors.js';

describe('formatApiError', () => {
  it('formats axios errors with response data', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      status: 400,
      data: { errorMessages: ['Field required'] },
      statusText: 'Bad Request',
      headers: {},
      config: {} as any,
    };

    const result = formatApiError(error);
    expect(result).toContain('API error 400');
    expect(result).toContain('Field required');
  });

  it('formats regular Error objects', () => {
    const result = formatApiError(new Error('Something went wrong'));
    expect(result).toBe('Something went wrong');
  });

  it('formats string errors', () => {
    const result = formatApiError('string error');
    expect(result).toBe('string error');
  });

  it('formats unknown error types', () => {
    const result = formatApiError(42);
    expect(result).toBe('42');
  });

  it('includes Jira field validation errors in output', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      status: 400,
      data: { errors: { summary: 'Field required' } },
      statusText: 'Bad Request',
      headers: {},
      config: {} as any,
    };

    const result = formatApiError(error);
    expect(result).toContain('API error 400');
    expect(result).toContain('summary');
    expect(result).toContain('Field required');
  });
});
