export const ResourceData: {
    /** 预加载预制体 */
    prefabs: { [key: string]: cc.Prefab };
    resource: cc.AssetManager.Bundle;
    atlasAvatar: cc.SpriteAtlas;
    remote: cc.AssetManager.Bundle; //远程bundle
} = {
    prefabs: {},
    resource: null,
    atlasAvatar: null,
    remote: null,
};

export enum MaticMould {
    白天模式 = 1,
    夜间模式 = 2
}


export interface GameDateType {
    /**  主题模式 */
    maticMould: MaticMould;
    /**  经典最高分数 */
    maxScore: {
        classicModel: number;
        endlessModel: number;
    }
}

let GameData: GameDateType = {
    maticMould: MaticMould.白天模式,
    maxScore: {
        classicModel: 0,
        endlessModel: 0
    }
};
export default GameData;
