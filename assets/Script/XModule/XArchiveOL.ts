/*******************************************************************************
文件: XArchiveOL.ts
创建: 2022年12月5日
作者: 老张(zwx@xfire.mobi)
描述:
    存档模块基类
    ✦实现远程存、读档的封装
    ✦实现版本兼容接口预置

使用规范：
    ✦在Script目录下新建脚本GameData.ts，用于游戏内的数据交互
    ✦在Script目录下新建脚本Archive.ts，继承XArchiveOL，实现相关接口

使用方法：
    存档：[await] Archive.getInstance().save();
    读档：[await] Archive.getInstance().load();

范例：
*******************************************************************************/

/** 本地存档名 */
const SaveDoc = '__xfire_save_doc';
/** 存档警告长度 */
const DocWarnLength = 16000;
/** 存档最大长度 */
const DocMaxLength = 18000;
/** 本地缓存多久后上传服务器，防止高频请求服务器，单位：秒 */
const CacheTime = 59;

export default abstract class XArchiveOL {
    protected docWarnLength = DocWarnLength;
    protected docMaxLength = DocMaxLength;
    protected filenamePrefix = '';
    protected abstract doc;
    /** 上次存档字符串，通过对比可判断是否需要存档，减少存档次数 */
    private lastSavedData = '';
    /** 判断是否已经完成了存档加载流程 */
    private loadEnd = false;

    /** 上次上传时间 */
    private lastUploadTime = 0;
    /** 缓存中的内容 */
    private caching = '';
    private uploading = false;

    public constructor() {
        /** 定时上传 */
        setInterval(() => {
            if ((xfire.currentTimeMillis - this.lastUploadTime) >= CacheTime * 1000 && this.caching) {
                this.upload();
            }
        }, 30 * 1000);
    }

    /** 初始化存档，会触发一次onAfterLoad */
    public abstract initDoc(): void;

    /** 加载存档 */
    public load(): Promise<boolean> {
        return new Promise<boolean> (async (resolve) => {
            if (!this.doc) {
                this.initDoc();
                if (this.doc == null) {
                    console.error('存档未正确初始化');
                    resolve(false);
                    return;
                }
            }
            let strDoc: string;
            // 等待登录
            while (!xfireol.isLogined()) {
                await xfire.sleep(0.1);
            }
            // 拉取远程存档
            while (true) {
                let ret = await xfireol.getUserData();
                if (ret.error) {
                    await xfire.sleep(5);
                    continue;
                }
                let onlineData = ret.data;
                if (onlineData != null && onlineData.length > 2) {
                    strDoc = onlineData;
                }
                break;
            }
            if (typeof strDoc !== 'string') {
                try {
                    this.onAfterLoad();
                } catch (error) {
                    console.error(error);
                }
                this.loadEnd = true;
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
                try {
                    this.onAfterLoad();
                } catch (error) {
                    console.error(error);
                }
                this.loadEnd = true;
                resolve(false);
                return;
            }
            // 版本判断
            if (doc == null) {
                try {
                    this.onAfterLoad();
                } catch (error) {
                    console.error(error);
                }
                this.loadEnd = true;
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
                    try {
                        this.onAfterLoad();
                    } catch (error) {
                        console.error(error);
                    }
                    this.loadEnd = true;
                    resolve(false);
                    return;
                }
            }
            else {
                this.doc = doc;
            }
            // 调用onAfterLoad
            try {
                this.onAfterLoad();
            } catch (error) {
                console.error(error);
            }
            this.loadEnd = true;
            resolve(true);
        });
    }

    /** 保存数据 */
    public save(atOnce = false): Promise<boolean> {
        return new Promise<boolean> (async (resolve) => {
            if (!this.loadEnd) {
                resolve(false);
                return;
            }
            try {
                this.onBeforeSave();
            } catch (error) {
                console.log(error);
            }
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

            // 存档长度判断
            if (strDoc.length >= this.docMaxLength) {
                console.error(`存档长度过长${strDoc.length}`);
                resolve(false);
                return;
            }
            if (strDoc.length >= this.docWarnLength) {
                console.warn(`存档长度已达${strDoc.length}`);
            }
            this.caching = strDoc;
            if (xfireol.isLogined() && atOnce) {
                this.upload();
            }
            resolve(true);
        });
    }

    /** 准备数据 */
    protected abstract onBeforeSave(): void;

    /** 数据输出 */
    protected abstract onAfterLoad(): void;

    private async upload() {
        if (this.uploading || !this.caching) return;
        this.uploading = true;
        try {
            let content = this.caching;
            let result = await xfireol.setUserData({content});
            if (result?.success) {
                this.lastUploadTime = xfire.currentTimeMillis;
                this.lastSavedData = content;
                if (content === this.caching) {
                    this.caching = '';
                }
                // 注：如果上传期间恰好触发了内容修改，那么新修改的内容不会立即上传，哪怕被要求了atonce
            }
        } catch (error) {
        } finally {
            this.uploading = false;
        }
    }
}
