// 模块化框架脚本：注册模块、渲染工作区、主题与共享控制
const STATE_KEY = 'zn_classroom_state_v1';
const THEME_KEY = 'zn_theme_pref';

const selectors = {
  featureCanvas: document.getElementById('feature-canvas'),
  moduleList: document.getElementById('module-list'),
  quickModuleBtn: document.getElementById('quick-module-btn'),
  exportConfigBtn: document.getElementById('export-config'),
  themeToggle: document.getElementById('theme-toggle'),
  shareBtn: document.getElementById('share-btn'),
  shareGuideBtn: document.getElementById('share-guide'),
  shareCta: document.getElementById('share-cta'),
  openLabBtn: document.getElementById('open-lab'),
  labCloseBtn: document.getElementById('lab-close'),
  commandLab: document.getElementById('command-lab'),
  gridToggle: document.getElementById('grid-toggle'),
  toast: document.getElementById('toast'),
  modal: document.getElementById('module-modal'),
  modalBody: document.getElementById('modal-body'),
  modalClose: document.getElementById('modal-close'),
  tourBtn: document.getElementById('tour-btn'),
  roadmapList: document.getElementById('roadmap-list'),
  labStats: document.getElementById('lab-stats'),
  yearEl: document.getElementById('year'),
  activityLog: document.getElementById('activity-log')
};

const defaultState = {
  activeModules: ['livestream-academy', 'mentor-market', 'agri-incubator'],
  layout: 'workspace',
  showGrid: false,
  intentData: {},
  actionLog: []
};

const layoutLabels = {
  landing: 'Landing 招生故事页',
  workspace: 'Workspace 学员控制台',
  knowledge: 'Knowledge 知识矩阵'
};

const moduleRegistry = new Map();
const modules = [];

const intentBlueprints = {
  'live:schedule': {
    title: '配置直播计划',
    description: '设置直播主题、时间与平台，准时触达乡村学员。',
    submitLabel: '保存计划',
    success: '直播计划已保存',
    fields: [
      {name:'topic', label:'直播主题', type:'text', required:true, placeholder:'例如：乡村电商冷启动实战'},
      {name:'startAt', label:'开播时间', type:'datetime-local', required:true},
      {name:'duration', label:'时长（分钟）', type:'number', min:15, step:5, value:90},
      {name:'platform', label:'直播平台', type:'select', options:['自建平台','钉钉','企业微信','飞书'], required:true},
      {name:'note', label:'补充说明', type:'textarea', rows:3, placeholder:'补充互动脚本、助教安排等'}
    ],
    summary: data => `${data.topic || '直播计划'} · ${formatDateTime(data.startAt)}`
  },
  'live:upload': {
    title: '上传直播回放',
    description: '登记直播回放与课件链接，便于学员复习。',
    submitLabel: '保存回放信息',
    success: '回放信息已记录',
    fields: [
      {name:'title', label:'直播主题', type:'text', required:true},
      {name:'recordingUrl', label:'回放链接', type:'url', required:true, placeholder:'https://'},
      {name:'materialsUrl', label:'课件/作业链接', type:'url', placeholder:'可选，上传课件地址'},
      {name:'note', label:'备注', type:'textarea', rows:3, placeholder:'补充作业要求或回放有效期'}
    ],
    summary: data => `回放 · ${data.title || '未命名'} `
  },
  'mentor:create': {
    title: '发布导师档案',
    description: '填写导师关键信息并同步到集市。',
    submitLabel: '保存导师档案',
    success: '导师档案已发布',
    fields: [
      {name:'name', label:'导师姓名', type:'text', required:true},
      {name:'expertise', label:'专长领域', type:'text', required:true, placeholder:'例如：直播带货 / 辅导社群'},
      {name:'region', label:'所在地区', type:'text', placeholder:'例如：四川·遂宁'},
      {name:'bio', label:'一句话介绍', type:'textarea', rows:3, placeholder:'突出导师成果与课程亮点'}
    ],
    summary: data => `导师 · ${data.name || '未命名'} · ${data.expertise || '待补充'}`
  },
  'mentor:booking': {
    title: '安排导师约课',
    description: '确定约课时间与形式，自动同步给导师与学员。',
    submitLabel: '创建约课',
    success: '导师约课已确认',
    fields: [
      {name:'mentor', label:'导师', type:'text', required:true},
      {name:'date', label:'约课时间', type:'datetime-local', required:true},
      {name:'mode', label:'授课形式', type:'select', options:['线上直播','线上视频连线','线下走访'], required:true},
      {name:'notes', label:'补充说明', type:'textarea', rows:3, placeholder:'填写学员名单、课前准备事项'}
    ],
    summary: data => `约课 · ${data.mentor || '未指定'} · ${formatDateTime(data.date)}`
  },
  'incubator:demand': {
    title: '录入产业需求',
    description: '记录合作社或企业的项目需求，便于匹配学员团队。',
    submitLabel: '提交需求',
    success: '产业需求已登记',
    fields: [
      {name:'project', label:'项目名称', type:'text', required:true},
      {name:'product', label:'主要品类', type:'text', required:true, placeholder:'例如：高山蔬菜 / 非遗手作'},
      {name:'quantity', label:'需求规模', type:'text', placeholder:'例如：月产 500 单'},
      {name:'deadline', label:'对接截止', type:'date'},
      {name:'notes', label:'补充说明', type:'textarea', rows:3, placeholder:'补充合作背景、结算方式等'}
    ],
    summary: data => `需求 · ${data.project || '未命名'} · ${data.product || '未填'}`
  },
  'incubator:match': {
    title: '匹配学员项目',
    description: '将学员项目与产业需求对接，并记录跟进状态。',
    submitLabel: '保存匹配结果',
    success: '项目匹配已更新',
    fields: [
      {name:'project', label:'学员项目', type:'text', required:true},
      {name:'partner', label:'对接方', type:'text', required:true},
      {name:'status', label:'当前进度', type:'select', options:['沟通中','达成意向','合作中','已完成'], required:true},
      {name:'notes', label:'跟进备注', type:'textarea', rows:3}
    ],
    summary: data => `匹配 · ${data.project || '未填'} → ${data.partner || '未指定'} (${data.status || '待更新'})`
  },
  'commerce:pricing': {
    title: '配置定价策略',
    description: '定义课程/班型的定价与售卖周期。',
    submitLabel: '保存定价',
    success: '定价策略已保存',
    fields: [
      {name:'plan', label:'方案名称', type:'text', required:true, placeholder:'例如：村播成长班'},
      {name:'price', label:'价格 (元)', type:'number', min:0, step:0.01, required:true},
      {name:'cycle', label:'售卖周期', type:'select', options:['一次性','按月','按季','按年'], required:true},
      {name:'benefits', label:'包含权益', type:'textarea', rows:3, placeholder:'列举课程次数、导师次数、社群服务等'}
    ],
    summary: data => `定价 · ${data.plan || '未命名'} · ¥${formatCurrency(data.price)} / ${data.cycle || '一次性'}`
  },
  'commerce:benefits': {
    title: '设置权益包',
    description: '将课程、导师、社群等权益组合成可售卖的套餐。',
    submitLabel: '保存权益包',
    success: '权益包已更新',
    fields: [
      {name:'bundle', label:'权益包名称', type:'text', required:true},
      {name:'perks', label:'权益明细', type:'textarea', rows:4, placeholder:'至少列出 3 项权益，让学员快速理解价值'},
      {name:'effectiveDays', label:'有效天数', type:'number', min:1, step:1, value:90}
    ],
    summary: data => `权益包 · ${data.bundle || '未命名'} · ${data.effectiveDays || '-'} 天`
  },
  'community:new-group': {
    title: '创建学习小组',
    description: '设定社群定位与渠道，保持学员持续互动。',
    submitLabel: '创建小组',
    success: '学习小组已创建',
    fields: [
      {name:'group', label:'小组名称', type:'text', required:true},
      {name:'focus', label:'小组主题', type:'text', required:true, placeholder:'例如：图文带货复盘 / 乡村短视频互评'},
      {name:'channel', label:'主要渠道', type:'select', options:['企业微信','钉钉','微信群','线下活动'], required:true},
      {name:'welcome', label:'欢迎语', type:'textarea', rows:3, placeholder:'给学员的第一句话，用于激活气氛'}
    ],
    summary: data => `小组 · ${data.group || '未命名'} · ${data.channel || '渠道待定'}`
  },
  'community:challenge': {
    title: '发布打卡话题',
    description: '设定打卡主题、时间与激励机制，提升学习黏性。',
    submitLabel: '发布打卡',
    success: '打卡活动已创建',
    fields: [
      {name:'title', label:'打卡主题', type:'text', required:true},
      {name:'start', label:'开始时间', type:'date', required:true},
      {name:'reward', label:'激励方式', type:'text', placeholder:'例如：优秀作品展示 / 积分奖励'},
      {name:'rules', label:'参与规则', type:'textarea', rows:3}
    ],
    summary: data => `打卡 · ${data.title || '未命名'} · ${formatDate(data.start)}`
  },
  'community:sync-channel': {
    title: '同步社交渠道',
    description: '将社群内容同步到外部平台，扩大影响力。',
    submitLabel: '同步渠道',
    success: '渠道同步信息已记录',
    fields: [
      {name:'platform', label:'平台', type:'select', options:['视频号','抖音','快手','小红书'], required:true},
      {name:'link', label:'入口链接', type:'url', required:true, placeholder:'https://'},
      {name:'note', label:'备注', type:'textarea', rows:3, placeholder:'补充官方账号或运营人'}
    ],
    summary: data => `同步 · ${data.platform || '平台待定'} · ${data.link || ''}`
  },
  'insight:metrics': {
    title: '配置指标',
    description: '设定关键指标及目标范围，便于后续监控。',
    submitLabel: '保存指标',
    success: '指标配置已更新',
    fields: [
      {name:'metric', label:'指标名称', type:'text', required:true, placeholder:'例如：报名转化率'},
      {name:'goal', label:'目标值', type:'text', required:true, placeholder:'例如：> 35%'},
      {name:'frequency', label:'更新频率', type:'select', options:['按日','按周','按月'], required:true},
      {name:'owner', label:'负责人', type:'text', placeholder:'负责跟进该指标的人'}
    ],
    summary: data => `指标 · ${data.metric || '未命名'} (${data.goal || '目标待定'})`
  },
  'policy:upload': {
    title: '上传政策材料',
    description: '记录政策名称、适用地区与原文链接，方便团队查找。',
    submitLabel: '保存政策',
    success: '政策资料已登记',
    fields: [
      {name:'title', label:'政策名称', type:'text', required:true},
      {name:'region', label:'适用地区', type:'text', placeholder:'例如：湖北省 / 全国'},
      {name:'link', label:'原文链接', type:'url', required:true, placeholder:'https://'},
      {name:'note', label:'备注', type:'textarea', rows:3, placeholder:'补充政策要点或适用对象'}
    ],
    summary: data => `政策 · ${data.title || '未命名'} · ${data.region || '地区待定'}`
  },
  'policy:summary': {
    title: '生成政策速览',
    description: '粘贴政策原文片段，生成教学可用的摘要要点。',
    submitLabel: '生成速览',
    success: '政策速览已生成',
    closeAfterSubmit: false,
    fields: [
      {name:'title', label:'政策标题', type:'text', required:true},
      {name:'content', label:'政策正文片段', type:'textarea', rows:6, required:true, placeholder:'粘贴 1-2 段关键原文，系统将生成要点'}
    ],
    summary: data => `政策速览 · ${data.title || '未命名'}`,
    onSubmit: (payload) => {
      const summary = generatePolicySummary(payload.content);
      openModal(`
        <h2>政策速览 · ${payload.title || '未命名'}</h2>
        <article style="display:grid;gap:0.8rem;color:var(--text-muted);line-height:1.7">
          ${summary.map(item => `<p>• ${encodeHTML(item)}</p>`).join('')}
        </article>
        <footer style="margin-top:1.2rem;display:flex;gap:0.6rem">
          <button class="primary-btn" data-close-modal>完成</button>
          <button class="ghost-btn" data-copy-text="${encodeHTML(summary.join('\n'))}">复制摘要</button>
        </footer>
      `);
    }
  }
};

const intentSpecialHandlers = {
  'insight:export': exportInsightReport,
  'commerce:sync-payment': handlePaymentSync
};

const resourceBlueprints = {
  delivery: {
    title: '课程交付策略手册',
    description: '下载包含直播、录播与在地作坊排课模板的手册。',
    filename: 'delivery-playbook.txt',
    content: `# 课程交付策略手册\n\n1. 直播排课：每周 2 场，覆盖招募与实操。\n2. 录播补充：重点难点拆分为 10 分钟短视频。\n3. 在地作坊：每月走访，结合基地实景演练。\n4. 课后作业：48 小时内提交，导师即时点评。`
  },
  pricing: {
    title: '知识付费盈利模型',
    description: '参考分层定价与补贴方案，快速构建可持续收益模型。',
    filename: 'pricing-model.csv',
    content: `方案,价格,周期,备注\n村播成长班,699,一次性,含导师点评与社群辅导\n产业顾问班,1299,季度,含产业对接与成果发布\n线下共创营,1999,周末,线下实地走访+项目教练`
  },
  matchmaking: {
    title: '乡村产业对接名录',
    description: '预约与知农合作社的连线，获取最新的产业需求配对。',
    action: openMatchmakingModal
  }
};

function safeParse(json, fallback){
  try{return JSON.parse(json);}catch(e){return fallback;}
}

function loadState(){
  const persisted = safeParse(localStorage.getItem(STATE_KEY), null);
  if(!persisted) return {...defaultState};
  return {...defaultState, ...persisted};
}

let state = loadState();

const baseModules = [
  {
    id: 'livestream-academy',
    icon: '🎥',
    title: '乡创直播课堂',
    subtitle: '一站式直播授课与回放管理',
    description: '策划直播日程、签到互动与回放上架，覆盖电商带货、农技、短视频等课程。',
    tags: ['直播教学', '互动课堂', '课程排期'],
    stage: 'Beta',
    actions: [
      {label: '配置直播计划', type: 'intent', target: 'live:schedule', tone: 'primary'},
      {label: '上传回放', type: 'intent', target: 'live:upload'},
      {label: '观看示例', type: 'link', href: 'https://example.com/rural-live'}
    ],
    details: {
      summary: '支持直播预约、弹幕互动、连麦答疑与课后作业推送，适配弱网环境与多终端观看。',
      capabilities: ['直播排课与通知', '互动签到与测验', '自动生成知识卡片'],
      integration: ['RTMP / WebRTC 推流', '短信通知', '企业微信社群']
    }
  },
  {
    id: 'mentor-market',
    icon: '🧑‍🌾',
    title: '专家导师集市',
    subtitle: '聚合农业、电商、手工艺导师资源',
    description: '搭建导师库与约课系统，支持按产业、技能、地域匹配乡村学员需求。',
    tags: ['导师生态', '预约', '技能匹配'],
    stage: 'Stable',
    actions: [
      {label: '发布导师档案', type: 'intent', target: 'mentor:create', tone: 'primary'},
      {label: '安排约课', type: 'intent', target: 'mentor:booking'},
      {label: '下载履历模板', type: 'link', href: 'https://example.com/mentor-cv'}
    ],
    details: {
      summary: '支持多角色入驻、收益分成与评价体系，保障导师供给与服务质量。',
      capabilities: ['导师筛选与标签', '服务日历', '结算与分润'],
      integration: ['实名认证服务', '支付网关', 'CRM / ERP']
    }
  },
  {
    id: 'agri-incubator',
    icon: '🌱',
    title: '产业孵化工坊',
    subtitle: '学习成果到产业项目的桥梁',
    description: '将课程学习与当地产业对接，完成选品、供应链与渠道配对，助力产销落地。',
    tags: ['产业对接', '资源撮合', '项目管理'],
    stage: 'Preview',
    actions: [
      {label: '录入产业需求', type: 'intent', target: 'incubator:demand', tone: 'primary'},
      {label: '匹配学员项目', type: 'intent', target: 'incubator:match'},
      {label: '查看合作案例', type: 'link', href: 'https://example.com/rural-case'}
    ],
    details: {
      summary: '提供项目模板、合作社资源与交易追踪，让学员在地跑通产销闭环。',
      capabilities: ['需求发布与匹配', '进度看板', '政策与资金对接'],
      integration: ['政府/合作社系统', '供应链 ERP', '地图选址服务']
    }
  },
  {
    id: 'course-commerce',
    icon: '💳',
    title: '知识付费引擎',
    subtitle: '定价、权益与营销一体化',
    description: '设计课程单卖、班型订阅与助学补贴方案，支撑 B2C/B2B2C 收费模型。',
    tags: ['知识付费', '订单', '权益'],
    stage: 'Beta',
    actions: [
      {label: '配置定价策略', type: 'intent', target: 'commerce:pricing', tone: 'primary'},
      {label: '设置权益包', type: 'intent', target: 'commerce:benefits'},
      {label: '同步到支付', type: 'intent', target: 'commerce:sync-payment'}
    ],
    details: {
      summary: '支持分期、拼团、学分兑换与助学补贴，自动生成账单与优惠策略。',
      capabilities: ['多层次定价', '权益管理', '优惠与裂变活动'],
      integration: ['微信支付/支付宝', '财务系统', '第三方营销工具']
    }
  },
  {
    id: 'community-hub',
    icon: '🤝',
    title: '同学社群中心',
    subtitle: '提升学习黏性的成长社区',
    description: '沉淀学习笔记、成果打卡与互帮互助，让乡村学员在社群中持续成长。',
    tags: ['社群运营', '成长记录', '互动'],
    stage: 'Stable',
    actions: [
      {label: '创建学习小组', type: 'intent', target: 'community:new-group', tone: 'primary'},
      {label: '发布打卡话题', type: 'intent', target: 'community:challenge'},
      {label: '同步到社交平台', type: 'intent', target: 'community:sync-channel'}
    ],
    details: {
      summary: '支持班级群、兴趣圈与导师私享群，多种互动方式提升转化与续费。',
      capabilities: ['积分与勋章', '作业互评', '线下活动报名'],
      integration: ['企业微信/钉钉', '短信/公众号', '社群机器人']
    }
  },
  {
    id: 'data-insight',
    icon: '📊',
    title: '运营数据驾驶舱',
    subtitle: '掌握招生与学习成效',
    description: '整合招生、课程完成度、付费转化与产业孵化成果，形成一体化仪表盘。',
    tags: ['数据分析', '成效评估', '指标'],
    stage: 'Preview',
    actions: [
      {label: '配置指标', type: 'intent', target: 'insight:metrics', tone: 'primary'},
      {label: '导出报表', type: 'intent', target: 'insight:export'},
      {label: '查看样板', type: 'link', href: 'https://example.com/rural-dashboard'}
    ],
    details: {
      summary: '提供模板指标与自定义分析，结合地市对比与学员画像，辅助决策。',
      capabilities: ['多维度指标', '自动化周报', '预警与提醒'],
      integration: ['BI 平台', '学习数据埋点', '招生 CRM']
    }
  },
  {
    id: 'policy-brief',
    icon: '📚',
    title: '政策知识库',
    subtitle: '政策解读与课程素材统一管理',
    description: '汇集农业补贴、电商扶持与技能培训政策，供导师与学员随时检索引用。',
    tags: ['政策解读', '知识库', '素材'],
    stage: 'Design',
    actions: [
      {label: '上传政策材料', type: 'intent', target: 'policy:upload', tone: 'primary'},
      {label: '生成速览', type: 'intent', target: 'policy:summary'},
      {label: '下载模板', type: 'link', href: 'https://example.com/policy-template'}
    ],
    details: {
      summary: '通过标签、地区与适用行业检索政策，自动生成易读速览，辅助课程制作。',
      capabilities: ['多维检索', 'AI 摘要', '收藏与订阅'],
      integration: ['政府公开数据', '文档管理', '通知中心']
    }
  }
];

baseModules.forEach(registerModule);
ensureActiveModulesExist();

const roadmapEntries = [
  {
    title: 'M1 · 直播课堂标准化',
    description: '完成直播授课模板、互动脚本与弱网容错方案，为乡村课堂打下基础。',
    tags: ['已完成', '直播交付']
  },
  {
    title: 'M2 · 导师生态上线',
    description: '开放导师入驻、认证与收益分润机制，建立跨地域专家智库。',
    tags: ['进行中', '导师运营']
  },
  {
    title: 'M3 · 知识付费体系',
    description: '迭代课程定价、权益与助学补贴方案，实现多层次收益闭环。',
    tags: ['规划中', '商业模型']
  },
  {
    title: 'M4 · 产业对接网络',
    description: '联动合作社、龙头企业与地方政府，打通培训到产销的落地路径。',
    tags: ['探索', '乡村振兴']
  }
];

function registerModule(definition){
  if(moduleRegistry.has(definition.id)) return;
  modules.push(definition);
  moduleRegistry.set(definition.id, definition);
}

function ensureActiveModulesExist(){
  state.activeModules = state.activeModules.filter(id => moduleRegistry.has(id));
  if(state.activeModules.length === 0) state.activeModules = [...defaultState.activeModules];
}

function saveState(){
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  if(selectors.themeToggle) selectors.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌗';
}

function loadTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved) return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function showToast(message){
  if(!selectors.toast) return;
  selectors.toast.textContent = message;
  selectors.toast.classList.remove('hidden');
  selectors.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(()=>{
    selectors.toast.classList.remove('show');
    setTimeout(()=>selectors.toast.classList.add('hidden'), 260);
  }, 2200);
}

function openModal(content){
  if(!selectors.modal) return;
  selectors.modalBody.innerHTML = content;
  selectors.modal.classList.remove('hidden');
  selectors.modal.setAttribute('aria-hidden', 'false');
}

function closeModal(){
  if(!selectors.modal) return;
  selectors.modal.classList.add('hidden');
  selectors.modal.setAttribute('aria-hidden', 'true');
}

function renderModuleLibrary(){
  if(!selectors.moduleList) return;
  selectors.moduleList.innerHTML = '';
  modules.forEach(mod => {
    const card = document.createElement('article');
    card.className = 'module-card';
    if(state.activeModules.includes(mod.id)) card.classList.add('active');
    const tagLine = mod.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || '';
    const addDisabled = state.activeModules.includes(mod.id);
    card.innerHTML = `
      <header>
        <h4>${mod.title}</h4>
        <span class="tag">${mod.stage || 'Draft'}</span>
      </header>
      <p>${mod.description}</p>
      <div class="tags">${tagLine}</div>
      <div class="actions">
        <button class="${addDisabled ? 'ghost-btn is-active' : 'primary-btn'}" data-action="add" data-id="${mod.id}" ${addDisabled ? 'disabled' : ''}>${addDisabled ? '已在工作区' : '加入工作区'}</button>
        <button class="ghost-btn" data-action="inspect" data-id="${mod.id}">查看详情</button>
      </div>
    `;
    selectors.moduleList.appendChild(card);
  });
}

function renderFeatureCanvas(){
  if(!selectors.featureCanvas) return;
  selectors.featureCanvas.innerHTML = '';
  if(state.activeModules.length === 0){
    selectors.featureCanvas.classList.add('empty');
    selectors.featureCanvas.innerHTML = '<div>还没有激活的模块。请从右侧模块仓库添加，或快速创建占位模块。</div>';
    return;
  }
  selectors.featureCanvas.classList.remove('empty');
  state.activeModules.forEach(id => {
    const mod = moduleRegistry.get(id);
    if(!mod) return;
    const card = document.createElement('article');
    card.className = 'feature-card';
    const tags = mod.tags?.map(t => `<span class="tag">${t}</span>`).join('') || '';
    card.innerHTML = `
      <button class="remove-btn" data-id="${mod.id}" aria-label="移除模块">✕</button>
      <header>
        <div class="icon">${mod.icon || '🧩'}</div>
        <div>
          <h3>${mod.title}</h3>
          ${mod.subtitle ? `<small style="color:var(--text-muted);font-size:0.8rem">${mod.subtitle}</small>` : ''}
        </div>
      </header>
      <p>${mod.description}</p>
      <div class="tag-line">${tags}</div>
      <div class="actions">${renderModuleActions(mod)}</div>
    `;
    selectors.featureCanvas.appendChild(card);
  });
}

function renderModuleActions(mod){
  if(!mod.actions || mod.actions.length === 0) return '';
  return mod.actions.map(action => {
    const toneClass = action.tone === 'primary' ? 'primary-btn' : 'ghost-btn';
    const urlAttr = action.href ? `data-url="${action.href}"` : '';
    return `<button class="${toneClass}" data-module="${mod.id}" data-intent="${action.type}" ${action.target ? `data-target="${action.target}"` : ''} ${urlAttr}>${action.label}</button>`;
  }).join('');
}

function triggerIntent(target, context = {}){
  const handler = intentSpecialHandlers[target];
  if(handler){
    handler(context);
    return;
  }
  const blueprint = target.startsWith('custom:') ? buildCustomBlueprint(target) : intentBlueprints[target];
  if(!blueprint){
    showToast('该功能即将上线');
    return;
  }
  openIntentForm(target, blueprint, context);
}

function buildCustomBlueprint(target){
  const name = target.split(':')[1] || 'custom';
  return {
    title: `配置 ${name} 模块`,
    description: '记录当前动作的关键信息，便于后续开发接入真实接口。',
    submitLabel: '保存记录',
    success: '自定义模块记录已保存',
    fields: [
      {name:'title', label:'操作标题', type:'text', required:true},
      {name:'notes', label:'备注', type:'textarea', rows:4, placeholder:'描述要连接的 API、数据源或 UI 需求'}
    ],
    summary: data => `自定义 · ${data.title || '未命名动作'}`
  };
}

function openIntentForm(target, blueprint, context){
  const formId = `intent-${target.replace(/[^a-z0-9-]/gi,'-')}`;
  const fieldsHtml = blueprint.fields.map(renderIntentField).join('');
  openModal(`
    <h2>${blueprint.title || context.label || '配置操作'}</h2>
    ${blueprint.description ? `<p style="color:var(--text-muted);line-height:1.6;margin:0 0 1.2rem">${blueprint.description}</p>` : ''}
    <form id="${formId}" class="intent-form" data-intent="${target}" style="display:grid;gap:1.2rem">
      <div class="form-grid" style="display:grid;gap:1rem">
        ${fieldsHtml}
      </div>
      <footer style="display:flex;gap:0.6rem;flex-wrap:wrap">
        <button type="submit" class="primary-btn">${blueprint.submitLabel || '保存'}</button>
        <button type="button" class="ghost-btn" data-close-modal>取消</button>
      </footer>
    </form>
  `);
  const form = selectors.modalBody.querySelector(`#${formId}`);
  if(!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {};
    blueprint.fields.forEach(field => {
      let value = formData.get(field.name);
      if(typeof value === 'string'){
        value = field.type === 'textarea' ? value.trim() : value.trim();
      }
      if(field.type === 'number'){
        value = value === '' ? '' : Number(value);
      }
      payload[field.name] = value;
    });
    persistIntentData(target, context.moduleId, payload);
    logActivity({
      moduleId: context.moduleId,
      moduleTitle: getModuleTitle(context.moduleId),
      label: blueprint.success || blueprint.title || context.label,
      summary: blueprint.summary ? blueprint.summary(payload) : context.label || '操作已记录'
    });
    if(typeof blueprint.onSubmit === 'function'){
      blueprint.onSubmit(payload, context);
    }
    if(blueprint.closeAfterSubmit !== false){
      closeModal();
    }
    showToast(blueprint.success || '已保存');
  });
  const cancelBtn = selectors.modalBody.querySelector('[data-close-modal]');
  cancelBtn?.addEventListener('click', closeModal);
}

function renderIntentField(field){
  const fieldId = `field-${field.name}-${Math.random().toString(16).slice(2,7)}`;
  const requiredAttr = field.required ? 'required' : '';
  const commonAttrs = `${requiredAttr} name="${field.name}" id="${fieldId}"`;
  if(field.type === 'select'){
    const options = field.options?.map(option => `<option value="${option}">${option}</option>`).join('') || '';
    return `
      <label for="${fieldId}" style="display:grid;gap:0.35rem">
        <span>${field.label}${field.required ? ' *' : ''}</span>
        <select ${commonAttrs}>${options}</select>
      </label>
    `;
  }
  if(field.type === 'textarea'){
    const rows = field.rows || 4;
    const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
    return `
      <label for="${fieldId}" style="display:grid;gap:0.35rem">
        <span>${field.label}${field.required ? ' *' : ''}</span>
        <textarea ${commonAttrs} rows="${rows}" ${placeholder}></textarea>
      </label>
    `;
  }
  const typeAttr = field.type === 'number' ? 'number' : (field.type === 'url' ? 'url' : (field.type === 'datetime-local' ? 'datetime-local' : (field.type === 'date' ? 'date' : 'text')));
  const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
  const valueAttr = typeof field.value !== 'undefined' ? `value="${typeof field.value === 'function' ? field.value() : field.value}"` : '';
  const minAttr = typeof field.min !== 'undefined' ? `min="${field.min}"` : '';
  const maxAttr = typeof field.max !== 'undefined' ? `max="${field.max}"` : '';
  const stepAttr = typeof field.step !== 'undefined' ? `step="${field.step}"` : '';
  return `
    <label for="${fieldId}" style="display:grid;gap:0.35rem">
      <span>${field.label}${field.required ? ' *' : ''}</span>
      <input type="${typeAttr}" ${commonAttrs} ${placeholder} ${valueAttr} ${minAttr} ${maxAttr} ${stepAttr} />
    </label>
  `;
}

function persistIntentData(target, moduleId, data){
  if(!state.intentData) state.intentData = {};
  const entry = {
    moduleId,
    data,
    createdAt: new Date().toISOString()
  };
  const list = state.intentData[target] ? [...state.intentData[target]] : [];
  list.unshift(entry);
  state.intentData[target] = list.slice(0, 12);
  saveState();
}

function logActivity(entry){
  if(!state.actionLog) state.actionLog = [];
  state.actionLog.unshift({
    ...entry,
    timestamp: new Date().toISOString()
  });
  state.actionLog = state.actionLog.slice(0, 15);
  saveState();
  renderActivityLog();
}

function renderActivityLog(){
  if(!selectors.activityLog) return;
  const records = state.actionLog && state.actionLog.length ? state.actionLog : null;
  if(!records){
    selectors.activityLog.innerHTML = '<li class="empty">暂无操作记录，尝试在模块中执行动作。</li>';
    return;
  }
  selectors.activityLog.innerHTML = records.map(entry => {
    const label = encodeHTML(entry.label || '操作记录');
    const summary = encodeHTML(entry.summary || '已完成');
    const moduleTitle = encodeHTML(entry.moduleTitle || '知农模块');
    const time = encodeHTML(formatTimestamp(entry.timestamp));
    return `
      <li>
        <strong>${label}</strong>
        <span>${summary}</span>
        <span style="color:var(--text-muted);font-size:0.8rem">来源：${moduleTitle}</span>
        <time>${time}</time>
      </li>
    `;
  }).join('');
}

function encodeHTML(value = ''){
  return value
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function formatDateTime(value){
  if(!value) return '时间待定';
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {hour12:false});
}

function formatDate(value){
  if(!value) return '时间待定';
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN');
}

function formatTimestamp(value){
  if(!value) return '';
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {hour12:false});
}

function formatCurrency(value){
  const num = Number(value);
  if(Number.isNaN(num)) return '0.00';
  return num.toFixed(2);
}

function generatePolicySummary(content = ''){
  const cleaned = content.replace(/\s+/g,' ').trim();
  if(!cleaned) return ['请粘贴政策正文片段'];
  const sentences = cleaned.split(/(?<=[。！？!?])/).map(sentence => sentence.trim()).filter(Boolean);
  if(sentences.length >= 3) return sentences.slice(0,3);
  if(sentences.length === 0) return [cleaned.slice(0,120)];
  return sentences;
}

function getModuleTitle(id){
  if(!id) return '知农模块';
  return moduleRegistry.get(id)?.title || '知农模块';
}

function downloadTextFile(filename, content){
  const blob = new Blob([content], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportInsightReport(context = {}){
  const rows = state.intentData?.['insight:metrics'] || [];
  const payload = rows.length ? rows : [
    {data:{metric:'报名转化率', goal:'35%', frequency:'按周', owner:'运营组'}, createdAt:new Date().toISOString()},
    {data:{metric:'课程完成率', goal:'80%', frequency:'按月', owner:'教研组'}, createdAt:new Date().toISOString()}
  ];
  const csv = ['指标,目标,频率,负责人,记录时间']
    .concat(payload.map(entry => {
      const data = entry.data || {};
      return [
        data.metric || '',
        data.goal || '',
        data.frequency || '',
        data.owner || '',
        formatDate(entry.createdAt)
      ].join(',');
    }))
    .join('\n');
  downloadTextFile('insight-report.csv', csv);
  logActivity({
    moduleId: context.moduleId,
    moduleTitle: getModuleTitle(context.moduleId),
    label: '导出运营数据报表',
    summary: `包含 ${payload.length} 条指标记录`
  });
  showToast('运营数据报表已导出');
}

function handlePaymentSync(context = {}){
  const sampleConfig = `{
  "paymentProvider": "微信支付",
  "notifyUrl": "https://example.com/pay/notify",
  "plans": [
    { "id": "plan-basic", "price": 699, "currency": "CNY", "label": "村播成长班" }
  ]
}`;
  openModal(`
    <h2>支付通道同步指引</h2>
    <ol style="padding-left:1.2rem;line-height:1.7;color:var(--text-muted)">
      <li>将最新的课程定价配置导出为 JSON。</li>
      <li>补充支付回调地址、渠道密钥后交付给支付团队。</li>
      <li>在支付平台创建对应的商品/套餐并验证通知。</li>
    </ol>
    <pre style="background:var(--surface-alt);padding:1rem;border-radius:16px;overflow:auto;margin:1rem 0">${encodeHTML(sampleConfig)}</pre>
    <footer style="display:flex;gap:0.6rem">
      <button class="primary-btn" data-copy-text="${encodeHTML(sampleConfig)}">复制示例配置</button>
      <button class="ghost-btn" data-close-modal>完成</button>
    </footer>
  `);
  logActivity({
    moduleId: context.moduleId,
    moduleTitle: getModuleTitle(context.moduleId),
    label: '查看支付同步指引',
    summary: '已复制示例配置后可发给支付团队'
  });
}

function openMatchmakingModal(){
  const formId = 'matchmaking-form';
  openModal(`
    <h2>预约产业对接</h2>
    <p style="color:var(--text-muted);line-height:1.6;margin:0 0 1.2rem">填写需求后，运营团队将在 1-2 个工作日内与合作社对接。</p>
    <form id="${formId}" style="display:grid;gap:1rem">
      <label style="display:grid;gap:0.35rem">
        <span>联系人 *</span>
        <input name="contact" required placeholder="姓名 / 团队" />
      </label>
      <label style="display:grid;gap:0.35rem">
        <span>联系方式 *</span>
        <input name="phone" required placeholder="手机号或邮箱" />
      </label>
      <label style="display:grid;gap:0.35rem">
        <span>想对接的品类 *</span>
        <input name="category" required placeholder="例如：茶叶直播、农旅线路" />
      </label>
      <label style="display:grid;gap:0.35rem">
        <span>补充说明</span>
        <textarea name="note" rows="4" placeholder="可描述当前进展、目标市场等信息"></textarea>
      </label>
      <footer style="display:flex;gap:0.6rem">
        <button type="submit" class="primary-btn">提交预约</button>
        <button type="button" class="ghost-btn" data-close-modal>取消</button>
      </footer>
    </form>
  `);
  const form = selectors.modalBody.querySelector(`#${formId}`);
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const summary = `${data.category || '未填写'} · 联系人 ${data.contact || '未留'}`;
    logActivity({
      moduleId: 'agri-incubator',
      moduleTitle: getModuleTitle('agri-incubator'),
      label: '提交产业对接预约',
      summary
    });
    closeModal();
    showToast('预约请求已记录，我们会尽快联系您');
  });
  const cancelBtn = selectors.modalBody.querySelector('[data-close-modal]');
  cancelBtn?.addEventListener('click', closeModal);
}

function handleResourceClick(event){
  const btn = event.target.closest('button[data-resource]');
  if(!btn) return;
  const key = btn.dataset.resource;
  const blueprint = resourceBlueprints[key];
  if(!blueprint){
    showToast('资源正在准备中');
    return;
  }
  if(typeof blueprint.action === 'function'){
    blueprint.action();
    return;
  }
  openModal(`
    <h2>${blueprint.title}</h2>
    <p style="color:var(--text-muted);line-height:1.6;margin:0 0 1.2rem">${blueprint.description}</p>
    <footer style="display:flex;gap:0.6rem">
      <button class="primary-btn" data-download-resource="${key}">下载资料</button>
      <button class="ghost-btn" data-close-modal>关闭</button>
    </footer>
  `);
  logActivity({
    moduleId: key,
    moduleTitle: '资源中心',
    label: `查看${blueprint.title}`,
    summary: blueprint.description
  });
}

function initResourceButtons(){
  document.querySelectorAll('[data-resource]').forEach(btn => {
    btn.addEventListener('click', handleResourceClick);
  });
}

function openShareGuide(){
  openModal(`
    <h2>分享知农课堂官网的三种方式</h2>
    <ol style="padding-left:1.2rem;line-height:1.7;color:var(--text-muted)">
      <li>直接分享：点击“复制分享链接”按钮，将当前站点地址发给团队成员。</li>
      <li>离线打包：将项目文件压缩为 ZIP 包，通过企业微信/邮箱发送，对方解压后双击 index.html 即可打开。</li>
      <li>在线托管：上传到 GitHub Pages、Vercel 或腾讯云静态网站，获取固定域名便于随时访问。</li>
    </ol>
    <footer style="display:flex;gap:0.6rem">
      <button class="primary-btn" data-close-modal>知道了</button>
      <button class="ghost-btn" data-scroll="#resources">查看支持资料</button>
    </footer>
  `);
}

function applyLayout(layoutId){
  state.layout = layoutId;
  document.body.dataset.layout = layoutId;
  saveState();
  highlightActiveLayout();
  showToast(`布局已切换为 ${layoutLabels[layoutId] || layoutId}`);
}

function highlightActiveLayout(){
  document.querySelectorAll('[data-layout]').forEach(btn => {
    if(btn.dataset.layout === state.layout){
      btn.classList.add('is-active');
    }else{
      btn.classList.remove('is-active');
    }
  });
}

function addModule(id){
  if(!moduleRegistry.has(id)){
    showToast('模块未找到，无法加入');
    return;
  }
  if(!state.activeModules.includes(id)){
    state.activeModules.push(id);
    saveState();
    renderFeatureCanvas();
    renderModuleLibrary();
    updateLabStats();
    showToast(`模块「${moduleRegistry.get(id).title}」已加入工作区`);
  }
}

function removeModule(id){
  const index = state.activeModules.indexOf(id);
  if(index === -1) return;
  state.activeModules.splice(index,1);
  saveState();
  renderFeatureCanvas();
  renderModuleLibrary();
  updateLabStats();
  showToast('模块已从工作区移除');
}

function slugify(text){
  return text.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,'-').replace(/^-+|-+$/g,'') || `custom-${Date.now().toString(36)}`;
}

function createCustomModule(){
  const name = prompt('输入新模块的名称：','自定义模块');
  if(!name) return;
  const desc = prompt('给这个模块写一句描述：','这是一个待补充的功能占位。');
  const id = slugify(name);
  if(moduleRegistry.has(id)){
    showToast('已存在同名模块，请换一个名称');
    return;
  }
  const definition = {
    id,
    icon: '🧪',
    title: name,
    subtitle: '自定义占位模块',
    description: desc || '这是一个待补充的功能占位。',
    tags: ['custom', 'draft'],
    stage: 'Draft',
    actions: [{label: '配置细节', type: 'intent', target: `custom:${id}`, tone: 'primary'}],
    details: {
      summary: '此模块由用户快速创建，可在后续补充具体功能与集成。',
      capabilities: ['可编辑说明', '可替换图标', '与任何布局搭配'],
      integration: ['待定']
    }
  };
  registerModule(definition);
  addModule(id);
  renderModuleLibrary();
}

function exportConfig(){
  const payload = {
    generatedAt: new Date().toISOString(),
    layout: state.layout,
    showGrid: state.showGrid,
    modules: state.activeModules.map(id => {
      const mod = moduleRegistry.get(id);
      return mod ? {
        id: mod.id,
        title: mod.title,
        description: mod.description,
        tags: mod.tags,
        actions: mod.actions
      } : null;
    }).filter(Boolean)
  };
  const json = JSON.stringify(payload, null, 2);
  if(navigator.clipboard){
    navigator.clipboard.writeText(json).then(()=>showToast('配置 JSON 已复制')).catch(()=>downloadJSON(json));
  }else{
    downloadJSON(json);
  }
}

function downloadJSON(json){
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zn-classroom-config.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('已下载配置 JSON');
}

function handleModuleListClick(event){
  const btn = event.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if(action === 'add'){ addModule(id); }
  if(action === 'inspect'){ openModuleDetails(id); }
}

function handleFeatureCanvasClick(event){
  const removeBtn = event.target.closest('.remove-btn');
  if(removeBtn){
    removeModule(removeBtn.dataset.id);
    return;
  }
  const actionBtn = event.target.closest('button[data-intent]');
  if(actionBtn){
    const intent = actionBtn.dataset.intent;
    const url = actionBtn.dataset.url;
    const target = actionBtn.dataset.target;
    if(intent === 'link' && url){
      window.open(url, '_blank');
      return;
    }
    if(intent === 'intent' && target){
      triggerIntent(target, {
        moduleId: actionBtn.dataset.module,
        label: actionBtn.textContent.trim()
      });
      return;
    }
    showToast('该操作正在对接中');
  }
}

function openModuleDetails(id){
  const mod = moduleRegistry.get(id);
  if(!mod) return;
  const capabilities = mod.details?.capabilities?.map(item => `<li>${item}</li>`).join('') || '';
  const integration = mod.details?.integration?.map(item => `<li>${item}</li>`).join('') || '';
  const summary = mod.details?.summary || mod.description;
  openModal(`
    <header style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem">
      <div style="font-size:2rem">${mod.icon || '🧩'}</div>
      <div>
        <h2 style="margin:0">${mod.title}</h2>
        ${mod.subtitle ? `<p style="margin:0;color:var(--text-muted)">${mod.subtitle}</p>` : ''}
      </div>
    </header>
    <p style="color:var(--text-muted);line-height:1.6">${summary}</p>
    <div style="display:grid;gap:1.2rem;margin-top:1.2rem">
      ${capabilities ? `<section><h3 style="margin:0 0 0.4rem">核心能力</h3><ul style="margin:0;padding-left:1.1rem;color:var(--text-muted);line-height:1.6">${capabilities}</ul></section>` : ''}
      ${integration ? `<section><h3 style="margin:0 0 0.4rem">集成 & 接入</h3><ul style="margin:0;padding-left:1.1rem;color:var(--text-muted);line-height:1.6">${integration}</ul></section>` : ''}
    </div>
    <footer style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:1.6rem">
      <button class="primary-btn" data-action="add" data-id="${mod.id}">加入工作区</button>
      <button class="ghost-btn" data-copy-id="${mod.id}">复制模块 ID</button>
    </footer>
  `);
}

function handleModalClick(event){
  const closeBtn = event.target.closest('[data-close-modal]');
  if(closeBtn){
    closeModal();
    return;
  }
  const addBtn = event.target.closest('button[data-action="add"]');
  if(addBtn){
    const id = addBtn.dataset.id;
    addModule(id);
    closeModal();
    return;
  }
  const copyBtn = event.target.closest('button[data-copy-id]');
  if(copyBtn && navigator.clipboard){
    navigator.clipboard.writeText(copyBtn.dataset.copyId).then(()=>showToast('模块 ID 已复制')).catch(()=>showToast('复制失败，请稍后再试'));
    return;
  }
  const copyTextBtn = event.target.closest('button[data-copy-text]');
  if(copyTextBtn && navigator.clipboard){
    navigator.clipboard.writeText(copyTextBtn.dataset.copyText).then(()=>showToast('内容已复制')).catch(()=>showToast('复制失败，请稍后再试'));
    return;
  }
  const downloadBtn = event.target.closest('button[data-download-resource]');
  if(downloadBtn){
    const key = downloadBtn.dataset.downloadResource;
    const blueprint = resourceBlueprints[key];
    if(blueprint && blueprint.content){
      downloadTextFile(blueprint.filename || 'resource.txt', blueprint.content);
    }
    closeModal();
    showToast('资料已下载');
    return;
  }
  const scrollBtn = event.target.closest('button[data-scroll]');
  if(scrollBtn){
    const target = scrollBtn.dataset.scroll;
    closeModal();
    const anchor = target ? document.querySelector(target) : null;
    if(anchor) anchor.scrollIntoView({behavior:'smooth'});
  }
}

function handleShare(){
  const payload = {
    title: document.title,
    text: '一起来共建知农课堂框架',
    url: window.location.href
  };
  if(navigator.share){
    navigator.share(payload).then(()=>showToast('已调起系统分享')).catch(()=>{});
    return;
  }
  if(navigator.clipboard){
    navigator.clipboard.writeText(payload.url).then(()=>showToast('分享链接已复制')).catch(()=>showToast('复制失败，请手动复制地址栏'));
  }else{
    showToast('复制失败，请手动复制地址栏');
  }
}

function openLab(){
  if(!selectors.commandLab) return;
  selectors.commandLab.classList.remove('hidden');
  selectors.commandLab.setAttribute('aria-hidden','false');
}

function closeLab(){
  if(!selectors.commandLab) return;
  selectors.commandLab.classList.add('hidden');
  selectors.commandLab.setAttribute('aria-hidden','true');
}

function handleLabAction(event){
  const btn = event.target.closest('button[data-lab]');
  if(!btn) return;
  const action = btn.dataset.lab;
  if(action === 'reset'){
    if(confirm('确认重置工作区？当前模块激活状态将被清空。')){
      state = {...defaultState};
      ensureActiveModulesExist();
      document.body.classList.toggle('grid-overlay', state.showGrid);
      selectors.gridToggle && (selectors.gridToggle.checked = state.showGrid);
      saveState();
      renderFeatureCanvas();
      renderModuleLibrary();
      highlightActiveLayout();
      updateLabStats();
      showToast('工作区已恢复默认状态');
    }
  }
  if(action === 'sync'){
    saveState();
    showToast('状态已同步到本地存储');
  }
  if(action === 'inspect'){
    const snapshot = JSON.stringify(state, null, 2);
    openModal(`<h2>当前状态快照</h2><pre style="background:var(--surface-alt);padding:1rem;border-radius:var(--radius-sm);overflow:auto">${snapshot}</pre>`);
  }
}

function updateLabStats(){
  if(!selectors.labStats) return;
  selectors.labStats.innerHTML = `
    <div>模块总数：${modules.length}</div>
    <div>已激活：${state.activeModules.length}</div>
    <div>当前布局：${layoutLabels[state.layout] || state.layout}</div>
  `;
}

function renderRoadmap(){
  if(!selectors.roadmapList) return;
  selectors.roadmapList.innerHTML = '';
  roadmapEntries.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'roadmap-item';
    li.innerHTML = `
      <h3>${entry.title}</h3>
      <p>${entry.description}</p>
      <div class="tag-line">${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
    `;
    selectors.roadmapList.appendChild(li);
  });
}

function initGridToggle(){
  if(!selectors.gridToggle) return;
  selectors.gridToggle.checked = !!state.showGrid;
  document.body.classList.toggle('grid-overlay', !!state.showGrid);
  selectors.gridToggle.addEventListener('change', () => {
    state.showGrid = selectors.gridToggle.checked;
    document.body.classList.toggle('grid-overlay', state.showGrid);
    saveState();
  });
}

function initEvents(){
  selectors.moduleList?.addEventListener('click', handleModuleListClick);
  selectors.featureCanvas?.addEventListener('click', handleFeatureCanvasClick);
  selectors.quickModuleBtn?.addEventListener('click', createCustomModule);
  selectors.exportConfigBtn?.addEventListener('click', exportConfig);
  selectors.themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(`已切换至${next === 'dark' ? '暗色' : '亮色'}模式`);
  });
  selectors.shareBtn?.addEventListener('click', handleShare);
  selectors.shareCta?.addEventListener('click', handleShare);
  selectors.shareGuideBtn?.addEventListener('click', openShareGuide);
  selectors.openLabBtn?.addEventListener('click', openLab);
  selectors.labCloseBtn?.addEventListener('click', closeLab);
  selectors.commandLab?.addEventListener('click', handleLabAction);
  selectors.modalClose?.addEventListener('click', closeModal);
  selectors.modal?.addEventListener('click', (event)=>{
    if(event.target === selectors.modal){
      closeModal();
      return;
    }
    handleModalClick(event);
  });
  document.querySelectorAll('[data-layout]').forEach(btn => {
    btn.addEventListener('click', () => applyLayout(btn.dataset.layout));
  });
  selectors.tourBtn?.addEventListener('click', () => {
    openModal(`
      <h2>快速入门指引</h2>
      <ol style="line-height:1.65;padding-left:1.2rem;color:var(--text-muted)">
        <li>在训练工坊的模块仓库中激活所需能力，或点击“快速创建”生成占位模块。</li>
        <li>调整工作区排布并挂载真实数据，逐步打磨课程、导师与资源模块。</li>
        <li>前往功能实验室执行重置、同步或查看调试信息。</li>
        <li>复制知农课堂链接，邀请团队成员协同共建。</li>
      </ol>
      <footer style="margin-top:1.2rem;display:flex;gap:0.6rem">
        <button class="primary-btn" data-scroll="#studio">直达训练工坊</button>
        <button class="ghost-btn" data-scroll="#timeline">查看路线图</button>
      </footer>
    `);
  });
  document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape'){
      if(!selectors.modal?.classList.contains('hidden')) closeModal();
      if(!selectors.commandLab?.classList.contains('hidden')) closeLab();
    }
  });
}

function initYear(){
  if(selectors.yearEl) selectors.yearEl.textContent = new Date().getFullYear();
}

function initRevealAnimations(){
  const animated = document.querySelectorAll('[data-animate]');
  if(animated.length === 0) return;
  if(!('IntersectionObserver' in window)){
    animated.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, {threshold:0.18});
  animated.forEach(el => observer.observe(el));
}

function bootstrap(){
  applyTheme(loadTheme());
  document.body.dataset.layout = state.layout;
  highlightActiveLayout();
  renderModuleLibrary();
  renderFeatureCanvas();
  renderActivityLog();
  renderRoadmap();
  initGridToggle();
  initEvents();
  initResourceButtons();
  updateLabStats();
  initYear();
  initRevealAnimations();
}

bootstrap();
