---
title: "使用 LxRunOffline 实现 WSL 自定义安装、备份"
date: 2023-06-01T06:12:38+08:00
lastmod: 2023-06-20T18:25:58+08:00
categories:
# - 分类1
# - 分类2
tags:
  - Linux
  - WSL
# - 标签1
# - 标签2
# summary->在列表页展现的摘要内容，自动生成，内容默认前70个字符，可通过此参数自定义，一般无需专门设置
summary: " "
# description->需要自己编写的文章描述，是搜索引擎呈现在搜索结果链接下方的网页简介，建议设置
description: " "
weight: # 输入1可以顶置文章，用来给文章展示排序，不填就默认按时间排序
slug: ""
draft: false # 是否为草稿
comments: true
showToc: true # 显示目录
TocOpen: true # 自动展开目录
hidemeta: false # 是否隐藏文章的元信息，如发布日期、作者等
disableShare: false # 底部不显示分享栏
showbreadcrumbs: true #顶部显示当前路径
DateFormat: "2006-01-02"
ShowWordCounts: true
ShowWordCount: true
ShowReadingTime: true
ShowLastMod: true
cover:
  image: ""
  caption: ""
  alt: ""
  relative: false
---

> 本文初衷是想在非默认目录下安装 WSL，查阅资料后用 LxRunOffline 了解并实现了 WSL 自定义安装

## 前言

虽说目前的 WSL 在 Windows 10 生态中已经越发成熟，但在实际使用中依旧存在一些不足之处，比如目前 WSL 的 Linux 发行版必须通过 Windows Store 或者旁加载安装包的形式安装到系统中。另外市面上 WSL 发行版也只有寥寥几款，且 WSL 只能默认安装到系统盘中，如果原本系统盘容量较小，就很容易造成 Windows 的系统盘空间不足。虽然可以修改 windows 应用安装位置，或者使用 `wsl --export` 和 `wsl --import` 这两个命令对 WSL 进行打包再自定义目录安装，但依靠本文提到的实用 WSL 管理软件：LxRunOffline，可以实现安装任意发行版到任意目录、转移已安装的 WSL 目录、备份 WSL、设置默认用户和修改环境变量等操作，完全碾压 wsl、wslconfig 这些简陋原生管理命令。

## 安装 LxRunOffline

LxRunOffline 与其说是软件，实际上只有两个文件，安装方式可以使用类似 choco 或者 scoop 这样的 Windows 包管理系统进行安装

### scoop 安装

```shell
scoop bucket add extras
scoop install lxrunoffline
```

### choco 安装

```shell
choco install lxrunoffline
```

### 手动安装

当然最为简单的安装办法则是直接在其 [GitHub](https://github.com/DDoSolitary/LxRunOffline/releases) 上下载安装，文件下载并解压缩之后，直接拷贝到 `C:\Windows\System32`即可，如果需要未来可以通过右键菜单功能执行某些功能操作，则需要以管理员权限打开终端，再执行`regsvr32 LxRunOfflineShellExt.dll` ，完成功能注册。
值得注意的是，开发者并没有在 GitHub 上给出任何选项参数说明，你需要在终端内直接输入 `lxrunoffline` 查看。

## 使用 LxRunOffline 安装 WSL

如果你没有使用过 WSL ，首先以管理员身份运行 Pow­er­Shell (WIN+X , A)，输入下面的命令开启 _“适用于 Linux 的 Win­dows 子系统”_ 功能，并重启计算机。

```bash
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
```

下载 [WSL 官方离线包](https://docs.microsoft.com/en-us/windows/wsl/install-manual)，你会得到一个后缀为`.appx`的文件，改后缀名为`.zip`，解压后文件夹中会有名为 `install.tar.gz` 的文件。

> 本文安装的是 ubuntu2004，其它版本没有实测，但方法会在后面讲到

- Ubuntu2004

![解压内容](https://img-blog.csdnimg.cn/2021021020443733.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZhcmVyX3l5aA==,size_16,color_FFFFFF,t_70)
输入以下命令进行安装：

```bash
lxrunoffline i -n <WSL名称> -d <安装路径> -f <安装包路径>.tar.gz
```

加入`-s`参数可在桌面创建快捷方式。
![安装成功](https://img-blog.csdnimg.cn/20210210205111965.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2ZhcmVyX3l5aA==,size_16,color_FFFFFF,t_70)

- Others Linux

首先我们可以通过 LxRunOffline 的 Wiki 页面来查看如何找到各种发行版的下载路径，实际上 WSL （特指第一代）并非是完整版的 Linux 环境，可以将其理解成一个基于微软订制的 Linux 内核加上各种 Linux 发行版软件的结合体，因此我们想要安装其他发行版，其实就是找到各个发行版推出的基于 **Docker** 或者 **核心版** ，而无需关心 Linux 内核部分。

1.  在 [LxRunOffline WiKi](https://github.com/DDoSolitary/LxRunOffline/wiki) 中下载大佬们提供的镜像文件（从其它途径下载也可以）。
2.  下载完毕之后，将其保存到一个全英文的目录中，接下来执行安装，这里直接打开终端执行以下的命令：

```bash
lxrunoffline i -n <WSL名称> -d <安装路径> -f <安装包路径>.tar.xz
```

例如：

```bash
LxRunOffline install -n CentOS -d D:\linux\centos -f D:\softbackup\centos-7.8.2003-x86_64-docker.tar.xz -s
```

这里的执行的命令意思是，将位于`D:\softbackup\的 centos-7.8.2003-x86_64-docker.tar.xz`镜像以 WSL 形式安装到 目录`D:\linux\centos`里面，并且创建桌面快捷方式。

3.  当桌面出现快捷方式之后双击就可以启动当前的 WSL 的 Bash 了

> 以此类推，我们也可以就此安装比如 Fedora、ArchLinux 等 Linux 发行版

## 使用 LxRunOffline 设置默认用户

当修改过 WSL 的名称或目录后就无法通过[微软官方提供的方法](https://docs.microsoft.com/en-us/windows/wsl/user-support)设置默认用户。这时可以使用 LxRunOf­fline 进行设置。

### 设置普通用户为默认用户

使用 LxRunOf­fline 新安装的 WSL 默认是以 root 用户登录，如果你需要默认以普通用户进行登录，就需要进行下面的操作。

首先运行 WSL ，输入以下命令创建用户：

```bash
useradd -m -s /bin/bash <用户名>
```

然后对该用户设置密码，输入命令后会提示输入两次密码。

```bash
passwd <用户名>
```

授予该用户 sudo 权限。

```bash
usermod -aG sudo <用户名>
```

查看用户 `UID` ，一般是 `1000`。

```bash
id -u <用户名>
```

按 `Ctrl+D` 退出 WSL ，在 `Pow­er­Shell` 中输入以下命令：

```bash
lxrunoffline su -n <WSL名称> -v 1000(UID)
```

### 设置 root 为默认用户

root 用户的 UID 为 0，所以可以直接在 Pow­er­Shell 输入以下命令进行设置：

```bash
lxrunoffline su -n <WSL名称> -v 0
```

## 使用 LxRunOffline 转移 WSL 安装目录

默认情况下，如果你通过 Microsoft Store 下载发行版安装 WSL 都会默认安装到系统盘，如果你的系统盘较小很容易造成后面的容量紧张，LxRunOffline 的好处在于你可以将 WSL 转移到非系统盘中，从而降低 WSL 对系统盘的空间占用。

1.  首先我们需要确定安装了哪些 WSL

```bash
LxRunOffline l
```

> 类似于`wsl -l`。LxRunOf­fline 不会显示默认 WSL ，查看默认 WSL 需要使用 `lxrunoffline gd`命令。

2.  确定需要转移目录的发行版的名字 ，比如截图中我安装的 Ubuntu。
    输入命令对 WSL 的目录进行移动。

```bash
lxrunoffline m -n <WSL名称> -d <路径>
```

比如我将 Ubuntu 转移到我的 D 盘下的 D:\Linux\Ubuntu 中：

```bash
LxRunOffline m -n Ubuntu -d D:\Linux\Ubuntu
```

3. 最后查看路径，进行确认。

```bash
lxrunoffline di -n <WSL名称>
```

例如

```bash
LxRunOffline di -n Ubuntu
```

如果终端返回 D 盘的位置表示转移目录成功，这个功能支持所有的 WSL 安装模式，当然包括从 Microsoft Store 安装或者通过 LxRunOffline 安装。

## 使用 LxRunOffline 备份和恢复 WSL

### 备份

实际上你可以将备份看作是 LxRunOffline 安装 WSL 的「逆操作」，比如我目前电脑中只安装了 Ubuntu 发行版，然后需要将其备份到移动存储或者备份文件服务器中，那么命令就是：

```bash
lxrunoffline e -n <WSL名称> -f <压缩包路径>.tar.gz
```

例如：

```bash
lxrunoffline e -n Ubuntu -f D:\dev\backupwsl\ubuntu_back.tar.gz
```

其中`D:\dev\backupwsl\ubuntu_back.tar.gz`为保存的备份文件和对应的路径，并且备份路径下还会生成 xml 格式的配置文件，用于在后面进行还原。

> 类似但不等同于`wsl --export <WSL名称> <压缩包路径>.tar`。LxRunOf­fline 备份完会生成一个.xml 后缀的同名配置文件，比如`WSL.tar.gz.xml`。

### 还原

还原工作就类似安装过程，只不过 LxRunOffline 会读取同目录下的 xml 文件并写入相关的配置：

```bash
lxrunoffline i -n <WSL名称> -d <安装路径> -f <压缩包路径>.tar.gz
```

比如我需要还原我安装的 Ubuntu，那么命令就是：

```bash
lxrunoffline i -n Ubuntu -d D:\Linux\ubuntu -f D:\dev\backupwsl\ubuntu_back.tar.gz
```

其中 D:\Linux\ubuntu 就是安装的路径，这样之前的备份就会被正式还原了。

> 类似但不等同于`wsl --import <WSL名称> <安装路径> <压缩包路径>.tar`。LxRunOf­fline 会读取备份时生成的配置文件并写入配置，前提是同目录且同名。否则你需要加入`-c`参数指定配置文件。

## 使用 LxRunOffline 运行 WSL

在 LxRunOffline 管理 WSL 要比原生 WSL 方便快捷的多，当然也包括了原生 WSL 命令行工具的一些功能。

### 使用命令运行指定 WSL

在有多个 WSL 的情况下，可以指定运行某个发行版。

```bash
lxrunoffline r -n <WSL名称>
```

等同于`wsl -d <WSL名称>`

### 取消注册已安装的 WSL 发行版

```bash
lxrunoffline ur -n <WSL名称>
```

例如取消注册我安装的 WSL 发行版 CentOS 的命令就是：

```bash
lxrunoffline ur -n CentOS
```

不过取消注册并非删除文件，如果删除文件还需要进入原来的安装目录手动删除。

### 创建快捷方式

```bash
lxrunoffline s -n <WSL名称> -f <快捷方式路径>.lnk
```

LxRunOffline 还可以实现一个功能就是生成 WSL 的桌面快捷方式，尤其是安装的 WSL 发行版一多，除非使用类似 Microsoft Terminal 的多标签页终端进行管理启动，否则启动某一个发行版必须要在命令行执行，所以我们可以使用 LxRunOffline 来为某一款发行版生成桌面快捷方式，比如我安装的 Ubuntu 希望生成桌面快捷方式，那么命令就是：

```bash
lxrunoffline s -n Ubuntu -f C:\Users\NB-PM\Desktop\Ubuntu.lnk
```

当然默认快捷方式是没有 logo 的，这里你也可以手动在更改发行版的 Logo 文件然后让他看上去更像是一款独立应用。

### 设置默认 WSL

设置默认 WSL 后，可以在 `cmd` 和 `powershell` 中输入 wsl 直接调用默认的 WSL 。

```bash
lxrunoffline sd -n <WSL名称>
```

等同于`wsl -s <WSL名称>`

## 使用 LxRunOffline 修改 WSL 名称

**查看 WSL 名称**

```bash
wsl -l
```

**查看 WSL 安装目录**

```bash
lxrunoffline di -n <WSL名称>
```

**导出指定的 WSL 配置文件到目标路径**

```bash
lxrunoffline ec -n <WSL名称> -f <配置文件路径>.xml
```

配置信息可以输入`lxrunoffline sm -n <WSL名称>`查看
**取消注册（这个操作不会删除目录）**

```bash
lxrunoffline ur -n <WSL名称>
```

**使用新名称注册**

```bash
lxrunoffline rg -n <WSL名称> -d <WSL路径> -c <配置文件路径>.xml
```

# 参考资料

> [1]. [想安装更多 Linux 发行版？LxRunOffline 让 WSL 更好用](https://sspai.com/post/61634)-by 化学心情下 2\
> [2]. [LxRunOffline 使用教程 - WSL 自定义安装、备份](https://p3terx.com/archives/manage-wsl-with-lxrunoffline.html)-by P3TERX
