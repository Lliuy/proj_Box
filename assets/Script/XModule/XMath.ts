/*******************************************************************************
文件: XMath.ts
创建: 2019年9月19日
作者: 杭州炫火科技有限公司 老张(zwx@xfire.mobi)
描述:
    数学模块，一些常用数学接口。

2020年5月14日
    新增splitCubicBezier

2019年9月19日
    新增cross、segmentsIntersect、isPointInTriangle
*******************************************************************************/


export default class XMath {
    /**
     * 计算向量p0p1与p0p2的叉积
     * 用途：
     * 1.判断点在线的哪一侧，右手坐标系下叉积>0表p2在p0->p1的左侧，<0表右侧
     * 2.判断三角形点序
     */
    public static cross(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): number {
        return (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    }

    /**
     * 判断线段p0p1与线段p2p3是否相交
     */
    public static segmentsIntersect(x0: number, y0: number, x1: number, y1: number,
        x2: number, y2: number, x3: number, y3: number): boolean {
        // 简单判断不相交情况，同时可以剔除在同一直线上叉积无法判断的情况
        let minX01 = x0 < x1 ? x0 : x1;
        let maxX01 = x0 < x1 ? x1 : x0;
        let minY01 = y0 < y1 ? y0 : y1;
        let maxY01 = y0 < y1 ? y1 : y0;
        let minX23 = x2 < x3 ? x2 : x3;
        let maxX23 = x2 < x3 ? x3 : x2;
        let minY23 = y2 < y3 ? y2 : y3;
        let maxY23 = y2 < y3 ? y3 : y2;
        if (maxX01 < minX23 || maxY01 < minY23 || minX01 > maxX23 || minY01 > maxY23) {
            return false;
        }
        // p2、p3两点均在p0p1同侧，必不相交
        if (XMath.cross(x0, y0, x1, y1, x2, y2) * XMath.cross(x0, y0, x1, y1, x3, y3) > 0) {
            return false;
        }
        // p0、p1两点均在p2p3同侧，必不相交
        if (XMath.cross(x2, y2, x3, y3, x0, y0) * XMath.cross(x2, y2, x3, y3, x1, y1) > 0) {
            return false;
        }
        return true;
    }

    /**
     * 判断点pt是否在三角形t0-t1-t2内(含边上)
     * triangleClockwise是为了优化，多点判断时可避免一次重复计算
     */
    public static isPointInTriangle(ptX: number, ptY: number, t0X: number, t0Y: number, t1X: number, t1Y: number, t2X: number, t2Y: number, triangleClockwise?: boolean) {
        let clockwise: boolean = triangleClockwise;
        if (clockwise == null) {
            clockwise = XMath.cross(t0X, t0Y, t1X, t1Y, t2X, t2Y) < 0;
        }
        if ((XMath.cross(t0X, t0Y, t1X, t1Y, ptX, ptY) < 0) !== clockwise) {
            return false;
        }
        if ((XMath.cross(t1X, t1Y, t2X, t2Y, ptX, ptY) < 0) !== clockwise) {
            return false;
        }
        if ((XMath.cross(t2X, t2Y, t0X, t0Y, ptX, ptY) < 0) !== clockwise) {
            return false;
        }
        return true;
    }

    /**
     * 拆分3次bezier的拆分点，拆分后的两个3次bezier拼接形状与拆分前一致
     * 可用于增加控制点
     * @param start 起点
     * @param c1 起点控制
     * @param c2 结束点控制
     * @param end 结束点
     * @param t 拆分点，0-1，0对应start，1对应end，注意t与曲线长度非线性对应，如0.5不代表位于曲线中点。
     */
    public static splitCubicBezier(start: cc.Vec2, c1: cc.Vec2, c2: cc.Vec2, end: cc.Vec2, t: number): {start: cc.Vec2; c1: cc.Vec2; c2: cc.Vec2; end: cc.Vec2}[] {
        let a = start.mul(1 - t).add(c1.mul(t));
        let b = c1.mul(1 - t).add(c2.mul(t));
        let c = c2.mul(1 - t).add(end.mul(t));

        let d = a.mul(1 - t).add(b.mul(t));
        let e = b.mul(1 - t).add(c.mul(t));

        let pos = d.mul(1 - t).add(e.mul(t));

        return  [{start, c1: a, c2: d, end: pos}, {start: pos, c1: e, c2: c, end}];
    }

    /**
     * 解析计算简单的数学表达式，当前支持 变量、加、减、乘、除、()、变量指定、Math下的函数
     * @param _expression 表达式如：1 + sqrt(2)*abc + d / (5 + e)
     * @param variableMapper 用于查询变量值
     */
    public static evaluate(_expression: string, _variableMapper?: (variable: string) => number): number {
        let expression = _expression.replace(/ /g, '');
        let vMapper = _variableMapper;
        if (vMapper == null) {
            vMapper = (variable: string): number => {
                console.error('未指定查询器');
                return NaN;
            };
        }
        /** 表达式拆分，嵌套括号去最外围为一整体 */
        const split = (expression: string, operator: string): string[] => {
            let result = [];
            let braces = 0;
            let currentChunk = '';
            let lastCh = null;
            for (let curCh of expression) {
                if (curCh === '(') {
                    braces++;
                } else if (curCh === ')') {
                    braces--;
                }
                if (braces === 0 && operator === curCh && (operator !== '-' || (lastCh !== '*' && lastCh !== '/'))) {
                    result.push(currentChunk);
                    currentChunk = '';
                }
                else {
                    currentChunk += curCh;
                }
                lastCh = curCh;
            }
            if (currentChunk !== '') {
                result.push(currentChunk);
            }
            return result;
        };
        /** 函数调用 */
        const functionParse = (expression: string) => {
            let argStart = expression.indexOf('(');
            let funName = expression.substr(0, argStart);
            let strArgs = expression.substring(argStart + 1, expression.length - 1);
            let argsExps = split(strArgs, ',');
            let args = [];
            for (let exp of argsExps) {
                args.push(additionParser(exp));
            }
            if (Math[funName] != null) {
                let result = Math[funName](...args);
                return result;
            }
            else {
                console.error(`非法函数名${funName}`);
                return NaN;
            }
        };
        /** 除法解析 */
        const divisionParser = (expression: string) => {
            const subExps = split(expression, '/');
            const numbers = subExps.map((subExp: string): number => {
                if (subExp[0] === '(') {
                    return additionParser(subExp.substr(1, subExp.length - 2));
                }
                // 如有必要查询变量
                let result = parseFloat(subExp);
                if (isNaN(result)) {
                    if (subExp.indexOf('(') > 0) {
                        return functionParse(subExp);
                    }
                    else {
                        return vMapper(subExp);
                    }
                }
                return result;
            });
            let initialValue = numbers[0];
            return numbers.slice(1).reduce((total, num) => total / num, initialValue);
        };
        /** 乘法解析 */
        const multiplicationParser = (expression: string): number => {
            const subExps = split(expression, '*');
            const numbers = subExps.map((subExp) => {
                return divisionParser(subExp);
            });
            return numbers.reduce((total, num) => total * num, numbers.length > 0 ? 1 : 0);
        };
        /** 减法解析 */
        const substractionParser = (expression: string): number => {
            const subExps = split(expression, '-');
            const numbers = subExps.map((subExp) => {
                return multiplicationParser(subExp);
            });
            const initialValue = numbers[0];
            return numbers.slice(1).reduce((total, num) => total - num, initialValue);
        };
        /** 加法解析 */
        const additionParser = (expression: string): number => {
            const subExps = split(expression, '+');
            const numbers = subExps.map((subExp) => {
                return substractionParser(subExp);
            });
            return numbers.reduce((total, num) => total + num, 0);
        };
        return additionParser(expression);
    }
}
