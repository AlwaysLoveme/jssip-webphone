import JsSIP from "jssip";
import type { UAConfiguration, UAEventMap } from "jssip/lib/UA";

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
class WebPhone {
  private ua!: JsSIP.UA;
  static instance: WebPhone | null = null;

  // 单例模式
  constructor() {
    if (WebPhone.instance) {
      return WebPhone.instance;
    }
    WebPhone.instance = this;
  }

  register(options: WebPhoneOptions["register"]) {
    const { socketUrls = [], domain, extension, password, ...restOptions } = options;
    const sockets = socketUrls.map((socketUrl) => new JsSIP.WebSocketInterface(socketUrl));
    const uri = `sip:${extension}@${domain}`;
    const configuration: UAConfiguration = {
      uri,
      password,
      sockets,
      no_answer_timeout: 120,
      display_name: extension,
      session_timers: false,
      contact_uri: uri,
      ...restOptions,
    };
    this.ua = new JsSIP.UA(configuration);
    this.ua.start();
    return this.ua;
  }
}

export default WebPhone;
