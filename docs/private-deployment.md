# 私有内测部署与秘密交接

这是新增团队服务的内测交付包，不是生产安全认证；原Android离线包不变。没有域名时，只通过用户建立的SSH或已确认的私网安全通道访问服务器loopback。禁止将4318映射到公网或以裸HTTP接收公网密码。

## 部署前只读核验

用户确认目标并亲自完成认证后，才运行deploy/preflight.sh读取OS、资源、监听端口、Docker/Node版本及已有容器。不读取环境、秘密或业务日志。确认4318空闲、内存建议至少1GiB（两路Argon2并发各64MiB）、磁盘足够且未占已有服务目录。不要自动安装Docker/Node、改防火墙/SSH/DNS、停旧服务。

对原候选服务器的两次指定TCP探测均超时，未登录；不能断言跨境限制。用户应从提供商控制台核对电源、公网IP、SSH真实端口和入口安全组。其他Linux/Tailscale节点须用户确认身份及目标后再部署。

## 用户亲自认证

在用户的Mac终端执行，亲自核对指纹并输入密码，不把密码回贴聊天：

```sh
ssh -p 11891 -o ControlMaster=yes -o ControlPersist=15m \
  -o ControlPath=/tmp/netatelier-deploy-140-210-12-112 root@140.210.12.112
```

保持窗口打开并明确告知已成功登录。助手后续只能复用已确认的会话，BatchMode=yes，不生成key或新建长期凭据。未确认时不探测控制socket。更换目标时请由用户提供正确的用户/IP/端口并确认，不能套用原root信息。

## 独立运行

构建源树：npm ci，npm run team:test，npm run team:build，node deploy/check-local.mjs。Node至少26.8.2。推荐已有Docker的Linux服务器，用deploy/compose.yaml独立项目运行；network_mode:host配合应用强制127.0.0.1，不发布公网端口；不适用于Mac Docker网络，Mac内测用本机Node。

提交后执行node deploy/package.mjs生成artifacts/team-deploy/<commit>.tar.gz，包含预构建网页、无依赖后端、runtime Dockerfile、compose和说明，没有数据库、用户图纸、账户或密钥。解包至新目录例如/opt/netatelier-private/releases/<commit>，不要覆盖既有目录。包内compose使用runtime Dockerfile。

在已核实的新目录手动执行docker compose -f deploy/compose.yaml up -d --build。它只创建netatelier-private项目及独立volume，不停止其他服务。必须先检查同名旧内测实例，若有则保留并明确迁移方案。健康检查GET http://127.0.0.1:4318/api/health。

没有Docker但已有Node>=26.8.2时，可由用户选择现有非root专用账户，设置TEAM_DB_PATH至新私有目录、TEAM_ORIGIN=http://127.0.0.1:4318、TEAM_PORT=4318，执行node server/app.mjs。不会自动创建账户/安装系统服务。进程守护方式根据已核验环境选择，不修改其他服务。

## 用户亲自创建应用账号

用户在服务器自己的交互终端运行：

```sh
docker compose -f deploy/compose.yaml exec team node server/admin.mjs create-user your-email@example.com
```

密码输入与确认隐藏，最低12字符；不接受脚本代填、环境变量密码或参数密码。没有默认账号/密码，注册入口关闭。使用Node直接运行时在同一TEAM_DB_PATH环境执行相同admin命令。

## 安全通道

用户先确认认证，再在Mac终端开通本地转发，原候选服务器示例：

```sh
ssh -p 11891 -S /tmp/netatelier-deploy-140-210-12-112 -O forward \
  -L 127.0.0.1:4318:127.0.0.1:4318 root@140.210.12.112
```

浏览器访问http://127.0.0.1:4318，仅Mac loopback HTTP段，跨网络传输由SSH加密。TEAM_ORIGIN与浏览器地址精确一致；不要改为0.0.0.0或关闭Origin校验。未来公网必须域名与有效TLS后再单独配置。

## 用户亲自录入DeepSeek密钥

默认DEEPSEEK_ENABLED=0，不调用模型。密钥由用户自己在服务器终端编辑新私有文件/opt/netatelier-private/secrets/deepseek_api_key，文件owner须能被容器UID1000读取、mode0600，父目录0700。不要粘贴到聊天、Git、日志或.env文件；助手不读取该文件。不要直接使用命令参数存明文。

用户配置完成后使用deploy/compose.vision.example.yaml作为第二个compose文件。它只挂载秘密文件并设置路径，启用DEEPSEEK_ENABLED=1。正式调用前用户另行明确同意具体合成图片的外传及付费调用；本轮未实际调用DeepSeek。API固定HTTPS api.deepseek.com，默认deepseek-flash，所有结果是待确认草稿，经严格schema校验后由React SVG模板呈现，不运行模型脚本。

账号与密钥录入均必须用户交接。密钥文件不可打入部署包；数据库只存哈希会话及工程/草稿，不保存原始图片。

## 验收与恢复

检查两独立账户/团队相互无法读写项目和识别任务，member不能管理成员，owner不能移除最后owner；过期/注销会话失效。真实网页应创建项目、保存重载、注销；视觉仅合成图另行验接口。镜像构建/启动、主机资源及正式TLS在目标环境完成前不声称生产就绪。

SQLite数据在独立volume；备份由用户对本应用volume停写后执行，仅本应用，不打包客户图片日志。回滚应用使用旧release目录/镜像并保留同一数据volume，数据库schema没有破坏性迁移。停止时只针对netatelier-private compose，不使用全局docker prune/down -v或删除旧服务。
