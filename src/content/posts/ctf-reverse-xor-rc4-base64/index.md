---
title: "算法笔记：XOR、RC4 与 Base64"
description: "介绍 XOR 异或运算、RC4 流密码与 Base64 编码的基本原理、Python 实现，并结合 CTF 逆向分析进行补充。"
slug: "ctf-reverse-xor-rc4-base64"
pubDate: "2026-10-29"
type: "note"
tags: ["Algo"]
lang: "zh-CN"
---

# 算法笔记：XOR、RC4 与 Base64

这是对 [ctfshow Reverse WP1 中 re2 题目](/posts/ctfshow-reverse-wp1/#%E4%BA%8Cre2) 中遇到的算法进行讲解和补充。

> **本文目标
> **
> 从用途、原理、代码实现和逆向识别四个角度理解 XOR、RC4 与 Base64。重点是手写一个可运行的 RC4 Python 实现，并学会在 CTF Reverse 中将反编译代码映射到算法步骤。

> **先分清概念
> **
>
> - **Base64：编码**，不是加密，不提供保密性。
> - **XOR：位运算**，可以用于简单混淆，也会出现在密码算法内部。
> - **RC4：对称流密码**，利用密钥生成密钥流，再与数据逐字节 XOR。RC4 已不适合新的安全系统，仅建议用于兼容性分析、CTF 和算法学习。

## 1. 先看整体关系

| 名称        | 本质       | 是否需要秘密密钥 | 典型用途                       | 逆向时关注点                            |
| ----------- | ---------- | ---------------: | ------------------------------ | --------------------------------------- |
| XOR（异或） | 位运算     |   取决于具体方案 | 简单混淆、算法内部运算         | `xor` 指令、常量、循环、数据流          |
| Base64      | 编码       |               否 | 将二进制数据表示成文本         | 字符表、位移、编码/解码函数             |
| RC4         | 对称流密码 |               是 | 历史系统、CTF 样本、旧程序兼容 | 256 字节状态数组、KSA、PRGA、密钥流 XOR |

常见的数据处理链可能是：

```text
硬编码字符串
    ↓ XOR 还原
真实密钥
    ↓ RC4 生成密钥流并处理数据
密文 / 明文
    ↓（如果程序还需要文本传输）Base64 编码
文本形式的结果
```

这只是一个可能的组合示例，不代表每道题都按这个顺序执行。逆向分析必须以实际代码和数据流为准。

---

## 2. XOR：异或运算

### 2.1 定义与真值表

XOR（Exclusive OR，异或）逐位比较两个操作数：相同为 `0`，不同为 `1`。

|   A |   B | A XOR B |
| --: | --: | ------: |
|   0 |   0 |       0 |
|   0 |   1 |       1 |
|   1 |   0 |       1 |
|   1 |   1 |       0 |

Python 和 C 中都使用 `^` 表示按位异或。

### 2.2 关键性质

XOR 在逆向中很常见，尤其要记住以下性质：

1. `A ^ 0 = A`
2. `A ^ A = 0`
3. `A ^ B = B ^ A`（交换律）
4. `(A ^ B) ^ B = A`（同一个值异或两次可还原）

因此，若程序执行：

$$
C = P \oplus K
$$

那么：

$$
P = C \oplus K
$$

其中 `P` 是原始字节，`C` 是处理结果，`K` 是密钥或掩码。

### 2.3 单字节示例

以字符 `A` 为例，其 ASCII 值为 `0x41`。假设使用 `0x1F` 异或：

```text
0x41 XOR 0x1F = 0x5E
0x5E XOR 0x1F = 0x41
```

Python 验证：

```python
plain = 0x41
key = 0x1F

cipher = plain ^ key
restored = cipher ^ key

print(hex(cipher))    # 0x5e
print(hex(restored))  # 0x41
```

### 2.4 重复单字节 XOR 字符串

```python
def xor_bytes(data: bytes, key: int) -> bytes:
    """使用一个 0~255 的单字节掩码处理数据。"""
    if not 0 <= key <= 0xFF:
        raise ValueError("key 必须在 0~255 范围内")
    return bytes(byte ^ key for byte in data)


raw = b"Hello"
encoded = xor_bytes(raw, 0x1F)
decoded = xor_bytes(encoded, 0x1F)

print("处理后（hex）:", encoded.hex())
print("还原结果:", decoded)
```

这里将数据定义为 `bytes`，而不是直接当成文本处理。这是因为逆向题中的数据可能包含 `0x00`、无效 UTF-8 字节或其他非打印字符。

### 2.5 XOR 在 CTF 中的常见用法

- 对字符串或 Flag 做简单混淆。
- 使用一个字节或循环密钥处理数据。
- 作为 RC4 等算法的内部操作。
- 与加法、位移、查表组合成自定义变换。

**注意：看到 `xor` 指令不等于确认了某种加密算法。** XOR 是 CPU 常见指令，程序也可能用它清零寄存器（例如 `xor eax, eax`）。要结合操作数、循环和数据流分析。

---

## 3. RC4：流密码原理

### 3.1 RC4 是什么？

RC4（Rivest Cipher 4）是一种对称流密码。它先根据密钥初始化内部状态，再生成与数据等长的伪随机密钥流，最后将密钥流与输入数据逐字节 XOR。

设：

- `P`：明文（Plaintext）
- `C`：密文（Ciphertext）
- `K`：RC4 生成的密钥流（Keystream）

加密：

$$
C = P \oplus K
$$

解密：

$$
P = C \oplus K
$$

由于 XOR 的可逆性，只要密钥、初始状态和处理顺序一致，同一套 RC4 核心流程既可加密也可解密。

> **安全性说明
> **
> RC4 存在已知安全问题，已不适合新的安全设计。本文代码用于理解算法、CTF 练习和分析旧程序，不应作为新系统的加密方案。

### 3.2 RC4 的三个阶段

```text
输入 Key
  |
KSA：Key Scheduling Algorithm
初始化并置换 S[0..255]
  |
PRGA：Pseudo-Random Generation Algorithm
逐轮更新状态并生成密钥流字节
  |
XOR
输入数据 XOR 密钥流 = 输出数据
```

### 3.3 KSA：密钥调度算法

KSA 的作用是根据密钥打乱一个长度为 256 的状态数组 `S`。

首先初始化：

$$
S[i] = i,\quad 0 \le i < 256
$$

此时 `S` 是 `0` 到 `255` 的顺序排列。接下来使用密钥字节更新索引 `j`，并交换 `S[i]` 和 `S[j]`。

标准 RC4 的 KSA 伪代码：

```python
S = list(range(256))
j = 0

for i in range(256):
    j = (j + S[i] + key[i % len(key)]) % 256
    S[i], S[j] = S[j], S[i]
```

重点理解：

- `i % len(key)`：密钥较短时，循环使用密钥字节。
- `% 256`：让索引落在 `0..255`。
- `S[i], S[j] = S[j], S[i]`：置换状态数组。
- KSA 的输出不是密文，而是初始化后的状态 `S`。

### 3.4 PRGA：伪随机生成算法

PRGA 利用 KSA 生成的状态数组，逐轮产生一个密钥流字节。每一轮都会更新索引并交换状态数组中的元素。

```python
i = 0
j = 0

while True:
    i = (i + 1) % 256
    j = (j + S[i]) % 256
    S[i], S[j] = S[j], S[i]

    t = (S[i] + S[j]) % 256
    k = S[t]  # 本轮输出的密钥流字节
```

其中 `k` 是当前轮生成的一个字节。下一轮会继续使用已经更新过的 `S`，因此 PRGA 是一个不断改变内部状态的过程。

### 3.5 数据处理：XOR 密钥流

每生成一个密钥流字节，就将它与一个输入字节异或：

```python
output_byte = input_byte ^ keystream_byte
```

输入可以是明文，也可以是密文。只要密钥和状态一致，同样的操作就可以恢复数据。

RC4 的算法实现要特别注意：**字节数据应优先以 `bytes` 处理**，不要在中途随意转换成字符串。二进制数据可能无法按 UTF-8 解码。

---

## 4. 完整 Python 实现 RC4

下面是一个用于学习和 CTF 验证的标准 RC4 实现。它不依赖第三方库，分成初始化、生成密钥流和处理数据三个部分。

```python
from typing import Iterator


def rc4_keystream(key: bytes) -> Iterator[int]:
    """
    生成标准 RC4 密钥流。

    参数:
        key: 原始密钥字节，不能为空。

    产出:
        一个个 0~255 的密钥流字节。
    """
    if not key:
        raise ValueError("RC4 密钥不能为空")

    # 1. KSA：初始化状态数组
    S = list(range(256))
    j = 0
    key_len = len(key)

    for i in range(256):
        j = (j + S[i] + key[i % key_len]) % 256
        S[i], S[j] = S[j], S[i]

    # 2. PRGA：持续生成密钥流
    i = 0
    j = 0

    while True:
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]

        t = (S[i] + S[j]) % 256
        yield S[t]


def rc4(data: bytes, key: bytes) -> bytes:
    """
    使用 RC4 处理数据。

    同一个函数可用于加密和解密：
    output = input XOR keystream
    """
    stream = rc4_keystream(key)
    return bytes(byte ^ next(stream) for byte in data)


if __name__ == "__main__":
    key = b"Key"
    plaintext = b"Plaintext"

    ciphertext = rc4(plaintext, key)
    recovered = rc4(ciphertext, key)

    print("明文:", plaintext)
    print("密文（hex）:", ciphertext.hex())
    print("还原:", recovered)
    print("验证成功:", recovered == plaintext)
```

### 4.1 如何运行

将代码保存为 `rc4_demo.py`，在终端执行：

```bash
python rc4_demo.py
```

正常情况下，最后一行应输出：

```text
验证成功: True
```

该示例使用字节串 `b"Key"` 作为密钥，`b"Plaintext"` 作为明文。输出密文以十六进制显示，是为了避免二进制字节被终端当作文本显示。

### 4.2 为什么将 KSA 和 PRGA 分开？

分开实现的好处是，能将代码结构直接映射到算法描述：

| 代码部分               | 算法职责                 |
| ---------------------- | ------------------------ |
| `S = list(range(256))` | 初始化状态数组           |
| KSA 循环               | 使用密钥置换状态         |
| PRGA 循环              | 更新状态并生成密钥流     |
| `byte ^ next(stream)`  | 将数据与密钥流逐字节 XOR |

逆向时也可以按照这个表逐段核对 IDA 的伪代码，而不是只凭函数名判断算法。

### 4.3 RC4 的标准测试向量

标准 RC4 有公开测试向量，可用于检查实现是否正确。经典示例之一：

```text
Key       = 4B6579
Plaintext = 506C61696E74657874
Ciphertext= BBF316E8D940AF0AD3
```

其中密钥 `4B6579` 对应 ASCII 字符串 `Key`，明文 `506C61696E74657874` 对应 `Plaintext`。标准 RC4 处理后应得到十六进制密文 `bbf316e8d940af0ad3`。

可以增加断言进行验证：

```python
key = bytes.fromhex("4b6579")
plaintext = bytes.fromhex("506c61696e74657874")
expected = bytes.fromhex("bbf316e8d940af0ad3")

assert rc4(plaintext, key) == expected
assert rc4(expected, key) == plaintext

print("RC4 测试向量验证通过")
```

> **调试建议
> **
> 如果测试向量不匹配，先检查 KSA 的索引更新、交换顺序、PRGA 的索引更新，以及是否误把密钥的十六进制文本当成密钥原始字节。

---

## 5. RC4 处理文件：二进制安全脚本

CTF 题目经常处理文件，而不只是 ASCII 字符串。此时应直接读写字节，避免文本模式的编码转换。

下面的脚本可以把同一个文件进行 RC4 处理，再用相同密钥还原。**仅对你有权分析的练习文件使用。**

```python
from pathlib import Path


def rc4_keystream(key: bytes):
    if not key:
        raise ValueError("RC4 密钥不能为空")

    S = list(range(256))
    j = 0

    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]

    i = 0
    j = 0

    while True:
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        yield S[(S[i] + S[j]) % 256]


def rc4(data: bytes, key: bytes) -> bytes:
    stream = rc4_keystream(key)
    return bytes(b ^ next(stream) for b in data)


def main():
    source = Path("sample.bin")
    encrypted_path = Path("sample.bin.rc4")
    decrypted_path = Path("sample.bin.restored")

    # 示例密钥。实际分析时应替换为从题目逻辑中还原的原始密钥字节。
    key = b"example-key"

    if not source.is_file():
        raise FileNotFoundError(f"找不到输入文件：{source}")

    original = source.read_bytes()

    encrypted = rc4(original, key)
    encrypted_path.write_bytes(encrypted)

    # RC4 重新使用同一密钥处理密文，可还原原始数据
    restored = rc4(encrypted, key)
    decrypted_path.write_bytes(restored)

    print(f"原始大小：{len(original)} bytes")
    print(f"密文已写入：{encrypted_path}")
    print(f"还原文件已写入：{decrypted_path}")
    print(f"还原校验：{restored == original}")


if __name__ == "__main__":
    main()
```

### 5.1 运行方式

把脚本和 `sample.bin` 放在同一个目录下，然后运行：

```bash
python rc4_file.py
```

会生成：

- `sample.bin.rc4`：RC4 处理后的二进制文件。
- `sample.bin.restored`：用相同密钥还原的文件。

此脚本用于验证算法的可逆性。实际 CTF 题目可能有额外步骤，例如密钥 XOR 还原、丢弃前若干密钥流字节、使用不同字符编码，或者在 RC4 外层再套一层编码。必须根据题目实现调整，不能把示例密钥直接套到目标样本上。

---

## 6. Base64：编码与解码

### 6.1 Base64 的用途

Base64 用于把任意字节表示为可打印文本，常见于文本协议、JSON、邮件附件、配置内容等。它不是加密，不需要秘密密钥，任何人都可以按公开规则解码。

标准 Base64 字符表包含：

```text
A-Z a-z 0-9 + /
```

`=` 是常见的填充字符。

### 6.2 编码原理

Base64 将输入的 3 个字节（24 位）拆成 4 组 6 位数据，每组映射成一个 Base64 字符。

```text
3 个输入字节 = 24 bit
24 bit → 4 组 × 6 bit
4 组数值 → 4 个 Base64 字符
```

例如：

```text
Man → TWFu
M   → TQ==
Ma  → TWE=
```

如果输入长度不是 3 的倍数，标准 Base64 编码通常使用 `=` 填充。某些变体会省略填充或使用不同字符表，因此不能仅凭 `=` 判断。

### 6.3 Python 编码和解码

```python
import base64

raw = b"flag{test}"

encoded = base64.b64encode(raw)
decoded = base64.b64decode(encoded)

print("编码结果:", encoded)  # b'ZmxhZ3t0ZXN0fQ=='
print("解码结果:", decoded)  # b'flag{test}'
```

对于命令行或题目中提取出的 Base64 字符串，可以这样处理：

```python
import base64

text = "ZmxhZ3t0ZXN0fQ=="
result = base64.b64decode(text, validate=True)

print(result)
```

`validate=True` 会对输入字符进行更严格的检查。但如果题目使用 Base64URL、自定义字符表或省略填充，需要先按具体格式处理。

### 6.4 Base64 与 RC4 的组合

如果程序先 RC4 加密，再将密文字节进行 Base64 编码，处理顺序是：

```text
明文 bytes
   ↓ RC4
密文 bytes
   ↓ Base64 encode
Base64 文本
```

还原时必须反过来：

```text
Base64 文本
   ↓ Base64 decode
密文 bytes
   ↓ RC4（相同密钥与状态）
明文 bytes
```

这体现了逆向分析中的一个重要原则：**复现数据处理流程时，操作顺序通常不能随意交换。**

---

## 7. 在 IDA 中如何识别这些算法？

### 7.1 XOR

常见线索：

- 循环中出现 `xor` 指令或 `^` 表达式。
- 固定常量与每个字符或字节进行运算。
- 运算结果被写回缓冲区，或者写入新的输出缓冲区。
- 输入、输出长度通常保持一致。

注意：`xor eax, eax` 也常被用来将寄存器清零，不一定是在加密数据。

### 7.2 RC4

标准 RC4 的典型线索：

| 特征                   | 可能对应        |
| ---------------------- | --------------- |
| 256 个元素的状态数组   | `S[0..255]`     |
| 依次写入 `0..255`      | 状态初始化      |
| 密钥字节参与索引计算   | KSA             |
| 状态数组元素频繁交换   | KSA / PRGA      |
| 索引模 256 更新        | RC4 常见运算    |
| 根据状态数组索引取值   | PRGA 生成密钥流 |
| 密钥流与输入逐字节 XOR | 数据加解密      |

这些特征要组合起来看。优化编译、变量复用和手工修改都会让反编译结果与教科书伪代码不同。

### 7.3 Base64

可观察：

- 是否调用已知 Base64 库函数。
- 是否存在标准或自定义字符表。
- 是否将输入字节拆分、移位并组合成 6 位索引。
- 是否存在 `=` 填充处理。
- 解码后的数据是否被送入后续解密或校验函数。

**不要只凭字符串外观判断 Base64。** 应结合调用关系和解码结果确认。

---

## 8. 将算法应用到 CTF Reverse 的分析流程

```text
1. 从 main 或程序入口开始
        |
2. 找到输入、输出、文件读写和关键函数
        |
3. 确认数据类型：文本还是原始字节
        |
4. 识别是否存在 XOR / Base64 / RC4
        |
5. 追踪密钥来源与处理顺序
        |
6. 用 Python 复现算法
        |
7. 用 CyberChef 或测试向量交叉验证
        |
8. 比对输出文件、明文或 Flag
```

建议记录以下信息，便于后续复盘：

- 密钥从哪里来？是硬编码、用户输入还是计算得到？
- 密钥在使用前是否被 XOR、Base64 或其他函数处理？
- 输入长度和输出长度是否相同？
- RC4 是否为标准实现？是否丢弃开头的密钥流字节？
- 数据以什么编码表示？是否包含 `0x00` 等非打印字节？
- 最终结果如何验证？是否有已知明文、文件头或校验逻辑？

---

## 9. 常见错误与排查

### 错误一：把 Base64 当成加密

Base64 只是编码。遇到 Base64 字符串，先解码并检查输出；不要因为内容看起来不可读，就认定它被加密。

### 错误二：把 RC4 的密钥当成普通文本随意转换

密钥最终是字节序列。`b"Key"` 与 `bytes.fromhex("4b6579")` 在这个例子中是相同的字节，但 `"4b6579".encode()` 得到的是字符 `4`、`b`、`6` 等的字节，并不相同。

```python
print(b"Key".hex())                  # 4b6579
print(bytes.fromhex("4b6579").hex()) # 4b6579
print("4b6579".encode().hex())       # 346236353739
```

### 错误三：把二进制密文直接当 UTF-8 文本

密文不一定是有效 UTF-8。优先保存 `bytes`，查看时使用 `.hex()`，不要在不确定的情况下使用忽略错误的解码方式，否则可能丢失数据。

### 错误四：RC4 的 KSA 或 PRGA 写错

常见原因：

- 忘记使用 `% 256`。
- 更新 `j` 时使用了错误的数组值。
- 交换状态数组的时机错误。
- PRGA 中计算输出索引时顺序不一致。
- 使用了错误的密钥字节。

先用公开测试向量验证实现，再处理题目样本。

### 错误五：认为任何 RC4 题目都能直接套标准脚本

题目可能在标准 RC4 外增加一层密钥混淆、修改密钥编码、丢弃密钥流前若干字节，或者更改部分算法细节。要先确认目标程序的实现与标准算法是否一致。

---

## 10. 快速复习

> **自测问题
> **
>
> 1. 为什么 `A ^ B ^ B = A`？
> 2. RC4 的 KSA 与 PRGA 分别负责什么？
> 3. 为什么 RC4 的同一个函数可以用于加密和解密？
> 4. 为什么 Base64 不属于加密？
> 5. 在 IDA 中，哪些特征组合起来可以支持“这是 RC4”的判断？
> 6. 为什么处理密文时优先使用 `bytes` 而不是字符串？
> 7. 如果标准 RC4 脚本解不出题目结果，应该优先检查哪些环节？

### 参考答案要点

1. 因为 `B ^ B = 0`，而 `A ^ 0 = A`。
2. KSA 根据密钥初始化和置换状态数组；PRGA 更新状态并生成密钥流。
3. 加解密都执行输入数据与同一密钥流的 XOR。
4. Base64 使用公开规则转换数据表示，不需要秘密密钥。
5. 结合 256 字节状态数组、KSA 索引计算与交换、PRGA 状态更新、密钥流 XOR 等特征。
6. 二进制数据可能包含不可打印字节或无效 UTF-8 序列。
7. 检查密钥来源、字节编码、KSA/PRGA 实现、处理顺序以及是否存在算法变体。

---

## 11. 延伸阅读

- [RFC 4648：Base-N Encodings](https://www.rfc-editor.org/rfc/rfc4648) —— Base64 等编码的标准说明。
- [RC4 - Wikipedia](https://en.wikipedia.org/wiki/RC4) —— RC4 的结构、历史和安全问题概览。
- [CyberChef](https://gchq.github.io/CyberChef/) —— 用于验证常见编码和数据变换的工具。
- [我的 CTF Reverse WP：ctfshow Reverse WP1](/posts/ctfshow-reverse-wp1/) —— 将算法知识与实际题目分析对应起来。

> **学习建议
> **
> 先独立实现并测试 XOR 与 Base64，再逐行运行 RC4 脚本，给 KSA 和 PRGA 添加断点或打印状态。随后打开自己的题目，用 IDA 找到相应函数，尝试将反编译代码映射到本文的算法步骤。目标不是死记代码，而是看到未知实现时能够识别数据流、状态更新和密钥来源。
