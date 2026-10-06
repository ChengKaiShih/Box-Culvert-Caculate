export const codeRegister = [
 {id:'TW-BRIDGE-109',title:'公路橋梁設計規範',version:'109-01-03 修訂（98 年本文及104/109修訂）',url:'https://www.motc.gov.tw/ch/app/divpubreg_list/view?id=740&module=divpubreg&serno=424',status:'版本公告已核對；載重條文整合待覆核'},
 {id:'TW-RC-112',title:'建築物混凝土結構設計規範',version:'112 年版；113-01-01 生效；113-02-19 勘誤',url:'https://www.nlma.gov.tw/ch/legislation/regsearch/6874',status:'斷面強度試算；箱涵適用性、細部及勘誤逐條覆核未完成'},
 {id:'TW-FOUNDATION-112',title:'建築物基礎構造設計規範',version:'112 年版',url:'https://www.nlma.gov.tw/uploads/files/53651dae74223e6599e20838bb8c4f2a.pdf',status:'列為參考；此版不作承載力、滑動及沉陷合格判定'},
] as const;
export const ruleStatus='工程試算版・規範整合待覆核';
/** RC strain compatibility model: TW-RC-112 ch.21, 22; SI constants. */
export const rcRules={concreteStrain:0.003,steelE:200000,stressBlock:0.85,phiTension:0.9,phiCompression:0.65,phiShear:0.75,beta1:(fc:number)=>Math.max(0.65,0.85-0.05*Math.max(0,fc-28)/7),source:'TW-RC-112 §21.2、§22.2.2；一般箍筋構材假設，非圍束柱設計'};
/** Default coefficients are exposed assumptions, never a certified design preset. */
export const assumptions=[
 '所有內力以橫向 1 m 帶寬表示；縱向為行車方向，橫向為水流方向。',
 '線彈性、毛斷面、Euler–Bernoulli 梁柱；未考慮剪切變形、開裂勁度與二階效應。',
 '倒角採 1:1 等腰三角形；尺寸由使用者指定，剛域採完全剛性連結。',
 'Winkler 為雙向線性彈簧；出現拉力反力時需改用接觸分析，不能視為地盤受拉。',
 'EH 與車載擴散參數可修改；衝擊依覆土自動分段。初始參數須確認適用條件。',
 '車載以單輪線之半軸重分配到 1 m 分析帶；有效寬度須依路幅與橫向分布另行指定，未自動搜尋多車道。',
 'Auto Envelope 為離散位置及軸距搜尋，應以步距減半檢查收斂；未含車道載重。',
 'RC 輸出為對稱雙面鋼筋之 N–M 斷面試算；不代表裂縫、剪力、錨定搭接、倒角細部及構材整體均合格。',
];
