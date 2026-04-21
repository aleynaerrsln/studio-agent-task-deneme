export class ProviderUnavailable extends Error {
  constructor(provider, reason) {
    super(`${provider} unavailable: ${reason}`);
    this.code = 'PROVIDER_UNAVAILABLE';
    this.provider = provider;
  }
}

export class ProviderRateLimited extends Error {
  constructor(provider) {
    super(`${provider} rate limited`);
    this.code = 'RATE_LIMIT';
    this.provider = provider;
  }
}

export class ProviderError extends Error {
  constructor(provider, message) {
    super(`${provider}: ${message}`);
    this.code = 'PROVIDER_ERROR';
    this.provider = provider;
  }
}
