declare module '@novnc/novnc/lib/rfb' {
  class RFB {
    constructor(
      target: HTMLElement,
      options: {
        encrypt?: boolean;
        credentials?: { password: string };
        viewOnly?: boolean;
        scaleViewport?: boolean;
        background?: string;
        shared?: boolean;
        repeaterID?: string;
      },
    );
    connect(host: string, port: number): void;
    disconnect(): void;
    addEventListener(event: string, handler: (e: any) => void): void;
  }
  export = RFB;
}
