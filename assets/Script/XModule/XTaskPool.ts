/*******************************************************************************
文件: XTaskPool.ts
创建: 2020年07月15日
作者: 老张(zwx@xfire.mobi)
描述:
    task管理模块，目前主要用于加载进度管理

使用：
    ✦添加任务，add
    ✦开始执行，start
    ✦查看进度，progress属性，没有任务时，progress属性将返回0
*******************************************************************************/

import xfire from "../XFire/xfire";

export abstract class Task {
    public end = false;
    /** 任务进度0-1 */
    public progress = 0;

    /** 开始工作，并需要更新进度 */
    public abstract run(): void;

    /** 标记任务结束，不指定succ标记将根据progress判断是否成功 */
    public endTask(succ: boolean = null): void {
        this.end = true;
        if (succ === true) {
            this.progress = 1;
        }
        else if (succ === false) {
            if (this.progress >= 1) {
                this.progress = 0.99;
            }
        }
    }
}

/** 任务池 */
export default class XTaskPool {
    private totalWeight = 0;
    private tasks: { weight: number; task: Task; block: boolean }[] = [];
    private completed = false;
    /** 上次计算的进度，防止倒退 */
    private lastRet = 0;
    /** 启动时间 */
    private startTimestamp = 0;
    /** 假进度，可以减少用户等待感 */
    private fakeTotalPercents = 0;
    private fakeMaxTime = 15;

    public constructor(params?: {
        /** 假进度总占比0 - 0.99，默认0 */
        fakeTotalPercents?: number;
        /** 假进度最大时间，默认15秒 */
        fakeMaxTime?: number;
    }) {
        if (params) {
            if (typeof params.fakeTotalPercents === 'number' && params.fakeTotalPercents > 0) this.fakeTotalPercents = Math.min(0.99, params.fakeTotalPercents);
            if (typeof params.fakeMaxTime === 'number' && params.fakeMaxTime > 0) this.fakeMaxTime = params.fakeMaxTime;
        }

    }

    /**
     * 结合假进度返回总进度
     * 算法如下：
     * fakeTotalPercents为0表没启用假进度，此时直接返回真进度
     * fakeTotalPercents非0则：
     */
    public get progress() {
        if (this.tasks.length === 0) {
            return 0;
        }
        if (this.completed) {
            return 1;
        }
        if (this.totalWeight <= 0) {
            this.completed = true;
            return 1;
        }
        let ret = 0;
        this.tasks.forEach((task) => {
            ret += task.weight * task.task.progress;
        });
        ret = ret / this.totalWeight;
        ret = Math.min(1, ret);
        this.completed = ret === 1;
        if (this.completed || this.fakeTotalPercents <= 0) {
            ret = Math.max(this.lastRet, ret);
            this.lastRet = ret;
            return ret;
        }
        // 结合加进度
        let time = Math.max(0, xfire.currentTimeMillis - this.startTimestamp) / 1000;
        let fakeProgress = ret;
        fakeProgress += (1 - ret) * Math.min(1, time / (this.fakeMaxTime));
        fakeProgress *= this.fakeTotalPercents;

        ret = fakeProgress + ret * (1 - this.fakeTotalPercents);
        ret = Math.max(this.lastRet, ret);
        this.lastRet = ret;
        return ret;
    }

    /**
     * 添加任务
     * @param task 任务对象
     * @param weight 总进度中的权重，默认为1
     * @param block 默认false，表是否阻塞，如果阻塞，后续添加的任务需要等本任务完成才开始
     */
    public addTask(task: Task, weight = 1, block = false) {
        if (CC_DEV && weight < 0) {
            console.error('权重不能为负数');
        }
        this.tasks.push({ weight, task, block });
        this.totalWeight += weight;
    }

    public start(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.completed = false;
            this.startTimestamp = xfire.currentTimeMillis;
            (async () => {
                for (let task of this.tasks) {
                    task.task.progress = 0;
                    task.task.end = false;
                    task.task.run();
                    // 等待阻塞型任务执行完成
                    while (task.block && task.task.progress < 1) {
                        await xfire.sleep(0.1);
                    }
                }
                // 等待所有任务完成
                do {
                    await xfire.sleep(0.1);
                    if (this.progress === 1) {
                        resolve();
                        break;
                    }
                } while (!this.completed);
            })();
        });
    }
}
