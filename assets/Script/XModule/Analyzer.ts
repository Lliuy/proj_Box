/*******************************************************************************
文件: Analyzer.ts
创建: 2020年06月28日
作者: 老张(zwx@xfire.mobi)
描述:
    可扩展数据统计模块，通过注册来达到扩展目的

文档：
    ✦友盟：https://developer.umeng.com/docs/147615/detail/270970

与xfire中的analyzer接口区别：
    ✦xfire中的analyzer为个别平台自身的统计接口封装，现已封装为AnalyzerPlat，只要
        注册到Analyzer中即可启用
    ✦新项目不要再直接使用xfire.analyzer接口
    ✦旧项目如果改用Analyzer，应该删除原来的xfire.analyzer调用

初始化范例1：
    文件域调用：
    cc.game.once(cc.game.EVENT_ENGINE_INITED, () => {
        // 注册平台自身统计插件
        Analyzer.register(new AnalyzerPlat());
        // 注册炫火自身统计插件 要传入【appkey】，炫火后台分配
        Analyzer.register(new AnalyzerXFire('YbBUFFVNuThauSoQ'));
        // 注册阿拉丁统计插件 要传入【appkey】，阿拉丁后台分配
        Analyzer.register(new AnalyzerAld('4f75fe52c6a5ac4c3c3319433688b2de'));
        // 注册TD统计插件 要传入【appkey】，td后台分配
        Analyzer.register(new AnalyzerTD('E8EBA5422F194CDEB1436542675D63DB', '应用名', '微信id'));
    });

初始化范例2：
    在启动场景脚本的onLoad函数里：
    // 注册平台自身统计插件
    Analyzer.register(new AnalyzerPlat());
    // 注册炫火自身统计插件 要传入【appkey】，炫火后台分配
    Analyzer.register(new AnalyzerXFire(【appkey】);
    // 注册阿拉丁统计插件 要传入【appkey】，阿拉丁后台分配
    Analyzer.register(new AnalyzerAld(【appkey】));

初始化后可使用接口：
    Analyzer.sendEvent
    Analyzer.stageEnter
    Analyzer.stageEnd

*******************************************************************************/

import AnalyzerInterface from './Analyzer/AnalyzerInterface';

export default class Analyzer {
    private static analyzers: AnalyzerInterface[] = [];
    /** 模块进入时间 */
    private static moduleEnterTime: {[key: string]: number} = {};
    /** 标记是否已初始化 */
    private static initialized = false;

    /**
     * 注册统计插件，不要在文件域调用本接口，可以在启动场景的onLoad里
     * @param analyzer 统计插件实例
     */
    public static register(analyzer: AnalyzerInterface) {
        try {
            if (analyzer.init()) {
                Analyzer.analyzers.push(analyzer);
            }
        } catch (error) {
            console.log(error);
        }
        // 监听隐藏事件，及时上报模块使用
        if (!this.initialized) {
            this.initialized = true;
            xfire.onHide(() => {
                for (let module of Object.keys(this.moduleEnterTime)) {
                    try {
                        Analyzer.moduleTiming(module);
                    } catch (error) {
                    }
                }
            });
        }
    }

    /**
     * 发送用户自定义事件
     * @param customEventName 事件名
     * @param eventArg 事件参数，不一定所有平台都支持，不支持的平台会使用_连接到事件名上
     */
    public static sendEvent(customEventName: string, eventArg?: string) {
        this.analyzers.forEach((analyzer) => {
            try {
                analyzer.sendCustomEvent(customEventName, eventArg);
            } catch (error) {
            }
        });
    }

    /**
     * 进入关卡
     * @param stageId 关卡id，从1开始
     * @param userId 可选，用户id
     */
    public static stageEnter(stageId: number, userId?: string): void {
        this.analyzers.forEach((analyzer) => {
            try {
                analyzer.stageEnter(stageId, userId);
            } catch (error) {
            }
        });
    }

    /**
     * 关卡结束、提前退出
     * @param stageId 关卡id，从1开始
     * @param succ 闯关成功与否，没设计成功与否的关卡认定成功，提前退出关卡认定失败
     * @param score 可选 分数
     * @param userId 可选 用户id
     */
    public static stageEnd(stageId: number, succ: boolean, score?: number, userId?: string): void {
        this.analyzers.forEach((analyzer) => {
            try {
                analyzer.stageEnd(stageId, succ, score, userId);
            } catch (error) {
            }
        });
    }

    /**
     * 进入某个模块
     * @param module 模块名
     */
    public static moduleEnter(module: string): void {
        if (module == null || module === '') {
            return;
        }
        if (this.moduleEnterTime[module] == null) {
            this.moduleEnterTime[module] = xfire.gameTime;
        }
        this.analyzers.forEach((analyzer) => {
            try {
                analyzer.moduleEnter(module);
            } catch (error) {
            }
        });
    }

    /**
     * 离开某个模块
     * @param module 模块名
     */
    public static moduleEnd(module: string): void {
        if (module == null || module === '') {
            return;
        }
        let time = 0;
        if (this.moduleEnterTime[module] != null) {
            time = xfire.gameTime - this.moduleEnterTime[module];
        }
        this.moduleEnterTime[module] = null;
        this.analyzers.forEach((analyzer) => {
            try {
                analyzer.moduleEnd(module, time);
            } catch (error) {
            }
        });
    }

    /**
     * 立即上报模块当前使用时间
     * @param module 模块名
     */
    public static moduleTiming(module: string): void {
        if (module == null || module === '' || this.moduleEnterTime[module] == null) {
            return;
        }
        let time = xfire.gameTime - this.moduleEnterTime[module];
        this.moduleEnterTime[module] = xfire.gameTime;
        this.analyzers.forEach((analyzer) => {
            try {
                analyzer.moduleTiming(module, time);
            } catch (error) {
            }
        });
    }
}
