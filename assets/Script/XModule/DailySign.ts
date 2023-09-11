/*******************************************************************************
文件: DailySign.ts
创建: 2020年03月27日
作者: 老张(zwx@xfire.mobi)
描述:
    每日签到模块
    支持五种签到模式：
        周期可中断  需设定周期，起始日为构建时刻，中间可以断开，比如7天周期，第1天签到，第2天没有签到，第3天依然可以签
        累计        需设定周期(签到最大次数)，可以隔n天再次签到，不会从第一天重新开始，比如7天，第1天签到，第2天没签，第3天签到算第2天
        周签到      以周一为起始日进行7天签到，中间可以断开
        月签到      以每月1日为起始日进行月周期签到，中间可以断开
        连续        需设定周期，连续签到，一旦中断，从第一天重新开始
    时区处理：以周期内第一次签到所在时区为准，持续到下次周期刷新
    支持补签、提前签
    存档加载时会自动进行签到周期刷新
    本次游戏内的手动周期刷新：tryToRefresh，比如遇到跨午夜
    支持自行存档：getDocString获取存档字符串，然后自行存储，读档时传给load函数即可
    存档加载时如果与初始化类型不符合，会抛弃存档

范例：
    new DailySign({
        type: DailySignType.连续,
        duration: 7
    }).load();

    // 判断今天是否签到了
    if (!DailySign.getInstance().isTodaySigned()) {
        // 调整ui
    }
    // 判断周期内某一天是否签到
    for (let i = 0; i < 7; i++) {
        this.signedNodes[i].active = DailySign.getInstance().isDaySigned(i);
    }
    // 签到
    DailySign.getInstance().signIn();

怎么测试：
    可以在场景onLoad里覆写时间接口，让签到模块以为变天了
    if (CC_DEV) {
        const dayOff = 1;
        console.warn('时间接口xfire.currentTimeMillis已临时调整');
        Object.defineProperty(xfire, 'currentTimeMillis', {
            get: () => {
                return Date.now() + (3600000 * 24 * dayOff);
            }
        });
    }

*******************************************************************************/

import xfire from '../XFire/xfire';
import { TimeZone } from '../XFire/xfire_base';

// 签到数据存档版本
const DailySignDocVersion = 2;
const DailySignAutoSaveName = '__xfire_dailysign_doc_v2'; // 自动存档名

export enum DailySignType {
    周期可中断 = 0, // 需设定周期，起始日为构建时刻，中间可以断开，比如7天周期，第1天签到，第2天没有签到，第3天依然可以签
    累计 = 1,       // 需设定周期(签到最大次数)，可以隔n天再次签到，不会从第一天重新开始，比如7天，第1天签到，第2天没签，第3天签到算第2天
    周签到 = 2,     // 以周一为起始日进行7天签到，中间可以断开
    月签到 = 3,     // 以每月1日为起始日进行月周期签到，中间可以断开
    连续 = 4        // 需设定周期，连续签到，一旦中断，从第一天重新开始
}

interface DailySignDocV1 {
    version: number;
    type: DailySignType;
    duration: number;
    marks: string;
    zone: TimeZone;
    startDate: number;
    lastSignTime: number;
}

export class DailySign {
    private static instance: DailySign = null;
    public static getInstance (): DailySign {
        return DailySign.instance;
    }

    private type: DailySignType;
    private duration = 0;       // 周期
    private marks = '';         // 标记某天是否签到字符串缩减长度，0表未签到，1表签到
    private zone: TimeZone = 0; // 时区
    private startDate = 0;      // 周期起始时间戳
    private lastSignTime = 0;   // 最近一次签到时间，用于累计模式，其他模式不一定有
    private autoSave = true;    // 自动保存

    /**
     * @param type 签到类型
     * @param duration 签到周期 如七天 周签到和月签到不需要填写
     * @param zone 可选 时区，默认跟随系统
     * @param noAutoSave 可选 true将不进行存档，此时可用getDocString获取数据执行存档
     */
    public constructor (params: {
        type: DailySignType;
        duration?: number;
        zone?: TimeZone;
        noAutoSave?: boolean;
    }) {
        if (DailySign.instance == null) {
            DailySign.instance = this;
        }
        else {
            console.info('【注意】已存在一个DailySign');
        }

        this.type = params.type;
        this.duration = params.duration || 0;
        this.zone = params.zone || xfire.currentTimeZone;
        this.startDate = xfire.currentTimeMillis;
        this.autoSave = params.noAutoSave !== true;

        switch (params.type) {
            case DailySignType.周期可中断:
            case DailySignType.累计:    // 必须指定duration
            case DailySignType.连续:
                if (params.duration == null) {
                    console.error('必须指定周期');
                    break;
                }
                break;
            case DailySignType.周签到:
                this.duration = 7;
                this.startDate = this.startDate - xfire.getNormalDate(this.startDate, this.zone).day * 24 * 3600 * 1000;
                break;
            case DailySignType.月签到:
                let normalDate = xfire.getNormalDate(this.startDate);
                this.duration = new Date(normalDate.year, normalDate.month + 1, 0).getDate();
                this.startDate = this.startDate - normalDate.date * 24 * 3600 * 1000;
                break;
            default:
                console.log('错误的签到类型');
                break;
        }
        this.marks = '0'.repeat(this.duration);
    }

    /** 加载存档 为空将加载默认存档 加成成功的同时会尝试周期刷新 */
    public load (docCnt?: string): boolean {
        let doc = docCnt || cc.sys.localStorage.getItem(DailySignAutoSaveName);
        if (doc == null || doc === '') {
            return false;
        }
        try {
            let json: DailySignDocV1 = JSON.parse(doc);
            if (json.type !== this.type) {
                console.warn(`签到存档类型不一致：存档中为${json.type}，而设定为${this.type}`);
                return false;
            }
            this.type = json.type;
            this.duration = json.duration;
            this.marks = json.marks;
            this.startDate = json.startDate;
            this.zone = json.zone;
            this.lastSignTime = json.lastSignTime || 0;
            this.tryToRefresh();
            return true;
        } catch (error) {
            console.error('签到存档加载失败：' + JSON.stringify(error));
            return false;
        }
    }

    /** 获取存档字符串 */
    public getDocString (): string {
        let doc: DailySignDocV1 = {
            version: DailySignDocVersion,
            type: this.type,
            duration: this.duration,
            marks: this.marks,
            startDate: this.startDate,
            zone: this.zone,
            lastSignTime: this.lastSignTime
        };
        return JSON.stringify(doc);
    }

    /** 获取周期 */
    public getDuration () {
        return this.duration;
    }

    /** 签到周期起始时间 */
    public getStartDate (): number {
        return this.startDate;
    }

    /** 判断签到周期内某一天是否签到，从0开始 */
    public isDaySigned (dayIndexStartFrom0: number): boolean {
        if (dayIndexStartFrom0 < 0 || dayIndexStartFrom0 >= this.duration) {
            return false;
        }
        return this.marks.charAt(dayIndexStartFrom0) === '1';
    }

    /** 判断指定时间点是否签到 */
    public isTimeSigned (timestampOrDate: number | Date): boolean {
        let ts = typeof timestampOrDate === 'number' ? (timestampOrDate as number) : (timestampOrDate as Date).getTime();
        if (this.type === DailySignType.累计) {
            if (xfire.getDateDiff(this.lastSignTime, ts) === 0) {
                return true;
            }
            console.error('【累计】签到不应使用idDateSigned、isTimeSigned');
        }
        let diffDay = xfire.getDateDiff(this.startDate, ts, this.zone);
        return this.isDaySigned(diffDay);
    }

    /** 根据年月日判断是否签到 */
    public idDateSigned (year: number, month: number, date: number): boolean {
        return this.isTimeSigned(new Date(year, month - 1, date));
    }

    /** 判断今天是否签到 */
    public isTodaySigned (): boolean {
        if (this.type === DailySignType.累计) {
            return xfire.getDateDiff(this.lastSignTime, xfire.currentTimeMillis) <= 0;
        }
        return this.isTimeSigned(xfire.currentTimeMillis);
    }

    /**
     * 执行签到或对指定某一天(今天及以前)进行补签 默认今天
     * @param timestampOrDate 指定某一天，对累计签到没有意义
     */
    public signIn (timestampOrDate?: number | Date): boolean {
        let ts: number;
        let curTime = xfire.currentTimeMillis;
        if (timestampOrDate == null || this.type === DailySignType.累计) {
            ts = curTime;
        }
        else {
            ts = typeof timestampOrDate === 'number' ? (timestampOrDate as number) : (timestampOrDate as Date).getTime();
        }

        let diffDay = this.type === DailySignType.累计 ?
            this.getSignTimes() : xfire.getDateDiff(this.startDate, ts, this.zone);
        if (diffDay < 0 || diffDay >= this.duration) {
            return false;
        }
        if (this.isDaySigned(diffDay)) {
            return false;
        }
        this.marks = this.marks.substring(0, diffDay) + '1' + this.marks.substring(diffDay + 1, this.marks.length);
        if (xfire.getDateDiff(ts, curTime) === 0) {
            this.lastSignTime = curTime;
        }
        if (this.autoSave) {
            cc.sys.localStorage.setItem(DailySignAutoSaveName, this.getDocString());
        }
        return true;
    }

    /**
     * 强行签到周期内的某一天，包括还没到来的日子
     * 如果该天已经签到返回失败
     * 对于【累计】、【连续】：
     *      只能强签第一个未签日
     * @param dayIndex 周期内的某一天，从0开始
     */
    public forceSignIn (dayIndexStartFrom0: number): boolean {
        if (this.isDaySigned(dayIndexStartFrom0) || dayIndexStartFrom0 < 0 || dayIndexStartFrom0 >= this.duration) {
            return false;
        }
        if (this.type === DailySignType.累计 || this.type === DailySignType.连续) {
            if (dayIndexStartFrom0 !== this.getSignTimes()) {
                return false;
            }
            this.lastSignTime = xfire.currentTimeMillis;
        }
        this.marks = this.marks.substring(0, dayIndexStartFrom0 - 1) + '1' + this.marks.substring(dayIndexStartFrom0 + 1, this.marks.length);
        if (this.autoSave) {
            cc.sys.localStorage.setItem(DailySignAutoSaveName, this.getDocString());
        }
        return true;
    }

    /**
     * 获取今日是第几天
     * @param time 可选，【今日时间】，不然用xfire.currentTimeMillis作为今日时间
     */
    public getIndexOfToday (_time: number = null) {
        let ts = _time == null ? xfire.currentTimeMillis : _time;
        if (this.type === DailySignType.累计 || this.type === DailySignType.连续) {
            let signs = this.getSignTimes();
            if (signs === 0) {
                return 0;
            }
            if (xfire.getDateDiff(ts, this.lastSignTime) === 0) {
                return signs - 1;
            }
            else {
                return signs;
            }
        }
        return xfire.getDateDiff(this.startDate, ts);
    }

    /** 获取签到次数 */
    public getSignTimes (): number {
        let count = 0;
        for (let i = 0; i < this.duration; i++) {
            if (this.isDaySigned(i)) {
                count++;
            }
        }
        return count;
    }

    /**
     * 判断签到周期是否结束，最后一天签到了就算周期结束了
     * 但只要时间还在最后一天就不会自动重开周期
     */
    public isDurationEnded () {
        return this.isDaySigned(this.duration - 1);
    }

    // 新起一个签到周期
    public newDuration () {
        this.lastSignTime = 0;
        this.marks = '0'.repeat(this.duration);
        this.zone = xfire.currentTimeZone;
        let ts = xfire.currentTimeMillis;
        switch (this.type) {
            case DailySignType.周期可中断:
                break;
            case DailySignType.累计:
            case DailySignType.连续:
                this.startDate = ts;
                break;
            case DailySignType.周签到:
                this.startDate = ts - xfire.getNormalDate(ts, this.zone).day * 24 * 3600 * 1000;
                break;
            case DailySignType.月签到:
                let normalDate = xfire.getNormalDate(ts);
                this.duration = new Date(normalDate.year, normalDate.month + 1, 0).getDate();
                this.startDate = ts - normalDate.date * 24 * 3600 * 1000;
                break;
            default:
                console.log('错误的签到类型');
                break;
        }
        if (this.autoSave) {
            cc.sys.localStorage.setItem(DailySignAutoSaveName, this.getDocString());
        }
    }

    /**
     * 判断是否需要重启周期
     */
    public needToRefresh (): boolean {
        let refresh = false;
        let ts = xfire.currentTimeMillis;
        switch (this.type) {
            case DailySignType.累计:
                refresh = (ts > this.startDate) && this.isDaySigned(this.duration - 1) && !this.isTodaySigned();
                break;
            case DailySignType.周期可中断:
            case DailySignType.周签到:
            case DailySignType.月签到:
                // >= this.duration判断没有错
                refresh = xfire.getDateDiff(this.startDate, ts, this.zone) >= this.duration;
                break;
            case DailySignType.连续:
                refresh = xfire.getDateDiff(this.startDate, ts, this.zone) >= this.duration ||
                    (xfire.getDateDiff(this.startDate, ts) > 0 && !this.isTimeSigned(ts - 24 * 3600000));
                break;
            default:
                console.log('错误的签到类型');
                break;
        }
        // 如果是连续签到或累计签到，没签到过，但时区变了，刷新下
        if (!refresh && (this.type === DailySignType.累计 || this.type === DailySignType.连续) &&
            this.getSignTimes() === 0 && this.zone !== xfire.currentTimeZone) {
            refresh = true;
        }
        return refresh;
    }

    /**
     * 判断是否需要刷新，如果需要则进行刷新
     * 需要判断能否签到时可以进行一次刷新，可解决跨夜问题
     */
    public tryToRefresh (): boolean {
        let refresh = this.needToRefresh();
        if (refresh) {
            this.newDuration();
        }
        return refresh;
    }
}
