---
title: "向量场三剑客：梯度、散度与旋度"
date: 2026-09-12
tags: ["数学", "向量分析", "物理"]
summary: "标量场给出“高低”，向量场给出“流向”。梯度、散度、旋度三个算子把这两种场连接起来，是电磁学、流体力学与场论的语言基础。"
slug: "vector-calculus"
draft: false
---

## 一、两类场

- **标量场** $\phi(\mathbf r)$：每点一个数值，如温度、电势；
- **向量场** $\mathbf F(\mathbf r)$：每点一个向量，如风速、电场。

三个微分算子刻画了它们之间的转化。

## 二、梯度：标量场的"上坡方向"

$$
\nabla \phi = \left( \frac{\partial\phi}{\partial x}, \frac{\partial\phi}{\partial y}, \frac{\partial\phi}{\partial z} \right)
$$

梯度指向 $\phi$ 增长最快的方向，大小是该方向的变化率。等温线的法线方向正是温度梯度的方向。

## 三、散度：向量场的"源与汇"

$$
\nabla\cdot\mathbf F = \frac{\partial F_x}{\partial x} + \frac{\partial F_y}{\partial y} + \frac{\partial F_z}{\partial z}
$$

散度在一点为正，表示该点"冒出"场线（源）；为负表示"吸入"（汇）。高斯定理把局部散度与整体通量联系起来：

$$
\iiint_V (\nabla\cdot\mathbf F)\,dV = \oiint_{\partial V} \mathbf F\cdot d\mathbf S
$$

## 四、旋度：向量场的"旋转"

$$
\nabla\times\mathbf F =
\begin{vmatrix}
\mathbf i & \mathbf j & \mathbf k \\
\partial_x & \partial_y & \partial_z \\
F_x & F_y & F_z
\end{vmatrix}
$$

旋度非零说明场在"打转"，如漩涡。斯托克斯定理：

$$
\iint_S (\nabla\times\mathbf F)\cdot d\mathbf S = \oint_{\partial S} \mathbf F\cdot d\mathbf l
$$

## 五、它们如何撑起物理

麦克斯韦方程组里，$\nabla\cdot\mathbf E = \rho/\varepsilon_0$ 说电场电荷是源；$\nabla\times\mathbf B = \mu_0\mathbf J$ 说电流让磁场打转。梯度则把保守力写成 $\mathbf F = -\nabla U$。**掌握这三剑客，就握住了经典场论的语法。**
