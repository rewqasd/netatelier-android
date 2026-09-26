# 离线选型与价格证据 · 2026-09-26

这不是电商爬虫或承诺成交价。应用首次断网也能读取随包目录，用户可覆盖单价并恢复目录值。金额采用人民币整数分，实际税费、运费、库存、版本和地区在采购时核实。报价中“计算完整”仅指当前工程约束通过，不代表施工图审定或价格已成交。

## 价格核验结果与边界

对精确型号进行京东、苏宁以及厂商资料核对。京东存在动态价格空白、商品变体与搜索最低价不一致等情况，**未获得可结算报价就不标“实时价”或“京东价”**。

| 精确对象 | 本次可读取证据 | 应用采用方式 |
| --- | --- | --- |
| TL-XAP1506GC-PoE/DC易展版 | [苏宁B2B企业专购](https://www.suning.com/item/0000000000/12438610526.html)显示430.80元；未登录核验结算/地区/税运/库存 | 页面价保存在价格参考记录，不冒充全市场最低价 |
| 同型号AP | [重庆交开投数智科技2026-06-05询价](https://szkj.cqjtkt.cn/article/90252656170339253)的单台采购最高限价276元 | 这是采购上限，既不是零售成交，也不是中标结果 |
| 同型号AP | [京东精确型号入口](https://item.jd.com/product/Bn6HNkY7m2BPgD_-V6s-Bw.html)本次无法读出页面价格 | 不拿搜索结果中的低价卡片作为依据 |
| TL-R479GPE-AC | [苏宁精确型号页](https://product.suning.com/0000000000/12186788911.html)可读型号，动态价格未获得 | 699元标暂估 |
| 山特TG500 | [京东100104072733](https://i-item.jd.com/100104072733.html)型号与规格可读，京东价为空且提示购物车变价 | 399元标暂估；仅可选，不默认入总价 |

默认Wi-Fi6吸顶AP采用299元**预算假设**，同时展示上述430.80元页面参考和276元采购上限；299不是任何渠道已核实成交价。Wi-Fi5、面板AP、交换机、摄像机、录像机、硬盘等其余价格均为明确暂估，不将规格资料当作价格来源。使用者可按自己的大陆供货渠道报价替换。不能据此宣称每款Wi-Fi6 AP一定低于400元，也不能把单台AP写成2000多元而不给对应型号依据。

## 规格资料（只摘用于校验的字段）

- [TL-XAP1506GC厂商资料](https://service.tp-link.com.cn/download/pdf/2936.pdf)：Wi-Fi6、千兆上联、吸顶/壁挂、标准PoE，最大10.57W，支持TP-LINK AC。
- [TL-AP1206GC资料](https://service.tp-link.com.cn/download/pdf/2979.pdf)：Wi-Fi5、千兆、吸顶、最大11.27W。不要与百兆TL-AP1202C混用。
- [TL-XAP1800GI易展面板](https://service.tp-link.com.cn/download/pdf/1658.pdf)：Wi-Fi6、千兆、最大9.88W；[TL-AP1202GI薄款方4.0](https://service.tp-link.com.cn/download/pdf/2310.pdf)：Wi-Fi5、千兆、最大8.76W。款式/版本不同须重核。
- [TL-R483G](https://service.tp-link.com.cn/download/pdf/444.pdf)：100台典型终端、50AP、单WAN配置下4LAN；[TL-R479GPE-AC](https://www.tp-link.com.cn/product_ap_976.html)：同级带机规划、50AP、8PoE LAN/120W/30W每口；[企业网关表](https://smb.tp-link.com.cn/pages/smbcheatsheet/pages/router/enterpriserouter.html)：ER3220G 300终端/100AP，ER5120G 500终端/100AP。典型带机量不是吞吐保证；统一按单千兆WAN预算，超出目录能力明确阻断。
- [TL-SG系列规格表](https://www.tp-link.com.cn/product_2670.html?v=specification)：SG2008MP 8口/57W、SG2016MP 16口/110W、SG2024MP 24口/190W；均按30W单口、标准af/at。型号中的数字不代表PoE功率。所选三款没有SFP，本版跨层光纤计入收发器，不凭空增加光口。
- [TL-IPC445EP-4](https://www.tp-link.com.cn/product_2684.html?v=specification)：400万半球、标准PoE、最大6W、H.265、最大6Mbps、百兆口；4mm水平角86°。点位算法的90°示意不是已按镜头实测的安防覆盖结论。
- [TL-NVR6108-L8P](https://service.tp-link.com.cn/download/pdf/2262.pdf)：8路、80Mbps、1盘位/最大10TB；[TL-NVR6216-L](https://service.tp-link.com.cn/download/pdf/1595.pdf)：16路、80Mbps、2盘位/单盘最大10TB。本版统一让摄像机接接入交换机，8路机自带PoE口未启用且不计作可用口，不在拓扑中伪造NVR供电关系。
- [西数紫盘资料](https://studio.westerndigital.com/content/dam/doc-library/en_us/assets/public/western-digital/product/internal-drives/wd-purple-hdd/data-sheet-wd-purple-hdd.pdf)：WD42PURZ 4TB、WD64PURZ 6TB、WD84PURZ 8TB，SATA监控盘。十进制TB，容量不假设智能压缩额外节省。
- [TL-EC6-305](https://www.tp-link.com.cn/m/product_1543.html?v=specification)：六类无氧铜305m箱装。按米项是施工结算分摊，不是厂家另一款单米SKU。
- [TL-FC311A-3](https://www.tp-link.com.cn/product_guangxian_785.html)：与B-3配对，千兆电口、SC单模单纤；报价一“对”为A/B各一及各自电源，另计尾纤/端接和两端RJ45跳线。

## 备选项

[商米T2s](https://www.sunmi.com/t2s/)作为收银终端，[80后厨打印机资料](https://file.cdn.sunmi.com/newebsite/products/80-kitchen-printer/appendix/product-datasheet-zh-n.pdf)为百兆LAN、独立DC供电；行业软件是否支持该打印机需供应商确认。[联想neo50s Gen4](https://psref.lenovo.com/product/ThinkCentre/ThinkCentre_neo_50s_Gen_4)官网已列撤售，条目明确建议已有机器联网、新购改为当地可供货等效型号，系列暂估不伪装成确定MTM。[山特TG500](https://www.santak.com/product/tg-e.html)为500VA/300W，不据此承诺续航。

以上仅展开推荐不产生费用。主动加入后，“购买设备”计硬件；“已有设备仅联网”不计硬件，但有线模式仍创建真实信息点、端口与线路。UPS默认为不联网。任何业务软件订阅、支付服务、强电施工不藏入基础报价。

## 计算策略及限制

1. 逐台接入：按功率降序整理终端，动态规划比较连续分组的交换机硬件成本；为网关上联、交换机串接、跨层主干、NVR/独立AC留真实端口。端口余量按终端数上取整，PoE功率乘一次用户余量，每台校验；不把多台功率合并掩盖单台超载。单楼层同时比较集成PoE网关直连方案。这里是**受约束的经济选型**，不承诺全球最低价、最小交换层数或所有端口组合的数学最优。
2. 集成AC匹配管理系列和总AP数，满足则不另购。所有楼层共用一次网关/录像机采购。带机量使用各层终端与并发较大值，加明确加入的联网业务设备，不把员工数再重复累计。
3. NVR通道与接入带宽预留20%；连续24小时录像 = 摄像机数×Mbps×86400×天数÷8÷1000000×1.1 TB。检查每盘容量和盘位；允许混合硬盘，在可选组合中按硬件价格选取。无法满足则标不完整，不能承诺保留天数。
4. 电缆每条独立计量，预留/引下后损耗只乘一次。整箱按降序首次适配裁线，不能接续余料；是可行采购量而非最优裁切保证。按米与整箱互斥；光纤主干单列，桥架/槽长按真实共线段去重。
5. 整数采购单位（整箱、整米、台、端、链路），单价和小计整数分；没有隐藏百分比管理费。分项人工80元/链路、50元/AP或摄像机、整项目调试300元均为可改暂估；包干人工替代全部分项人工，不叠加。
6. 机柜套装含基础托板/理线/PDU。空间按每台网络设备1U、NVR2U、光收发器托板和通风估算，不足则阻断；安装尺寸、承重、散热、柜深、槽填充率和220V强电需现场验证。不是宣称已完成机电设计。
7. 本版跨层采用根机柜到各楼层的星形主干；复杂环网/多个机柜分区需另行设计。拓扑展示规划物理关系，不自动配置VLAN、不承诺所有链路端到端吞吐。型号/功率未知、路径/比例不明时保留已知小计并标不完整。

## 五场景核算快照

2026-09-26，默认参数、全部备选未加入，实际点位与物理线路生成后逐行核算：餐厅8,380元，办公室10,514元，健身房11,576元，酒店28,434元，零售6,317元。酒店为4层共1600㎡，三条楼层主干仍为待确认，所以不是完整施工报价。其余场景通过当前端口/供电/路径计算，也仍含暂估单价与现场复核事项。数值是该版本回归参考，用户改参数、价格或布线后应相应变化，不是预置固定套餐价。
