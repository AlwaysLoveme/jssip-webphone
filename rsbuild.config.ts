import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

//cursor-start
export default defineConfig({
  plugins: [pluginReact()],
  server: {
    proxy: {
      "/socket": {
        target: "https://phone.codingman.icu",
        changeOrigin: true,
        ws: true,
        secure: true,
        logLevel: "debug",
        pathRewrite: {
          "^/socket": "",
        },
        onProxyReqWs: (_proxyReq, req, _socket) => {
          console.log("WebSocket代理请求:", req.url);
        },
        onError: (err, _req, _res) => {
          console.log("代理错误:", err.message);
        },
      },
    },
  },
});
//cursor-end
