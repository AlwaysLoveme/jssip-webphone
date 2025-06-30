import JsSIP from "jssip";
import type { UAConfiguration, UAEventMap, CallOptions } from "jssip/lib/UA";
import type { RTCSession } from "jssip/lib/RTCSession";
export interface WebPhoneOptions {
  register: {
    /**
     * 域名
     */
    domain: string;
    /**
     * 分机号
     */
    extension: string;
    /**
     * 注册地址
     */
    socketUrls: string[];
    /**
     * 事件监听
     */
    on?: {
      [key in keyof UAEventMap]?: (event: UAEventMap[key]) => void;
    };
  } & Omit<UAConfiguration, "sockets" | "uri" | "session_timers" | "contact_uri">;
}
export type UA = JsSIP.UA;

class WebPhone {
  private ua!: JsSIP.UA;
  static instance: WebPhone | null = null;
  audio: HTMLAudioElement;
  currentSession: RTCSession | null = null;
  registerOptions: WebPhoneOptions["register"] | null = null;

  // 单例模式
  constructor() {
    this.audio = new Audio();
    if (WebPhone.instance) {
      return WebPhone.instance;
    }
    WebPhone.instance = this;
  }

  register(options: WebPhoneOptions["register"]) {
    this.registerOptions = options;
    const { socketUrls = [], domain, extension, password, on = {}, ...restOptions } = options;
    const sockets = socketUrls.map((socketUrl) => new JsSIP.WebSocketInterface(socketUrl));
    sockets.forEach((socket) => {
      socket.via_transport = "wss";
    });
    const uri = new JsSIP.URI("sip", extension, domain);
    uri.setParam("transport", "wss");

    const configuration: UAConfiguration = {
      uri: uri.toString(),
      password,
      sockets,
      display_name: extension,
      session_timers: false,
      contact_uri: uri.toString(),
      ...restOptions,
    };
    this.ua = new JsSIP.UA(configuration);
    Object.entries(on).forEach(([key, value]) => {
      this.ua.on(key as keyof UAEventMap, value as any);
    });
    this.onListener();
    this.ua.start();
    return this.ua;
  }

  unregister() {
    this.ua.unregister();
  }

  call(extension: string, options: CallOptions = {}) {
    const uri = new JsSIP.URI("sip", extension, this.registerOptions?.domain ?? "");
    const { eventHandlers, ...restOptions } = options;
    const call = this.ua.call(uri.toString(), {
      eventHandlers: {
        ...eventHandlers,
        confirmed(data: any) {
          console.log("confirmed");
          options.eventHandlers?.confirmed?.(data);
        },
      },
      ...restOptions,
    });
    return call;
  }

  onListener() {
    this.ua.on("newRTCSession", (data: any) => {
      console.log(data.originator);
      const { originator, session } = data;
      this.currentSession = session;
      if (originator === "local") {
        this.currentSession?.on("confirmed", (confirmedData) => {
          console.log(confirmedData, "=====");
        });
      }
    });
  }

  async playAudio(srcObject: MediaStream) {
    this.audio.srcObject = srcObject;
    await this.audio.play();
  }
}

export default WebPhone;
