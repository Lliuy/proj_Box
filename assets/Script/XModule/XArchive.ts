/*******************************************************************************
文件: XArchive.ts
创建: 2020年07月14日
作者: 老张(zwx@xfire.mobi)
描述:
    存档模块基类
    ✦实现本地、远程存、读档的封装
    ✦实现版本兼容接口预置

使用规范：
    ✦在Script目录下新建脚本GameData.ts，用于游戏内的数据交互
    ✦在Script目录下新建脚本Archive.ts，继承XArchive，实现相关接口

使用方法：
    存档：[await] Archive.getInstance().save();
    读档：[await] Archive.getInstance().load();

范例：
import { GameData } from './GameData';
import XArchive from './XModule/XArchive';

export default class Archive extends XArchive {
    private static instance: Archive = new Archive();
    public static getInstance(): Archive {
        return Archive.instance;
    }

    protected doc: DocV1;

    public constructor() {
        super();
        Archive.instance = this;
    }

    public initDoc(): void {
        this.doc = {
            version: 2,
            gold: 100
        };
    }

    protected onBeforeSave(): void {
        let doc = this.doc;
        doc.gold = GameData.gold;
    }

    protected onAfterLoad() {
        let doc = this.doc;

        GameData.gold = doc.gold;
    }

    // protected convertV1(src: DocV1) {
    //     this.doc.gold = src.gold;
    //     this.doc.lv = 1;
    // }
}

// 下方数据模型里不要定义函数接口
interface DocV1{
    version: number;
    gold: number;
}

*******************************************************************************/

import xfire from "../XFire/xfire";
import xfireol from "../XFire/xfireol";

/** 存档名 */
const SaveDoc = '__xfire_save_doc';
/** 存档警告长度 */
const DocWarnLength = 1800;
/** 存档最大长度 */
const DocMaxLength = 2000;

export default abstract class XArchive {
    protected docWarnLength = DocWarnLength;
    protected docMaxLength = DocMaxLength;
    protected filenamePrefix = '';
    protected abstract doc;
    /** 上次存档字符串，通过对比可判断是否需要存档，减少存档次数 */
    private lastSavedData = '';

    /** 初始化存档，会触发一次onAfterLoad */
    public abstract initDoc (): void;

    /** 加载存档 */
    public load (): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            if (!this.doc) {
                this.initDoc();
                if (this.doc == null) {
                    console.error('存档未正确初始化');
                    resolve(false);
                    return;
                }
            }
            let strDoc = this.localLoad();
            if (xfire.mustArchiveOnline() && xfireol.isLogined()) {
                let onlineData = (await xfireol.getUserData()).data;
                if (onlineData != null && onlineData.length > 2) {
                    strDoc = onlineData;
                }
            }
            if (typeof strDoc !== 'string') {
                this.onAfterLoad();
                resolve(true);
                return;
            }
            /** 解析存档字符串 */
            let doc;
            try {
                doc = JSON.parse(strDoc);
                if (doc == null || typeof doc.version !== 'number') {
                    doc = null;
                }
            } catch (error) {
                console.error(error);
                this.onAfterLoad();
                resolve(false);
                return;
            }
            // 版本判断
            if (doc == null) {
                this.onAfterLoad();
                resolve(false);
                return;
            }
            if (doc.version !== this.doc.version) {
                if (typeof this[`convertV${doc.version}`] === 'function') {
                    this[`convertV${doc.version}`](doc);
                }
                // 没有转换函数，直接抛弃存档
                else {
                    console.warn(`无法转换V${doc.version}存档`);
                    this.onAfterLoad();
                    resolve(false);
                    return;
                }
            }
            else {
                this.doc = doc;
            }
            // 调用onAfterLoad
            this.onAfterLoad();
            resolve(true);
        });
    }

    /** 保存数据 */
    public save (): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            this.onBeforeSave();
            if (this.doc == null) {
                console.error('存档未初始化');
                resolve(false);
                return;
            }
            if (typeof this.doc.version !== 'number') {
                console.error('存档中没有设置version数值');
                resolve(false);
                return;
            }
            let strDoc = JSON.stringify(this.doc);
            if (strDoc === this.lastSavedData) {
                resolve(true);
                return;
            }
            this.lastSavedData = strDoc;
            // 本地存档
            this.localSave(strDoc);
            // 云存档
            if (xfire.mustArchiveOnline() && xfireol.isLogined()) {
                // 存档长度判断
                if (strDoc.length >= this.docMaxLength) {
                    console.error(`云存档长度过长${strDoc.length}`);
                    resolve(false);
                    return;
                }
                if (strDoc.length >= this.docWarnLength) {
                    console.warn(`云存档长度已达${strDoc.length}`);
                }
                xfireol.setUserData({
                    content: strDoc
                });
            }
            resolve(true);
        });
    }
    /** 准备数据 */
    protected abstract onBeforeSave (): void;

    /** 数据输出 */
    protected abstract onAfterLoad (): void;

    /** 加载本地存档 */
    private localLoad () {
        let strDoc = cc.sys.localStorage.getItem(this.filenamePrefix + SaveDoc);
        if (strDoc == null || strDoc === '') {
            return null;
        }
        return strDoc;
    }

    /** 存本地 */
    private localSave (strDoc: string) {
        cc.sys.localStorage.setItem(this.filenamePrefix + SaveDoc, strDoc);
    }
}
