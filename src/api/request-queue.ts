import type { GraphqlResponse } from './responses';

type ApiResponse = {
  status: number;
  headers: Record<string, string>;
  json: unknown;
  text: string;
};
type Clock = { now: () => number; sleep: (milliseconds: number) => Promise<void> };
const clock: Clock = {
  now: () => Date.now(),
  sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

/** One lane per service prevents nested pagination and multiple windows from bursting. */
export class RequestQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private nextRequest = 0;
  private cooldown = 0;
  constructor(
    private service: string,
    private timing: Clock = clock,
  ) {}

  run(
    request: () => Promise<ApiResponse>,
    options: { retry: boolean },
  ): Promise<ApiResponse> {
    const task = this.tail.then(() => this.request(request, options));
    this.tail = task.catch(() => {});
    return task;
  }

  private rateLimitError(): Error {
    return new Error(
      `${this.service} rate limit: requests paused until ${new Date(this.cooldown).toLocaleTimeString()}. Your cached board is retained.`,
    );
  }

  private async request(
    request: () => Promise<ApiResponse>,
    options: { retry: boolean },
  ): Promise<ApiResponse> {
    for (let attempt = 0; ; attempt++) {
      const wait = Math.max(this.nextRequest, this.cooldown) - this.timing.now();
      // Do not park the board for an hourly quota reset. Subsequent clicks respect it too.
      if (wait > 120_000) {
        throw this.rateLimitError();
      }
      if (wait > 0) {
        await this.timing.sleep(wait);
      }
      const response = await request();
      this.nextRequest = this.timing.now() + 250;
      const headers = Object.fromEntries(
        Object.entries(response.headers ?? {}).map(([key, value]) => [
          key.toLowerCase(),
          value,
        ]),
      );
      const payload = response.json as
        (GraphqlResponse<unknown> & { message?: string }) | null;
      const messages = [
        payload?.message,
        ...(payload?.errors ?? []).map((error) => error.message),
      ]
        .filter(Boolean)
        .join('; ');
      const limited =
        response.status === 429 ||
        (response.status === 403 && headers['x-ratelimit-remaining'] === '0') ||
        payload?.errors?.some((error) =>
          ['RATE_LIMITED', 'RATELIMITED'].includes(
            error.type ?? error.extensions?.code ?? '',
          ),
        ) ||
        ((response.status === 403 || !!payload?.errors?.length) &&
          /rate.?limit|secondary rate|abuse detection/i.test(messages));
      const resets: number[] = [];
      for (const [remaining, reset, multiplier] of [
        ['x-ratelimit-remaining', 'x-ratelimit-reset', 1000],
        ['x-ratelimit-requests-remaining', 'x-ratelimit-requests-reset', 1],
        ['x-ratelimit-complexity-remaining', 'x-ratelimit-complexity-reset', 1],
        [
          'x-ratelimit-endpoint-requests-remaining',
          'x-ratelimit-endpoint-requests-reset',
          1,
        ],
      ] as const) {
        if (headers[remaining] === '0' && Number(headers[reset]) > 0) {
          resets.push(Number(headers[reset]) * multiplier);
        }
      }
      if (resets.length) {
        this.cooldown = Math.max(this.cooldown, ...resets);
      }
      if (limited) {
        const retryAfter = headers['retry-after'];
        const retryAt = retryAfter
          ? Number.isFinite(Number(retryAfter))
            ? this.timing.now() + Number(retryAfter) * 1000
            : Date.parse(retryAfter)
          : NaN;
        this.cooldown = Math.max(
          this.cooldown,
          Number.isFinite(retryAt)
            ? retryAt
            : resets.length
              ? this.timing.now()
              : this.timing.now() + 60_000 * 2 ** attempt,
        );
        if (!options.retry || attempt >= 2) {
          throw this.rateLimitError();
        }
        continue;
      }
      if (options.retry && [502, 503, 504].includes(response.status) && attempt < 2) {
        this.nextRequest = this.timing.now() + 1000 * 2 ** attempt;
        continue;
      }
      return response;
    }
  }
}
