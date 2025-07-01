import styles from "./App.module.css";
import { useState, useRef } from "react";

import { useSetState } from "ahooks";
import Button from "@mui/material/Button";
import FormItem from "./components/FormItem";
import WebPhone, { type UA } from "./webphone";

const App = () => {
  const [webPhoneData, setWebPhoneData] = useState({
    extension: "1005",
    password: "12345678",
    domain: import.meta.env.PUBLIC_DOMAIN,
    server: import.meta.env.PUBLIC_SOCKET,
    callNumber: "1006",
  });

  //cursor-start
  const handleInputChange = (key: keyof typeof webPhoneData) => (value: string) => {
    setWebPhoneData({
      ...webPhoneData,
      [key]: value,
    });
  };
  //cursor-end

  const uaRef = useRef<UA | null>(null);
  const webPhoneRef = useRef<WebPhone | null>(null);
  const [uaStates, setUAStates] = useSetState({
    isRegistered: false,
    isConnecting: false,
    isDisconnected: false,
    isRegistrationFailed: false,
  });
  //cursor-start
  const handleRegister = () => {
    console.log("开始注册WebPhone，使用配置:", {
      socketUrls: [webPhoneData.server],
      domain: webPhoneData.domain,
      extension: webPhoneData.extension,
    });

    webPhoneRef.current = new WebPhone();
    uaRef.current = webPhoneRef.current.register({
      socketUrls: [webPhoneData.server],
      domain: webPhoneData.domain,
      extension: webPhoneData.extension,
      password: webPhoneData.password,
      on: {
        connected: (event) => {
          console.log("✅ WebSocket连接成功:", event);
        },
        disconnected: (event) => {
          console.log("❌ WebSocket连接断开:", event);
          setUAStates({
            isDisconnected: true,
          });
        },
        registered: (event) => {
          console.log("✅ SIP注册成功:", event);
          setUAStates({
            isRegistered: true,
            isRegistrationFailed: false,
          });
        },
        unregistered: (event) => {
          console.log("❌ SIP注册失败:", event);
          setUAStates({
            isRegistered: false,
          });
        },
        registrationFailed: (event) => {
          console.log("❌ SIP注册失败:", event);
          setUAStates({
            isRegistrationFailed: true,
            isRegistered: false,
          });
        },
        progress() {
          webPhoneRef.current?.answer();
        },
      },
    });
  };
  //cursor-end

  const handleUnregister = () => {
    if (uaRef.current) {
      uaRef.current.unregister();
    }
  };

  const handleCall = () => {
    if (uaRef.current) {
      webPhoneRef.current?.call(webPhoneData.callNumber);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <div className={styles.section_header}>WebPhone</div>
        <div className="flex gap-[20px] mt-[20px]">
          <FormItem
            label="分机号"
            value={webPhoneData.extension}
            onChange={handleInputChange("extension")}
          />
          <FormItem
            label="密码"
            value={webPhoneData.password}
            onChange={handleInputChange("password")}
          />
        </div>
        <FormItem
          label="注册域名"
          value={webPhoneData.domain}
          onChange={handleInputChange("domain")}
          className="mt-[10px]"
        />
        <FormItem
          label="注册服务器"
          value={webPhoneData.server}
          onChange={handleInputChange("server")}
          className="mt-[10px]"
        />
        <div className="mt-[20px] flex items-center gap-[10px]">
          <Button
            variant="contained"
            color="primary"
            onClick={handleRegister}
          >
            注册
          </Button>
          {uaStates.isRegistered && (
            <Button
              variant="contained"
              color="success"
              onClick={handleUnregister}
            >
              断开连接
            </Button>
          )}
        </div>
        <p className="border-1 border-gray-300 my-[20px]" />
        <div className="flex gap-[20px]">
          <input
            type="text"
            className="border-1 border-gray-300"
            value={webPhoneData.callNumber}
            onChange={(e) => {
              handleInputChange("callNumber")(e.target.value);
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleCall}
          >
            拨打
          </Button>
        </div>
      </section>
    </div>
  );
};

export default App;
