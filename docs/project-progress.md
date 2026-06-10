# 包装纸张排版计算器项目进度

更新时间：2026-06-10

## 当前状态

项目已经从零创建为 React + TypeScript + Vite 纯前端应用，当前目录不是 Git 仓库。

已完成第一版矩形排版 MVP，并在此基础上加入了异形刀模方向的 MVP 探索：

- 支持纸张宽高、边距、包装间距输入。
- 支持包装列表新增、删除。
- 每行支持名称、展开宽度、展开高度、目标数量、是否允许旋转。
- 支持矩形展开片排版计算。
- 支持超大包装分片模式，不再只显示 0。
- 支持 SVG 二维预览。
- 支持 Three.js 三维实时预览。
- 已加入普通双插盒异形刀模模板，用户可输入 L/W/H/纸厚生成近似刀模外形。
- SVG 和 3D 预览已经能消费异形刀模结果，而不只是矩形。

## 已实现文件

主要文件：

- `package.json`
- `vite.config.ts`
- `src/App.tsx`
- `src/main.tsx`
- `src/styles.css`
- `src/types/layout.ts`
- `src/algorithms/layout.ts`
- `src/algorithms/dielines.ts`
- `src/algorithms/irregularPacking.ts`
- `src/utils/validation.ts`
- `src/components/PaperForm.tsx`
- `src/components/PackageList.tsx`
- `src/components/NumberField.tsx`
- `src/components/ResultsPanel.tsx`
- `src/components/LayoutPreview2D.tsx`
- `src/components/LayoutPreview3D.tsx`

测试文件：

- `src/algorithms/layout.test.ts`
- `src/algorithms/dielines.test.ts`
- `src/algorithms/irregularPacking.test.ts`
- `src/utils/validation.test.ts`

## 参考站点调研结论

已用只读方式查看 `https://dplate.sd2000.com/` 的前端资源。该站点是 Vue SPA，核心思路是：

- 根据盒型尺寸生成 SVG 路径。
- 出血线、割线、折线分别以不同路径表示。
- 页面通过 SVG 展示刀模，并支持导出 SVG/PDF。

本项目没有接入该站点 API，也没有复制其完整盒型公式。当前只是按它的产品形态，先做了一个普通双插盒近似模板，作为后续盒型模板系统的起点。

## 算法现状

矩形模式：

- 纸张可用尺寸为 `paperWidth - 2 * margin` 和 `paperHeight - 2 * margin`。
- 排版数量用 `floor((usable + gap) / (piece + gap))`，间距只计算相邻包装之间。
- 允许旋转时比较正向和旋转方向。
- 优先选择数量最多，其次利用率更高，再其次比例更接近纸张。
- 如果正向和旋转方向都放不进纸张，进入超大分片模式。

异形模式：

- `dielines.ts` 生成近似普通双插盒刀模，包括外轮廓、折线和外接矩形。
- `irregularPacking.ts` 尝试用扫描候选位置 + 多边形碰撞检测排入纸张。
- 当前异形排版是探索版，已经能表达“刀模不是矩形”的方向，但性能还需要优化。

## 验证结果

构建：

- `npm.cmd run build` 已通过。
- 输出目录为 `dist/`。
- Vite 有一个体积提示：Three.js 导致 JS chunk 超过 500 kB，这是预览功能带来的正常风险，后续可以用动态 import 优化。

单项测试：

- `npx.cmd vitest run src/algorithms/dielines.test.ts --reporter verbose` 通过。
- `npx.cmd vitest run src/algorithms/layout.test.ts --reporter verbose` 通过。
- `npx.cmd vitest run src/utils/validation.test.ts --reporter verbose` 通过。
- `npx.cmd vitest run src/algorithms/irregularPacking.test.ts --reporter verbose` 超时。

全量测试：

- `npm.cmd test` 当前会卡住或超时，原因集中在 `irregularPacking.test.ts`。

浏览器验证：

- 昨天已启动本地 Vite 并打开 `http://localhost:5173/` 验证过桌面端。
- 默认普通双插盒数据能算出结果并渲染 SVG/Three.js。
- 当时页面无浏览器 console 错误。

## 当前问题

最主要问题是异形排版测试性能：

- `irregularPacking.ts` 当前使用较密的扫描步长。
- 每个候选点会和已放置的所有多边形做碰撞检测。
- 包装数量增加后复杂度上升很快。
- `irregularPacking.test.ts` 中的大纸张 + `maxPieces: 200` 场景会导致测试超时。

下一步建议先不要继续加盒型，而是先优化异形排版算法：

- 先用外接框快速生成行列候选，减少全纸扫描。
- 保留多边形碰撞作为二次校验。
- 降低默认 `maxAttempts` 或让测试用更小的目标。
- 给异形排版增加确定性性能边界，避免 UI 计算卡死。

## 如何运行

安装依赖：

```powershell
npm.cmd install
```

启动开发服务器：

```powershell
npm.cmd run dev
```

构建：

```powershell
npm.cmd run build
```

运行测试：

```powershell
npm.cmd test
```

注意：当前全量测试会被异形排版测试拖住，建议修复 `src/algorithms/irregularPacking.ts` 后再把全量测试作为完成标准。

## 当前版本限制

- 第一版仍然不是完整盒型库。
- 普通双插盒模板是近似刀模，不是生产级刀模公式。
- 暂未支持用户自由绘制或导入 SVG/DXF 刀模。
- 暂未实现多个不同尺寸混合拼版的全局最优。
- 异形排版算法还没有达到稳定生产可用性能。
- 3D 预览用于排版验证，不是盒型折叠仿真。
- 数据不保存到后端，也没有登录、数据库和外部 API。
