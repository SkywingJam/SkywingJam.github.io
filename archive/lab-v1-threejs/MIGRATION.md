# Lab v1 migration

归档日期：2026-10-03。来源：`167832b`（当前替换前的 Lab 首版）。

- 原 `lab/` 保存于此目录的 `lab/`，包含两套 poster、Three.js 模块及 MIT 许可证。
- 原 `docs/discovery/lab-page.md` 和 `lab-implementation.md` 保存于 `docs/`。文档中的原始路径描述首版，不表示当前入口。
- 预览：仓库根目录运行 `python3 server.py`，打开 `/archive/lab-v1-threejs/lab/`。
- 归档 HTML 增加历史版本横幅、`noindex, nofollow`，移除正式入口 canonical；其余渲染逻辑、资源与许可证原样保留。OG 元数据保留历史信息，不作为当前分享入口。
- CSS、脚本、poster 和源码下载均保持 `./` 相对路径，因此整个目录移动后仍有效；首页、favicon 和 Ambient field 源码使用根路径，仍指向有效主站资源。
- 主题设置与站点共用 localStorage 的 `theme` 键。预览历史版本也会更新主题偏好。
- 当前 `/lab/` 已改用独立 Canvas 2D 霜面渲染器，不再加载此目录中的 Three.js。
