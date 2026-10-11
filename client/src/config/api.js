/**
 * Centralized API Endpoints Configuration
 */
export const API_BASE_URL = "http://localhost:5000/api";

export const API_ENDPOINTS = {
  TEST_CONNECTION: `${API_BASE_URL}/test-connection`,
  KNOWLEDGE: `${API_BASE_URL}/knowledge`,
  SCHEDULE: `${API_BASE_URL}/schedule`,
  SCHEDULE_STREAM: `${API_BASE_URL}/schedule/stream`,
  MEETINGS: `${API_BASE_URL}/meetings`
};
