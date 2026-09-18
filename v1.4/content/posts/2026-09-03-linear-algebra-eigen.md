---
title: "线性代数：向量空间、矩阵与特征值"
date: 2026-09-03
tags: ["线性代数", "矩阵"]
summary: "从向量空间公理出发，理解线性映射与矩阵的对应关系、行列式的几何意义，再到特征值分解与谱定理，并用 NumPy 与幂迭代法亲手算一遍。"
slug: "linear-algebra-eigen"
draft: false
---

## 一、向量空间：不只是"箭头"

初学时把向量当成有方向的箭头，够用但不够深。线性代数的真正对象是**向量空间**——一个集合配上两种运算，满足八条公理。

### 1.1 定义

域 $\mathbb{F}$（通常是 $\mathbb{R}$ 或 $\mathbb{C}$）上的向量空间是一个集合 $V$，配有加法 $+:V\times V\to V$ 与数乘 $\cdot:\mathbb{F}\times V\to V$，满足：

| 公理 | 内容 |
|---|---|
| 加法交换律 | $u+v = v+u$ |
| 加法结合律 | $(u+v)+w = u+(v+w)$ |
| 加法零元 | 存在 $0\in V$，$v+0=v$ |
| 加法逆元 | 对任意 $v$ 存在 $-v$，$v+(-v)=0$ |
| 数乘结合律 | $a(bv) = (ab)v$ |
| 数乘单位元 | $1\cdot v = v$ |
| 分配律（向量） | $a(u+v) = au+av$ |
| 分配律（标量） | $(a+b)v = av+bv$ |

### 1.2 为什么这很重要

因为**满足这八条的东西都是向量空间**，于是所有关于向量空间的定理对它们全都成立：

- $\mathbb{R}^n$ 是向量空间
- 次数不超过 $n$ 的多项式集合 $\mathcal{P}_n$ 是向量空间
- 区间上的连续函数 $C[a,b]$ 是向量空间
- 满足某个齐次微分方程的所有解构成向量空间

这就是抽象的威力：证明一次，到处可用。

### 1.3 基与维数

若 $V$ 中一组向量 $\{e_1,\dots,e_n\}$ 满足**线性无关**且**张成** $V$，则称其为一组基。基的个数就是**维数** $\dim V$。

同一个向量在不同基下有不同的坐标。坐标变换公式：若新旧基的过渡矩阵为 $P$，则

$$
[v]_{\text{旧}} = P\,[v]_{\text{新}}
$$

## 二、线性映射与矩阵

### 2.1 线性映射

映射 $T:V\to W$ 称为线性的，若

$$
T(au+bv) = a\,T(u) + b\,T(v)
$$

关键洞察：**线性映射完全由它在基上的作用决定**。只要知道 $T(e_1),\dots,T(e_n)$，任意 $v=\sum c_i e_i$ 的像就是

$$
T(v) = \sum_{i=1}^{n} c_i\,T(e_i)
$$

### 2.2 矩阵是线性映射的坐标表示

把 $T(e_j)$ 在第 $j$ 列排开，就得到矩阵 $A$：

$$
A = \big[\,T(e_1)\;\;T(e_2)\;\;\cdots\;\;T(e_n)\,\big]
$$

于是抽象的映射运算变成了矩阵乘法：

$$
[T(v)] = A\,[v]
$$

**矩阵不是目的，是计算工具。** 真正的研究对象是线性映射本身；换一组基，矩阵变成 $P^{-1}AP$（相似变换），但映射没变。

### 2.3 行列式的几何意义

$n$ 阶矩阵 $A$ 的行列式 $\det A$ 等于**以列向量为棱的平行多面体的有向体积**。

由此立刻得到几个结论：

- $\det A = 0$ $\iff$ 列向量线性相关 $\iff$ $A$ 不可逆 $\iff$ 体积塌缩到低维
- $|\det A|$ 是线性变换的体积放大倍数
- $\det(AB) = \det A\cdot\det B$（两次缩放的体积倍率相乘）

## 三、特征值与特征向量

### 3.1 定义与动机

若存在非零向量 $v$ 与标量 $\lambda$ 使得

$$
A v = \lambda v
$$

则称 $v$ 为**特征向量**，$\lambda$ 为对应的**特征值**。

它的意义是：在线性变换 $A$ 的作用下，这个方向**只是被拉伸了 $\lambda$ 倍，方向没有改变**。找到所有这样的方向，整个变换就被分解成"沿若干独立方向的纯伸缩"——这是理解线性变换最简单的方式。

### 3.2 特征方程

由 $(A-\lambda I)v=0$ 且 $v\neq 0$，得

$$
\det(A-\lambda I) = 0
$$

这是关于 $\lambda$ 的 $n$ 次多项式方程，称为**特征方程**。

### 3.3 对角化与谱定理

若 $A$ 有 $n$ 个线性无关的特征向量，令 $Q$ 以它们为列，$\Lambda=\mathrm{diag}(\lambda_1,\dots,\lambda_n)$，则

$$
A = Q\Lambda Q^{-1}
$$

对角化让矩阵幂运算变得平凡：$A^k = Q\Lambda^k Q^{-1}$。

**谱定理**（实对称矩阵的特例，也是物理中最常用的）：若 $A$ 是实对称矩阵（$A=A^{\mathsf T}$），则存在**正交矩阵** $Q$（$Q^{\mathsf T}Q=I$）使得

$$
A = Q\Lambda Q^{\mathsf T}
$$

也就是说对称矩阵不仅能对角化，还能用**正交变换**对角化——这正是主成分分析（PCA）、刚体转动惯量主轴、量子力学中可观测量算符的理论基础。

## 四、代码实践

### 4.1 用 NumPy 直接求特征系统

```python
import numpy as np

A = np.array([[4.0, 1.0],
              [1.0, 3.0]])

w, V = np.linalg.eigh(A)   # eigh 专用于对称矩阵，数值更稳定

print("特征值:", w)
print("特征向量（列）:\n", V)

# 验证 A v = λ v
for i in range(len(w)):
    v = V[:, i]
    lhs = A @ v
    rhs = w[i] * v
    print(f"λ={w[i]:.6f}  残差={np.linalg.norm(lhs - rhs):.2e}")

# 验证谱分解 A = Q Λ Q^T
A_recon = V @ np.diag(w) @ V.T
print("重构误差:", np.linalg.norm(A_recon - A))
```

### 4.2 幂迭代法：手算主特征值

当矩阵很大、只需要最大特征值时，QR 全套分解太重。幂迭代只需要矩阵向量乘法：

$$
v_{k+1} = \frac{A v_k}{\|A v_k\|},\qquad
\lambda \approx v_k^{\mathsf T} A v_k \quad(\text{瑞利商})
$$

```python
import numpy as np

def power_iteration(A, num_steps=100, tol=1e-12):
    """返回（主特征值, 对应特征向量）"""
    n = A.shape[0]
    v = np.random.default_rng(42).normal(size=n)
    v = v / np.linalg.norm(v)

    for k in range(num_steps):
        w = A @ v
        v_new = w / np.linalg.norm(w)
        # 用瑞利商估计特征值
        lam = v_new @ A @ v_new
        if np.linalg.norm(v_new - v) < tol:
            v = v_new
            break
        v = v_new
    return lam, v

A = np.array([[4.0, 1.0, 0.5],
              [1.0, 3.0, 0.2],
              [0.5, 0.2, 2.0]])

lam, v = power_iteration(A)
exact = np.linalg.eigvalsh(A)

print("幂迭代得到的最大特征值:", lam)
print("NumPy 精确特征值      :", exact)
print("最大者                :", exact.max())
print("误差                  :", abs(lam - exact.max()))
```

收敛速度取决于 $|\lambda_2/\lambda_1|$：两个最大特征值越接近，收敛越慢。若它们相等（重根），幂迭代会失效——这时需要正交迭代或 Arnoldi/Lanczos 类方法。

## 五、小结

- 向量空间的公理化让"多项式""函数""解空间"都能享受同一套定理。
- 矩阵是线性映射在一组基下的坐标表示，换基对应相似变换。
- 行列式的本质是**有向体积缩放倍率**。
- 特征分解 $A=Q\Lambda Q^{-1}$ 把线性变换拆成"换基 → 独立伸缩 → 换回来"三步。
- 对称矩阵可以正交对角化 $A=Q\Lambda Q^{\mathsf T}$，这是物理与数据科学中最常用的形式。

下一篇进入经典力学，看看拉格朗日方程如何用"最小作用量"重述 $F=ma$。
