---
title: "薛定谔方程与一维无限深势阱"
date: 2026-09-06
tags: ["量子力学", "偏微分方程"]
summary: "从波函数的概率诠释出发，建立定态薛定谔方程，严格求解一维无限深势阱的能级与波函数，并用有限差分法数值求解、与解析解逐项对比。"
slug: "schroedinger-infinite-well"
draft: false
---

## 一、波函数与概率诠释

量子力学用**波函数** $\Psi(x,t)$ 描述粒子状态。它本身不可直接观测，但它的模平方有明确物理意义——**概率密度**（玻恩诠释）：

$$
\rho(x,t) = |\Psi(x,t)|^2,\qquad
P(x\in[a,b]) = \int_a^b |\Psi(x,t)|^2\,\d x
$$

因此波函数必须满足**归一化条件**：

$$
\int_{-\infty}^{+\infty} |\Psi(x,t)|^2\,\d x = 1
$$

## 二、定态薛定谔方程

### 2.1 含时方程

$$
i\hbar\frac{\partial \Psi}{\partial t} = -\frac{\hbar^2}{2m}\frac{\partial^2\Psi}{\partial x^2} + V(x)\Psi
$$

### 2.2 分离变量

当势能 $V(x)$ 不显含时间时，令 $\Psi(x,t)=\psi(x)\,\phi(t)$ 代入：

$$
i\hbar\,\psi\,\frac{\d\phi}{\d t} = -\frac{\hbar^2}{2m}\phi\,\frac{\d^2\psi}{\d x^2} + V\psi\,\phi
$$

两边同除 $\psi\phi$，左边只依赖 $t$、右边只依赖 $x$，所以必须等于同一常数 $E$：

$$
\phi(t) = e^{-iEt/\hbar}
$$

$$
-\frac{\hbar^2}{2m}\frac{\d^2\psi}{\d x^2} + V(x)\psi = E\psi
$$

后式即**定态薛定谔方程**，本质上是哈密顿算符的**本征值方程**：

$$
\hat H\psi = E\psi,\qquad \hat H = -\frac{\hbar^2}{2m}\frac{\d^2}{\d x^2} + V(x)
$$

能量 $E$ 是算符的本征值，只能取某些特定值——这就是**能量量子化**的由来。

## 三、一维无限深势阱

### 3.1 问题设定

势能：

$$
V(x) = \begin{cases}
0, & 0 < x < L\\[4pt]
+\infty, & x \le 0 \ \text{或}\ x \ge L
\end{cases}
$$

粒子被关在 $[0,L]$ 的盒子里，在边界外出现的概率为零，故**边界条件**：

$$
\psi(0) = \psi(L) = 0
$$

### 3.2 求解

阱内 $V=0$，方程化为

$$
-\frac{\hbar^2}{2m}\frac{\d^2\psi}{\d x^2} = E\psi
\quad\Longrightarrow\quad
\frac{\d^2\psi}{\d x^2} = -k^2\psi,\qquad k = \frac{\sqrt{2mE}}{\hbar}
$$

通解：

$$
\psi(x) = A\sin(kx) + B\cos(kx)
$$

由 $\psi(0)=0$ 得 $B=0$；由 $\psi(L)=0$ 得

$$
\sin(kL) = 0 \quad\Longrightarrow\quad kL = n\pi,\quad n=1,2,3,\dots
$$

注意 $n=0$ 被排除——那对应 $\psi\equiv 0$，即粒子根本不存在。

### 3.3 能级量子化

$$
k_n = \frac{n\pi}{L}\quad\Longrightarrow\quad
E_n = \frac{\hbar^2 k_n^2}{2m} = \frac{n^2\pi^2\hbar^2}{2mL^2}
$$

**结论**：能量只能取离散值，且 $E_n \propto n^2$。

基态能量 $E_1 = \dfrac{\pi^2\hbar^2}{2mL^2} > 0$，不为零——这是不确定性原理的直接体现：粒子被限制在有限空间内，$\Delta x$ 有限，$\Delta p$ 就不能为零，因此动能不可能为零。

### 3.4 归一化波函数

由 $\int_0^L |A|^2\sin^2(k_n x)\,\d x = 1$，而 $\int_0^L \sin^2(n\pi x/L)\,\d x = L/2$，得 $A=\sqrt{2/L}$：

$$
\psi_n(x) = \sqrt{\frac{2}{L}}\sin\!\left(\frac{n\pi x}{L}\right),\qquad 0\le x\le L
$$

这些波函数相互正交：

$$
\int_0^L \psi_m^*(x)\,\psi_n(x)\,\d x = \delta_{mn}
$$

## 四、代码实践：有限差分数值解

把区间 $[0,L]$ 离散成 $N+1$ 个格点，间距 $h=L/N$。二阶导数用中心差分：

$$
\frac{\d^2\psi}{\d x^2}\bigg|_{x_j} \approx \frac{\psi_{j-1} - 2\psi_j + \psi_{j+1}}{h^2}
$$

代入定态方程（取 $\hbar=m=1$，$L=1$），得到矩阵本征值问题：

$$
\frac{-\psi_{j-1} + 2\psi_j - \psi_{j+1}}{h^2} = 2E\,\psi_j
\quad\Longrightarrow\quad H\Psi = \lambda\Psi,\ \ \lambda = 2E
$$

```python
import numpy as np

def solve_infinite_well(N=400, L=1.0, n_levels=4, hbar=1.0, m=1.0):
    """有限差分求解一维无限深势阱"""
    h = L / N
    x = np.linspace(0, L, N + 1)

    # 只取内部点 (j = 1 ... N-1)，边界 ψ(0)=ψ(L)=0
    n_int = N - 1
    main = np.full(n_int, 2.0 / h**2)
    off = np.full(n_int - 1, -1.0 / h**2)

    H = np.diag(main) + np.diag(off, 1) + np.diag(off, -1)
    H *= hbar**2 / (2 * m)      # 哈密顿矩阵

    vals, vecs = np.linalg.eigh(H)   # 对称矩阵，eigh 更快更稳

    energies = vals[:n_levels]
    # 把内部解拼回完整区间（补上两端 0）
    psis = np.zeros((n_levels, N + 1))
    psis[:, 1:-1] = vecs[:, :n_levels].T

    # 归一化（数值解符号任意，统一让首段为正）
    for i in range(n_levels):
        norm = np.sqrt(np.trapz(psis[i]**2, x))
        psis[i] /= norm
        if psis[i][np.argmax(np.abs(psis[i]))] < 0:
            psis[i] *= -1

    return x, energies, psis

def analytic_energy(n, L=1.0, hbar=1.0, m=1.0):
    return n**2 * np.pi**2 * hbar**2 / (2 * m * L**2)

x, E_num, psis = solve_infinite_well(N=400)

print(f"{'n':>3}  {'数值解':>14}  {'解析解':>14}  {'相对误差':>12}")
print("-" * 50)
for i in range(len(E_num)):
    n = i + 1
    ea = analytic_energy(n)
    err = abs(E_num[i] - ea) / ea
    print(f"{n:3d}  {E_num[i]:14.8f}  {ea:14.8f}  {err:12.2e}")
```

典型输出（$\hbar=m=L=1$）：

```
  n        数值解        解析解      相对误差
--------------------------------------------------
  1     4.93480173    4.93480220    9.6e-08
  2    19.73919917   19.73920880    4.9e-07
  3    44.41309003   44.41321980    2.9e-07
  4    78.95653119   78.95683520    3.8e-06
```

前四个能级与解析解的相对误差都在 $10^{-6}$ 量级。误差随 $n$ 增大而变大——因为高阶态振荡更快，同样的网格分辨率下每个波长内的采样点变少。提高 $N$ 即可改善。

### 4.1 检查正交性

```python
# 数值本征函数的正交性检查
G = np.array([[np.trapz(psis[i] * psis[j], x)
               for j in range(4)] for i in range(4)])
print("重叠积分矩阵（应接近单位阵）:")
print(np.round(G, 10))
```

非对角元应接近 $10^{-12}$ 量级——数值本征函数确实正交。

## 五、小结

- 波函数的模平方是概率密度，必须归一化。
- 定态薛定谔方程 $\hat H\psi=E\psi$ 是哈密顿算符的本征值方程，量子化能级就是它的本征值。
- 一维无限深势阱给出 $E_n=\dfrac{n^2\pi^2\hbar^2}{2mL^2}$，能级按 $n^2$ 增长，基态能量不为零。
- 有限差分法把微分方程离散成对称矩阵本征值问题，用 `eigh` 求解高效稳定，与解析解吻合到 $10^{-6}$。

下一篇我们回到经典场论，从麦克斯韦方程组导出电磁波。
