# 项目目标

这是一个纯前端网页工具，用来计算包装盒刀模在纸张上的排版利用率。

用户输入：
1. 纸张尺寸
2. 包装展开尺寸
3. 可动态增减多个包装尺寸
4. 可选参数：边距、刀缝/间距、是否允许旋转、目标数量

系统输出：
1. 一张纸最多能切多少个包装展开片
2. 每个包装尺寸的最佳摆放方向
3. 材料利用率
4. 如果包装尺寸大于纸张尺寸，计算多少张纸才能做一个盒子
5. 可视化纸张排版示意图

# 重要定义

本工具第一版只计算「展开后的包装刀模外接矩形」在纸张中的排版，不直接根据立体包装的长宽高计算刀模。

也就是说，用户输入的包装尺寸应理解为：
包装展开后占用的矩形宽度 × 高度。

不要在第一版里擅自加入复杂盒型公式，例如飞机盒、天地盖、抽屉盒、手提袋等。

后续可以扩展「盒型模板」，但当前版本先做通用矩形排版计算器。

# 技术限制

1. 必须是纯前端。
2. 不需要后端。
3. 不需要数据库。
4. 不要接入登录系统。
5. 不要调用外部 API。
6. 所有计算都在浏览器本地完成。
7. 页面刷新后可以不保存数据；如要保存，只能用 localStorage。

# 推荐技术栈

优先使用：
- React
- TypeScript
- Vite
- CSS Modules 或普通 CSS

如果项目没有现成框架，可以直接创建 Vite + React + TypeScript 项目。

# 页面交互要求

页面打开后应包含：

1. 纸张尺寸输入区
   - 纸张宽度
   - 纸张高度
   - 单位：mm
   - 纸张边距
   - 刀缝/安全间距

2. 包装尺寸输入区
   - 支持动态新增包装尺寸
   - 支持删除包装尺寸
   - 每一行包含：
     - 名称
     - 展开宽度
     - 展开高度
     - 目标数量，可选
     - 是否允许旋转，可继承全局设置

3. 计算结果区
   - 每种包装单独计算结果
   - 一张纸可切数量
   - 最佳方向
   - 利用率
   - 需要多少张纸完成目标数量
   - 如果单个包装大于纸张，显示「多少张纸做一个盒子」

4. 可视化区域
   - 用 SVG 画出纸张
   - 用矩形画出包装展开片
   - 显示编号或名称
   - 超大包装时，显示分片网格

# 核心算法要求

## 1. 基础尺寸处理

纸张可用尺寸：

usableWidth = paperWidth - 2 × margin

usableHeight = paperHeight - 2 × margin

包装有效占用尺寸要考虑间距：

pieceWidth = packageWidth
pieceHeight = packageHeight

排版数量计算时，间距只出现在相邻包装之间，不应该简单地给每个包装都粗暴加两倍间距。

推荐公式：

cols = floor((usableWidth + gap) / (pieceWidth + gap))

rows = floor((usableHeight + gap) / (pieceHeight + gap))

count = cols × rows

## 2. 单尺寸排版

对每个包装尺寸，至少尝试两种方向：

方向 A：
packageWidth × packageHeight

方向 B：
packageHeight × packageWidth

如果允许旋转，就比较 A 和 B。

选择规则：
1. 优先选择 count 最大的方案。
2. count 相同时，选择材料利用率更高的方案。
3. 仍然相同时，选择更接近纸张比例的方案。

材料利用率：

usedArea = count × packageWidth × packageHeight

paperUsableArea = usableWidth × usableHeight

utilization = usedArea / paperUsableArea

## 3. 包装尺寸大于纸张的情况

如果包装在两个方向下都无法完整放进一张纸，则进入「分片模式」。

分片模式计算：

方案 A：
tilesX = ceil(packageWidth / usableWidth)
tilesY = ceil(packageHeight / usableHeight)
sheetsPerBox = tilesX × tilesY

方案 B：
tilesX = ceil(packageHeight / usableWidth)
tilesY = ceil(packageWidth / usableHeight)
sheetsPerBox = tilesX × tilesY

如果允许旋转，比较两个方案，选择 sheetsPerBox 更少的。

输出：
- 这是超出纸张尺寸的包装
- 一个盒子至少需要多少张纸
- 横向分几片
- 纵向分几片
- 建议提示：实际生产中还需要考虑拼接边、出血、压线和结构强度

不要把超大包装强行算成一张纸能切 0 个后就结束，必须给出「多少张纸做一个盒子」的结果。

## 4. 多尺寸混排

第一版可以先做「每个尺寸单独排版」。
如果实现多尺寸混排，需要使用启发式算法，不要求全局最优。

推荐实现 MaxRects 或简化版 free rectangles 算法：

1. 把所有待排的包装按面积从大到小排序。
2. 维护一组可用空闲矩形区域。
3. 每放入一个包装，就切分剩余空间。
4. 尝试允许旋转和不旋转。
5. 尝试多种排序策略：
   - 面积从大到小
   - 宽度从大到小
   - 高度从大到小
   - 长边从大到小
6. 选择最终利用率最高的方案。

但是不要为了多尺寸混排牺牲基础功能稳定性。
先保证单尺寸计算准确。

# 代码质量要求

1. 计算逻辑必须独立成纯函数。
2. 不要把核心算法直接写死在 React 组件里。
3. 推荐目录结构：

src/
  components/
  algorithms/
  types/
  utils/
  App.tsx

4. 核心函数建议包括：
   - calculateSinglePackageLayout
   - calculateOversizedPackageLayout
   - calculateBestLayout
   - calculateUtilization
   - generateGridPositions

5. 所有尺寸输入都要做校验。
6. 输入为空、负数、0、非数字时，页面要提示错误，不能崩溃。
7. 计算结果保留 2 位小数。
8. 不要使用魔法数字。
9. 变量名要清晰表达纸张、包装、边距、间距、数量等含义。

# UI 风格要求

界面应简洁、工具化、偏专业，不要做成花哨营销页。

重点是：
1. 输入清楚
2. 计算结果醒目
3. 可视化直观
4. 错误提示明确

# 禁止事项

1. 不要实现后端。
2. 不要使用付费 API。
3. 不要引入复杂登录权限。
4. 不要把包装立体长宽高误当成展开尺寸。
5. 不要只返回一个 count，要同时返回排版方向、行列数、利用率和可视化数据。
6. 不要在超大包装时只显示 0，要进入分片模式。