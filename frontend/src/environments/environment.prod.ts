export const environment = {
  production: true,
  apiBaseUrl: typeof window !== 'undefined' && window.location.origin ? window.location.origin : '',
  authApiUrl: (typeof window !== 'undefined' && window.location.origin ? window.location.origin : '') + '/api/auth',
  recordingEndpoint: '/api/v1/recordings',
  useMockUpload: false
};
