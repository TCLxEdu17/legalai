declare namespace facebook.Pixel {
  type Params = Record<string, unknown>;

  interface Event {
    (type: 'init', pixelId: string): void;
    (type: 'track', eventName: string, params?: Params): void;
    (type: 'trackCustom', eventName: string, params?: Params): void;
    callMethod?: (...args: unknown[]) => void;
    queue?: unknown[][];
    push?: (...args: unknown[]) => void;
    loaded?: boolean;
    version?: string;
  }
}

interface Window {
  fbq: facebook.Pixel.Event;
  _fbq: facebook.Pixel.Event;
}
