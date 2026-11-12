---
title: "BUUCTF-REVERSE-WP1"
description: "BUUCTF-REVERSE-WP1"
slug: "buuctf-reverse-wp1"
pubDate: "2026-10-21"
type: "writeup"
tags: ["CTF-REVERSE"]
lang: "zh-CN"
---

# BUUCTF-REVERSE-WP

## REVERSE1

### 题目描述

平台描述：reverse1，注意：得到的 flag 请包上 `flag{}` 提交。

下载并解压后，得到 `reverse_1.exe`，这是一个 64 位 Windows 可执行文件。

运行程序，显示如下内容：

```text
input the flag:
```

尝试输入字符串后，程序会根据输入内容判断是否正确。

### 使用 IDA 分析程序

#### 1. 分析 main_0 函数

使用 IDA 打开 `reverse_1.exe`，找到主逻辑函数 `main_0`，按 `F5` 查看反编译后的 C 伪代码。

关键代码如下：

```c
int __fastcall main_0(int argc, const char **argv, const char **envp)
{
  char *v3; // rdi
  __int64 i; // rcx
  size_t v5; // rax
  char v7; // [rsp+0h] [rbp-20h] BYREF
  int j; // [rsp+24h] [rbp+4h]
  char Str1[224]; // [rsp+48h] [rbp+28h] BYREF
  __int64 v10;

  v3 = &v7;
  for ( i = 82; i != 0; --i )
  {
    *(_DWORD *)v3 = -858993460;
    v3 += 4;
  }

  for ( j = 0; ; ++j )
  {
    v10 = j;
    if ( j > j_strlen(Str2) )
      break;
    if ( Str2[j] == 111 )
      Str2[j] = 48;
  }

  sub_1400111D1("input the flag:");
  sub_14001128F("%20s", Str1);

  v5 = j_strlen(Str2);
  if ( strncmp(Str1, Str2, v5) == 0 )
    sub_1400111D1("this is the right flag!\n");
  else
    sub_1400111D1("wrong flag\n");

  return 0;
}
```

#### 2. 分析栈空间初始化代码

```c
v3 = &v7;
for ( i = 82; i != 0; --i )
{
    *(_DWORD *)v3 = -858993460;
    v3 += 4;
}
```

这段代码主要用于初始化局部栈空间。

其中：

- `v3 = &v7`：让指针 `v3` 指向局部变量 `v7` 的地址。
- `*(_DWORD *)v3 = -858993460`：将当前地址处的 4 字节数据写入 `-858993460`。
- `v3 += 4`：指针向后移动 4 字节。
- `i = 82`：循环执行 82 次，每次写入 4 字节，总计写入 328 字节。

将 `-858993460` 转换为 32 位十六进制补码：

```text
-858993460 = 0xCCCCCCCC
```

`0xCC` 是 MSVC 调试环境中常见的未初始化栈内存填充值之一。

这类代码通常属于编译器生成的栈空间初始化代码，并不是本题的核心解题逻辑，可以略过，不必深入分析。

#### 3. 分析字符串替换逻辑

接下来关注这段代码：

```c
for ( j = 0; ; ++j )
{
    v10 = j;
    if ( j > j_strlen(Str2) )
        break;

    if ( Str2[j] == 111 )
        Str2[j] = 48;
}
```

可以看到，程序通过循环遍历字符串 `Str2`，并检查其中的字符。

在 IDA 中点击 `Str2`，查看其初始字符串内容：

```text
{hello_world}
```

关键代码为：

```c
if (Str2[j] == 111)
    Str2[j] = 48;
```

这里的 `111` 和 `48` 是十进制整数，分别对应 ASCII 编码中的字符：

| 字符 | 十进制 ASCII | 十六进制 ASCII |
| ---- | -----------: | -------------: |
| `o`  |          111 |         `0x6F` |
| `0`  |           48 |         `0x30` |

因此，这段代码的作用是将字符串 `Str2` 中的小写字母 `o` 替换为数字字符 `0`。

等价的 C 语言写法为：

```c
if (Str2[j] == 'o')
    Str2[j] = '0';
```

经过替换后，字符串由：

```text
{hello_world}
```

变为：

```text
{hell0_w0rld}
```

需要注意，字符 `'o'` 和数字字符 `'0'` 是不同的字符，只是外形相似。

#### 4. 分析输入逻辑

继续分析以下代码：

```c
sub_1400111D1("input the flag:");
sub_14001128F("%20s", Str1);
```

通过查看函数调用及其参数，可以判断：

- `sub_1400111D1` 对应输出字符串的函数，类似 `printf`。
- `sub_14001128F` 对应读取用户输入的函数，类似 `scanf`。
- `%20s` 表示最多读取 20 个非空白字符，并在末尾添加字符串结束符 `\0`。

因此，这部分代码用于提示用户输入 Flag，并将输入内容保存到 `Str1` 中。

#### 5. 分析字符串比较逻辑

程序最后通过以下代码判断输入是否正确：

```c
v5 = j_strlen(Str2);

if (strncmp(Str1, Str2, v5) == 0)
    sub_1400111D1("this is the right flag!\n");
else
    sub_1400111D1("wrong flag\n");
```

其中：

```c
v5 = j_strlen(Str2);
```

用于获取处理后的字符串 `Str2` 的长度。

`strncmp(a, b, n)` 用于比较两个字符串的前 `n` 个字节：

- 返回 `0`：前 `n` 个字节相同。
- 返回小于 `0` 的值：第一个不同字节中，`a` 的值小于 `b`。
- 返回大于 `0` 的值：第一个不同字节中，`a` 的值大于 `b`。

因此，这里实际比较的是输入字符串 `Str1` 和处理后的 `Str2` 的前 `strlen(Str2)` 个字节。

如果比较结果为 `0`，程序输出：

```text
this is the right flag!
```

否则输出：

```text
wrong flag
```

#### 6. 整理解题思路

通过以上分析，可以得到完整的解题流程：

1. 使用 IDA 打开程序，通过 `main_0` 函数分析主逻辑。
2. 查看 `Str2` 的初始内容，发现其为 `{hello_world}`。
3. 分析字符替换逻辑，发现程序将小写字母 `o` 替换为数字字符 `0`。
4. 得到处理后的字符串 `{hell0_w0rld}`。
5. 结合题目要求的 Flag 格式，在字符串前补上 `flag`，得到最终提交内容。

### Flag

```text
flag{hell0_w0rld}
```

### 知识点总结

- **IDA 静态分析：** 使用反编译功能查看 C 伪代码，并结合字符串和交叉引用定位关键逻辑。
- **ASCII 编码：** 字符在计算机中通过编码对应到数值，例如 `o` 对应十进制 `111`，`0` 对应十进制 `48`。
- **字符串处理：** 通过遍历字符串并修改指定位置的字符，实现简单的字符替换。
- **字符串比较：** `strncmp` 可以比较指定长度的字节序列，可用于分析程序的 Flag 校验逻辑。
- **编译器生成代码：** 识别常见的栈空间初始化代码，避免把与解题无关的代码当成核心逻辑。

## REVERSE2

### 题目描述

题目名称：`reverse2`

题目要求：得到 Flag 后，需要使用 `flag{}` 格式提交。

下载并解压附件后，得到一个名为 `reverse_2` 的无后缀文件。使用 Detect It Easy（DIE）分析，确认其为 Linux ELF 64 位可执行文件。

### 使用 IDA 分析程序

#### 1. 分析 main 函数

```C
int __fastcall main(int argc, const char **argv, const char **envp)
{
  int stat_loc; // [rsp+4h] [rbp-3Ch] BYREF
  int i; // [rsp+8h] [rbp-38h]
  __pid_t pid; // [rsp+Ch] [rbp-34h]
  char s2[24]; // [rsp+10h] [rbp-30h] BYREF
  unsigned __int64 v8; // [rsp+28h] [rbp-18h]

  v8 = __readfsqword(0x28u);
  pid = fork();
  if ( pid != 0 )
  {
    waitpid(pid, &stat_loc, options: 0);
  }
  else
  {
    for ( i = 0; i <= strlen(s: flag); ++i )
    {
      if ( flag[i] == 105 || flag[i] == 114 )
        flag[i] = 49;
    }
  }
  printf(format: "input the flag:");
  __isoc99_scanf(a1: "%20s", s2);
  if ( strcmp(s1: flag, s2) == 0 )
    return puts(s: "this is the right flag!");
  else
    return puts(s: "wrong flag!");
}
```

从代码中可以看出，程序的主要逻辑包括：

1. 创建子进程，并由父进程等待子进程结束。

2. 子进程遍历全局字符串 `flag`，将指定字符替换为数字字符。

3. 获取用户输入。

4. 使用 `strcmp()` 比较输入与程序中的 `flag`，判断是否正确。

其中，字符串替换逻辑是本题的重要分析入口，但还需要结合父子进程的执行关系判断它是否会影响最终比较。

#### 2. 分析栈溢出保护代码

```C
  v8 = __readfsqword(0x28u);
  pid = fork();
  if ( pid != 0 )
  {
    waitpid(pid, &stat_loc, options: 0);
  }
```

这里涉及两个 Linux 进程操作函数：

- `fork()`：创建子进程。成功时，父进程获得子进程的 PID，子进程获得返回值 `0`。

- `waitpid()`：等待指定的子进程结束。

当 `fork()` 成功后，父进程和子进程拥有各自独立的虚拟地址空间。虽然子进程最初拥有与父进程相同的全局变量内容，但子进程对普通变量的修改不会直接影响父进程。

因此，这段代码的执行过程是：

1. 父进程调用 `fork()` 创建子进程。

2. 父进程进入 `pid != 0` 分支，等待子进程结束。

3. 子进程进入 `else` 分支，遍历全局字符串 `flag`，并替换指定字符。

4. 子进程结束后，父进程继续执行后面的输入和字符串比较逻辑。

**关键点：** `waitpid()` 只负责等待子进程结束，并不会将子进程修改的普通内存数据同步回父进程。

因此，按照当前反编译代码，如果没有其他共享内存或进程间通信机制，父进程后续比较时使用的仍然是原始的 `flag`。

虽然父进程用的是原始 `flag`，**但子进程在修改完 `flag` 后并没有退出，而是继续往下执行了 `scanf` 和 `strcmp`。因此，当你在终端输入正确密码时，实际上是子进程拿着修改后的 `flag` 校验通过并输出了结果**

另外，`__readfsqword(0x28u)` 通常与 Linux x86-64 下的 Stack Canary（栈保护机制）有关。本题的核心分析重点是父子进程之间的变量修改，不必在此处深入研究栈保护机制。

#### 3. 分析字符串替换逻辑

```C
for ( i = 0; i <= strlen(s: flag); ++i )
    {
      if ( flag[i] == 105 || flag[i] == 114 )
        flag[i] = 49;
    }
  }
```

这里的数字是字符对应的 ASCII 十进制编码

| 十进制                | 对应字符 |
| --------------------- | -------- |
| 105                   | `i`      |
| 114                   | `r`      |
| 49                    | `1`      |
| 所以就是替换 i r 为 1 |

这段遍历一个叫 `flag` 的全局变量，点击查看flag的字符为{hacking_for_fun}，替换之后变为{hack1ng_fo1_fun}

#### 4. 分析输入和字符串比较逻辑

```c
printf(format: "input the flag:");
__isoc99_scanf(a1: "%20s", s2); // 获取你的输入，存到 s2
if ( strcmp(s1: flag, s2) == 0 ) // 比较修改后的 flag 和你的输入 s2
    return puts(s: "this is the right flag!");
else
    return puts(s: "wrong flag!");
```

注意，这里用的是 `strcmp(s1, s2)`，它和上一题的 `strncmp` 的区别是：`strcmp` 比较的是**完整的两个字符串**，必须一模一样才行。

#### 5. 整理解题思路

通过以上分析，可以得到完整的解题流程：

1. 使用 IDA 打开程序，通过 `main` 函数分析主逻辑。
2. 查看 `Str2` 的初始内容，发现其为 `{hacking_for_fun}`。
3. 分析字符替换逻辑，发现程序将小写字母 `r` `i` 替换为数字字符 `1`。
4. 得到处理后的字符串`{hack1ng_fo1_fun}` 。
5. 结合题目要求的 Flag 格式，在字符串前补上 `flag`，得到最终提交内容。

### Flag

```
flag{hack1ng_fo1_fun}
```

### 知识点总结

如上题

## REVERSE3

### 题目描述

题目名称：`reverse3`

题目要求：得到 Flag 后，使用 `flag{}` 格式提交。

下载并解压附件，使用 DIE 查壳，发现是一个 32 位无壳的 Windows 可执行文件（PE 格式）。直接拖入 32 位的 IDA 中进行分析。

---

### 使用 IDA 分析程序

#### 1. 分析 main_0 函数（主逻辑）

在左侧函数列表中找到 `main_0`，按 `F5` 查看反编译代码。核心逻辑如下：

```c
int __cdecl main_0(int argc, const char **argv, const char **envp)
{
  // ... 变量声明省略 ...
  char Destination[108]; // 存放处理后的字符串
  char Str[28];          // 存放用户的输入

  for ( i = 0; i < 100; ++i )
  {
    if ( (unsigned int)i >= 0x64 )
      j____report_rangecheckfailure();
    Destination[i] = 0;
  }

  // 1. 提示并接收输入
  sub_41132F(Format: "please enter the flag:", a2: v7);
  sub_411375(Format: "%20s", a2: (char)Str);

  // 2. 第一次加密：调用未知函数 sub_4110BE
  v3 = j_strlen(Str);
  v4 = (const char *)sub_4110BE(a1: Str, a2: v3, a3: v14);
  strncpy(Destination, Source: v4, Count: 0x28u);

  // 3. 第二次加密：位置偏移
  v11 = j_strlen(Str: Destination);
  for ( j = 0; j < v11; ++j )
    Destination[j] += j;

  // 4. 字符串比较
  v5 = j_strlen(Str: Destination);
  if ( strncmp(Str1: Destination, Str2: Str2, MaxCount: v5) == 0 )
    sub_41132F(Format: "rigth flag!\n", a2: v8);
  else
    sub_41132F(Format: "wrong flag!\n", a2: v8);
  return 0;
}
```

**逻辑解析**：

1. 开头一大段 `for` 循环是清理内存，直接跳过。
2. 程序接收了我们的输入 `Str`。
3. 接着调用了一个未知函数 `sub_4110BE` 对 `Str` 进行处理，结果存入 `Destination`。
4. 然后遍历 `Destination`，执行了 `Destination[j] += j`。即**把第 `j` 个字符的 ASCII 码加上了 `j`**。
5. 最后将处理后的 `Destination` 与全局变量 `Str2` 比较。

#### 2. 深挖未知函数 sub_4110BE（核心考点）

双击 `sub_4110BE` 进去，发现它只是一个外壳，里面又 `return sub_411AB0(...)`。继续双击 `sub_411AB0` 进去看。

```c
void *__cdecl sub_411AB0(char *a1, unsigned int a2, int *a3)
{
  // ... 变量声明省略 ...
  v9 = a2 / 3;
  if ( (int)(a2 / 3) % 3 != 0 )
    ++v9;
  v10 = 4 * v9;
  v12 = malloc(Size: v10 + 1);
  // ... memset 清空内存 ...

  while ( v11 > 0 )
  {
    // 每次读 3 个字节到 byte_41A144
    for ( i = 0; i < 3 && v11 >= 1; ++i ) { ... }
    if ( i == 0 ) break;

    switch ( i )
    {
      case 1:
        // 补两个 =
      case 2:
        // 补一个 =
      case 3:
        // 不补 =
        *((_BYTE *)v12 + v4) = aAbcdefghijklmn[(int)(unsigned __int8)byte_41A144[0] >> 2];
        v7 = v4 + 1;
        *((_BYTE *)v12 + v7) = aAbcdefghijklmn[((algn_41A145[0] & 0xF0) >> 4) | (16 * (byte_41A144[0] & 3))];
        *((_BYTE *)v12 + ++v7) = aAbcdefghijklmn[((algn_41A145[1] & 0xC0) >> 6) | (4 * (algn_41A145[0] & 0xF))];
        *((_BYTE *)v12 + ++v7) = aAbcdefghijklmn[algn_41A145[1] & 0x3F];
        // ...
    }
  }
  return v12;
}
```

**零基础特征识别**：

- **按 3 字节读取**：每次 `for` 循环读 3 个字符。
- **按 4 字节输出**：`v10 = 4 * v9`，输出长度是 4 的倍数。
- **位运算**：出现了 `>> 2`（右移2位）、`& 0xF0`、`& 0x3F`。这是把 24 位（3 字节）拆分成 4 个 6 位的标准操作。
- **查表**：数组 `aAbcdefghijklmn` 的名字暗示了这是一个字符表（通常是 `A-Z a-z 0-9 + /`）。
- **补位**：`case 1` 和 `case 2` 中出现了 `aAbcdefghijklmn[64]`，对应 Base64 的填充字符 `=`。

**结论**：`sub_411AB0` 就是标准的 **Base64 编码算法**。

#### 3. 整理解题思路

现在我们把 `main_0` 的加密流程彻底搞清楚了：
**正向流程**：

1. `用户输入` -> 经过 **Base64 编码** -> `Base64字符串`
2. `Base64字符串` -> 每个字符加上它的下标 `j` -> **`最终的密文`**
3. 比较 `最终密文` 和 `Str2`。

**逆向流程（解密）**：

1. 在 IDA 中双击 `Str2`，获取最终密文。
2. 将密文的每个字符 **减去** 它的下标 `j`，得到 Base64 字符串。
3. 对 Base64 字符串进行 **Base64 解码**，得到原始 Flag。

---

### 编写 Python 解密脚本

逆向题到了这一步，直接用 Python 跑脚本比手算快一万倍。

#### 第一步：获取密文

在 IDA 中双击 `Str2`，发现它的值是：

```text
e3nifIH9b_C@n@dH
```

_(注意：这个值可能因不同版本的附件略有不同，请以你 IDA 里的实际值为准)_

#### 第二步：编写脚本执行逆运算

```python
import base64

# 1. 填入你在 IDA 中找到的 Str2
str2 = "e3nifIH9b_C@n@dH"  # 请替换为你实际找到的密文

# 2. 逆向位置偏移：每个字符减去对应的索引 j
middle_str = ""
for j, char in enumerate(str2):
    middle_str += chr(ord(char) - j)

print("逆向位置偏移后得到的 Base64 字符串:", middle_str)

# 3. 对 Base64 字符串进行解码
try:
    # 补齐 Base64 的 = 填充符（如果原串缺失的话）
    missing_padding = len(middle_str) % 4
    if missing_padding:
        middle_str += '=' * (4 - missing_padding)

    flag = base64.b64decode(middle_str).decode('utf-8')
    print("最终的 Flag 是:", flag)
except Exception as e:
    print("解码失败，错误信息:", e)
```

#### 第三步：动态验证

运行程序，输入我们脚本算出的 Flag 内容，如果程序提示 `rigth flag!`（注意原程序拼写是 rigth），说明逆向成功。
最后包上 `flag{}` 提交。

### Flag

```text
flag{i_l0ve_you}
```

### 知识点总结

- **代码跟踪能力**：遇到未知函数 `sub_XXX` 不要怕，双击进去看。如果一个函数里又调用了别的函数，继续跟进去，直到看到核心逻辑。
- **Base64 算法特征**：在逆向中，看到 `3` 个字节变为 `4` 个字符、看到 `>> 2`、`& 0x3F` 这种位运算、看到常数表、看到补 `=` 操作，第一反应就是 Base64。
- **位置偏移加密**：`Destination[j] += j` 是一种非常经典的“变种加密”，利用下标作为密钥。
- **Python 脚本辅助**：逆向绝不能纯靠脑算。用 Python 的 `enumerate` 遍历字符串，结合 `chr()` 和 `ord()` 进行加减法，是逆向最常用的技能。
