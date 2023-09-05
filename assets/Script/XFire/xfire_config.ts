let XFireConfigs = {
    版本: '2.50.0',
    广告自动刷新闲置时间限制: 1,
    广告自动刷新有效计时限制: 10,
    监听层刷新周期: 100,            // 单位 毫秒
    远程图片缓存大小: 50,           // 单位 张

    远程图片加载重试间隔: 5,        // 单位 秒
    远程图片加载重试次数: 10,

    远程音频加载重试间隔: 5,        // 单位 秒
    远程音频加载重试次数: 5,

    远程图集加载重试间隔: 5,        // 单位 秒
    远程图集加载重试次数: 5,

    vivo视频加载重试间隔: 30,       // 单位 秒
    vivo视频播放间隔限制: 60,       // 单位 秒
    oppo插屏间隔限制: 60,           // 单位 秒

    即刻广告加载重试间隔: 40,       // 单位 秒

    分享无回调平台成功限时: 2,      // 单位 秒，超过？秒才能算成功
    平台账号登录标记: '__xfire_plat_has_logined',
    支付订单管理: '__xfire_pay_orders'  // 支付订单管理
};

export default XFireConfigs;

/**
 * 2.50.0
 *      2021年2月4日
 *      ✦添加组件XPlatFeedbackButton，用户创建平台的用户意见反馈按钮
 *
 * 2.49.0
 *      2021年1月23日
 *      ✦添加了新的统计接口：moduleEnter、moduleEnd，用来分析模块使用频次、时间
 *      ✦添加组件AnalyzerTimer：用来自动统计模块使用频次、时间
 *
 * 2.48.0
 *      2021年1月19日
 *      ✦添加了酷狗平台支持
 *
 * 2.47.2
 *      2020年12月23日
 *      ✦优化了视频播放时show、hide消息的发送，防范视频播放失败导致的游戏中断
 *
 * 2.47.1
 *      2020年12月18日
 *      ✦改进了视频播放中的判断逻辑，一些异常情况将不再依据回调返回来判定视频播放结束
 *
 * 2.47.0
 *      2020年12月17日
 *      ✦XSolution添加了权重支持
 *      ✦添加spine的远程加载接口：xfire.loadRemoteSpine
 *
 * 2.46.0
 *      2020年12月15日
 *      ✦添加提现接口xfire.withdraw，目前支持qq平台
 *      ✦xfireol接口进行了加密
 *
 * 2.45.1
 *      2020年12月9日
 *      ✦加速计回调接口添加了normalized标记，表示加速度是否已被标准化
 *
 * 2.45.0
 *      2020年12月5日
 *      ✦安卓平台添加了一些接口，如获取版本号、包名
 *
 * 2.44.1
 *      2020年12月2日
 *      ✦炫火统计添加方案参数
 *
 * 2.44.0
 *      2020年11月30日
 *      ✦添加了XSolution模块，用于方案管理、切换
 *
 * 2.43.1
 *      2020年11月27日
 *      ✦修正了XArchive存档时的mustArchiveOnline判断bug
 *
 * 2.43.0
 *      2020年11月23日
 *      ✦XMath新增接口evaluate，用于计算字符串形式的数学表达式如'1 +sqrt(1+1)*2'
 *
 * 2.42.0
 *      2020年11月18日
 *      ✦添加加速度接口：
 *          xfire.supportAccelerometer
 *          xfire.startAccelerometer
 *          xfire.stopAccelerometer
 *          xfire.onAccelerometerChange
 *          xfire.offAccelerometerChange
 *
 * 2.41.0
 *      2020年11月6日
 *      ✦新增组件XRemoteSprite，通过指定url来显示远程图片
 *
 * 2.40.1
 *      2020年11月4日
 *      ✦XArchive：
 *          修正了load、save有部分路径没有正确返回，导致await一直等待的问题。
 *      ✦XTaskPool：
 *          没有任务时，进度改为返回0，【注】任务未添加完成前访问该属性是没啥意义的。
 *          分包加载应该也纳入XTaskPool，参考模板工程。
 *
 * 2.40.0
 *      2020年11月3日
 *      ✦新增组件：
 *          XWidgetHelper，用于区别设置非全面屏下Widget的锚定属性，目前仅限top
 *
 * 2.39.1
 *      2020年10月30日
 *      ✦AnalyzerXFire
 *          接口传输进行加密
 *          上报sdk名
 *
 * 2.39.0
 *      2020年10月29日
 *      ✦新增接口
 *          xfire.moveBlock         用于移动积木广告
 *          xfire.stringToUtf8      将js字符串转utf8编码b并存为Uint8Array
 *          xfire.utf8ToString      重新将存储utf8编码的Uint8Array转为字符串
 *          xfire.base64EncodeUtin8Array 将Uint8Array字节流编码为base64字符串
 *          xfire.base64Encode      将字符串编码为base64
 *          xfire.base64DecodeToUint8Array 将base64字符串解码为Uint8Array字节流
 *          xfire.base64Decode      解码base64编码的字符串
 *          xfire.encrypt           RC4加密
 *          xfire.decrypt           RC4解密
 *      ✦XAdBlock：添加了移动策略
 *
 * 2.38.0
 *      2020年10月27日
 *      ✦添加条件激活组件XActivator，可设定结点根据是否全面屏、某些平台、某些sdk才激活
 *
 * 2.37.0
 *      2020年10月22日
 *      ✦oppo小游戏：限制前60秒不出现banner
 *      ✦安卓：添加完善了下载接口
 *
 * 2.36.0
 *      2020年10月21日
 *      ✦字节跳动添加showFavoriteGuide，用于显示引导组件
 *      ✦修正了qq、微信一个分包加载进度Nan的问题
 *      ✦修正了qq有2个及以上分包时，开发工具无法加载的问题，原因是开发工具不支持并发加载分包
 *
 * 2.35.0
 *      2020年10月13日
 *      ✦添加刮刮卡组件：XScratch
 *
 * 2.34.0
 *      2020年10月10日-2020年10月12日
 *      ✦添加积木广告组件XAdBlock
 *      ✦添加信息流广告组件XAdFeeds
 *      ✦添加全新的屏蔽组件XAdCleaner，可以针对banner、block、feeds
 *      ✦XBanner改名XAdBanner
 *      ✦XAd的排序改用真实zorder，不再依赖onEnable、onDisable的触发顺序
 *
 * 2.33.0
 *      2020年10月9日
 *      ✦添加积木广告支持，目前仅限QQ
 *          xfire.supportBlockAd
 *          xfire.showBlockAd
 *          xfire.hideBlockAd
 *      ✦优化了XBanner的显示逻辑，降低出错概率
 *      ✦调整了qq、微信的banner在尺寸变化时的位置修正策略，兼顾了非居中时的情况
 *      ✦屏蔽qq在ios平台下的banner刷新，当前刷新后出现无法再加载的问题
 *
 * 2.32.1
 *      2020年9月29日
 *      ✦安卓平台添加showPrivacy，用于主动弹出隐私窗口
 *      ✦优化：httpGetString参数空时不再拼接？
 *
 * 2.32.0
 *      2020年9月27日
 *      ✦调整安卓广告底层实现，支持banner、信息流移动
 *      ✦触网扩展接口修改，提现、余额展示接口需传入余额
 *
 * 2.31.6
 *      2020年9月23日
 *      ✦XTexturedPath：
 *          修正了纹理替换时显示异常
 *
 * 2.31.5
 *      2020年9月22日
 *      ✦qq：
 *          添加彩签接口addColorSign
 *          添加彩签接口isColorSignExistSync
 *      ✦弱联网接口：
 *          修正getUserData的promise返回值层级不对的问题
 *
 * 2.31.4
 *      2020年9月22日
 *      ✦安卓：
 *          添加接口setKeepScreenOn
 *
 * 2.31.3
 *      2020年9月22日
 *      ✦qq、微信分包：
 *          修正了分包进度统计bug，导致分包被提前认定已加载完成
 *
 * 2.31.2
 *      2020年9月22日
 *      ✦安卓平台：
 *          新增接口getIMEI、getIMSI、getUserInput
 *
 * 2.31.1
 *      2020年9月16日
 *      ✦签到模块：
 *          新增接口：getIndexOfToday
 *      ✦信息流广告：
 *          配置中应指定width、height
 *
 * 2.31.0
 *      2020年9月14日
 *      ✦新增接口：xfire.loadSubpackages，用于加载微信、qq的自动分包
 *      ✦XTaskPool：添加阻塞型任务支持，方便分包加载任务化，从而易于进度计算
 *
 * 2.30.1
 *      2020年9月9日
 *      ✦4399：修正了适配问题，在高宽比过低时自动适配高度，两边留空
 *
 * 2.30.0
 *      2020年9月8日
 *      ✦新增平台：4399小游戏，打包需要使用打包插件1.7.0及以上
 *      ✦快看平台：根据平台要求更改了奖励发放的判断标记
 *
 * 2.29.0
 *      2020年9月8日
 *      ✦组件：
 *          修改XBanner：修改了XBanner工作机制，同时仅允许一个XBanner存在
 *          新增组件：XBannerCleaner，激活时将屏蔽当前激活的XBanner，
 *              关闭时会恢复上一个XBanner或XBannerCleaner，
 *              用法用处类似cocos的触摸屏蔽组件BlockInputEvents
 *
 * 2.28.0
 *      2020年9月7日
 *      ✦接口新增：
 *          xfire.supportFeedsAdMove    判断信息流广告是否可移动
 *          xfire.moveFeeds             移动信息流广告
 *
 * 2.27.0
 *      2020年8月26日
 *      ✦新增广告类型：信息流广告，类型为"feeds"，相关接口：
 *          xfire.showFeedsAd
 *          xfire.hideFeedsAd
 *          xfire.supportFeedsAd
 *
 * 2.26.1
 *      2020年8月26日
 *      ✦XTexturedPath:
 *          优化：使用的贴图由texture改为SpriteFrame，从而可以使用图集中的贴图
 *          优化：编辑时修改坐标会实时重绘
 *          优化：折弯时，允许首尾线段全部长度被弯曲，原先设定为一半长度可被用于弯曲
 *          bug修正：初始挂载组件时报错
 *          bug修正：右折弯显示异常，未考虑不同折弯方向下向量旋转方向的差异
 *          bug修正：Vec2的点积计算可能超出[-1, 1]从而导致无法计算出角度
 *          bug修正：弯曲角偏小未达细分角度设定值时会直接添加点，但加点未考虑不同折弯方向的法向差异
 *          bug修正：法向单位化带来轻度计算误差导致了折弯方向的判断错误
 *
 * 2.26.0
 *      2020年8月26日
 *      ✦vivo小游戏：登录后需要存档服务器，不要判断平台，要用xfire.mustArchiveOnline判断
 *      ✦新增组件：XTexturedPath，纹理路径，用于实现折弯效果
 *
 * 2.25.2
 *      2020年8月25日
 *      ✦更换了sdk初始化标记为私有变量，减少被干扰可能
 *
 * 2.25.1
 *      2020年8月20日
 *      ✦雪花小程序：添加插屏支持
 *
 * 2.25.0
 *      2020年8月19日
 *      ✦新增平台：瑞狮雪花小程序，需要打包插件1.6.0
 *
 * 2.24.9
 *      2020年8月18日
 *      ✦即刻玩：所有类型广告重新加载间隔调整到40秒
 *
 * 2.24.8
 *      2020年8月17日
 *      ✦粒子组件：bug修正，多次播放时，短周期发射器可能无法发射粒子，这个bug是2.17.2引入的
 *
 * 2.24.7
 *      2020年8月17日
 *      ✦即刻玩：即刻玩视频重新加载间隔调整到40秒
 *
 * 2.24.6
 *      2020年8月17日
 *      ✦QQ：修正banner没有自动刷新
 *
 * 2.24.5
 *      2020年8月14日
 *      ✦即刻玩：修正即刻玩横屏banner出现在顶部的问题
 *
 * 2.24.4
 *      2020年8月14日
 *      ✦bug修正：xfire.httpGetString在get模式下没有拼接参数
 *      ✦字节跳动：添加了头条买量数据上报
 *
 * 2.24.3
 *      2020年8月13日
 *      ✦完善了安卓平台的事件统计接口
 *
 * 2.24.2
 *      2020年8月12日
 *      ✦调整uc的banner尺寸计算方式，以适配横屏模式
 *
 * 2.24.1
 *      2020年8月12日
 *      ✦调整了字节跳动平台banner的居中策略
 *      ✦统计插件的事件统计接口添加了事件参数，在不支持事件参数的平台上，参数会用'_'合并到事件名尾部
 *
 * 2.24.0
 *      2020年8月9日
 *      ✦新增平台：快看，需要打包插件1.5.0及以上
 *
 * 2.23.0
 *      2020年8月7日
 *      ✦新增平台：连尚，需要打包插件1.4.0及以上
 *
 * 2.22.4
 *      2020年8月4日
 *      ✦vivo：
 *          使用最新的登录接口进行登录
 *
 * 2.22.3
 *      2020年7月28日
 *      ✦魅族：
 *          bug修正：mustArchiveOnline返回值不对
 *
 * 2.22.2
 *      2020年7月24日
 *      ✦百度：
 *          bug修正：获取用户信息时可能会报错
 *      ✦即刻玩：
 *          尝试优化广告加载逻辑
 *
 * 2.22.1
 *      2020年7月22日
 *      ✦android平台：
 *          创建banner时会传递banner宽高了，但是否支持取决于接入的广告sdk
 *      ✦XAudio
 *          playSound添加loop参数，默认为false，循环播放时会返回一个句柄
 *          添加stopSound接口，传入句柄可以停止正在循环播放的音效
 *
 * 2.22.0
 *      2020年7月21日
 *      ✦快手小程序：
 *          添加了登录支持
 *
 * 2.21.1
 *      2020年7月17日
 *      ✦bug修正：
 *          修正了快手平台广告不弹出的问题，主要是广告播放逻辑没有使用可重载的isReady，导致特殊平台异常
 *
 * 2.21.0
 *      2020年7月16日
 *      ✦接口新增：
 *          xfire.supportAutoLogin，判断平台是否允许自动登录，有些需要用户手动点击
 *
 * 2.20.0
 *      2020年7月13日-2020年7月16日
 *      ✦平台新增：
 *          快手小程序，打包需要炫火打包插件1.1.0以上
 *      ✦bug修正：
 *          xfire.getRandomPointInCircle存在bug：没有使用传入参数
 *          XInstancer：一个结点持有多个XInstancer组件时，实例化的node无法取到正确参数
 *      ✦接口新增：
 *          xfire.mustArchiveOnline，判断平台是否要求云存储
 *      ✦模块新增：
 *          XArchive，存档模块，封装云存储、本地存储
 *          XTaskPool，进度型任务管理，主要用于加载场景
 *
 * 2.19.1
 *      2020年7月8日
 *      ✦Analyzer模块：
 *          封装android平台事件统计，使用AnalyzerPlat可激活
 *          bug修正：td统计初始化时参数传送错误，导致无法初始化
 *
 * 2.19.0
 *      2020年7月6日
 *      ✦Analyzer模块：
 *          新增了td统计插件。
 *          修改了xfire统计插件上报给服务器的stageend事件名
 *
 * 2.18.0
 *      2020年7月3日
 *      ✦模块新增：
 *          Analyzer，统计插件封装，封装平台、炫火、阿拉丁三个统计插件，使用详见
 *              Analyzer.ts头部
 *
 * 2.17.3
 *      2020年7月3日
 *      ✦趣头条：  播放视频广告时隐藏banner，因为平台自身没有处理好层级关系，
 *          视频与banner同时展示会出现banner叠在视频上方的情况。
 *
 * 2.17.2
 *      2020年6月29日
 *      ✦组件修正
 *          XParticle，修正bug：发射器发射周期和速度同时偏小时，发射速度出现异常
 *
 * 2.17.1
 *      2020年6月28日
 *      ✦模块增强：
 *          Messager，装饰器listen添加支持类的静态函数，方便模块监听消息
 *      ✦组件修正：
 *          XAniNumber，修正了动画时间进度计算的一个bug，会导致动画时间设定非1时
 *              产生显示异常。
 *
 * 2.17.0
 *      2020年6月28日
 *      ✦模块新增：
 *          Messager，消息分发、监听
 *      ✦小米小程序：
 *          不再需要申请广告id，配置里的广告id可以留空了
 *
 * 2.16.2
 *      2020年6月24日
 *      ✦字节跳动：
 *          添加预加载的概率支持，将dontPreload参数设置为数字，如：
 *          "dontPreload": 0.25，表示25%概率采用非预加载
 * 2.16.1
 *      2020年6月22日
 *      ✦组件修正：
 *          XListView图标模式显示时默认居中，方便排版
 *          XListView修正图标模式下尾部结点计算错误导致结点缺失问题
 *
 * 2.16.0
 *      2020年6月17日-2020年6月22日
 *      ✦字节跳动：
 *          增加sdk下params参数dontPreload，来控制视频预加载，配置方法：
 *          params下新增参数"dontPreload": "true"，"true"必须为字符串
 *      ✦组件增强：
 *          XListView添加图标模式，一行可以放多个元素，目前图标模式仅限纵向滚动
 *      ✦组件新增：
 *          XTransButton，透传按钮，响应但又不会截断触摸事件继续传播
 *      ✦接口新增：
 *          Boxe2DUtils.setPixelsPerMeter   设置物理引擎每米对应的像素数（需要更新定制引擎v2）
 *
 * 2.15.0
 *      2020年6月8日-2020年6月16日
 *      ✦bug修正：XDragger如果没有拖动过，那么不会再触发onEnd
 *      ✦接口新增：XAudio添加振动接口封装
 *          XAudio.vibrateOn        振动开关，切换自动存档
 *          XAudio.vibrateShort     短振动，会判断振动开关
 *          XAudio.vibrateLong      长振动，会判断振动开关
 *      ✦模块新增：Box2DUtils，针对CocosCreator的box2d封装的实用接口，当前有：
 *          Box2DUtils.getContactCount      获取结点本级接触数
 *          Box2DUtils.setSimSpeed          调节box2d模拟速度
 *          Box2DUtils.setDebugDrawFlags    显示调试辅助图形
 *
 * 2.14.0
 *      2020年6月4日
 *      ✦接口新增：xfire.getRandomPointInCircle，圆内【均匀】随机取点
 *      ✦XShadow强化：支持摄像机视点位置偏移设置，更方便模拟放大镜移动
 *
 * 2.13.0
 *      2020年5月27日-2020年6月2日
 *      ✦bug修正：原生平台无法使用cc.loader.load加载远程文本，导致远程图集在原
 *          平台无法加载成功，改为直接使用网络接口请求文本。
 *      ✦新增组件：XAniNumber，基于cc.Label实现动态数字变化或其他字符映射，【详
 *          见文件头】
 *      ✦新增模块：FakeInput，实现用户输入模拟，目前支持触摸模拟，主要考虑方便
 *          引导，后续添加引导模块。【详见文件头】
 *
 * 2.12.0
 *      2020年5月12日
 *      ✦接口新增：xfire.isKeyPressed，用于判断键盘的某个按键是否按下
 *      ✦接口新增：XMath新增splitCubicBezier，用于拆分三次bezier曲线，
 *          拆分后的2个bezier曲线拼接起来与拆分前形状一致
 *      ✦新增组件：XShadow，能够实时呈现某个结点的投影
 *
 * 2.11.1
 *      2020年5月8日
 *      ✦XDragger组件添加了回调接口onStart、onMove、onEnd
 *      ✦安卓添加了box广告接口，oppo超休闲的游戏社区跳转使用box广告实现
 *
 * 2.11.0
 *      2020年5月7日
 *      ✦添加组件XInstancer，用于间接实现预制体嵌套
 *      ✦添加广告类型：全屏插屏，类型标记为：fullscreen
 *          ✦xfire.supportFullscreenAd
 *          ✦xfire.showFullscreenAd
 *
 * 2.10.3
 *      2020年4月26日
 *      ✦bug修正：签到模块签到后标记设置错误、部分类型的刷新逻辑错误
 *
 * 2.10.2
 *      2020年4月23日
 *      ✦bug修正：点秦的回调名称不对导致回调不触发
 *
 * 2.10.1
 *      2020年4月22日
 *      ✦魅族的基础库提升到1064，视频、插屏加载方式做出调整
 *      ✦bug修正：点秦的视频广告无法二次播放
 *
 * 2.10.0
 *      2020年4月21日
 *      ✦广告的一些内部接口调整，方便平台封装，无关外部调用
 *      ✦接入点秦h5广告
 *
 * 2.9.13
 *      2020年4月21日
 *      ✦bug修正：字节跳动低版本http通信存在异常，会自行转换json字符串为js对象，导致通信异常
 *      ✦bug修正：字节跳动低版本上不存在createMoreGamesButton接口时报错
 *
 * 2.9.12
 *      2020年4月16日-2020年4月17日
 *      ✦bug修正：桌面浏览器的模拟登录会在触发登录重试时创建多个登录页面
 *      ✦优化XSimpleGesture：简单手势组件可以在编辑器中预览操作区域了
 *
 * 2.9.11
 *      2020年4月15日
 *      ✦优化了即刻玩广告加载逻辑，加载失败或超时时会继续尝试
 *
 * 2.9.10
 *      2020年4月15日
 *      ✦XAudio添加对同一音效的播放间隔限制，默认0.05秒
 *
 * 2.9.9
 *      2020年4月14日
 *      ✦修正了即刻玩插屏无法二次弹出的问题
 *
 * 2.9.8
 *      2020年4月14日
 *      ✦头条添加插屏广告支持
 *
 * 2.9.7
 *      2020年4月9日-2020年4月13日
 *      ✦接入即刻玩
 *      ✦bug修正：签到模块没有存储上次签到时间，导致【累计】模式下今天是否签到判断出错
 *      ✦新增图集加载接口，鼓励使用预先打包的图集：
 *          xfire.loadResourceSpriteAtlas   加载本地图集
 *          xfire.loadRemoteSpriteAtlas     加载远程图集，失败会自动重试一定次数
 *      ✦优化XListView、XBanner：编辑器结构树中隐藏预览结点，同时禁止预览结点被点击
 *
 * 2.9.6
 *      2020年4月7日
 *      接口新增：xfire.loadRemoteAudio，加载远程音频，失败自动重试
 *      接口优化：loadRemoteImage会限制重试次数为10次，超10次每次调用才进行一次加载
 *      优化XListView：编辑器预览时限制最大创建条目数，防止过多影响编辑器稳定
 *      添加新模块XAudio，用于音频的加载、状态管理、播放，会自动存档音效、音乐开关
 *
 * 2.9.5
 *      2020年4月3日
 *      bug修正：桌面浏览器模拟登录账号输入完没有显示输入内容
 *
 * 2.9.4
 *      2020年4月2日
 *      功能新增：为方便开发，桌面浏览器添加模拟banner支持，支持移动、style设置，与微信类似
 *
 * 2.9.3
 *      2020年3月30日
 *      新增接口：
 *          xfire.getDateDiff   计算两个日期、时间戳之间的间隔天数，可以指定时区
 *          xfire.getNormalDate 将指定时间戳翻译为指定时区正常时间，主要是用于时区转换
 *      新增模块：
 *          DailySign   签到模块，支持常见的几种签到方式，未严格测试，使用时有问题反馈
 *      ucbug修正：query空值导致ios无法拉起分享界面
 *
 * 2.9.2
 *      2020年3月27日
 *      弱联网分数上传接口新增了replace参数，为true会强制替换分数
 *
 * 2.9.1
 *      2020年3月26日
 *      ✦oppo的插屏与banner的显示做了互斥，插屏优先级高于banner，插屏显示时自动关闭banner，插屏关闭则自动恢复banner
 *      ✦oppo的广告在加载失败时会进行重试，增加成功率
 *
 * 2.9.0
 *      2020年3月25日
 *      ✦添加接口xfire.supportBannerAdMove用于判定平台banner是否可移动
 *      ✦添加更强大的banner移动函数xfire.moveBannerToEx，主要为XBanner服务
 *      ✦添加组件XBanner，可以用banner进行绑定，在编辑器中可视化排版、预览banner，
 *          移动XBanner组件所在结点即可移动banner
 *          隐藏、激活XBanner所在结点可同步隐藏、显示绑定banner
 *          不支持banner移动的平台可以保持底部显示或者设置为隐藏
 *          【目前支持微信、qq、百度】
 *      ✦微信、qq的banner刷新机制改为平台自带机制，配置条目中的duration依然有效，但最少30秒
 *      ✦优化百度banner的移动机制
 *
 * 2.8.0
 *      2020年3月23日
 *      oppo在初始化时进行上报数据
 *
 * 2.7.9
 *      2020年3月18日
 *      修正奇虎360 getSystemInfoSync接口返回信息的brand和model为空的问题
 *      完善百度广告错误信息输出
 *
 * 2.7.8
 *      2020年3月17日
 *      增加剪贴板适配平台，现在支持平台：安卓 微信 qq 字节跳动 百度 oppo vivo
 *
 * 2.7.7
 *      2020年3月16日
 *      添加剪贴板支持接口，可进行字符串的复制粘贴操作，目前支持安卓平台：
 *          supportClipboard
 *          setClipboardData
 *          getClipboardData
 *
 * 2.7.6
 *      2020年3月13日
 *      触网扩展接口添加微信登录接口
 *
 * 2.7.5
 *      2020年3月13日
 *      完善安卓扩展接口调用
 *
 * 2.7.4
 *      2020年3月12日
 *      添加通用组件：简单手势响应组件XSimpleGesture，当前支持上下左右的滑动手势
 *
 * 2.7.3
 *      2020年3月12日
 *      统计接口xfire.analyzerStageEnd添加分数参数
 *
 * 2.7.2
 *      2020年3月11日
 *      添加【触网安卓】扩展接口
 *
 * 2.7.1
 *      2020年3月9日
 *      qq支付完善，支持道具补发
 *      添加接口xfire.currentTimeMillis获取本地时间戳，单位：毫秒
 *
 * 2.7.0
 *      2020年3月5日
 *      qq添加插屏广告支持，qq的插屏在游戏启动一定时间内不能弹出，两次插屏有间隔时长限制
 *      微信添加格子广告支持，操作接口跟banner的接口相似，呈现也与banner相似
 *
 * 2.6.9
 *      2020年3月4日
 *      奇虎360添加了快捷方式安装支持接口
 *
 * 2.6.8
 *      2020年2月17日
 *      奇虎360完善视频广告支持，banner暂时取消支持（显示异常，竖屏时banner过小显示不清）
 *
 * 2.6.7
 *      2020年1月18日
 *      调整计费模块设计，原先的设计无法满足正规平台的需求
 *
 * 2.6.6
 *      2020年1月16日
 *      魅族添加onShow、onHide支持，但存在兼容问题，可能导致label显示异常，如有异常可修改label的cache mode看看
 *
 * 2.6.5
 *      2020年1月13日-2020年1月15日
 *      优化了安卓的计费支持
 *      适配魅族新版广告接口
 *
 * 2.6.4
 *      2020年1月9日
 *      雪鲤鱼添加插屏支持（全屏视频）
 *      添加接口：
 *          xfire.analyzerSendEvent
 *          xfire.analyzerStageEnter
 *          xfire.analyzerStageEnd
 *
 * 2.6.3
 *      2020年1月6日
 *      添加雪鲤鱼小程序支持，需配合打包插件1.0.4构建web-mobile，生成snowfish文件夹
 *
 * 2.6.2
 *      2019年12月27日
 *      bug修正：字节跳动停止后立即启动record可能导致回调错乱
 *
 * 2.6.1
 *      2019年12月25日
 *      bug修正：版本号处理存在bug
 *
 * 2.6.0
 *      2019年12月11日-2019年12月20日
 *      添加奇虎360小程序支持，请配合打包插件1.0.3构建
 *      添加华为小程序支持，目前仅提供少量接口
 *      添加计费接口，为方便开发，网页版在CC_DEV下提供计费模拟操作
 *      xfire.copy模板化，返回被copy对象的类型
 *
 * 2.5.0
 *      2019年12月9日-2019年12月11日
 *      XListView现在可以在编辑器中预览了
 *      修正字节跳动录屏接口，endRecord、startRecord不能连续使用的问题，但startRecord后仍不能立即endRecord
 *      修正XListView在未激活时无法使用滚动接口的问题：scrollToBottom、scrollToTop、scrollToLeft、scrollToRight、scrollToItem
 *
 * 2.4.9
 *      2019年12月5日
 *      添加xfire.gameTime属性，单位：秒，表示游戏时长（onHide状态不计入游戏时长）
 *      添加xfire.idleTime属性，单位：秒，表示游戏未操作时间（onHide状态不计入），废除原来的getIdleTime接口
 *      录屏回调添加【录屏时长】方便判断合法性，单位：秒
 *      添加模块：LargeNumberOperation，宏建提供
 *
 * 2.4.8
 *      2019年11月28日
 *      vivo更新支持桌面快捷方式安装
 *
 * 2.4.7
 *      2019年11月26日
 *      修复qq的banner移动接口有偏差的问题
 *
 * 2.4.6
 *      2019年11月21日
 *      视频分享接口添加回调处理
 *
 * 2.4.5
 *      2019年11月20日
 *      趣头条设置为必有账号
 *
 * 2.4.4
 *      2019年11月19日
 *      优化趣头条中断处理，需要更新定制引擎
 *
 * 2.4.3
 *      2019年11月18日
 *      优化vivo的banner与插屏的显示逻辑
 *      oppo加强登录兼容性
 *      oppo的插屏展示添加间隔限制，同时限制期间isAdReady将返回false
 *
 * 2.4.2
 *      2019年11月15日
 *      bug修正：多边形组件可能裁剪不正确，导致显示异常
 *
 * 2.4.1
 *      2019年11月15日
 *      修正预制体开启资源延迟加载后【粒子组件】、【多边形组件】显示异常的问题
 *      修正多边形组件addPoint函数没有正确返回true的问题
 *
 * 2.4.0
 *      2019年11月14日
 *      修改了creator.d.ts以添加多点触摸的扩展属性
 *      XEngineExt引擎扩展：
 *          extendButton        按钮扩展，如统一添加音效
 *          getButtonCustomData 获取扩展时自定义类型数据
 *          setButtonCustomData 修改自定义类型数据
 *          范例：
 *          export function overrideButton(): void {
 *              XEngineExt.extendButton(true, (button, data) => {
 *                  if (data) {
 *                      playSound('按钮');
 *                  }
 *              });
 *          }
 *
 *          export function muteButton(button: cc.Button): void {
 *              XEngineExt.setButtonCustomData(button, false);
 *          }
 *
 *          export function unmuteButton(button: cc.Button): void {
 *              XEngineExt.setButtonCustomData(button, true);
 *          }
 *
 * 2.3.9
 *      2019年11月14日
 *      修正vivo小游戏音乐stop后能被resume的问题，需更新定制引擎
 *      bug修正：XParticle处理矩形发射器时存在位置偏移
 *
 * 2.3.8
 *      2019年11月13日
 *      解决vivo小游戏激活时可能会播放上次音效的问题
 *
 * 2.3.7
 *      2019年11月11日
 *      添加了xfire.supportAppBoxAd
 *      添加了xfire.showAppBox
 *
 * 2.3.6
 *      2019年11月7日
 *      XParticle的playOnce回调参数改为可选
 *      添加截图接口：xfire.captureScreen
 *      XListView添加接口：scrollToItem(index: number, anim = false)
 *
 * 2.3.5
 *      2019年11月5日-2019年11月6日
 *      优化vivo平台音乐播放行为
 *      优化qq平台音乐播放行为、中断处理方式
 *      优化百度音乐播放行为、中断处理方式，需要定制化游戏引擎
 *      优化字节跳动音乐播放行为、中断处理方式
 *
 * 2.3.4
 *      2019年11月5日
 *      优化微信平台音乐播放行为
 *
 * 2.3.3
 *      2019年11月4日
 *      xfire.sleep添加可选参数driveComponent，添加后将使用cocos的schedule驱动，主要是考虑setTimeout在后台也可能运行
 *      添加快速方式安装接口：
 *          xfire.supportShortcut
 *          xfire.installShortcut
 *          xfire.hasShortcutInstalled
 *
 * 2.3.2
 *      2019年11月4日
 *      微信平台在播放视频广告时重新模拟出hide、show事件，【注】需要修改版引擎
 *      粒子组件支持同一时刻生成粒子的寿命随机化
 *
 * 2.3.1
 *      2019年10月30日
 *      完善oppo平台登录状态记录
 *      完善百度平台platLogined的准确性
 *
 * 2.3.0
 *      2019年10月23日
 *      添加接口xfire.platLogined，判断用户是否已登录平台账号、或者登录过平台账号
 *      添加弱联网接口xfireol.loginAsGuest
 *      添加弱联网分数评估接口：
 *          evaluateGlobalScore
 *          evaluateLevelScore
 *          evaluateDailyLevelScore
 *          evaluateWeeklyLevelScore
 *          evaluateMonthlyLevelScore
 *      更多同步化接口：弱联网分数上传、分数查询、评估、榜单获取
 *
 *
 * 2.2.9
 *      2019年10月17日
 *      bug修正：uc只能看一次视频
 *
 * 2.2.8
 *      2019年10月16日
 *      bug修正：游客登录时没有正确标识为游客导致登录失败
 *
 * 2.2.7
 *      2019年10月15日
 *      bug修正：oppo意外去掉了登录支持
 *
 * 2.2.6
 *      2019年10月15日
 *      针对oppo快应用2.9.0的banner广告hide的bug，采用了特殊方式进行避免
 *      添加了振动接口：
 *          xfire.supportVibrate
 *          xfire.vibrateShort
 *          xfire.vibrateLong
 *
 * 2.2.5
 *      2019年10月15日
 *      优化oppo的banner广告加载延迟时的显、隐操作
 *
 * 2.2.4
 *      2019年10月14日
 *      修正xfire.d.ts中对于xfireol的类型声明错误
 *      修改了网络请求接口返回格式，以统一同步化调用返回结果的格式
 *      一些接口添加同步化调用支持：
 *          xfire.getSetting
 *          xfire.getUserInfo
 *          xfireol.getServerTime
 *          xfireol.getConfigs
 *          xfireol.login
 *          xfireol.setUserData
 *          xfireol.getUserData
 *          xfireol.submitUserInfo
 *          登录示例：
 *              let fnLogin = async () => {
 *                  let userInfo = (await xfireol.login()).userInfo;
 *                  if (!userInfo) {
 *                      App.getInstance().showToast('登录失败，稍后重试');
 *                      await xfire.sleep(3);
 *                      fnLogin();
 *                      return;
 *                  }
 *                  App.getInstance().showToast('登录成功');
 *              };
 *              fnLogin();
 *
 * 2.2.3
 *      2019年10月11日
 *      banner广告的显、隐逻辑优化：同一任务栈内多次设置仅进行标记，稍后一次性处理
 *      添加实用接口：getRandomIndexByWeight 根据权重取随机，使用案例：按概率掉落道具
 *
 * 2.2.2
 *      2019年10月9日
 *      字节跳动banner风格升级，尝试进行适配优化
 *
 * 2.2.1
 *      2019年10月8日
 *      标准化vivo的一些行为：在播放、关闭视频广告模拟出onHide、onShow事件，从而与微信平台一致。
 *
 * 2.2.0
 *      2019年9月27日-2019年9月30日
 *      1.bug修正：字节条动用户信息上传不成功
 *      2.bug修正：矩形控件使用结点颜色时透明度没有生效
 *      3.XEngineExt引擎扩展：
 *          extendNodeMutiTouch：扩展多点触摸机制，可解决目前的多点触摸并发问题，目前稳健性待验证
 *      4.添加可异步实用接口sleep，后续将添加更多的异步开发支持，异步代码同步化示例：
 *          (async () => {
 *              await xfire.sleep(1);
 *              console.log('sleep 1');
 *              let content = await xfire.httpGetStringWithBody('https://minigame.orbn.top/minigame/json', JSON.stringify({method: 'getServerTime'}));
 *              console.log(content);
 *              await xfire.sleep(2);
 *              console.log('sleep 2');
 *              await xfire.sleep(3);
 *              console.log('sleep 3');
 *          })();
 *
 * 2.1.2
 *      2019年9月26日
 *      vivo小程序添加视频广告播放间隔限制
 *      录频结束接口允许添加end回调，添加后将不触发startRecord时指定的回调，不填写则将触发startRecord时指定的回调
 *
 * 2.1.1
 *      2019年9月25日
 *      uc小程序支持优化
 *
 * 2.1.0
 *      2019年9月24日
 *      bug修正：字节跳动showMoreGamesButton没有正确处理图片路径
 *      添加新平台：uc小程序
 *      弱联网添加接口：
 *          getDailyLevelRanklist
 *          getWeeklyLevelRanklist
 *          getMonthlyLevelRanklist
 *
 * 2.0.6
 *      2019年9月23日
 *      多边形组件、矩形组件兼容2.1.x版本
 *      封装字节跳动更多游戏按钮，使用方式：
 *          // xhappcfg.json中配置跳转id
 *          if (xfire.plat === xfire.PLAT_BYTEDANCE) {
 *              let btnMoreGames = (xfire as XFireAppByteDance).showMoreGamesButton(null, 10, 10, 100, 100, 'resources/img.png');
 *              // 显示隐藏请调用btnMoreGames的show、hide函数
 *          }
 *
 * 2.0.5
 *      2019年9月20日
 *      粒子组件添加playbackSpeed属性，修改可调整播放速度，默认为1
 *
 * 2.0.4
 *      2019年9月19日
 *      添加新自绘组件demo：XPolygon，实现多边形贴图
 *      新增模块：XMath（XPolygon使用），XSortedQueue
 *
 * 2.0.3
 *      2019年9月19日
 *      重新适配oppo小程序视频广告，oppo从1040开始启用新的视频回调接口
 *
 * 2.0.2
 *      2019年9月18日-2019年9月19日
 *      小米快游戏支持插屏广告
 *      弱联网新增接口：
 *          uploadDailyLevelScore       上传日榜分数
 *          uploadWeeklyLevelScore      上传周榜分数
 *          uploadMonthlyLevelScore     上传月榜分数
 *          getDailyLevelScore          获取日榜(可区分本期、上期)分数
 *          getWeeklyLevelScore         获取周榜(可区分本期、上期)分数
 *          getMonthlyLevelScore        获取月榜(可区分本期、上期)分数
 *
 * 2.0.1
 *      2019年9月17日
 *      榜单获取支持指定范围获取：指定start参数，如指定start=2，表示从第二名（含）开始拉取
 *
 * 2.0.0
 *      2019年9月0日-2019年9月11日
 *      添加新平台支持：趣头条
 *      添加实用接口：getUrlParam，获取url中的参数值，主要用于h5类型平台
 *      添加网络接口：httpGetJsonWithBody
 *
 * 1.9.7
 *      2019年9月4日
 *      捕获微信视频广告快速连续播放可能产生数据未就绪错误，并追加回调
 *
 * 1.9.6
 *      2019年9月4日
 *      视频广告播放接口在视频无法播放时依然给予回调
 *
 * 1.9.5
 *      2019年9月3日
 *      视频广告加入防冲突判断
 *      添加实用接口：getRandomIndexExcept，一个数组排除指定下标后取随机
 *
 * 1.9.4
 *      2019年8月27日
 *      粒子组件新增height属性支持
 *
 * 1.9.3
 *      2019年8月22日
 *      粒子组件完善：加入纵向和横向加速的支持
 *
 * 1.9.2
 *      2019年8月20日
 *      列表组件XListView添加横向支持
 *      添加接口实用接口：getRandomMember，随机取数组成员
 *
 * 1.9.1
 *      2019年8月12日-2019年8月20日
 *      控件新增：矩形组件，无图绘制矩形，可定义色彩过渡
 *      控件新增：列表组件XListView
 *
 * 1.9.0
 *      2019年8月12日
 *      弱联网添加分数上传接口：uploadGlobalScore（总榜，每个游戏仅一个）、uploadLevelScore（关卡榜，每关一个榜）
 *      弱联网添加最高分数获取接口：getGlobalScore、getLevelScore
 *      弱联网添加排行榜获取接口：getGlobalRanklist、getLevelRanklist
 *
 * 1.8.3
 *      2019年8月9日
 *      粒子插件：减少编辑器里资源未拖放时的报错
 *
 * 1.8.2
 *      2019年8月9日
 *      尝试加强vivo小程序视频广告的稳健性
 *
 * 1.8.1
 *      2019年8月7日
 *      bug修正：qq、微信分享没有正确回调，该bug源于1.8.0版本
 *
 * 1.8.0
 *      2019年8月6日-2019年8月7日
 *      代码整理
 *      字节跳动关闭跳转支持
 *      xfireol添加公共属性：noname、guest
 *      功能新增：xfireol支持游客登录，在xhappcfg的对应平台下添加"allowGuest": true可开启
 *      调整onShow、onHide实现，添加接口：offShow、offHide
 *      分享接口现在可以传入success、fail、complete，微信、qq平台的成功与否使用时间判定
 *
 * 1.7.1
 *      2019年8月5日
 *      bug修复：微信视频广告在高版本库下多次回调
 *
 * 1.7.0
 *      2019年8月1日-2019年8月5日
 *      安卓平台优化：播放视频广告时暂停游戏
 *      添加平台：小米小程序
 *
 * 1.6.7
 *      2019年7月26日-2019年7月29日
 *      添加接口：isRecording，判断当前是否正在录屏
 *      添加接口：getIdleTime，获取玩家未操作时间（仅指触摸），单位：秒
 *      广告功能新增：广告条目允许配置alias别名，条目配置别名后仅name、alias属性生效
 *      广告自动刷新：定时器内置，自动统计闲置时间，无需外部再调用update
 *
 * 1.6.6
 *      2019年7月25日
 *      添加了移动浏览器
 *      浏览器添加了模拟登录（仅限开发环境），公司网络自动注册、登录
 *
 * 1.6.5
 *      2019年7月25日
 *      bug修正：qq、字节跳动、百度onShow没有触发回调函数
 *      完成粒子组件在2.1.2下的适配
 *      xfireol新增接口getConfigs，获取服务端配置，无需登录
 *      xfireol新增接口getServerTime，获取服务器时间，无需登录
 *
 * 1.6.4
 *      2019年7月24日
 *      bug修正：微信onShow没有触发回调函数
 *      完善部分平台的getUserInfo接口
 *      使用ts重写了粒子组件
 *
 * 1.6.3
 *      2019年7月19日-2019年7月23日
 *      弱联网增加字节跳动、vivo
 *      xfireol添加公共属性：id、nickname、avatar，
 *          登录成功后将被赋值，大部分平台需要先上传用户信息，否则为匿名用户信息
 *      添加了oppo的小程序跳转功能，oppo的小程序跳转需要将appId配置为包名
 *      xfireol新增接口submitUserInfo，将用户信息提交到服务器
 *      字节跳动横幅广告隐藏时不再销毁
 *      开心网广告添加日志输出
 *
 * 1.6.2
 *      2019年7月19日
 *      弱联网增加oppo、魅族
 *      移除未使用的network
 *      bug修正：魅族插屏不展示
 *
 * 1.6.1
 *      2019年7月18日
 *      弱联网增加百度、QQ
 *      调整getUserInfo接口参数格式
 *      调整getSetting接口参数格式
 *      实现开心网的getUserInfo
 *
 * 1.6.0
 *      2019年7月18日
 *      添加弱联网模块
 *      添加弱联网接口isLogined、login、setUserData、getUserData
 *      添加实用接口：copy、compareVersion
 *
 * 1.5.5
 *      2019年7月16日
 *      开心网banner就绪标记完善
 *      修正了字节跳动录像启动时时长参数格式错误
 *      魅族添加插屏支持
 *
 * 1.5.4
 *      2019年7月15日
 *      微信添加插屏支持
 *
 * 1.5.3
 *      2019年7月12日
 *      添加了网络请求接口。
 *      录屏接口调整，结束回调从endRecord移动到startRecord中，主要是考虑被动结束时的情况。
 *
 * 1.5.2
 *      2019年7月11日
 *      魅族平台修正了回调方式，仅在关闭时回调，避免多次回调
 *
 * 1.5.1
 *      2019年7月11日
 *      bug修正：魅族模块在移动浏览器上错误启动
 *      qq平台添加跳转接口
 *      loadResourceImage内部加载方式从纹理改为spriteFrame以应对自动图集带来的问题
 *
 * 1.5.0
 *      2019年7月11日
 *      添加了小程序跳转系列接口
 *      vivo平台播放视频广告时会主动暂停游戏，其他平台会自行处理
 *
 * 1.4.2
 *      2019年7月11日
 *      bug修正：onShareAppMessage接口错误调用平台shareAppMessage接口
 *
 * 1.4.1
 *      2019年7月10日
 *      vivo视频广告拉取失败会持续尝试
 *      字节跳动广告自动重新加载
 *      添加了远程图片加载接口
 *      添加了本地图片加载接口
 *      添加了字符串格式化接口
 *
 * 1.4.0
 *      2019年7月9日
 *      添加了魅族小程序支持
 *      修正了录屏接口缺失问题
 *      添加了录像分享接口，目前仅字节条跳动支持
 *      修正了字节跳动banner不显示问题
 *
 * 1.3.1
 *      修正了vivo未加载的问题
 *
 * 1.3.0
 *      新增了开心玩小程序支持
 *
 * 1.2.0
 *      新增了vivo小程序支持
 *      新增了字节跳动小程序支持
 *      添加接口：supportBannerAd、supportVideoAd、supportInterstitialAd
 *      添加接口：showInterstitialAd
 *
 * 1.1.1
 *      修正了oppo的广告加载bug，同时支持oppo 1040的新api：getSystemInfoSync
 *
 * 1.1.0
 *      添加QQ小游戏平台
 *
 * 1.0.0
 *      首发
 *
 *
 * 当前支持平台：
 *      微信小程序
 *      百度小程序
 *      qq小程序
 *      oppo小程序
 *      vivo小程序
 *      开心小程序
 *      字节跳动小程序
 *      阿里安卓
 *      vivo安卓
 *      oppo安卓
 *      魅族小程序
 *      小米小程序
 *      趣头条小程序
 *      uc小程序
 * 弱联网支持平台：
 *      微信小程序
 *      开心小程序
 *      百度小程序
 *      qq小程序
 *      oppo小程序
 *      魅族小程序
 *      vivo小程序
 *      字节跳动小程序
 *      小米小程序
 *      趣头条小程序
 *      uc小程序
 */
