import type {Catalog,CatalogItem} from '../domain/model';
const checkedAt='2026-09-26',tp='TP-LINK';
const pdf=(id:number)=>`https://service.tp-link.com.cn/download/pdf/${id}.pdf`;
const estimate=(id:string,category:CatalogItem['category'],brand:string,model:string,name:string,yuan:number,specs:CatalogItem['specs'],specificationUrl?:string,unit='台',conditions='人民币预算占位；未取得同规格可结算电商价格，采购前核价；不承诺税运/促销/库存。'):CatalogItem=>({id,category,brand,model,name,unit,unitCents:Math.round(yuan*100),priceKind:'estimate',checkedAt,conditions,specs,specificationUrl});
const switchSpec=(ports:number,poeW:number)=>({ports,poePorts:ports,poeW,portW:30,poe:'af-at',portMbps:1000});
const all='restaurant,office,gym,hotel,retail';
/** Offline snapshot. Estimated prices are explicitly NOT live retailer prices. */
export const catalog:Catalog=[
  {...estimate('tp-ap6-ceiling','ap',tp,'TL-XAP1506GC-PoE/DC易展版','Wi-Fi 6 吸顶AP',299,{wifi:6,mount:'ceiling',poeW:10.57,poe:'af',acFamily:'tp',portMbps:1000},pdf(2936)),
    sourceUrl:'https://www.suning.com/item/0000000000/12438610526.html',
    conditions:'采用价299元为预算假设，不是京东实时价；同型号苏宁企业购页面430.80元，采购询价上限276元。两者均不能等同今日到手价。无DC适配器，按PoE供电。',
    priceReferences:[{url:'https://www.suning.com/item/0000000000/12438610526.html',observedCents:43080,kind:'retail-page',checkedAt,conditions:'苏宁B2B企业专购展示价；未登录下单确认税运/地区/库存。'},{url:'https://szkj.cqjtkt.cn/article/90252656170339253',observedCents:27600,kind:'procurement-cap',checkedAt,conditions:'2026-06-05单台采购最高限价，不是零售成交价。'}]},
  estimate('tp-ap5-ceiling','ap',tp,'TL-AP1206GC-PoE/DC易展版','Wi-Fi 5 吸顶AP',239,{wifi:5,mount:'ceiling',poeW:11.27,poe:'af',acFamily:'tp',portMbps:1000},pdf(2979)),
  estimate('tp-ap6-panel','ap',tp,'TL-XAP1800GI-PoE易展版','Wi-Fi 6 面板AP',329,{wifi:6,mount:'panel',poeW:9.88,poe:'af',acFamily:'tp',portMbps:1000},pdf(1658)),
  estimate('tp-ap5-panel','ap',tp,'TL-AP1202GI-PoE 薄款（方）4.0','Wi-Fi 5 面板AP',219,{wifi:5,mount:'panel',poeW:8.76,poe:'af',acFamily:'tp',portMbps:1000},pdf(2310)),
  estimate('tp-gw100','gateway',tp,'TL-R483G','千兆网关（集成AC）',399,{ports:4,poePorts:0,poeW:0,portW:0,clients:100,bandwidthMbps:1000,acCapacity:50,acFamily:'tp'},pdf(444)),
  {...estimate('tp-gw100poe','gateway',tp,'TL-R479GPE-AC V8','千兆PoE网关（集成AC）',699,{ports:8,poePorts:8,poeW:120,portW:30,clients:100,bandwidthMbps:1000,acCapacity:50,acFamily:'tp'},'https://www.tp-link.com.cn/product_ap_976.html'),sourceUrl:'https://product.suning.com/0000000000/12186788911.html',conditions:'苏宁精确型号页面存在，但动态价格未读到；699元仅暂估。采用V8的1WAN+8PoE LAN、120W规格。'},
  estimate('tp-gw300','gateway',tp,'TL-ER3220G','300终端规划网关（集成AC）',899,{ports:4,poePorts:0,poeW:0,portW:0,clients:300,bandwidthMbps:1000,acCapacity:100,acFamily:'tp'},'https://www.tp-link.com.cn/product_999.html?v=specification'),
  estimate('tp-gw500','gateway',tp,'TL-ER5120G V4','500终端规划网关（集成AC）',1599,{ports:4,poePorts:0,poeW:0,portW:0,clients:500,bandwidthMbps:1000,acCapacity:100,acFamily:'tp'},'https://smb.tp-link.com.cn/pages/smbcheatsheet/pages/router/enterpriserouter.html'),
  ...[[8,57,299,'TL-SG2008MP'],[16,110,549,'TL-SG2016MP'],[24,190,899,'TL-SG2024MP']].map(([ports,power,price,model])=>estimate(`tp-poe${ports}`,'switch',tp,String(model),`${ports}口千兆PoE交换机`,Number(price),switchSpec(Number(ports),Number(power)),'https://www.tp-link.com.cn/product_2670.html?v=specification')),
  estimate('tp-camera4','camera',tp,'TL-IPC445EP-4','400万PoE半球摄像机',199,{poeW:6,poe:'af',codec:'h265',maxBitrateMbps:6,horizontalFov:86,portMbps:100},'https://www.tp-link.com.cn/product_2684.html?v=specification'),
  estimate('tp-nvr8','nvr',tp,'TL-NVR6108-L8P','8路单盘位录像机',399,{channels:8,inputMbps:80,diskBays:1,maxDiskTB:10,codec:'h265',unusedPoePorts:8},pdf(2262),'台','裸机不含硬盘；暂估价。本版摄像机接交换机，其自带PoE口未分配，不可额外计为可用端口。'),
  estimate('tp-nvr16','nvr',tp,'TL-NVR6216-L','16路双盘位录像机',499,{channels:16,inputMbps:80,diskBays:2,maxDiskTB:10,codec:'h265'},pdf(1595)),
  ...[[4,499,'WD42PURZ'],[6,699,'WD64PURZ'],[8,899,'WD84PURZ']].map(([tb,price,model])=>estimate(`wd-${tb}tb`,'disk','Western Digital',String(model),`${tb}TB 监控紫盘`,Number(price),{tb:Number(tb),interface:'sata'},'https://studio.westerndigital.com/content/dam/doc-library/en_us/assets/public/western-digital/product/internal-drives/wd-purple-hdd/data-sheet-wd-purple-hdd.pdf','块')),
  estimate('tp-cat6-box','cable',tp,'TL-EC6-305','六类无氧铜网线',599,{medium:'copper',lengthM:305},'https://www.tp-link.com.cn/m/product_1543.html?v=specification','箱'),
  estimate('tp-cat6-m','cable',tp,'TL-EC6-305 按米分摊','六类网线（按米）',2.2,{medium:'copper',lengthM:1},'https://www.tp-link.com.cn/m/product_1543.html?v=specification','米','非厂家单米SKU；施工方按米结算预算，和箱装采购互斥。'),
  estimate('pvc-tray','tray','待采购确认','PVC 40×25及必要分支','线槽及分支辅材',6,{},undefined,'米','暂估；按唯一共线长度计，槽型/线束填充率/防火等级现场核实，不代表已设计合规桥架。'),
  estimate('module-cat6','material','待采购确认','CAT6 模块+单口面板','信息模块与面板',18,{role:'module'},undefined,'套'),
  estimate('plug-cat6','material','待采购确认','CAT6 RJ45','水晶头与端部护套',3,{role:'termination'},undefined,'端'),
  estimate('patch-cat6','material','待采购确认','CAT6 1–2m成品跳线','机柜及终端跳线',10,{role:'patch'},undefined,'条'),
  estimate('cabinet-kit','material','待采购确认','9U 600×450配套','机柜/托板/理线/PDU',499,{role:'cabinet',rackU:9},undefined,'套','预算套装，非已核价品牌SKU；预留至少1U通风，每柜设备空间和220V电源需现场复核，强电施工不在总价。'),
  estimate('fiber-os2','cable','待采购确认','G.657A OS2 单模室内2芯','楼层主干光纤',3,{medium:'fiber',lengthM:1},undefined,'米'),
  estimate('tp-fiber-pair','material',tp,'TL-FC311A-3 + TL-FC311B-3','千兆单模单纤A/B收发器',258,{role:'converter-pair',medium:'singlemode-singlefiber',speedMbps:1000},'https://www.tp-link.com.cn/product_guangxian_785.html','对','每对A/B各一台并含各自电源，SC单模单纤配对；柜内须有220V，未另购SFP。暂估价。'),
  estimate('fiber-end','material','待采购确认','SC/UPC OS2尾纤+保护盒','光纤端接辅材',35,{role:'fiber-end'},undefined,'端'),
  estimate('labor-wire','labor','当地施工方','布线端接测试','基础布线人工',80,{role:'wire'},undefined,'链路','人工预算，不是全国统一价；包含敷设、端接、标签与链路测试，不含设备安装调试。高空/夜间/土建/强电/光纤特殊熔接另议。'),
  estimate('labor-mount','labor','当地施工方','AP/半球安装','设备安装人工',50,{role:'mount'},undefined,'台','暂估；只含设备固定定位，不重复收布线端接费用。'),
  estimate('labor-setup','labor','当地施工方','整网配置验收','整网调试',300,{role:'setup'},undefined,'项','暂估；单项目一次基本配置与验收，不是按每台重复收取。'),
  estimate('sunmi-t2s','optional','SUNMI 商米','T2s 单屏15.6英寸','前台收银终端',2499,{scenes:'restaurant,gym,hotel,retail',network:'wired'},'https://www.sunmi.com/t2s/','台','仅硬件预算；内存/软件授权、支付渠道、打印机另核；百兆LAN，不含行业软件订阅。'),
  estimate('sunmi-kitchen','optional','SUNMI 商米','80后厨云打印机','后厨出单打印机',399,{scenes:'restaurant',network:'wired',portMbps:100},'https://file.cdn.sunmi.com/newebsite/products/80-kitchen-printer/appendix/product-datasheet-zh-n.pdf','台','预算占位；百兆RJ45、DC24V独立供电，非PoE。接口版本及与餐饮软件兼容性待确认，不能仅凭有网口保证可出单。'),
  estimate('lenovo-pc','optional','Lenovo 联想','ThinkCentre neo 50s Gen 4','前台/办公电脑',2999,{scenes:all,network:'wired'},'https://psref.lenovo.com/product/ThinkCentre/ThinkCentre_neo_50s_Gen_4','台','系列预算不是确定MTM配置；官网已列Withdrawn，优先已有设备联网。若新购需更换为可供货的等效型号并核CPU/内存/系统授权/显示器。'),
  {...estimate('santak-ups','optional','SANTAK 山特','TG500','后备式UPS',399,{scenes:all,network:'none',ratedW:300,va:500},'https://www.santak.com/product/tg-e.html'),sourceUrl:'https://i-item.jd.com/100104072733.html',conditions:'已找到京东精确型号页但未核实结算价格，399元暂估；500VA/300W不等于续航时长，须另核实际负载和电池工况。'},
];
