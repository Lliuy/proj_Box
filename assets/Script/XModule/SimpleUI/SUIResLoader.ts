/*******************************************************************************
文件: SUIResLoader.ts
创建: 2021年03月17日
作者: 老张(zwx@xfire.mobi)
描述:
    资源加载器
*******************************************************************************/

export default abstract class SUIResLoader {
    public abstract loadImage (name: string, ext?: string): Promise<cc.SpriteFrame>;
}
