/*******************************************************************************
文件: Archive.ts
创建: 2020年
作者:
描述:
    存档模块，不要直接访问存档内数据，数据交互使用GameData
使用方法：
    存档：[await] Archive.getInstance().save();
    读档：[await] Archive.getInstance().load();
*******************************************************************************/

import GameData, { GameDateType } from './GameData';
import xfire from './XFire/xfire';
import XArchive from './XModule/XArchive';

export default class Archive extends XArchive {
    private static instance: Archive = new Archive();
    public static getInstance(): Archive {
        return Archive.instance;
    }

    /** 存档 */
    protected doc: DocV1;

    /**
     * 存档初始化，一般不需要主动调用，除非需要清理存档
     * 首次进游戏调用load会自动初始化一次存档
     * 初始化会触发一次onAfterLoad
     */
    public initDoc(): void {
        this.doc = new DocV1();
    }

    /** 存档前填充存档数据 */
    protected onBeforeSave(): void {
        let doc = this.doc;
        doc.data.maticMould = GameData.maticMould;
        doc.data.maxScore = GameData.maxScore;
    }

    /** 存档加载后将数据进行输出，如果是加载了旧存档会先调用转换函数 */
    protected onAfterLoad() {
        let doc = this.doc;
        GameData.maticMould = doc.data.maticMould;
        GameData.maxScore = doc.data.maxScore;

    }

    /** 老版本存档加载转换函数，格式为convertV${version} */
    // protected convertV1(src: DocV1) {
    //     this.doc.gold = src.gold;
    //     this.doc.lv = 1;
    // }
}

// 数据模型，使用class可以直接设置初始化（默认值）
/*
class DocV2{
    public version = 2;
    public gold = 100;
    public lv = 1;
}*/

class DocV1 {
    public version = 1;
    public data: GameDateType;
}

