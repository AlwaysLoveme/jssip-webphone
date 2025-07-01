import JsSIP from "jssip";
import type { UAConfiguration, UAEventMap, CallOptions } from "jssip/lib/UA";
import type { RTCSession, OutgoingAckEvent, EndEvent } from "jssip/lib/RTCSession";
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
    } & {
      progress?: (session: RTCSession, cb?: () => void) => void;
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

    const callOptions = {
      ...restOptions,
      eventHandlers: {
        ...eventHandlers,
        confirmed(data: any) {
          options.eventHandlers?.confirmed?.(data);
        },
      },
      pcConfig: {
        ...restOptions.pcConfig,
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
          ...(restOptions.pcConfig?.iceServers ?? []),
        ],
      },
    };
    const call = this.ua.call(uri.toString(), callOptions);
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
      const { originator, session } = data;
      this.currentSession = session;

      // 远程来电
      if (originator === "remote") {
        // 处理接听逻辑
        this.answerSession(session);
      } else if (originator === "local") {
        // 处理呼叫逻辑
        this.callSession(session);
      }
      // this.currentSession?.on("confirmed", () => {
      //   console.log("confirmed", "通话已确认");

      //   this.playAudio().catch(console.log);
      // });
      // this.currentSession?.on("progress", () => {
      //   // 来电 振铃
      //   if (originator === "local") {
      //     console.log("11111");
      //     this.playAudio().catch(console.log);
      //   }
      //   if (originator === "remote") {
      //     console.log("有来电");
      //     this.playAudio().catch(console.log);
      //   }
      // });
      // this.currentSession?.on("accepted", () => {
      //   console.log("通话已接通");
      //   this.playAudio().catch(console.log);
      // });
      // this.currentSession?.on("ended", () => {
      //   console.log("通话已结束");
      //   this.audio.pause();
      // });
    });
  }

  private answerSession(session: RTCSession) {
    // 来电-被接听了
    session.on("accepted", () => {
      console.log("来电接听");
      this.playAudio().catch(console.log);
    });
    session.on("peerconnection", (data) => {
      console.log("peerconnection", data);
    });
    session.on("progress", () => {
      console.log("来电提示");
      this.currentSession && this.registerOptions?.on?.progress?.(this.currentSession);
    });
    session.on("ended", (data) => {
      console.log("来电挂断", data);
    });
    session.on("failed", (e: any) => {
      console.error("无法建立通话", e);
    });
  }

  private callSession(session: RTCSession) {
    session.on("progress", () => {
      console.log("响铃中");
    });
    session.on("confirmed", (data: OutgoingAckEvent) => {
      console.log("已接听", data);
      this.playAudio().catch(console.log);
    });
    session.on("ended", (data: EndEvent) => {
      console.log("通话结束", data);
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
    this.audio.muted = false;
    this.audio.volume = 1;
    await this.audio.play();
  }
}

export default WebPhone;
