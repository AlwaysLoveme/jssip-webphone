import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

//cursor-start
export default defineConfig((params) => {
  console.log(params);
  return {
    plugins: [pluginReact()],
    html: {
      title: "WebPhone",
    },
    server: {
      proxy: {
        "/socket": {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          target: `https://${process.env.PUBLIC_DOMAIN}`,
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
  };
});
//cursor-end
