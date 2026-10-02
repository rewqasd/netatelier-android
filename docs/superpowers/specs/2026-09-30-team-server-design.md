# 私有团队服务器与视觉识图最小闭环

用户已授权公司/团队租户（个人可单人租户）与服务器部署；没有域名。本阶段为私有内测，Node >=26.8.2 后端只绑定 127.0.0.1:4318，使用用户建立的 SSH tunnel，不开放公网密码入口。无用户确认不复用 SSH socket，不操作原服务器。生产 TLS/域名另阶段配置。

原 Android 离线产品不增加网络权限或云调用。新增 team.html 网页管理台与 server/ 后端，独立数据目录、SQLite、无长期新访问凭据。Node 内置 Argon2id 哈希（64MiB/3passes/parallelism1/32bytes，16byte salt），随机会话仅数据库存摘要，HttpOnly/SameSite=Strict Cookie，TTL及注销；写操作验证 Origin 和 JSON Content-Type。内测只监听loopback，允许明确配置的 localhost 浏览器 Origin，不信任 X-Forwarded-*。

初始账号由用户在终端亲自执行交互管理CLI创建，隐藏输入密码；不设默认密码、不自动注册、不写秘密进日志或Git。每个账户可创建租户；租户成员管理仅owner/admin，不能移除最后owner，不能越权指定角色。项目/识别任务/输出绑定服务端身份确认的租户和项目，所有读取/修改/删除均检查 membership。跨租户对象返回404，未经授权租户访问拒绝。个人账户可创建单人租户。

API契约：POST /api/login {email,password}；POST /api/logout；GET /api/me → {user:{id,email},tenants:[{id,name,role}]}；POST /api/tenants {name} → {tenant}；以下带 X-Tenant-Id，服务端校验当前身份membership：GET/POST /api/projects {name,data?}；GET/PUT/DELETE /api/projects/:id，PUT {name?,data?,expectedRevision} 乐观锁；GET/POST /api/members，POST {email,role:'admin'|'member'}；DELETE /api/members/:userId；POST /api/projects/:id/recognitions {mime:'image/png'|'image/jpeg',imageBase64,consent:true} → {recognition:{id,status,draft}}；GET /api/projects/:id/recognitions/:jobId。角色owner/admin管理成员，member可编辑项目。

识图仅后端适配器：createVisionAdapter({enabled,apiKey,baseUrl,model}, {fetchImpl?}) 返回 async recognize({mime,imageBase64,consent},signal?)。默认禁用；deepseek-flash 可配置（官方已核验图文）。仅api.deepseek.com HTTPS固定目标，无任意用户URL；最长30秒，图片4MiB，返回限额，拒绝空/截断/非法JSON、未知键、非有限/越界坐标及过大集合，记录草稿，不直接覆盖工程。输入需显式外传确认，不持久保存图片，也不记录原图/响应/密钥。图纸1300px范围建议裁切，小字性能需真实授权后验证。本轮仅合成/模拟服务测试。

草稿 schema：{width:number,height:number,rooms:[{name:string,use:'public'|'office'|'meeting'|'kitchen'|'storage'|'corridor'|'entrance'|'equipment'|'guest'|'toilet'|'shower'|'changing',polygon:[{x:number,y:number}]}],walls:[{from:{x,y},to:{x,y}}],warnings:string[]}。width/height整数1..2400；全部点在对应图幅内；最多100房间、1000墙、100warnings，房间3..100点、名称1..80chars。所有识别均标记未人工确认。网页用React SVG确定性绘制，不执行模型HTML/SVG/脚本。

前端：登录→选择/新建租户→项目新建/列表/保存/重新载入→上传PNG/JPEG和外传确认→查看草稿/房间表格编辑/保存人工校正→成员列表与添加/移除。请求同源Cookie，写Origin服务端验证。会话失效清登录；租户切换清项目/草稿，拒绝过期请求覆盖新租户界面。图片进入请求前限额、无默认外传。

部署：独立目录与非root容器用户，只绑定loopback的compose端口，固定Node版本，数据库volume权限；不停止已有服务。无Docker时给非容器预检及手工隔离运行步骤；目标服务器OS/资源/服务只读检查后选路线。不会自行改SSH、防火墙、DNS、安装系统软件或生成key。必须测试登录注销、错误密码、租户A/B项目及识图任务越权、成员权限、乐观锁、Origin/会话过期、模拟视觉空/截断/非法结果及实际浏览器管理闭环。该阶段不是生产安全认证。
