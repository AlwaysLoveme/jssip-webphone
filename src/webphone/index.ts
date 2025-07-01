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
      realm: domain,
      no_answer_timeout: 120,
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
      pcConfig: {
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      },
      ...restOptions,
    });
    return call;
  }

  answer() {
    this.currentSession?.answer({
      mediaConstraints: {
        audio: true,
        video: false,
      },
      pcConfig: {
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      },
    });
  }

  onListener() {
    this.ua.on("newRTCSession", (data: any) => {
      console.log(data.originator, data, "收到事件");
      this.answer();
      const { originator, session } = data;
      this.currentSession = session;
      this.currentSession?.on("confirmed", () => {
        console.log("confirmed", "通话已确认");

        this.playAudio().catch(console.log);
      });
      this.currentSession?.on("progress", () => {
        // 来电 振铃
        if (originator === "local") {
          console.log("11111");
          this.playAudio().catch(console.log);
        }
        if (originator === "remote") {
          console.log("有来电");
          this.playAudio().catch(console.log);
        }
      });
      this.currentSession?.on("accepted", () => {
        console.log("通话已接通");
        this.playAudio().catch(console.log);
      });
      this.currentSession?.on("ended", () => {
        console.log("通话已结束");
        this.audio.pause();
      });
    });
  }

  async playAudio() {
    const stream = new MediaStream();
    console.log(this.currentSession?.connection, "currentSession");

    const receivers = this.currentSession?.connection.getReceivers();
    if (receivers) {
      receivers.forEach((receiver) => {
        stream.addTrack(receiver.track);
      });
    }
    console.log(receivers, "receivers");

    this.audio.srcObject = stream;
    await this.audio.play();
  }
}

export default WebPhone;
