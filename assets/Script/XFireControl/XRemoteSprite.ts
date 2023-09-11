/*******************************************************************************
文件: XRemoteSprite.ts
创建: 2020年11月06日
作者: 老张(zwx@xfire.mobi)
描述:
    显示远程图片
*******************************************************************************/

import xfire from "../XFire/xfire";

const {ccclass, executeInEditMode, menu, property, requireComponent} = cc._decorator;

@ccclass
@executeInEditMode
@requireComponent(cc.Sprite)
@menu('XFire/XRemoteSprite')
export default class XRemoteSprite extends cc.Component {

    @property
    public _host = 'http://192.168.1.10/g/001/assets/v1/resources/';
    @property({
        displayName: CC_DEV && '远程目录',
        tooltip: CC_DEV && 'http://192.168.1.10/g/001/assets/v1/resources/',
        visible: CC_DEV && function() {
            return this != null;
        }
    })
    public get host() {
        return this._host;
    }
    public set host(value: string) {
        if (value !== this._host) {
            this._host = value;
            this.refresh();
        }
    }

    @property
    public _path = 'Image/test.png';
    @property({
        displayName: CC_DEV && '路径',
        tooltip: CC_DEV && '会优先尝试在本地resources下加载，失败后加载远程主机下的资源',
        visible: CC_DEV && function() {
            return this != null;
        }
    })
    public get path() {
        return this._path;
    }
    public set path(value: string) {
        if (this._path !== value) {
            this._path = value;
            this.refresh();
        }
    }

    public onLoad () {
        this.refresh();
    }

    public start () {

    }

    public onEnable() {
        this.refresh();
    }

    private refresh() {
        let sprite = this.getComponent(cc.Sprite);
        if (!sprite) {
            return;
        }

        cc.loader.loadRes(this.path, cc.SpriteFrame, (err, spriteFrame: cc.SpriteFrame) => {
            if (err) {
                // console.error(err);
                sprite.spriteFrame = xfire.loadRemoteImage(this.host + this.path);
                return;
            }
            sprite.spriteFrame = spriteFrame;
        });
    }

}
