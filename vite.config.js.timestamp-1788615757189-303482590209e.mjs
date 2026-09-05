// vite.config.js
import { defineConfig } from "file:///D:/abhin/Comding/Web%20Dev/My%20projects/expense-tracker/node_modules/vite/dist/node/index.js";
import react from "file:///D:/abhin/Comding/Web%20Dev/My%20projects/expense-tracker/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///D:/abhin/Comding/Web%20Dev/My%20projects/expense-tracker/node_modules/vite-plugin-pwa/dist/index.js";
import tailwindcss from "file:///D:/abhin/Comding/Web%20Dev/My%20projects/expense-tracker/node_modules/@tailwindcss/vite/dist/index.mjs";
function versionEmitterPlugin(buildId) {
  return {
    name: "version-emitter",
    configureServer(server) {
      server.middlewares.use("/version.json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          version: "dev",
          buildId: "dev"
        }));
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({
          version: process.env.npm_package_version || "1.0.0",
          buildId
        })
      });
    }
  };
}
var vite_config_default = defineConfig(({ mode }) => {
  const isProd = mode === "production";
  const buildId = isProd ? `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}` : "dev";
  return {
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId)
    },
    plugins: [
      react(),
      tailwindcss(),
      versionEmitterPlugin(buildId),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["logo.png"],
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        },
        manifest: {
          name: "LifeTracker",
          short_name: "LifeTracker",
          description: "Track your habits, shopping, todos, and expenses all in one place",
          theme_color: "#060b14",
          background_color: "#060b14",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/logo.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        }
      })
    ]
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxhYmhpblxcXFxDb21kaW5nXFxcXFdlYiBEZXZcXFxcTXkgcHJvamVjdHNcXFxcZXhwZW5zZS10cmFja2VyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxhYmhpblxcXFxDb21kaW5nXFxcXFdlYiBEZXZcXFxcTXkgcHJvamVjdHNcXFxcZXhwZW5zZS10cmFja2VyXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9hYmhpbi9Db21kaW5nL1dlYiUyMERldi9NeSUyMHByb2plY3RzL2V4cGVuc2UtdHJhY2tlci92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcclxuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJ1xyXG5cclxuZnVuY3Rpb24gdmVyc2lvbkVtaXR0ZXJQbHVnaW4oYnVpbGRJZCkge1xyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAndmVyc2lvbi1lbWl0dGVyJyxcclxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcclxuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL3ZlcnNpb24uanNvbicsIChyZXEsIHJlcykgPT4ge1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICB2ZXJzaW9uOiAnZGV2JyxcclxuICAgICAgICAgIGJ1aWxkSWQ6ICdkZXYnXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBnZW5lcmF0ZUJ1bmRsZSgpIHtcclxuICAgICAgdGhpcy5lbWl0RmlsZSh7XHJcbiAgICAgICAgdHlwZTogJ2Fzc2V0JyxcclxuICAgICAgICBmaWxlTmFtZTogJ3ZlcnNpb24uanNvbicsXHJcbiAgICAgICAgc291cmNlOiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICB2ZXJzaW9uOiBwcm9jZXNzLmVudi5ucG1fcGFja2FnZV92ZXJzaW9uIHx8ICcxLjAuMCcsXHJcbiAgICAgICAgICBidWlsZElkOiBidWlsZElkXHJcbiAgICAgICAgfSlcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIGNvbnN0IGlzUHJvZCA9IG1vZGUgPT09ICdwcm9kdWN0aW9uJztcclxuICBjb25zdCBidWlsZElkID0gaXNQcm9kID8gYCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIsIDcpfWAgOiAnZGV2JztcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGRlZmluZToge1xyXG4gICAgICBfX0FQUF9CVUlMRF9JRF9fOiBKU09OLnN0cmluZ2lmeShidWlsZElkKSxcclxuICAgIH0sXHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIHJlYWN0KCksXHJcbiAgICAgIHRhaWx3aW5kY3NzKCksXHJcbiAgICAgIHZlcnNpb25FbWl0dGVyUGx1Z2luKGJ1aWxkSWQpLFxyXG4gICAgICBWaXRlUFdBKHtcclxuICAgICAgICByZWdpc3RlclR5cGU6ICdwcm9tcHQnLFxyXG4gICAgICAgIGluY2x1ZGVBc3NldHM6IFsnbG9nby5wbmcnXSxcclxuICAgICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd29mZjJ9J10sXHJcbiAgICAgICAgICBtYXhpbXVtRmlsZVNpemVUb0NhY2hlSW5CeXRlczogNSAqIDEwMjQgKiAxMDI0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgICAgbmFtZTogJ0xpZmVUcmFja2VyJyxcclxuICAgICAgICAgIHNob3J0X25hbWU6ICdMaWZlVHJhY2tlcicsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RyYWNrIHlvdXIgaGFiaXRzLCBzaG9wcGluZywgdG9kb3MsIGFuZCBleHBlbnNlcyBhbGwgaW4gb25lIHBsYWNlJyxcclxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnIzA2MGIxNCcsXHJcbiAgICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnIzA2MGIxNCcsXHJcbiAgICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXHJcbiAgICAgICAgICBzdGFydF91cmw6ICcvJyxcclxuICAgICAgICAgIHNjb3BlOiAnLycsXHJcbiAgICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3JjOiAnL2xvZ28ucG5nJyxcclxuICAgICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxyXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzcmM6ICcvbG9nby5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHNyYzogJy9sb2dvLnBuZycsXHJcbiAgICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcclxuICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICBdXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgXVxyXG4gIH07XHJcbn0pXHJcblxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThWLFNBQVMsb0JBQW9CO0FBQzNYLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFDeEIsT0FBTyxpQkFBaUI7QUFFeEIsU0FBUyxxQkFBcUIsU0FBUztBQUNyQyxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixnQkFBZ0IsUUFBUTtBQUN0QixhQUFPLFlBQVksSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLFFBQVE7QUFDcEQsWUFBSSxVQUFVLGdCQUFnQixrQkFBa0I7QUFDaEQsWUFBSSxJQUFJLEtBQUssVUFBVTtBQUFBLFVBQ3JCLFNBQVM7QUFBQSxVQUNULFNBQVM7QUFBQSxRQUNYLENBQUMsQ0FBQztBQUFBLE1BQ0osQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLGlCQUFpQjtBQUNmLFdBQUssU0FBUztBQUFBLFFBQ1osTUFBTTtBQUFBLFFBQ04sVUFBVTtBQUFBLFFBQ1YsUUFBUSxLQUFLLFVBQVU7QUFBQSxVQUNyQixTQUFTLFFBQVEsSUFBSSx1QkFBdUI7QUFBQSxVQUM1QztBQUFBLFFBQ0YsQ0FBQztBQUFBLE1BQ0gsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQ0Y7QUFHQSxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNLFNBQVMsU0FBUztBQUN4QixRQUFNLFVBQVUsU0FBUyxHQUFHLEtBQUssSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsVUFBVSxHQUFHLENBQUMsQ0FBQyxLQUFLO0FBRXRHLFNBQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxNQUNOLGtCQUFrQixLQUFLLFVBQVUsT0FBTztBQUFBLElBQzFDO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsTUFDWixxQkFBcUIsT0FBTztBQUFBLE1BQzVCLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxRQUNkLGVBQWUsQ0FBQyxVQUFVO0FBQUEsUUFDMUIsU0FBUztBQUFBLFVBQ1AsY0FBYyxDQUFDLHNDQUFzQztBQUFBLFVBQ3JELCtCQUErQixJQUFJLE9BQU87QUFBQSxRQUM1QztBQUFBLFFBQ0EsVUFBVTtBQUFBLFVBQ1IsTUFBTTtBQUFBLFVBQ04sWUFBWTtBQUFBLFVBQ1osYUFBYTtBQUFBLFVBQ2IsYUFBYTtBQUFBLFVBQ2Isa0JBQWtCO0FBQUEsVUFDbEIsU0FBUztBQUFBLFVBQ1QsV0FBVztBQUFBLFVBQ1gsT0FBTztBQUFBLFVBQ1AsT0FBTztBQUFBLFlBQ0w7QUFBQSxjQUNFLEtBQUs7QUFBQSxjQUNMLE9BQU87QUFBQSxjQUNQLE1BQU07QUFBQSxZQUNSO0FBQUEsWUFDQTtBQUFBLGNBQ0UsS0FBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsTUFBTTtBQUFBLFlBQ1I7QUFBQSxZQUNBO0FBQUEsY0FDRSxLQUFLO0FBQUEsY0FDTCxPQUFPO0FBQUEsY0FDUCxNQUFNO0FBQUEsY0FDTixTQUFTO0FBQUEsWUFDWDtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
