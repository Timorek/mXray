import axios from 'axios';

export function formatApiError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response) {
    const data = error.response.data;
    // Only include standard Jira/Xray error fields to avoid leaking internals
    if (data && typeof data === 'object') {
      const filtered: Record<string, unknown> = {};
      if ('errorMessages' in data) filtered.errorMessages = data.errorMessages;
      if ('errors' in data) filtered.errors = data.errors;
      if ('message' in data) filtered.message = data.message;
      if (Object.keys(filtered).length > 0) {
        return `API error ${error.response.status}: ${JSON.stringify(filtered)}`;
      }
    }
    return `API error ${error.response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`;
  }
  return error instanceof Error ? error.message : String(error);
}
