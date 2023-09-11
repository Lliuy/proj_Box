/*******************************************************************************
文件: XSolution.ts
创建: 2020年11月30日
作者: 老张(zwx@xfire.mobi)
描述:
    方案筛选
*******************************************************************************/

import xfire from "../XFire/xfire";

const SaveDoc = '__xfire_solution_doc';

export class XSolution {
    /**
     * 获取解决方案下标，从0开始，保持版本和方案数不变可以存档
     * @param version 版本，如果版本变了，将重置用户方案，仅调整方案权重，未调整方案数、方案内容，可不更新版本号
     * @param _solutionCountOrWeights 数字表方案数量，每个方案权重相同，
     * 数字数组表方案权重，数组长度表方案数量
     * 如果数量变了，将重置用户方案
     */
    public static getSolution(version: number, _solutionCountOrWeights: number | number[]): number {
        let isWeithArray = typeof _solutionCountOrWeights !== 'number';
        let solutionCount = isWeithArray ?
            (_solutionCountOrWeights as number[]).length :
            _solutionCountOrWeights as number;
        let item = cc.sys.localStorage.getItem(SaveDoc);
        let json;
        try {
            if (item != null) {
                json = JSON.parse(item);
                if (typeof json !== 'object' || json.version !== version ||
                    json.count !== solutionCount ||
                    json.index === null) {
                    json = null;
                }
            }
        } catch (error) {
            console.error(error);
        }
        if (json == null) {
            let index = isWeithArray ?
                xfire.getRandomIndexByWeight(_solutionCountOrWeights as number[]) :
                Math.floor(Math.random() * solutionCount);
            json = {version, count: solutionCount, index};
            cc.sys.localStorage.setItem(SaveDoc, JSON.stringify(json));
        }
        return json.index;
    }
}
