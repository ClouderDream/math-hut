---
title: "麦克斯韦方程组的微分形式与电磁波"
date: 2026-09-07
tags: ["电磁学", "电动力学"]
summary: "从麦克斯韦方程组的微分形式出发，在真空中导出波动方程并得到光速，讨论平面波解与偏振，最后用一维 FDTD 方法模拟电磁波的传播与反射。"
slug: "maxwell-em-wave"
draft: false
---

## 一、麦克斯韦方程组的微分形式

积分形式描述大范围行为，微分形式描述**每一点**的行为——后者才是场的局域定律。

### 1.1 四个方程（真空中）

$$
\nabla\cdot\mathbf{E} = \frac{\rho}{\varepsilon_0}
$$

$$
\nabla\cdot\mathbf{B} = 0
$$

$$
\nabla\times\mathbf{E} = -\frac{\partial\mathbf{B}}{\partial t}
$$

$$
\nabla\times\mathbf{B} = \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial\mathbf{E}}{\partial t}
$$

### 1.2 逐个解读

| 方程 | 名称 | 物理含义 |
|---|---|---|
| $\nabla\cdot\mathbf{E}=\rho/\varepsilon_0$ | 高斯定律 | 电荷是电场的源；电场线从正电荷发出、终止于负电荷 |
| $\nabla\cdot\mathbf{B}=0$ | 高斯磁定律 | **没有磁单极子**；磁感线闭合 |
| $\nabla\times\mathbf{E}=-\partial_t\mathbf{B}$ | 法拉第定律 | 变化的磁场产生**旋涡电场**（发电机原理） |
| $\nabla\times\mathbf{B}=\mu_0\mathbf{J}+\mu_0\varepsilon_0\partial_t\mathbf{E}$ | 安培-麦克斯韦定律 | 电流**和**变化的电场都产生磁场 |

最后一项 $\mu_0\varepsilon_0\,\partial\mathbf{E}/\partial t$ 是麦克斯韦的**位移电流**项，是他最伟大的补笔。没有它，方程组在电荷不守恒的情形下自相矛盾；有了它，才可能导出电磁波。

### 1.3 电荷守恒自动满足

对安培-麦克斯韦方程取散度，左边 $\nabla\cdot(\nabla\times\mathbf{B})\equiv 0$，于是

$$
0 = \mu_0\nabla\cdot\mathbf{J} + \mu_0\varepsilon_0\frac{\partial}{\partial t}(\nabla\cdot\mathbf{E})
= \mu_0\nabla\cdot\mathbf{J} + \mu_0\frac{\partial\rho}{\partial t}
$$

即

$$
\nabla\cdot\mathbf{J} + \frac{\partial\rho}{\partial t} = 0
$$

这正是**连续性方程**（电荷守恒）。位移电流项是自洽性的必需品。

## 二、从方程组到波动方程

### 2.1 真空中的对称形式

真空中 $\rho=0,\ \mathbf{J}=0$：

$$
\nabla\cdot\mathbf{E}=0,\quad \nabla\cdot\mathbf{B}=0
$$

$$
\nabla\times\mathbf{E}=-\frac{\partial\mathbf{B}}{\partial t},\quad
\nabla\times\mathbf{B}=\mu_0\varepsilon_0\frac{\partial\mathbf{E}}{\partial t}
$$

### 2.2 取旋度

对法拉第定律两边取旋度：

$$
\nabla\times(\nabla\times\mathbf{E}) = -\frac{\partial}{\partial t}(\nabla\times\mathbf{B})
$$

用矢量恒等式 $\nabla\times(\nabla\times\mathbf{E})=\nabla(\nabla\cdot\mathbf{E})-\nabla^2\mathbf{E}$，第一项因 $\nabla\cdot\mathbf{E}=0$ 消失：

$$
-\nabla^2\mathbf{E} = -\mu_0\varepsilon_0\frac{\partial^2\mathbf{E}}{\partial t^2}
$$

即

$$
\nabla^2\mathbf{E} = \mu_0\varepsilon_0\frac{\partial^2\mathbf{E}}{\partial t^2}
$$

同理对 $\mathbf{B}$ 有完全相同形式的方程。

### 2.3 光速的出现

与标准波动方程 $\nabla^2 u = \dfrac{1}{v^2}\dfrac{\partial^2 u}{\partial t^2}$ 对比，得波速

$$
c = \frac{1}{\sqrt{\varepsilon_0\mu_0}}
$$

代入数值 $\varepsilon_0\approx 8.854\times10^{-12}\ \mathrm{F/m}$，$\mu_0=4\pi\times10^{-7}\ \mathrm{H/m}$：

$$
c \approx 2.998\times 10^8\ \mathrm{m/s}
$$

**这与实测光速一致**。麦克斯韦由此断言：光就是一种电磁波。这是物理学史上最漂亮的统一之一。

## 三、平面波解与偏振

### 3.1 平面波

沿 $z$ 方向传播、角频率 $\omega$ 的单色平面波：

$$
\mathbf{E}(z,t) = \mathbf{E}_0\,e^{i(kz-\omega t)},\qquad
\mathbf{B}(z,t) = \mathbf{B}_0\,e^{i(kz-\omega t)}
$$

其中 $k=\omega/c$ 是波数。

### 3.2 横波性与正交关系

代入 $\nabla\cdot\mathbf{E}=0$ 得 $ikE_{0z}=0$，即 $E_{0z}=0$——**电场没有沿传播方向的分量**。同理 $B_{0z}=0$。所以电磁波是**横波**。

再代入法拉第定律 $\nabla\times\mathbf{E}=-\partial_t\mathbf{B}$：

$$
i\mathbf{k}\times\mathbf{E}_0 = i\omega\mathbf{B}_0
\quad\Longrightarrow\quad
\mathbf{B}_0 = \frac{1}{\omega}\mathbf{k}\times\mathbf{E}_0 = \frac{1}{c}\,\hat{\mathbf{k}}\times\mathbf{E}_0
$$

三个矢量 $\mathbf{E}$、$\mathbf{B}$、$\mathbf{k}$ 两两垂直，构成右手系，且振幅关系为

$$
E_0 = c\,B_0
$$

### 3.3 偏振

电场矢量端点在垂直于传播方向的平面内画出的轨迹，就是**偏振**：

- **线偏振**：$\mathbf{E}_0$ 固定方向
- **圆偏振**：$\mathbf{E}_0 = E_0(\hat{x} \pm i\hat{y})/\sqrt{2}$，电场端点画圆
- **椭圆偏振**：一般情形

### 3.4 能量传输（坡印廷矢量）

电磁波携带能量，能流密度由坡印廷矢量给出：

$$
\mathbf{S} = \frac{1}{\mu_0}\mathbf{E}\times\mathbf{B}
$$

对平面波取时间平均：

$$
\langle S\rangle = \frac{E_0^2}{2\mu_0 c} = \frac{1}{2}c\varepsilon_0 E_0^2
$$

## 四、代码实践：一维 FDTD 模拟

FDTD（时域有限差分）直接对麦克斯韦旋度方程做差分离散。一维情形（波沿 $z$ 传播，$E_x$ 与 $B_y$ 耦合），方程简化为：

$$
\frac{\partial E_x}{\partial t} = -c^2\frac{\partial B_y}{\partial z},\qquad
\frac{\partial B_y}{\partial t} = -\frac{\partial E_x}{\partial z}
$$

采用 Yee 网格（$E$ 与 $B$ 在空间上半格错开、时间上半步错开）：

```python
import numpy as np

c = 1.0            # 无量纲化：光速 = 1
L = 20.0           # 计算域长度
Nx = 800           # 空间格点数
dx = L / Nx
dt = 0.5 * dx / c  # CFL 条件：dt <= dx/c，取 0.5 保证稳定
Nt = 2600

# Yee 网格：Ex 在整格点，By 在半格点
Ex = np.zeros(Nx)
By = np.zeros(Nx - 1)

# 初始：一个高斯脉冲（用 By 初始化，然后推进）
z = np.linspace(0, L, Nx)
z_half = 0.5 * (z[:-1] + z[1:])
z0, width = 5.0, 0.6
By[:] = np.exp(-((z_half - z0) / width) ** 2)

# 在右半区放一个"完美导体墙"：把 z > 15 的区域电场强制为 0
WALL_START = int(0.75 * Nx)

snapshots = []
for n in range(Nt):
    # 1) 用 B 更新 E（内部点）
    Ex[1:-1] += -(c**2) * dt / dx * (By[1:] - By[:-1])

    # 2) 边界条件：两端为理想导体，切向电场为 0
    Ex[0] = 0.0
    Ex[-1] = 0.0

    # 3) 导体墙：墙内电场归零（模拟金属反射）
    Ex[WALL_START:] = 0.0

    # 4) 用 E 更新 B
    By[:] += -dt / dx * (Ex[1:] - Ex[:-1])

    if n % 650 == 0:
        snapshots.append((n, Ex.copy()))

# 能量（离散形式），用于检查数值稳定性
def field_energy(Ex, By):
    return 0.5 * np.sum(Ex**2) + 0.5 * c**2 * np.sum(By**2)

print(f"Courant 数 S = c*dt/dx = {c*dt/dx:.3f}  (应 < 1)")
for n, snap in snapshots:
    peak_idx = np.argmax(np.abs(snap))
    print(f"步 {n:5d}  峰值位置 z = {z[peak_idx]:6.2f}  峰值 = {snap[peak_idx]: .4f}")
```

运行后能看到：脉冲先向两侧展开（初始高斯包络按色散关系分成左右两支），其中一支向右传播，撞到 $z=15$ 处的导体墙后**反号反射**——这正是理想导体表面切向电场必须为零导致的结果。

### 4.1 CFL 稳定性条件

FDTD 不是随便取步长都行。稳定性要求 **Courant 条件**：

$$
S = \frac{c\,\Delta t}{\Delta x} \le 1
$$

超过 1 时误差指数增长，几步之后就溢出。上面代码取 $S=0.5$，留了安全余量。

## 五、小结

- 麦克斯韦方程组微分形式共四条：两条散度（源与无磁单极）、两条旋度（法拉第与安培-麦克斯韦）。
- 位移电流项 $\mu_0\varepsilon_0\,\partial_t\mathbf{E}$ 是方程组自洽的必要条件，也是电磁波存在的前提。
- 真空中取旋度即得波动方程，波速 $c=1/\sqrt{\varepsilon_0\mu_0}$ 与实测光速吻合 → 光是电磁波。
- 电磁波是横波，$\mathbf{E}\perp\mathbf{B}\perp\mathbf{k}$ 成右手系，$E_0=cB_0$。
- FDTD 直接在时域差分离散，需注意 CFL 条件 $c\Delta t\le\Delta x$。

---

到这里，「云梦的数理小屋」的五篇开篇笔记就齐了：微积分 → 线性代数 → 经典力学 → 量子力学 → 电磁学。它们串起来是一条完整的物理数学主干线。后续会继续往深处写，也会补上更多可运行的代码实验。
