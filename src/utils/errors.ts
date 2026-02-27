import axios from 'axios';

export function formatApiError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response) {
    return `API error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
  }
  return error instanceof Error ? error.message : String(error);
}
