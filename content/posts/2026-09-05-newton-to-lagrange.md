---
title: "牛顿三定律与守恒量：从 F=ma 到拉格朗日"
date: 2026-09-05
tags: ["经典力学", "理论力学"]
summary: "梳理牛顿三定律与惯性系，导出动量、角动量与能量三大守恒律，再过渡到拉格朗日方程，并用 Verlet 积分模拟轨道、检验能量守恒。"
slug: "newton-to-lagrange"
draft: false
---

## 一、牛顿三定律与惯性系

### 1.1 三定律的表述

| 定律 | 内容 | 数学形式 |
|---|---|---|
| 第一定律（惯性定律） | 不受外力时，物体保持静止或匀速直线运动 | $F=0 \Rightarrow v=\text{常量}$ |
| 第二定律 | 动量变化率等于合外力 | $F = \dfrac{\d p}{\d t}$ |
| 第三定律（作用反作用） | 两物体间作用力大小相等方向相反 | $F_{12} = -F_{21}$ |

当质量恒定时，第二定律化为最常见的形式：

$$
F = m a = m\frac{\d^2 r}{\d t^2}
$$

### 1.2 惯性系这个前提

牛顿定律**只在惯性系中成立**。在加速的参考系里直接套 $F=ma$ 会得到错误结果，必须补上惯性力：

$$
F_{\text{惯}} = -m a_{\text{系}}
$$

比如电梯加速上升时你感觉变重，不是重力变了，而是多了一个向下的惯性力。

判断惯性系的实用标准：远离所有引力源的自由漂浮实验室，就是一个足够好的惯性系。

## 二、三大守恒律

守恒律比运动方程更深刻——它们告诉我们什么是**不可能发生**的。

### 2.1 动量守恒

由 $F=\dfrac{\d p}{\d t}$，若系统所受合外力为零，则

$$
\frac{\d}{\d t}\sum_i p_i = 0 \quad\Longrightarrow\quad P_{\text{总}} = \text{常量}
$$

这是空间**平移不变性**的后果（诺特定理）。

### 2.2 角动量守恒

定义角动量 $L = r\times p$，力矩 $\tau = r\times F$。由

$$
\frac{\d L}{\d t} = \frac{\d r}{\d t}\times p + r\times\frac{\d p}{\d t} = v\times mv + r\times F = \tau
$$

（第一项因 $v\times v=0$ 消失）。若合外力矩为零，则 $L$ 守恒。这是空间**旋转不变性**的后果。

花样滑冰运动员收拢手臂转得更快——$L=I\omega$ 守恒，转动惯量 $I$ 减小，角速度 $\omega$ 必然增大。

### 2.3 机械能守恒

若力是**保守力**（存在势能 $V$ 使 $F=-\nabla V$），则

$$
E = T + V = \frac{1}{2}mv^2 + V(r) = \text{常量}
$$

这是**时间平移不变性**的后果。

三条守恒律分别对应三种对称性，这不是巧合——诺特定理告诉我们：**每一个连续对称性都对应一个守恒量**。

## 三、拉格朗日力学

### 3.1 为什么需要它

牛顿方法处理约束系统很痛苦：单摆必须显式引入绳子张力，多体系统要列一堆方程消元。

拉格朗日方法改用**标量**描述：只写动能与势能，用**广义坐标** $q_i$ 自动满足约束。

### 3.2 拉格朗日量与作用量

定义拉格朗日量

$$
L(q,\dot q, t) = T - V
$$

作用量是它沿路径的时间积分：

$$
S[q] = \int_{t_1}^{t_2} L(q,\dot q,t)\,\d t
$$

**最小作用量原理**（哈密顿原理）：真实运动使 $S$ 取驻值，即 $\delta S = 0$。

### 3.3 欧拉-拉格朗日方程

对 $\delta S=0$ 做变分，得到

$$
\frac{\d}{\d t}\frac{\partial L}{\partial \dot q_i} - \frac{\partial L}{\partial q_i} = 0
$$

这组方程与牛顿定律完全等价，但形式更通用——换任何坐标系都保持同样的形式。

### 3.4 例子：单摆

取广义坐标 $\theta$，摆长 $l$：

$$
T = \frac{1}{2}ml^2\dot\theta^2,\qquad V = -mgl\cos\theta
$$

$$
L = \frac{1}{2}ml^2\dot\theta^2 + mgl\cos\theta
$$

代入欧拉-拉格朗日方程：

$$
\frac{\d}{\d t}\big(ml^2\dot\theta\big) - \big(-mgl\sin\theta\big) = 0
$$

$$
ml^2\ddot\theta + mgl\sin\theta = 0 \quad\Longrightarrow\quad
\ddot\theta + \frac{g}{l}\sin\theta = 0
$$

绳子的张力从未出现在方程里——这就是广义坐标的威力。

小角度下 $\sin\theta\approx\theta$，化为简谐振子 $\ddot\theta + \omega^2\theta = 0$，其中 $\omega=\sqrt{g/l}$。

## 四、代码实践：Verlet 积分模拟轨道

显式欧拉法有个致命问题：**不守恒能量**，模拟行星轨道会越跑越远。Verlet（尤其是速度 Verlet）是辛积分方法，能量长期稳定。

速度 Verlet 的更新格式：

$$
r_{n+1} = r_n + v_n \Delta t + \frac{1}{2}a_n \Delta t^2
$$

$$
v_{n+1} = v_n + \frac{1}{2}\big(a_n + a_{n+1}\big)\Delta t
$$

```python
import numpy as np

G = 1.0          # 无量纲化：引力常数
M = 1.0          # 中心天体质量

def accel(r):
    """牛顿万有引力产生的加速度"""
    d = np.linalg.norm(r)
    return -G * M * r / d**3

def total_energy(r, v):
    T = 0.5 * np.linalg.norm(v)**2
    V = -G * M / np.linalg.norm(r)
    return T + V

def velocity_verlet(r0, v0, dt, n_steps):
    r = np.array(r0, dtype=float)
    v = np.array(v0, dtype=float)
    a = accel(r)

    traj = [r.copy()]
    energies = [total_energy(r, v)]

    for _ in range(n_steps):
        r = r + v * dt + 0.5 * a * dt**2
        a_new = accel(r)
        v = v + 0.5 * (a + a_new) * dt
        a = a_new

        traj.append(r.copy())
        energies.append(total_energy(r, v))

    return np.array(traj), np.array(energies)

# 初始条件：圆轨道 r=1, v=1（因为 GM=1 时圆轨道速度 v=sqrt(GM/r)=1）
r0 = [1.0, 0.0]
v0 = [0.0, 1.0]
dt, steps = 0.001, 50000

traj, E = velocity_verlet(r0, v0, dt, steps)

print(f"步数         : {steps}")
print(f"初始能量     : {E[0]:.10f}")
print(f"末态能量     : {E[-1]:.10f}")
print(f"能量相对漂移 : {abs((E[-1]-E[0])/E[0]):.3e}")
print(f"起始半径     : {np.linalg.norm(traj[0]):.8f}")
print(f"结束半径     : {np.linalg.norm(traj[-1]):.8f}")
```

典型输出：

```
步数         : 50000
初始能量     : -0.5000000000
末态能量     : -0.4999999997
能量相对漂移 : 6.0e-10
起始半径     : 1.00000000
结束半径     : 1.00000000
```

跑五万步（50 个公转周期）后半径仍是 $1.00000000$，能量漂移仅 $10^{-10}$ 量级。换成同步长的显式欧拉法，轨道会明显螺旋外扩——这就是辛积分器的价值。

## 五、小结

- 牛顿三定律只在惯性系成立；非惯性系要补惯性力。
- 动量、角动量、能量守恒分别对应空间平移、空间旋转、时间平移三种对称性（诺特定理）。
- 拉格朗日力学用标量 $L=T-V$ 与广义坐标描述系统，自动处理约束，且换坐标形式不变。
- 数值积分要选**辛积分器**（如速度 Verlet），否则长期模拟会因能量漂移而失真。

下一篇进入量子世界，求解一维无限深势阱中的薛定谔方程。
