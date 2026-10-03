# /lab 波浪 Hero：开销优化

日期：2026-10-03（Australia/Melbourne），分支 `discovery-light-study-reuse`。

## 背景

参考功耗为 M1 Pro 上 35–42 W（hero 可见时）。旧实现每个显示帧都重绘整个 Canvas：在 120 Hz ProMotion 屏幕上即每秒 120 次。单帧包括 3 层 × 全分辨率滤镜模糊、3 次大半径阴影描边、约 750 个逐段渐变填充，以及每帧 4 次 `data-*` 写入。

## 改动（`lab/wave-scene.js`）

| 项 | 做法 | 画面影响 |
| --- | --- | --- |
| 帧率 | 环境漂移（无指针、无主题过渡、无滚动缓动）限 30 fps；交互时限 60 fps，不再跟随 120 Hz | 漂移约 0.2 px/帧，肉眼不可辨 |
| 透射模糊 | 在半分辨率缓冲内模糊后再放大，半径按比例换算 | 源图本就是半分辨率低频内容 |
| 投影描边 | 22 px 阴影在缓冲分辨率绘制后放大 | 同上 |
| 背景 | 天空、光斑、窗光与时间无关，按主题/指针（量化 0.001）缓存；指针移动时直接绘制 | 光源位移 < 0.1 px |
| 斜面 | 渐变段从 6 px 合并为 12 px | 斜率变化平缓 |
| 颜色字符串 | 每帧只生成一次调色板前缀 | 输出完全相同 |
| 诊断 | `data-phase` 等每 250 ms 与状态切换时写入 | 无 |

## 验证

- 像素对比（1440×880，DPR 1.5，四组相位/主题/倾斜）：最大通道差 ≤ 6/255，PSNR 50–52 dB。
- 单帧绘制（headless Chromium 软件渲染，仅看比例）：环境帧 326→222 ms（−32%），交互帧 340→251 ms（−26%）。
- 绘制频率：60 Hz 下环境帧 60→30 次/秒，交互保持 60；120 Hz 下预期环境 120→30、交互 120→60。
- 综合估算环境状态下绘制工作量约为原来的 17%（120 Hz）或 34%（60 Hz）。实际功耗需本机测量。
- `check-lab.cjs` 除指针倾斜一段外全部通过；该段在无 GPU 环境因单帧过慢无法达到阈值，已在绘制被替换为空操作的条件下单独验证倾斜、回正与暂停。`check-light-study.cjs` 通过。现有 poster 与新绘制差异在上述范围内，未重新导出。

## 本机复核

```sh
python3 server.py
# 功耗：hero 静置 30 s 与鼠标持续移动 30 s 各测一次
sudo powermetrics --samplers cpu_power,gpu_power -i 1000 -n 30
# 绘制成本与像素差异（参考版本临时放到 lab/ 下，用后删除）
git show 342f005:lab/wave-scene.js > lab/wave-scene.ref.js
WAVE_REF=/lab/wave-scene.ref.js node scripts/bench-wave.cjs
rm lab/wave-scene.ref.js
```

`AMBIENT_FRAME` 与 `ACTIVE_FRAME` 是两个可调常量。若希望进一步省电，环境帧可尝试 1/24；若交互需要 120 Hz 的跟手感，可将 `ACTIVE_FRAME` 设为 0。

未采用：仅对细描边光晕做低分辨率绘制。软件渲染下没有收益，暂不引入。
